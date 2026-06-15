"""
Cadence DJ System — Audio Engine

Central audio engine that manages two decks, a mixer, and
drives the real-time audio output via sounddevice.
Computes peak metering, spectrum analysis, mix recording,
and routes audio to master/cue outputs.
"""

import threading
import numpy as np
import sounddevice as sd
from audio.deck import Deck
from audio.mixer import Mixer
from audio.metering import compute_peak_levels
from audio.recorder import MixRecorder
from audio.spectrum import compute_spectrum
from audio.router import AudioRouter
from config import SAMPLE_RATE, CHANNELS, BLOCK_SIZE, DTYPE


class AudioEngine:
    """
    Singleton audio engine managing dual decks, mixer, and real-time output.
    Uses sounddevice's OutputStream with a callback for low-latency playback.
    Includes spectrum analysis, recording, and audio routing.
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

        # Peak metering state (updated in audio callback)
        self.levels_a: dict = {}
        self.levels_b: dict = {}
        self.levels_master: dict = {}

        # Spectrum analyzer state (updated in audio callback)
        self.spectrum_master: dict = {"bands": [], "peak_freq": 0.0}

        # Mix recorder
        self.recorder = MixRecorder()

        # Audio router (master/cue)
        self.router = AudioRouter()

    def _audio_callback(self, outdata: np.ndarray, frames: int,
                        time_info, status) -> None:
        """
        Real-time audio callback invoked by sounddevice.
        Gets frames from both decks, mixes them, computes peak levels
        and spectrum, pushes to recorder and cue output.
        """
        if status:
            print(f"[AudioEngine] Stream status: {status}")

        # Get raw frames from both decks (volume already applied per-deck)
        frames_a = self.deck_a.get_frames(frames)
        frames_b = self.deck_b.get_frames(frames)

        # Compute per-deck peak levels (before mixing)
        self.levels_a = compute_peak_levels(frames_a)
        self.levels_b = compute_peak_levels(frames_b)

        # Push pre-fader audio to cue output
        self.router.push_cue(frames_a, frames_b)

        # Delegate all mixing to the Mixer
        mixed = self.mixer.mix(frames_a, frames_b)

        # Compute master output levels (after mixing)
        self.levels_master = compute_peak_levels(mixed)

        # Compute spectrum (every callback — 32 bands is cheap)
        self.spectrum_master = compute_spectrum(mixed)

        # Push to recorder (non-blocking — just appends to buffer)
        self.recorder.push_block(mixed)

        # Write to output
        outdata[:] = mixed

    def start(self) -> None:
        """Start the audio output stream."""
        if self._running:
            return

        # Use the router's master device if set
        device = self.router.master_device_id

        self._stream = sd.OutputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            blocksize=BLOCK_SIZE,
            dtype=DTYPE,
            device=device,
            callback=self._audio_callback,
        )
        self._stream.start()
        self._running = True
        print(f"[AudioEngine] Started — SR={SAMPLE_RATE}, CH={CHANNELS}, "
              f"Block={BLOCK_SIZE}, Device={device or 'default'}")

    def stop(self) -> None:
        """Stop the audio output stream."""
        # Stop recorder if active
        if self.recorder.state.value != "idle":
            self.recorder.stop()

        # Stop cue routing
        self.router.stop()

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
            "levels": {
                "deck_a": self.levels_a,
                "deck_b": self.levels_b,
                "master": self.levels_master,
            },
            "spectrum": self.spectrum_master,
            "recording": self.recorder.get_status(),
            "routing": self.router.get_state(),
            "running": self._running,
        }
