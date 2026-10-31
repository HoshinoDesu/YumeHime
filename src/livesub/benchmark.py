from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import queue
import shutil
import threading
import time
import unicodedata

import numpy as np
import psutil

from .asr import FRAME, SAMPLE_RATE, Recognizer, Segmenter, read_audio
from .assets import model_files, sha256


@dataclass
class Segment:
    audio_start: float
    audio_end: float
    ready_at: float
    inference_seconds: float
    queue_seconds: float
    completed_at: float
    end_to_final_seconds: float | None
    start_to_final_seconds: float | None
    text: str


def normalize(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKC", text)
                   if not c.isspace() and not unicodedata.category(c).startswith("P"))


def cer(reference: str, hypothesis: str) -> float:
    ref, hyp = normalize(reference), normalize(hypothesis)
    if not ref:
        raise ValueError("Reference transcript is empty")
    row = list(range(len(hyp) + 1))
    for i, a in enumerate(ref, 1):
        new = [i]
        for j, b in enumerate(hyp, 1):
            new.append(min(new[-1] + 1, row[j] + 1, row[j - 1] + (a != b)))
        row = new
    return row[-1] / len(ref)


def cpu_seconds():
    values = os.times()
    return values.user + values.system + values.children_user + values.children_system


class Monitor:
    def __init__(self):
        self.stop = threading.Event()
        self.peak = 0
        self.thread = threading.Thread(target=self.watch, daemon=True)

    def watch(self):
        process = psutil.Process()
        while not self.stop.is_set():
            total = process.memory_info().rss
            for child in process.children(recursive=True):
                try:
                    total += child.memory_info().rss
                except psutil.NoSuchProcess:
                    pass
            self.peak = max(self.peak, total)
            self.stop.wait(0.05)


