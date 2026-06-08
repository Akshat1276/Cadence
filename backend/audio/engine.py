"""
Cadence DJ System — Audio Engine

Central audio engine that manages two decks, mixes their outputs,
and drives the real-time audio output via sounddevice.
"""

import threading
import numpy as np
import sounddevice as sd
from audio.deck import Deck
from config import SAMPLE_RATE, CHANNELS, BLOCK_SIZE, DTYPE


class AudioEngine:
    """
    Singleton audio engine managing dual decks and real-time output.
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

        # Master volume
        self.master_volume: float = 0.8

        # Crossfader: 0.0 = full A, 0.5 = center, 1.0 = full B
        self.crossfader: float = 0.5

        # Audio output stream
        self._stream: sd.OutputStream | None = None
        self._running = False

    def _audio_callback(self, outdata: np.ndarray, frames: int,
                        time_info, status) -> None:
        """
        Real-time audio callback invoked by sounddevice.
        Mixes both decks and writes to the output buffer.
        """
        if status:
            print(f"[AudioEngine] Stream status: {status}")

        # Get frames from both decks
        frames_a = self.deck_a.get_frames(frames)
        frames_b = self.deck_b.get_frames(frames)

        # Apply crossfader
        # crossfader=0.0 → full A, crossfader=1.0 → full B
        gain_a = 1.0 - self.crossfader
        gain_b = self.crossfader

        # Mix
        mixed = (frames_a * gain_a) + (frames_b * gain_b)

        # Apply master volume
        mixed *= self.master_volume

        # Clip to prevent distortion
        np.clip(mixed, -1.0, 1.0, out=mixed)

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
            "master_volume": round(self.master_volume, 2),
            "crossfader": round(self.crossfader, 2),
            "running": self._running,
        }
