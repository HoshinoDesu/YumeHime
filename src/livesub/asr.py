from pathlib import Path
import re
import subprocess
import tempfile
import wave

import numpy as np
import sherpa_onnx


SAMPLE_RATE = 16000
FRAME = 512


def read_audio(path: Path) -> np.ndarray:
    with wave.open(str(path), "rb") as source:
        if (source.getframerate(), source.getnchannels(), source.getsampwidth()) != (16000, 1, 2):
            raise ValueError("Audio must be 16 kHz mono PCM16 WAV; use ffmpeg -i input -ar 16000 -ac 1 -c:a pcm_s16le output.wav")
        return np.frombuffer(source.readframes(source.getnframes()), dtype="<i2").astype(np.float32) / 32768


def write_audio(path: Path, samples: np.ndarray):
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes((np.clip(samples, -1, 32767 / 32768) * 32768).astype("<i2").tobytes())


class Recognizer:
    def __init__(self, engine: str, root: Path, threads: int, whisper_cli: str = "whisper-cli", decoding_method: str = "greedy_search"):
        self.engine = engine
        self.threads = threads
        self.root = root
        self.whisper_cli = whisper_cli
        if engine == "reazon":
            folder = root / "reazon"
            self.model = sherpa_onnx.OfflineRecognizer.from_transducer(
                encoder=str(folder / "encoder-epoch-99-avg-1.int8.onnx"),
                decoder=str(folder / "decoder-epoch-99-avg-1.onnx"),
                joiner=str(folder / "joiner-epoch-99-avg-1.int8.onnx"),
                tokens=str(folder / "tokens.txt"), num_threads=threads,
                sample_rate=SAMPLE_RATE, feature_dim=80, decoding_method=decoding_method,
                max_active_paths=4)
        elif engine == "sensevoice":
            self.model = sherpa_onnx.OfflineRecognizer.from_sense_voice(
                model=str(root / "sensevoice" / "model.int8.onnx"),
                tokens=str(root / "sensevoice" / "tokens.txt"),
                num_threads=threads, language="ja", use_itn=True)
        elif engine == "parakeet":
            self.model = sherpa_onnx.OfflineRecognizer.from_nemo_ctc(
                model=str(root / engine / "model.int8.onnx"), tokens=str(root / engine / "tokens.txt"),
                num_threads=threads, sample_rate=SAMPLE_RATE, feature_dim=80)
        elif engine == "nemotron":
            self.model = sherpa_onnx.OnlineRecognizer.from_transducer(
                encoder=str(root / engine / "encoder.int8.onnx"), decoder=str(root / engine / "decoder.int8.onnx"),
                joiner=str(root / engine / "joiner.int8.onnx"), tokens=str(root / engine / "tokens.txt"),
                num_threads=threads, sample_rate=SAMPLE_RATE, feature_dim=80, model_type="nemo_transducer",
                enable_endpoint_detection=True, rule2_min_trailing_silence=0.65, rule3_min_utterance_length=4)
        elif engine != "whisper":
            raise ValueError(f"Unknown engine: {engine}")

    def transcribe(self, samples: np.ndarray) -> str:
        if self.engine == "nemotron":
            stream = self.model.create_stream()
            stream.set_option("language", "ja")
            stream.accept_waveform(SAMPLE_RATE, np.concatenate([samples, np.zeros(int(0.8 * SAMPLE_RATE), dtype=np.float32)]))
            stream.input_finished()
            while self.model.is_ready(stream):
                self.model.decode_stream(stream)
            return self.model.get_result(stream).strip()
        if self.engine == "whisper":
            with tempfile.TemporaryDirectory(prefix="livesub-") as directory:
                audio = Path(directory) / "segment.wav"
                write_audio(audio, samples)
                output = Path(directory) / "result"
                result = subprocess.run([
                    self.whisper_cli, "-m", str(self.root / "whisper" / "ggml-base.bin"),
                    "-f", str(audio), "-l", "ja", "-t", str(self.threads),
                    "-otxt", "-of", str(output), "-nt", "-np", "-ng"],
                    capture_output=True, text=True, encoding="utf-8", timeout=120)
                if result.returncode:
                    raise RuntimeError(result.stderr[-2000:])
                return output.with_suffix(".txt").read_text(encoding="utf-8").strip()
        stream = self.model.create_stream()
        if self.engine == "reazon":
            samples = np.concatenate([samples, np.zeros(int(.3 * SAMPLE_RATE), dtype=np.float32)])
        stream.accept_waveform(SAMPLE_RATE, samples)
        self.model.decode_stream(stream)
        text = stream.result.text.strip()
        return re.sub(r"<\|[^|]+\|>", "", text).strip()


class Segmenter:
    """Feed 512-sample frames; keep VAD on one thread."""

    def __init__(self, root: Path, max_seconds: float = 3, silence: float = 0.35):
        config = sherpa_onnx.VadModelConfig()
        config.silero_vad.model = str(root / "silero_vad.onnx")
        config.silero_vad.min_silence_duration = silence
        config.silero_vad.min_speech_duration = 0.15
        config.silero_vad.threshold = 0.35
        config.silero_vad.max_speech_duration = 60
        config.sample_rate = SAMPLE_RATE
        config.num_threads = 1
        self.vad = sherpa_onnx.VoiceActivityDetector(config, buffer_size_in_seconds=65)
        self.head_padding = int(0.8 * SAMPLE_RATE)
        self.tail_padding = int(0.2 * SAMPLE_RATE)
        self.silence_samples = int(silence * SAMPLE_RATE)
        self.max_samples = int(max_seconds * SAMPLE_RATE)
        self.buffer = np.empty(0, dtype=np.float32)
        self.total = 0
        self.buffer_limit = int((max_seconds + silence + 2) * SAMPLE_RATE)
        self.active_start = None

    def feed(self, frame: np.ndarray):
        self.buffer = np.concatenate([self.buffer, frame])[-self.buffer_limit:]
        self.total += len(frame)
        self.vad.accept_waveform(frame)
        while not self.vad.empty():
            self.vad.pop()
        speaking = self.vad.is_speech_detected()
        if speaking and self.active_start is None:
            self.active_start = max(0, self.total - self.head_padding)
        if self.active_start is None:
            return []
        if not speaking:
            end = max(self.active_start, self.total - self.silence_samples + self.tail_padding)
            result = self.extract(self.active_start, end)
            self.active_start = None
            return [result] if len(result[1]) else []
        if self.total - self.active_start >= self.max_samples:
            result = self.extract(self.active_start, self.total)
            self.active_start = self.total - int(0.2 * SAMPLE_RATE)
            return [result]
        return []

    def finish(self):
        self.vad.flush()
        if self.active_start is None:
            return []
        result = self.extract(self.active_start, self.total)
        self.active_start = None
        return [result] if len(result[1]) else []

    def extract(self, start, end):
        offset = self.total - len(self.buffer)
        start, end = max(start, offset), min(end, self.total)
        return start, self.buffer[start - offset:end - offset].copy()
