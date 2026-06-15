"""
Cadence DJ System — Audio Router

Manages separate audio output streams for Master (speakers) and
Cue (headphones). Cue output sends the pre-fader signal of decks
that have cue monitoring enabled.
"""

import threading
import numpy as np
import sounddevice as sd
from config import SAMPLE_RATE, CHANNELS, BLOCK_SIZE, DTYPE


class AudioRouter:
    """
    Routes audio to separate master and cue output devices.

    Master: receives the crossfaded mix (post-mixer output).
    Cue:    receives a separate mix of decks with cue enabled (pre-fader).

    The cue stream runs independently so the DJ can preview tracks
    in headphones while the master plays on the main speakers.
    """

    def __init__(self):
        self._lock = threading.Lock()

        # Device IDs (None = system default / disabled)
        self.master_device_id: int | None = None
        self.cue_device_id: int | None = None

        # Cue stream
        self._cue_stream: sd.OutputStream | None = None
        self._cue_enabled = False

        # Cue monitoring flags per deck
        self.cue_deck_a: bool = False
        self.cue_deck_b: bool = False

        # Cue volume
        self.cue_volume: float = 1.0

        # Buffer for cue output (written from audio callback)
        self._cue_buffer: np.ndarray | None = None

    def set_master_device(self, device_id: int | None) -> dict:
        """Set the master output device. Requires engine restart."""
        self.master_device_id = device_id
        return self.get_state()

    def set_cue_device(self, device_id: int | None) -> dict:
        """Set the cue output device and start/stop the cue stream."""
        with self._lock:
            # Stop existing cue stream
            self._stop_cue_stream()

            self.cue_device_id = device_id

            if device_id is not None:
                self._start_cue_stream()

        return self.get_state()

    def _start_cue_stream(self) -> None:
        """Start a separate output stream for cue monitoring."""
        try:
            self._cue_stream = sd.OutputStream(
                samplerate=SAMPLE_RATE,
                channels=CHANNELS,
                blocksize=BLOCK_SIZE,
                dtype=DTYPE,
                device=self.cue_device_id,
                callback=self._cue_callback,
            )
            self._cue_stream.start()
            self._cue_enabled = True
            print(f"[Router] Cue stream started on device {self.cue_device_id}")
        except Exception as e:
            print(f"[Router] Failed to start cue stream: {e}")
            self._cue_stream = None
            self._cue_enabled = False

    def _stop_cue_stream(self) -> None:
        """Stop the cue output stream."""
        if self._cue_stream is not None:
            try:
                self._cue_stream.stop()
                self._cue_stream.close()
            except Exception:
                pass
            self._cue_stream = None
            self._cue_enabled = False
            print("[Router] Cue stream stopped")

    def _cue_callback(self, outdata: np.ndarray, frames: int,
                      time_info, status) -> None:
        """Cue output stream callback — plays the cue buffer."""
        if self._cue_buffer is not None and len(self._cue_buffer) >= frames:
            outdata[:] = self._cue_buffer[:frames] * self.cue_volume
        else:
            outdata.fill(0)

    def push_cue(self, frames_a: np.ndarray, frames_b: np.ndarray) -> None:
        """
        Push pre-fader deck audio to the cue output.
        Called from the audio callback — must be non-blocking.

        Mixes whichever decks have cue enabled.
        """
        if not self._cue_enabled:
            return

        cue_mix = np.zeros_like(frames_a)
        if self.cue_deck_a:
            cue_mix += frames_a
        if self.cue_deck_b:
            cue_mix += frames_b

        self._cue_buffer = cue_mix

    def toggle_cue(self, deck_id: str) -> dict:
        """Toggle cue monitoring for a deck."""
        if deck_id.upper() == "A":
            self.cue_deck_a = not self.cue_deck_a
        elif deck_id.upper() == "B":
            self.cue_deck_b = not self.cue_deck_b
        return self.get_state()

    def stop(self) -> None:
        """Stop all routing streams."""
        self._stop_cue_stream()

    def get_state(self) -> dict:
        return {
            "master_device_id": self.master_device_id,
            "cue_device_id": self.cue_device_id,
            "cue_enabled": self._cue_enabled,
            "cue_deck_a": self.cue_deck_a,
            "cue_deck_b": self.cue_deck_b,
            "cue_volume": round(self.cue_volume, 2),
        }
