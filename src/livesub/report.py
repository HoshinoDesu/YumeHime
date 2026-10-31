import json
from pathlib import Path


def value(number, digits=3):
    return "—" if number is None else f"{number:.{digits}f}"


def summarize(folder: Path, output: Path):
    rows = []
    for path in sorted(folder.glob("*.json")):
        report = json.loads(path.read_text(encoding="utf-8"))
        if "metrics" not in report:
            continue
        metric = report["metrics"]
        cer = metric["cer"]
        rows.append("| " + " | ".join([
            path.stem, value(metric["asr_rtf"]), value(metric["asr_rtf_on_speech"]),
            value(cer * 100, 1) + "%" if cer is not None else "—",
            value(metric["final_latency_p95_seconds"]),
            value(metric.get("speech_start_to_final_p95_seconds")),
            value(metric["peak_rss_mib"], 1),
        ]) + " |")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join([
        "# ASR 测试结果", "",
        "各次测试的音频来源、SHA256、参数和完整识别文本见同名 JSON/TXT 文件。",
        "结束延迟指片段结束至日文最终结果；起始延迟指片段开始至日文最终结果，单位为秒。",
        "未按播放速度输入时不报告这两项延迟。Whisper CLI 每段加载模型的开销已计入 RTF。", "",
        "| 测试 | RTF（整段） | RTF（语音） | 字符错误率 | 结束延迟 P95 | 起始延迟 P95 | 内存 MiB |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |", *rows, "",
        "样例数量有限，不能据此认定直播识别质量、中文翻译延迟或三小时稳定性已达标。", "",
    ]), encoding="utf-8")
    print(output.read_text(encoding="utf-8"))
