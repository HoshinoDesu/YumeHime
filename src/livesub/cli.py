import argparse
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(prog="livesub")
    sub = parser.add_subparsers(dest="command", required=True)
    assets = sub.add_parser("prepare", help="Download models and optional Japanese examples")
    assets.add_argument("--models", type=Path, default=Path("models"))
    assets.add_argument("--engines", nargs="+", choices=["reazon", "sensevoice", "whisper", "nemotron", "parakeet"], default=["reazon", "sensevoice"])
    assets.add_argument("--samples", action="store_true")
    reel = sub.add_parser("sample-reel", help="Join the five author-provided Japanese samples")
    reel.add_argument("--models", type=Path, default=Path("models"))
    reel.add_argument("--output", type=Path, default=Path("audio"))
    reel.add_argument("--repeat", type=int, default=1)
    summary = sub.add_parser("report", help="Create a Markdown table from benchmark JSON files")
    summary.add_argument("--results", type=Path, default=Path("results"))
    summary.add_argument("--output", type=Path, default=Path("results/summary.md"))
    bench = sub.add_parser("benchmark", help="Measure ASR on this machine")
    bench.add_argument("--audio", required=True, type=Path)
    bench.add_argument("--models", type=Path, default=Path("models"))
    bench.add_argument("--engine", choices=["reazon", "sensevoice", "whisper", "nemotron", "parakeet"], required=True)
    bench.add_argument("--threads", type=int, choices=range(1, 5), default=3)
    bench.add_argument("--decoding-method", choices=["greedy_search", "modified_beam_search"], default="greedy_search", help="ReazonSpeech decoder; other engines use their own decoder")
    bench.add_argument("--max-segment", type=float, default=3)
    bench.add_argument("--silence", type=float, default=0.35)
    bench.add_argument("--realtime", action="store_true", help="Feed audio at its original playback speed")
    bench.add_argument("--whisper-cli", default="vendor/whisper.cpp/build/bin/whisper-cli")
    bench.add_argument("--reference", type=Path)
    bench.add_argument("--source", default="user-provided")
    bench.add_argument("--output", type=Path, default=Path("results"))
    bench.add_argument("--name")
    args = parser.parse_args()
    if args.command == "prepare":
        from .assets import prepare
        prepare(args.models, args.engines, args.samples)
    elif args.command == "sample-reel":
        import numpy as np
        from .asr import read_audio, write_audio, SAMPLE_RATE
        if args.repeat < 1:
            parser.error("--repeat must be positive")
        parts = []
        for number in range(1, 6):
            parts.extend([read_audio(args.models / "samples" / f"{number}.wav"), np.zeros(SAMPLE_RATE, dtype=np.float32)])
        args.output.mkdir(parents=True, exist_ok=True)
        write_audio(args.output / "sample-reel.wav", np.concatenate(parts * args.repeat))
        lines = (args.models / "samples" / "transcript.txt").read_text(encoding="utf-8").splitlines()
        text = "\n".join(line.split(maxsplit=1)[1] for line in lines if line.strip())
        (args.output / "sample-reel.txt").write_text("\n".join([text] * args.repeat), encoding="utf-8")
    elif args.command == "benchmark":
        if args.max_segment <= 0 or args.silence <= 0:
            parser.error("--max-segment and --silence must be positive")
        from .benchmark import run
        run(args)
    elif args.command == "report":
        from .report import summarize
        summarize(args.results, args.output)


if __name__ == "__main__":
    main()
