"""
Cadence DJ System — Waveform Generator

Generates downsampled waveform peak data from audio buffers
for frontend visualization. Supports both overview (full track)
and zoomed (partial) waveform generation.
"""

import numpy as np
from config import WAVEFORM_PEAKS, SAMPLE_RATE


def generate_waveform_peaks(audio_data: np.ndarray,
                            num_peaks: int = WAVEFORM_PEAKS) -> dict:
    """
    Generate a downsampled waveform from a full audio buffer.

    Takes the raw audio (samples, channels) and reduces it to
    a fixed number of peaks for rendering. Each peak contains
    the min and max amplitude in that segment.

    Args:
        audio_data: NumPy array of shape (num_samples, channels)
        num_peaks: Number of peaks to generate (default from config)

    Returns:
        Dict with peaks_positive, peaks_negative arrays and metadata.
    """
    if audio_data is None or len(audio_data) == 0:
        return {"peaks_positive": [], "peaks_negative": [], "length": 0, "duration": 0}

    # Convert stereo to mono for waveform (average channels)
    if audio_data.ndim == 2:
        mono = np.mean(audio_data, axis=1)
    else:
        mono = audio_data

    total_samples = len(mono)
    duration = total_samples / SAMPLE_RATE

    # Ensure we don't request more peaks than samples
    num_peaks = min(num_peaks, total_samples)

    samples_per_peak = total_samples / num_peaks
    peaks_positive = np.zeros(num_peaks, dtype=np.float32)
    peaks_negative = np.zeros(num_peaks, dtype=np.float32)

    for i in range(num_peaks):
        start = int(i * samples_per_peak)
        end = int((i + 1) * samples_per_peak)
        end = min(end, total_samples)

        if start < end:
            segment = mono[start:end]
            peaks_positive[i] = np.max(segment)
            peaks_negative[i] = np.min(segment)

    return {
        "peaks_positive": peaks_positive.tolist(),
        "peaks_negative": peaks_negative.tolist(),
        "length": num_peaks,
        "duration": round(duration, 3),
        "sample_rate": SAMPLE_RATE,
    }


def generate_zoomed_waveform(audio_data: np.ndarray,
                             start_sec: float,
                             end_sec: float,
                             num_peaks: int = WAVEFORM_PEAKS) -> dict:
    """
    Generate waveform peaks for a specific time range (zoomed view).

    Args:
        audio_data: Full audio buffer
        start_sec: Start time in seconds
        end_sec: End time in seconds
        num_peaks: Number of peaks for the zoomed region

    Returns:
        Dict with peaks and metadata for the specified range.
    """
    if audio_data is None or len(audio_data) == 0:
        return {"peaks_positive": [], "peaks_negative": [], "length": 0,
                "start": start_sec, "end": end_sec}

    # Convert to mono
    if audio_data.ndim == 2:
        mono = np.mean(audio_data, axis=1)
    else:
        mono = audio_data

    total_samples = len(mono)

    # Clamp to valid range
    start_sample = max(0, int(start_sec * SAMPLE_RATE))
    end_sample = min(total_samples, int(end_sec * SAMPLE_RATE))

    if start_sample >= end_sample:
        return {"peaks_positive": [], "peaks_negative": [], "length": 0,
                "start": start_sec, "end": end_sec}

    region = mono[start_sample:end_sample]
    region_samples = len(region)
    num_peaks = min(num_peaks, region_samples)

    samples_per_peak = region_samples / num_peaks
    peaks_positive = np.zeros(num_peaks, dtype=np.float32)
    peaks_negative = np.zeros(num_peaks, dtype=np.float32)

    for i in range(num_peaks):
        start = int(i * samples_per_peak)
        end = int((i + 1) * samples_per_peak)
        end = min(end, region_samples)

        if start < end:
            segment = region[start:end]
            peaks_positive[i] = np.max(segment)
            peaks_negative[i] = np.min(segment)

    return {
        "peaks_positive": peaks_positive.tolist(),
        "peaks_negative": peaks_negative.tolist(),
        "length": num_peaks,
        "start": round(start_sec, 3),
        "end": round(end_sec, 3),
    }