def run(args):
    audio = read_audio(args.audio)
    duration = len(audio) / SAMPLE_RATE
    if duration == 0:
        raise ValueError("Audio is empty")
    args.output.mkdir(parents=True, exist_ok=True)
    load_start = time.perf_counter()
    monitor = Monitor()
    monitor.thread.start()
    try:
        recognizer = Recognizer(args.engine, args.models, args.threads, args.whisper_cli, args.decoding_method)
        segmenter = Segmenter(args.models, args.max_segment, args.silence)
        load_seconds = time.perf_counter() - load_start
        # A warm-up run is recorded separately and excluded from steady-state RTF.
        warm_start = time.perf_counter()
        recognizer.transcribe(audio[:min(len(audio), SAMPLE_RATE * 3)])
        warm_seconds = time.perf_counter() - warm_start
        pending = queue.Queue()
        records, errors = [], []
        origin = time.perf_counter()
        cpu_start = cpu_seconds()

        def worker():
            while True:
                item = pending.get()
                if item is None:
                    break
                start, samples, ready_at = item
                started = time.perf_counter() - origin
                try:
                    text = recognizer.transcribe(samples)
                except Exception as error:
                    errors.append(error)
                    # Keep draining the queue so the producer can finish cleanly.
                    continue
                completed = time.perf_counter() - origin
                end = (start + len(samples)) / SAMPLE_RATE
                records.append(Segment(start / SAMPLE_RATE, end, ready_at,
                    completed - started, max(0, started - ready_at), completed,
                    max(0, completed - end) if args.realtime else None,
                    max(0, completed - start / SAMPLE_RATE) if args.realtime else None, text))
                print(f"{start / SAMPLE_RATE:7.2f}s {text}", flush=True)

        consumer = threading.Thread(target=worker)
        consumer.start()
        max_queue = 0
        vad_seconds = 0
        try:
            for offset in range(0, len(audio), FRAME):
                end = min(offset + FRAME, len(audio))
                if args.realtime:
                    delay = end / SAMPLE_RATE - (time.perf_counter() - origin)
                    if delay > 0:
                        time.sleep(delay)
                frame = audio[offset:end]
                if len(frame) < FRAME:
                    frame = np.pad(frame, (0, FRAME - len(frame)))
                before = time.perf_counter()
                segments = segmenter.feed(frame)
                vad_seconds += time.perf_counter() - before
                for start, samples in segments:
                    pending.put((start, samples, time.perf_counter() - origin))
                max_queue = max(max_queue, pending.qsize())
            before = time.perf_counter()
            tail = segmenter.finish()
            vad_seconds += time.perf_counter() - before
            for start, samples in tail:
                pending.put((start, samples, time.perf_counter() - origin))
        finally:
            pending.put(None)
            consumer.join()
        elapsed = time.perf_counter() - origin
        cpu_used = cpu_seconds() - cpu_start
        if errors:
            raise errors[0]
        speech_seconds = sum(s.audio_end - s.audio_start for s in records)
        inference_seconds = sum(s.inference_seconds for s in records)
        transcript = "\n".join(s.text for s in records)
        latencies = [s.end_to_final_seconds for s in records if s.end_to_final_seconds is not None]
        from_start = [s.start_to_final_seconds for s in records if s.start_to_final_seconds is not None]
        report = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "engine": args.engine, "threads": args.threads,
            "machine": {"architecture": platform.machine(), "platform": platform.platform(),
                        "logical_cpus": os.cpu_count(), "cpu_affinity": psutil.Process().cpu_affinity() if hasattr(psutil.Process(), "cpu_affinity") else None},
            "versions": {x: importlib.metadata.version(x) for x in ["sherpa-onnx", "numpy", "psutil"]},
            "audio": {"file": args.audio.name, "sha256": sha256(args.audio), "seconds": duration, "source": args.source},
            "models_sha256": model_files(args.models, args.engine),
            "whisper_cli_sha256": sha256(Path(shutil.which(args.whisper_cli) or args.whisper_cli)) if args.engine == "whisper" else None,
            "parameters": {"realtime": args.realtime, "max_segment_seconds": args.max_segment,
                           "reazon_decoding_method": args.decoding_method if args.engine == "reazon" else None,
                           "inference_tail_padding_seconds": .3 if args.engine == "reazon" else 0,
                           "silence_seconds": args.silence, "vad_frame_samples": FRAME},
            "vad": {"threshold": 0.35, "head_padding_seconds": 0.8, "tail_padding_seconds": 0.2, "continuous_window_overlap_seconds": 0.2},
            "metrics": {"load_seconds": load_seconds, "warmup_seconds": warm_seconds,
                "asr_rtf": inference_seconds / duration,
                "asr_rtf_on_speech": inference_seconds / speech_seconds if speech_seconds else None,
                "processing_rtf": (inference_seconds + vad_seconds) / duration,
                "vad_seconds": vad_seconds, "inference_seconds": inference_seconds,
                "wall_seconds": elapsed, "cpu_seconds": cpu_used,
                "cpu_percent_one_core": cpu_used / elapsed * 100,
                "peak_rss_mib": monitor.peak / 1024**2,
                "speech_seconds": speech_seconds, "segments": len(records), "max_queued_segments": max_queue,
                "final_latency_p50_seconds": float(np.percentile(latencies, 50)) if latencies else None,
                "final_latency_p95_seconds": float(np.percentile(latencies, 95)) if latencies else None,
                "speech_start_to_final_p50_seconds": float(np.percentile(from_start, 50)) if from_start else None,
                "speech_start_to_final_p95_seconds": float(np.percentile(from_start, 95)) if from_start else None,
                "queue_wait_p95_seconds": float(np.percentile([s.queue_seconds for s in records], 95)) if records else None,
                "backlog_at_eof_seconds": max(0, elapsed - duration) if args.realtime else None,
                "cer": cer(args.reference.read_text(encoding="utf-8"), transcript) if args.reference else None},
            "segments": [asdict(s) for s in records],
        }
        name = args.name or f"{args.engine}-t{args.threads}-{int(time.time())}"
        (args.output / f"{name}.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        (args.output / f"{name}.txt").write_text(transcript, encoding="utf-8")
        print(json.dumps(report["metrics"], indent=2), flush=True)
        return report
    finally:
        monitor.stop.set()
        monitor.thread.join()
