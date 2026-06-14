"""
Cadence DJ System — Peak Metering

Computes real-time RMS and peak levels from audio frames
for VU meter / peak meter visualization on the frontend.
"""

import numpy as np


def compute_peak_levels(frames: np.ndarray) -> dict:
    """
    Compute peak and RMS levels for a block of audio frames.

    Args:
        frames: Audio data of shape (num_frames, channels)

    Returns:
        Dict with per-channel peak and RMS values in both
        linear (0.0-1.0) and dBFS scales.
    """
    if frames is None or len(frames) == 0:
        return {
            "peak_l": 0.0, "peak_r": 0.0,
            "rms_l": 0.0, "rms_r": 0.0,
            "peak_db_l": -60.0, "peak_db_r": -60.0,
            "rms_db_l": -60.0, "rms_db_r": -60.0,
        }

    if frames.ndim == 1:
        # Mono — duplicate for L/R
        left = frames
        right = frames
    else:
        left = frames[:, 0]
        right = frames[:, 1] if frames.shape[1] > 1 else frames[:, 0]

    # Peak (absolute max)
    peak_l = float(np.max(np.abs(left)))
    peak_r = float(np.max(np.abs(right)))

    # RMS (root mean square — perceived loudness)
    rms_l = float(np.sqrt(np.mean(left ** 2)))
    rms_r = float(np.sqrt(np.mean(right ** 2)))

    return {
        "peak_l": round(peak_l, 4),
        "peak_r": round(peak_r, 4),
        "rms_l": round(rms_l, 4),
        "rms_r": round(rms_r, 4),
        "peak_db_l": round(_to_dbfs(peak_l), 1),
        "peak_db_r": round(_to_dbfs(peak_r), 1),
        "rms_db_l": round(_to_dbfs(rms_l), 1),
        "rms_db_r": round(_to_dbfs(rms_r), 1),
    }


def _to_dbfs(linear: float) -> float:
    """Convert linear amplitude (0.0–1.0) to dBFS."""
    if linear <= 0.0:
        return -60.0
    db = 20.0 * np.log10(linear)
    return max(-60.0, db)
