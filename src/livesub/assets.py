import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import urllib.request


REAZON_REPO = "https://huggingface.co/csukuangfj/reazonspeech-k2-v2"
REAZON_REV = "7ebed8f70b8ef67f656aa08e3084e5885202d0e6"
REAZON_FILES = {
    "encoder-epoch-99-avg-1.int8.onnx": "2c7bd08a8a99f9ddd0d9e458456577b1f6279214e51426f114f9eced44c54e1d",
    "decoder-epoch-99-avg-1.onnx": "58b18211ae06265466bfa17172dab574df94f76c8bcb61a3640c28ba860e4124",
    "joiner-epoch-99-avg-1.int8.onnx": "49cc7ea1d3d35a40a27442db5e89996da64bf0e683a903dce76e99e57a12e4de",
    "tokens.txt": None,
}
RELEASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
SENSE_ARCHIVE = "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.tar.bz2"
SENSE_SHA = "7d1efa2138a65b0b488df37f8b89e3d91a60676e416f515b952358d83dfd347e"
VAD_SHA = "9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6"
WHISPER_SHA = "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe"
EXTRA_MODELS = {
    "nemotron": ("sherpa-onnx-nemotron-3.5-asr-streaming-0.6b-560ms-int8-2026-06-11", "c6bf5e0df765f9d5b43bc9e0536d4b4b3e7d40bdf5ecf13e45f134c51c05ae3a", ["encoder.int8.onnx", "decoder.int8.onnx", "joiner.int8.onnx", "tokens.txt"]),
    "parakeet": ("sherpa-onnx-nemo-parakeet-tdt_ctc-0.6b-ja-35000-int8", "4b0a800ef29f4f4c8667339bf6f60d5bfdc2852ddc9dc5741aea65b6f8d1306b", ["model.int8.onnx", "tokens.txt"]),
}


def sha256(path: Path) -> str:
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def download(url: str, path: Path, expected: str | None = None):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and (expected is None or sha256(path) == expected):
        return
    print(f"Downloading {path.name}", flush=True)
    temp = path.with_suffix(path.suffix + ".part")
    with urllib.request.urlopen(url, timeout=90) as response, temp.open("wb") as output:
        shutil.copyfileobj(response, output)
    if expected and sha256(temp) != expected:
        temp.unlink()
        raise ValueError(f"SHA256 mismatch: {path.name}")
    temp.replace(path)


def prepare(root: Path, engines: list[str], samples: bool):
    download(f"{RELEASE}/silero_vad.onnx", root / "silero_vad.onnx", VAD_SHA)
    for engine in engines:
        if engine not in EXTRA_MODELS:
            continue
        folder, digest, names = EXTRA_MODELS[engine]
        archive = root / f"{folder}.tar.bz2"
        download(f"{RELEASE}/{archive.name}", archive, digest)
        target = root / engine
        target.mkdir(exist_ok=True)
        with tarfile.open(archive) as tar:
            for name in names:
                member = tar.getmember(f"{folder}/{name}")
                with tar.extractfile(member) as source, (target / name).open("wb") as output:
                    shutil.copyfileobj(source, output)
    if "reazon" in engines:
        for name, digest in REAZON_FILES.items():
            download(f"{REAZON_REPO}/resolve/{REAZON_REV}/{name}", root / "reazon" / name, digest)
    if "sensevoice" in engines:
        archive = root / SENSE_ARCHIVE
        download(f"{RELEASE}/{SENSE_ARCHIVE}", archive, SENSE_SHA)
        target = root / "sensevoice"
        target.mkdir(exist_ok=True)
        with tarfile.open(archive) as tar:
            for name in ["model.int8.onnx", "tokens.txt"]:
                member = tar.getmember(f"{SENSE_ARCHIVE.removesuffix('.tar.bz2')}/{name}")
                with tar.extractfile(member) as source, (target / name).open("wb") as output:
                    shutil.copyfileobj(source, output)
    if "whisper" in engines:
        download("https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
                 root / "whisper" / "ggml-base.bin", WHISPER_SHA)
    if samples:
        for name in ["1.wav", "2.wav", "3.wav", "4.wav", "5.wav", "transcript.txt"]:
            download(f"{REAZON_REPO}/resolve/{REAZON_REV}/test_wavs/{name}", root / "samples" / name)
    files = {p.relative_to(root).as_posix(): sha256(p)
             for p in root.rglob("*") if p.is_file() and p.suffix not in {".json", ".part", ".bz2"}}
    (root / "manifest.json").write_text(json.dumps({"reazon_revision": REAZON_REV, "sha256": files}, indent=2), encoding="utf-8")


def model_files(root: Path, engine: str) -> dict[str, str]:
    names = EXTRA_MODELS[engine][2] if engine in EXTRA_MODELS else {"reazon": list(REAZON_FILES), "sensevoice": ["model.int8.onnx", "tokens.txt"], "whisper": ["ggml-base.bin"]}[engine]
    return {name: sha256(root / engine / name) for name in names}
