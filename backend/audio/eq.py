"""
Cadence DJ System — 3-Band EQ

Per-deck 3-band equalizer (Low / Mid / High) using biquad IIR filters.
Each band can boost or cut by ±12 dB. Filters are implemented as
second-order sections (SOS) for numerical stability.
"""

import numpy as np
from scipy.signal import sosfilt
from config import SAMPLE_RATE

# Band center frequencies (Hz)
EQ_LOW_FREQ = 100.0
EQ_MID_FREQ = 1000.0
EQ_HIGH_FREQ = 10000.0

# Q factor (bandwidth) — higher = narrower band
EQ_Q = 0.707  # Butterworth-like


class EQBand:
    """A single parametric EQ band using a biquad peaking filter."""

    def __init__(self, freq: float, q: float, sample_rate: int):
        self.freq = freq
        self.q = q
        self.sample_rate = sample_rate
        self.gain_db: float = 0.0
        self._sos = self._compute_sos()
        # Filter state — one per channel (stereo = 2)
        self._state = np.zeros((1, 2, 2), dtype=np.float64)

    def set_gain(self, gain_db: float) -> None:
        """Set the gain for this band (-12 to +12 dB)."""
        gain_db = max(-12.0, min(12.0, gain_db))
        if gain_db != self.gain_db:
            self.gain_db = gain_db
            self._sos = self._compute_sos()

    def _compute_sos(self) -> np.ndarray:
        """
        Compute the second-order section coefficients for a peaking EQ filter.

        Uses the Audio EQ Cookbook formula by Robert Bristow-Johnson.
        """
        A = 10.0 ** (self.gain_db / 40.0)  # Square root of linear gain
        w0 = 2.0 * np.pi * self.freq / self.sample_rate
        alpha = np.sin(w0) / (2.0 * self.q)

        cos_w0 = np.cos(w0)

        b0 = 1.0 + alpha * A
        b1 = -2.0 * cos_w0
        b2 = 1.0 - alpha * A
        a0 = 1.0 + alpha / A
        a1 = -2.0 * cos_w0
        a2 = 1.0 - alpha / A

        # Normalize by a0
        sos = np.array([[b0 / a0, b1 / a0, b2 / a0, 1.0, a1 / a0, a2 / a0]],
                       dtype=np.float64)
        return sos

    def process(self, audio: np.ndarray) -> np.ndarray:
        """
        Apply the EQ band filter to audio frames.

        Args:
            audio: shape (num_frames, channels), float32

        Returns:
            Filtered audio, same shape.
        """
        if abs(self.gain_db) < 0.1:
            return audio  # Bypass when near 0 dB

        # Process each channel separately to maintain filter state
        output = np.empty_like(audio, dtype=np.float64)
        for ch in range(audio.shape[1]):
            filtered, self._state[0, ch:ch + 1, :] = sosfilt(
                self._sos,
                audio[:, ch].astype(np.float64),
                zi=self._state[0, ch:ch + 1, :]
            )
            output[:, ch] = filtered

        return output.astype(np.float32)

    def reset_state(self) -> None:
        """Reset filter state (call when loading a new track)."""
        self._state = np.zeros((1, 2, 2), dtype=np.float64)


class ThreeBandEQ:
    """
    3-band parametric EQ with Low, Mid, and High bands.
    Each band independently boosts/cuts ±12 dB.
    """

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.low = EQBand(EQ_LOW_FREQ, EQ_Q, sample_rate)
        self.mid = EQBand(EQ_MID_FREQ, EQ_Q, sample_rate)
        self.high = EQBand(EQ_HIGH_FREQ, EQ_Q, sample_rate)
        self.enabled: bool = True

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply all 3 EQ bands in series."""
        if not self.enabled:
            return audio

        output = self.low.process(audio)
        output = self.mid.process(output)
        output = self.high.process(output)
        return output

    def set_gains(self, low_db: float, mid_db: float, high_db: float) -> None:
        """Set all three band gains at once."""
        self.low.set_gain(low_db)
        self.mid.set_gain(mid_db)
        self.high.set_gain(high_db)

    def reset(self) -> None:
        """Reset all EQ bands to 0 dB and clear filter state."""
        self.low.set_gain(0.0)
        self.mid.set_gain(0.0)
        self.high.set_gain(0.0)
        self.low.reset_state()
        self.mid.reset_state()
        self.high.reset_state()

    def get_state(self) -> dict:
        """Get current EQ state."""
        return {
            "enabled": self.enabled,
            "low_db": round(self.low.gain_db, 1),
            "mid_db": round(self.mid.gain_db, 1),
            "high_db": round(self.high.gain_db, 1),
        }
