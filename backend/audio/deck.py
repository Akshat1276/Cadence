"""
Cadence DJ System — Deck Module

Each Deck represents an independent audio player that holds a loaded track,
manages playback state, and provides audio frames on demand.
"""

import threading
import numpy as np
from enum import Enum
from audio.loader import load_audio_file_stereo
from config import SAMPLE_RATE, CHANNELS


class DeckState(str, Enum):
    EMPTY = "empty"
    LOADED = "loaded"
    PLAYING = "playing"
    PAUSED = "paused"


class Deck:
    """
    A single DJ deck that can load, play, pause, and seek through an audio track.
    Audio frames are read by the engine's audio callback.
    """

    def __init__(self, deck_id: str):
        self.deck_id = deck_id
        self.state = DeckState.EMPTY
        self._lock = threading.Lock()

        # Audio data
        self.audio_data: np.ndarray | None = None   # shape: (samples, channels)
        self.duration: float = 0.0                    # seconds
        self.total_frames: int = 0

        # Playback cursor (in samples)
        self.cursor: int = 0

        # Track metadata
        self.track_name: str = ""
        self.file_path: str = ""

        # Volume (0.0 to 1.0)
        self.volume: float = 1.0

    def load_track(self, file_path: str, track_name: str = "") -> dict:
        """Load an audio file into this deck."""
        with self._lock:
            audio_data, duration = load_audio_file_stereo(file_path)
            self.audio_data = audio_data
            self.duration = duration
            self.total_frames = audio_data.shape[0]
            self.cursor = 0
            self.file_path = file_path
            self.track_name = track_name or file_path.split("\\")[-1].split("/")[-1]
            self.state = DeckState.LOADED
            return self.get_status()

    def play(self) -> dict:
        """Start or resume playback."""
        with self._lock:
            if self.state in (DeckState.LOADED, DeckState.PAUSED):
                self.state = DeckState.PLAYING
            return self.get_status()

    def pause(self) -> dict:
        """Pause playback."""
        with self._lock:
            if self.state == DeckState.PLAYING:
                self.state = DeckState.PAUSED
            return self.get_status()

    def stop(self) -> dict:
        """Stop playback and reset cursor to beginning."""
        with self._lock:
            if self.state in (DeckState.PLAYING, DeckState.PAUSED):
                self.state = DeckState.LOADED
                self.cursor = 0
            return self.get_status()

    def seek(self, position_seconds: float) -> dict:
        """Seek to a specific position in seconds."""
        with self._lock:
            if self.audio_data is not None:
                target_frame = int(position_seconds * SAMPLE_RATE)
                self.cursor = max(0, min(target_frame, self.total_frames - 1))
            return self.get_status()

    def get_frames(self, num_frames: int) -> np.ndarray:
        """
        Read the next chunk of audio frames from this deck.
        Called by the audio engine in the real-time callback.
        Returns a numpy array of shape (num_frames, channels).
        """
        output = np.zeros((num_frames, CHANNELS), dtype=np.float32)

        if self.state != DeckState.PLAYING or self.audio_data is None:
            return output

        with self._lock:
            remaining = self.total_frames - self.cursor
            if remaining <= 0:
                # Track finished
                self.state = DeckState.LOADED
                self.cursor = 0
                return output

            frames_to_read = min(num_frames, remaining)
            output[:frames_to_read] = self.audio_data[self.cursor:self.cursor + frames_to_read]
            self.cursor += frames_to_read

            # Apply volume
            output *= self.volume

        return output

    def get_position_seconds(self) -> float:
        """Get the current playback position in seconds."""
        if self.audio_data is None:
            return 0.0
        return self.cursor / SAMPLE_RATE

    def get_status(self) -> dict:
        """Get the current status of this deck."""
        return {
            "deck_id": self.deck_id,
            "state": self.state.value,
            "track_name": self.track_name,
            "position": round(self.get_position_seconds(), 2),
            "duration": round(self.duration, 2),
            "volume": round(self.volume, 2),
            "file_path": self.file_path,
        }
