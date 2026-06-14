"""
Cadence DJ System — BPM Detection & Beat Grid

Analyzes audio to detect tempo (BPM) and beat positions using
librosa's onset and tempo detection. Generates a beat grid
for visualization and synchronization.
"""

import numpy as np
import librosa
from config import SAMPLE_RATE


def detect_bpm(audio_data: np.ndarray, sample_rate: int = SAMPLE_RATE) -> dict:
    """
    Detect BPM and beat positions from audio data.

    Uses librosa's beat tracker which applies:
      1. Onset strength envelope (spectral flux)
      2. Auto-correlation for periodicity
      3. Dynamic programming for beat tracking

    Args:
        audio_data: NumPy array of shape (num_samples, channels)
        sample_rate: Sample rate in Hz

    Returns:
        Dict with bpm, beat_times (seconds), beat_frames, and confidence.
    """
    if audio_data is None or len(audio_data) == 0:
        return {
            "bpm": 0.0,
            "beat_times": [],
            "beat_count": 0,
            "downbeat_times": [],
        }

    # Convert stereo to mono for analysis
    if audio_data.ndim == 2:
        mono = np.mean(audio_data, axis=1).astype(np.float32)
    else:
        mono = audio_data.astype(np.float32)

    # Compute onset envelope (spectral flux)
    onset_env = librosa.onset.onset_strength(
        y=mono, sr=sample_rate, hop_length=512
    )

    # Detect tempo (BPM) using auto-correlation
    tempo_result = librosa.beat.tempo(
        onset_envelope=onset_env, sr=sample_rate, hop_length=512
    )
    bpm = float(tempo_result[0]) if len(tempo_result) > 0 else 0.0

    # Track beat positions
    _, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sample_rate,
        hop_length=512, bpm=bpm
    )

    # Convert beat frames to time positions (seconds)
    beat_times = librosa.frames_to_time(
        beat_frames, sr=sample_rate, hop_length=512
    ).tolist()

    # Estimate downbeats (every 4 beats for 4/4 time)
    downbeat_times = beat_times[::4] if len(beat_times) >= 4 else beat_times[:1]

    return {
        "bpm": round(bpm, 1),
        "beat_times": [round(t, 4) for t in beat_times],
        "beat_count": len(beat_times),
        "downbeat_times": [round(t, 4) for t in downbeat_times],
    }


def generate_beat_grid(bpm: float, duration: float,
                       offset: float = 0.0) -> list[float]:
    """
    Generate a uniform beat grid from a known BPM.

    This is used as an alternative to detected beats when the BPM
    is known/confirmed. Produces perfectly even beat spacing.

    Args:
        bpm: Beats per minute
        duration: Track duration in seconds
        offset: Grid offset from start of track in seconds

    Returns:
        List of beat times in seconds.
    """
    if bpm <= 0:
        return []

    beat_interval = 60.0 / bpm  # seconds per beat
    beats = []
    t = offset
    while t < duration:
        beats.append(round(t, 4))
        t += beat_interval

    return beats


def compute_phase_offset(beat_times_a: list[float], position_a: float,
                         beat_times_b: list[float], position_b: float) -> float:
    """
    Compute the phase difference between two decks' beat positions.

    Finds the nearest beat to each deck's current position and
    computes how far apart they are as a fraction of the beat interval.

    Args:
        beat_times_a: Beat grid for deck A
        position_a: Current playback position of deck A (seconds)
        beat_times_b: Beat grid for deck B
        position_b: Current playback position of deck B (seconds)

    Returns:
        Phase offset in seconds (positive = B is ahead, negative = B is behind).
    """
    if not beat_times_a or not beat_times_b:
        return 0.0

    # Find nearest beat to current position for each deck
    nearest_a = min(beat_times_a, key=lambda t: abs(t - position_a))
    nearest_b = min(beat_times_b, key=lambda t: abs(t - position_b))

    # Phase = distance from each deck's position to its nearest beat
    phase_a = position_a - nearest_a
    phase_b = position_b - nearest_b

    return round(phase_b - phase_a, 4)
