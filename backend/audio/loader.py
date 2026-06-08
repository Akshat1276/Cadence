"""
Cadence DJ System — Audio File Loader

Handles decoding audio files into NumPy arrays using librosa.
Supports WAV, MP3, FLAC, OGG, AAC, and other formats via FFmpeg.
"""

import numpy as np
import librosa
from config import SAMPLE_RATE, CHANNELS


def load_audio_file(file_path: str) -> tuple[np.ndarray, float]:
    """
    Load an audio file and return a stereo float32 NumPy array + duration.

    Args:
        file_path: Path to the audio file.

    Returns:
        Tuple of (audio_data, duration_seconds).
        audio_data shape: (num_samples, 2) for stereo, dtype float32.
    """
    # Load as mono first for compatibility, then convert to stereo
    y_mono, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=True)

    # Convert mono to stereo by duplicating channels
    if CHANNELS == 2:
        audio_data = np.column_stack([y_mono, y_mono]).astype(np.float32)
    else:
        audio_data = y_mono.reshape(-1, 1).astype(np.float32)

    duration = len(y_mono) / sr
    return audio_data, duration


def load_audio_file_stereo(file_path: str) -> tuple[np.ndarray, float]:
    """
    Load an audio file preserving stereo information if available.

    Args:
        file_path: Path to the audio file.

    Returns:
        Tuple of (audio_data, duration_seconds).
        audio_data shape: (num_samples, 2) for stereo, dtype float32.
    """
    y, sr = librosa.load(file_path, sr=SAMPLE_RATE, mono=False)

    # librosa returns (channels, samples) for stereo, (samples,) for mono
    if y.ndim == 1:
        # Mono → duplicate to stereo
        audio_data = np.column_stack([y, y]).astype(np.float32)
    else:
        # Stereo → transpose to (samples, channels)
        audio_data = y.T.astype(np.float32)
        # If more than 2 channels, take first two
        if audio_data.shape[1] > 2:
            audio_data = audio_data[:, :2]

    duration = audio_data.shape[0] / sr
    return audio_data, duration
