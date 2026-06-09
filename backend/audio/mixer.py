"""
Cadence DJ System — Mixer Module

Handles the audio mixing pipeline: per-deck gain (trim), crossfader,
and master output volume. The Mixer processes raw deck frames into
the final mixed output.
"""

import numpy as np


class Mixer:
    """
    Audio mixer that combines two deck signals using crossfader logic,
    applies per-deck gain trim, and controls master output volume.
    """

    def __init__(self):
        # Per-deck gain trim in dB (0 dB = no change, range: -12 to +12)
        self.gain_a_db: float = 0.0
        self.gain_b_db: float = 0.0

        # Crossfader position: 0.0 = full A, 0.5 = center, 1.0 = full B
        self.crossfader: float = 0.5

        # Master output volume (0.0 to 1.0)
        self.master_volume: float = 0.8

        # Crossfader curve type: "linear", "constant_power", "sharp"
        self.crossfader_curve: str = "constant_power"

    @staticmethod
    def db_to_linear(db: float) -> float:
        """Convert decibels to linear gain multiplier."""
        return 10.0 ** (db / 20.0)

    def _get_crossfader_gains(self) -> tuple[float, float]:
        """
        Calculate crossfader gains for deck A and B based on the
        selected curve type.
        """
        cf = self.crossfader  # 0.0 to 1.0

        if self.crossfader_curve == "linear":
            # Simple linear crossfade
            gain_a = 1.0 - cf
            gain_b = cf

        elif self.crossfader_curve == "constant_power":
            # Constant power crossfade — maintains perceived loudness
            # Uses equal-power (sine/cosine) curves
            import math
            angle = cf * (math.pi / 2.0)
            gain_a = math.cos(angle)
            gain_b = math.sin(angle)

        elif self.crossfader_curve == "sharp":
            # Sharp cut — quick transition near the edges
            # Deck is at full volume until crossfader passes ~10% threshold
            if cf < 0.1:
                gain_a = 1.0
                gain_b = cf / 0.1
            elif cf > 0.9:
                gain_a = (1.0 - cf) / 0.1
                gain_b = 1.0
            else:
                gain_a = 1.0
                gain_b = 1.0

        else:
            # Fallback to linear
            gain_a = 1.0 - cf
            gain_b = cf

        return gain_a, gain_b

    def mix(self, frames_a: np.ndarray, frames_b: np.ndarray) -> np.ndarray:
        """
        Mix two deck frame buffers into a single master output.

        Processing chain:
            1. Apply per-deck gain trim (dB → linear)
            2. Apply crossfader gains
            3. Sum the signals
            4. Apply master volume
            5. Clip to [-1.0, 1.0]

        Args:
            frames_a: Audio frames from Deck A, shape (num_frames, channels)
            frames_b: Audio frames from Deck B, shape (num_frames, channels)

        Returns:
            Mixed output, shape (num_frames, channels)
        """
        # 1. Apply per-deck gain trim
        trim_a = self.db_to_linear(self.gain_a_db)
        trim_b = self.db_to_linear(self.gain_b_db)
        processed_a = frames_a * trim_a
        processed_b = frames_b * trim_b

        # 2. Get crossfader gains
        cf_gain_a, cf_gain_b = self._get_crossfader_gains()

        # 3. Mix with crossfader
        mixed = (processed_a * cf_gain_a) + (processed_b * cf_gain_b)

        # 4. Apply master volume
        mixed *= self.master_volume

        # 5. Clip to prevent digital distortion
        np.clip(mixed, -1.0, 1.0, out=mixed)

        return mixed

    def get_state(self) -> dict:
        """Get the current mixer state for API reporting."""
        return {
            "crossfader": round(self.crossfader, 3),
            "master_volume": round(self.master_volume, 3),
            "gain_a_db": round(self.gain_a_db, 1),
            "gain_b_db": round(self.gain_b_db, 1),
            "crossfader_curve": self.crossfader_curve,
        }
