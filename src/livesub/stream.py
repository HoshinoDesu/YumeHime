from pathlib import Path
import uuid
import os

import numpy as np

from .asr import FRAME, SAMPLE_RATE, Recognizer, Segmenter


class StreamRecognizer:
    def __init__(self, recognizer: Recognizer, models: Path, terms: list[dict]):
        self.recognizer = recognizer
        self.segmenter = Segmenter(models, max_seconds=8, silence=0.65)
        self.terms = terms
        self.remainder = np.empty(0, dtype=np.float32)
        self.history = np.empty(0, dtype=np.float32)
        self.cursor = 0
        self.active = None

    def new_segment(self, start: int):
        self.active = {"segment_id": uuid.uuid4().hex, "revision": 0,
                       "start": start, "last_partial": self.cursor, "last_text": "", "stable_text": ""}

    def correct(self, text: str):
        for term in self.terms:
            for alias in term.get("aliases", []):
                if alias:
                    text = text.replace(alias, term["source"])
        return text

    def event(self, text: str, final: bool, start: int, end: int, stable_text: str = ""):
        self.active["revision"] += 1
        return {"type": "subtitle", "kind": "original", "segment_id": self.active["segment_id"],
                "revision": self.active["revision"], "final": final, "text": text,
                "stable": final or bool(stable_text), "stable_text": text if final else stable_text,
                "start_ms": round(start / SAMPLE_RATE * 1000), "end_ms": round(end / SAMPLE_RATE * 1000)}

    def final_events(self, segments):
        events = []
        for start, audio in segments:
            if self.active is None:
                self.new_segment(start)
            text = self.correct(self.recognizer.transcribe(audio))
            events.append(self.event(text, True, start, start + len(audio)))
            self.active = None
        return events

    def feed(self, pcm: bytes):
        samples = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768
        self.remainder = np.concatenate([self.remainder, samples])
        events = []
        while len(self.remainder) >= FRAME:
            frame, self.remainder = self.remainder[:FRAME], self.remainder[FRAME:]
            self.history = np.concatenate([self.history, frame])[-SAMPLE_RATE * 10:]
            self.cursor += FRAME
            segments = self.segmenter.feed(frame)
            if segments:
                events.extend(self.final_events(segments))
            elif self.segmenter.vad.is_speech_detected():
                if self.active is None:
                    self.new_segment(self.segmenter.active_start)
                duration = (self.cursor - self.active["start"]) / SAMPLE_RATE
                interval = .6 if not self.active["last_text"] else (.8 if duration < 4 else 1.2)
                if self.cursor - self.active["last_partial"] >= int(interval * SAMPLE_RATE):
                    start = self.active["start"]
                    text = self.correct(self.recognizer.transcribe(self.history[-(self.cursor - start):]))
                    self.active["last_partial"] = self.cursor
                    previous = self.active["last_text"]
                    stable_text = os.path.commonprefix([previous, text]).rstrip()
                    if len(stable_text) < 4:
                        stable_text = ""
                    if text and (text != previous or stable_text != self.active["stable_text"]):
                        self.active["last_text"] = text
                        self.active["stable_text"] = stable_text
                        events.append(self.event(text, False, start, self.cursor, stable_text=stable_text))
        return events

    def finish(self):
        events = []
        if len(self.remainder):
            padding = np.zeros(FRAME - len(self.remainder), dtype="<i2").tobytes()
            events.extend(self.feed(padding))
        events.extend(self.final_events(self.segmenter.finish()))
        return events
