"""
Cadence DJ System — Audio Engine

Central audio engine that manages two decks, a mixer, and
drives the real-time audio output via sounddevice.
"""

import threading
import numpy as np
import sounddevice as sd
from audio.deck import Deck
from audio.mixer import Mixer
from config import SAMPLE_RATE, CHANNELS, BLOCK_SIZE, DTYPE


class AudioEngine:
    """
    Singleton audio engine managing dual decks, mixer, and real-time output.
    Uses sounddevice's OutputStream with a callback for low-latency playback.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        # Initialize dual decks
        self.deck_a = Deck("A")
        self.deck_b = Deck("B")

        # Initialize mixer
        self.mixer = Mixer()

        # Audio output stream
        self._stream: sd.OutputStream | None = None
        self._running = False

    def _audio_callback(self, outdata: np.ndarray, frames: int,
                        time_info, status) -> None:
        """
        Real-time audio callback invoked by sounddevice.
        Gets frames from both decks and delegates mixing to the Mixer.
        """
        if status:
            print(f"[AudioEngine] Stream status: {status}")

        # Get raw frames from both decks (volume already applied per-deck)
        frames_a = self.deck_a.get_frames(frames)
        frames_b = self.deck_b.get_frames(frames)

        # Delegate all mixing to the Mixer (gain trim → crossfader → master vol → clip)
        mixed = self.mixer.mix(frames_a, frames_b)

        # Write to output
        outdata[:] = mixed

    def start(self) -> None:
        """Start the audio output stream."""
        if self._running:
            return

        self._stream = sd.OutputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            blocksize=BLOCK_SIZE,
            dtype=DTYPE,
            callback=self._audio_callback,
        )
        self._stream.start()
        self._running = True
        print(f"[AudioEngine] Started — SR={SAMPLE_RATE}, CH={CHANNELS}, "
              f"Block={BLOCK_SIZE}")

    def stop(self) -> None:
        """Stop the audio output stream."""
        if self._stream is not None:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        self._running = False
        print("[AudioEngine] Stopped")

    def get_deck(self, deck_id: str) -> Deck:
        """Get a deck by ID ('A' or 'B')."""
        deck_id = deck_id.upper()
        if deck_id == "A":
            return self.deck_a
        elif deck_id == "B":
            return self.deck_b
        else:
            raise ValueError(f"Invalid deck ID: {deck_id}. Use 'A' or 'B'.")

    def get_state(self) -> dict:
        """Get the full engine state for status reporting."""
        return {
            "deck_a": self.deck_a.get_status(),
            "deck_b": self.deck_b.get_status(),
            "mixer": self.mixer.get_state(),
            "running": self._running,
        }
