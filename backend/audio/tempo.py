"""
Cadence DJ System — Tempo Adjustment

Provides playback speed control for beat matching. Uses a simple
resampling approach — adjusting the read step size in the audio buffer.

Pitch shift is NOT applied (we use time-independent pitch for a future PR).
For now, tempo changes also affect pitch (vinyl-style behavior).
"""

import numpy as np
from config import SAMPLE_RATE


class TempoController:
    """
    Controls playback speed for a deck.

    Speed factor:
      - 1.0 = normal speed
      - 1.05 = 5% faster (higher pitch)
      - 0.95 = 5% slower (lower pitch)

    Range: 0.5 to 2.0 (±50%)
    Fine range for beatmatching: typically ±8%
    """

    def __init__(self):
        self.speed: float = 1.0          # Playback speed multiplier
        self.original_bpm: float = 0.0   # BPM at speed=1.0
        self._accumulator: float = 0.0   # Fractional sample accumulator

    @property
    def effective_bpm(self) -> float:
        """Current BPM accounting for speed adjustment."""
        return self.original_bpm * self.speed if self.original_bpm > 0 else 0.0

    def set_speed(self, speed: float) -> None:
        """Set playback speed (clamped to 0.5–2.0)."""
        self.speed = max(0.5, min(2.0, speed))

    def nudge(self, amount: float) -> None:
        """Temporarily nudge speed for beat alignment (±0.01 typical)."""
        self.speed = max(0.5, min(2.0, self.speed + amount))

    def reset(self) -> None:
        """Reset to normal speed."""
        self.speed = 1.0
        self._accumulator = 0.0

    def compute_read_frames(self, num_output_frames: int) -> tuple[int, float]:
        """
        Calculate how many source frames to read for the desired output frames.

        At speed 1.0: read N frames to produce N output frames.
        At speed 1.1: read 1.1N frames to produce N output frames (faster).
        At speed 0.9: read 0.9N frames to produce N output frames (slower).

        Uses an accumulator for sub-sample accuracy.

        Args:
            num_output_frames: Number of frames the output buffer needs.

        Returns:
            Tuple of (integer frames to read, new accumulator value).
        """
        exact_frames = num_output_frames * self.speed + self._accumulator
        int_frames = int(exact_frames)
        new_accumulator = exact_frames - int_frames
        return int_frames, new_accumulator

    def resample_block(self, source: np.ndarray,
                       num_output_frames: int) -> np.ndarray:
        """
        Resample a source audio block to a different number of output frames.

        Uses linear interpolation for smooth tempo changes.

        Args:
            source: Input audio of shape (source_frames, channels)
            num_output_frames: Desired output length

        Returns:
            Resampled audio of shape (num_output_frames, channels)
        """
        source_frames = source.shape[0]
        channels = source.shape[1] if source.ndim == 2 else 1

        if source_frames == num_output_frames or source_frames == 0:
            return source

        # Generate interpolation indices
        indices = np.linspace(0, source_frames - 1, num_output_frames)
        int_indices = indices.astype(int)
        fractions = (indices - int_indices).astype(np.float32)

        # Clamp to valid range
        int_indices_next = np.minimum(int_indices + 1, source_frames - 1)

        if source.ndim == 2:
            # Stereo interpolation
            output = (source[int_indices] * (1 - fractions[:, np.newaxis]) +
                      source[int_indices_next] * fractions[:, np.newaxis])
        else:
            # Mono interpolation
            output = source[int_indices] * (1 - fractions) + \
                     source[int_indices_next] * fractions

        return output.astype(np.float32)

    def get_state(self) -> dict:
        return {
            "speed": round(self.speed, 4),
            "original_bpm": round(self.original_bpm, 1),
            "effective_bpm": round(self.effective_bpm, 1),
        }
