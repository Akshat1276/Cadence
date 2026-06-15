"""
Cadence DJ System — Real-Time Spectrum Analyzer

Computes FFT magnitude spectrum from audio blocks and bins into
frequency bands for visualization. Runs in the audio callback.
"""

import numpy as np
from config import SAMPLE_RATE

# Number of frequency bands for the visual display
NUM_BANDS = 32

# Frequency range
MIN_FREQ = 20.0      # Hz
MAX_FREQ = 20000.0   # Hz


def compute_spectrum(audio: np.ndarray, num_bands: int = NUM_BANDS) -> dict:
    """
    Compute frequency spectrum from an audio block.

    Uses FFT to convert time-domain audio into frequency magnitudes,
    then bins into logarithmically-spaced bands for visualization.

    Args:
        audio: shape (num_frames, channels), float32
        num_bands: number of output frequency bands

    Returns:
        Dict with bands (magnitude array), peak_freq, and band_frequencies.
    """
    if audio is None or len(audio) == 0:
        return {
            "bands": [0.0] * num_bands,
            "peak_freq": 0.0,
        }

    # Convert stereo to mono for analysis
    if audio.ndim == 2:
        mono = np.mean(audio, axis=1)
    else:
        mono = audio

    num_samples = len(mono)

    # Apply Hann window to reduce spectral leakage
    window = np.hanning(num_samples)
    windowed = mono * window

    # Compute FFT (real-valued input → rfft)
    fft_result = np.fft.rfft(windowed)
    magnitudes = np.abs(fft_result) / num_samples  # Normalize

    # Frequency axis
    freqs = np.fft.rfftfreq(num_samples, d=1.0 / SAMPLE_RATE)

    # Find peak frequency
    peak_idx = np.argmax(magnitudes[1:]) + 1  # Skip DC component
    peak_freq = float(freqs[peak_idx]) if peak_idx < len(freqs) else 0.0

    # Bin into logarithmically-spaced frequency bands
    bands = _bin_to_log_bands(magnitudes, freqs, num_bands)

    return {
        "bands": [round(float(b), 4) for b in bands],
        "peak_freq": round(peak_freq, 1),
    }


def _bin_to_log_bands(magnitudes: np.ndarray, freqs: np.ndarray,
                      num_bands: int) -> np.ndarray:
    """
    Bin FFT magnitudes into logarithmically-spaced frequency bands.

    Logarithmic spacing matches human hearing perception — each band
    covers an octave-like range rather than equal Hz ranges.

    Args:
        magnitudes: FFT magnitude array
        freqs: Frequency axis (Hz)
        num_bands: Number of output bands

    Returns:
        Array of band magnitudes.
    """
    bands = np.zeros(num_bands, dtype=np.float64)

    # Generate logarithmic band edges
    log_min = np.log10(max(MIN_FREQ, 1.0))
    log_max = np.log10(min(MAX_FREQ, SAMPLE_RATE / 2.0))
    band_edges = np.logspace(log_min, log_max, num_bands + 1)

    for i in range(num_bands):
        low = band_edges[i]
        high = band_edges[i + 1]

        # Find FFT bins within this band
        mask = (freqs >= low) & (freqs < high)
        if np.any(mask):
            # Use RMS of magnitudes in this band
            bands[i] = np.sqrt(np.mean(magnitudes[mask] ** 2))

    # Convert to dB scale (0 = silence, 1 = full scale)
    # Apply soft scaling for visual appeal
    max_val = np.max(bands)
    if max_val > 0:
        bands = bands / max_val  # Normalize to 0-1

    return bands


def get_band_frequencies(num_bands: int = NUM_BANDS) -> list[float]:
    """Get the center frequencies for each band (for UI labels)."""
    log_min = np.log10(max(MIN_FREQ, 1.0))
    log_max = np.log10(min(MAX_FREQ, SAMPLE_RATE / 2.0))
    band_edges = np.logspace(log_min, log_max, num_bands + 1)

    centers = []
    for i in range(num_bands):
        center = np.sqrt(band_edges[i] * band_edges[i + 1])  # Geometric mean
        centers.append(round(float(center), 1))

    return centers
