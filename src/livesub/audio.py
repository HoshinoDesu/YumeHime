import numpy as np


class SpeechLeveler:
    """Raise quiet input for speech detection; keep recognition and playback audio unchanged."""

    def __init__(self):
        self.level = 0.0
        self.gain = 1.0

    def process(self, samples: np.ndarray) -> np.ndarray:
        rms = float(np.sqrt(np.mean(samples * samples)))
        peak = float(np.max(np.abs(samples)))
        # Hold the recent voice level so gaps and background music are not boosted between words.
        self.level = max(rms, self.level * .995)
        target = min(16.0, max(1.0, .08 / max(self.level, .0001))) if rms >= .0001 else 1.0
        limit = .98 / peak if peak else 16.0
        previous = min(self.gain, limit)
        rate = .25 if target > self.gain else .6
        self.gain = min(limit, self.gain + rate * (target - self.gain))
        gains = np.linspace(previous, self.gain, len(samples), dtype=np.float32)
        return samples * gains
