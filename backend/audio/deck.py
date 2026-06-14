"""
Cadence DJ System — Deck Module

Each Deck represents an independent audio player that holds a loaded track,
manages playback state, and provides audio frames on demand.
Includes per-deck 3-band EQ, effects chain, cue points, and looping.
"""

import threading
import numpy as np
from enum import Enum
from audio.loader import load_audio_file_stereo
from audio.eq import ThreeBandEQ
from audio.effects import EffectsChain
from audio.bpm import detect_bpm
from audio.tempo import TempoController
from config import SAMPLE_RATE, CHANNELS

# Maximum number of hot cue slots per deck
MAX_CUE_POINTS = 8

# Hot cue colors for UI display
CUE_COLORS = [
    "#ff006e",  # Magenta
    "#00d4ff",  # Cyan
    "#ffd600",  # Yellow
    "#00ff88",  # Green
    "#ff6b35",  # Orange
    "#a855f7",  # Purple
    "#06b6d4",  # Teal
    "#f43f5e",  # Rose
]


class DeckState(str, Enum):
    EMPTY = "empty"
    LOADED = "loaded"
    PLAYING = "playing"
    PAUSED = "paused"


class CuePoint:
    """A named position marker in a track."""

    def __init__(self, slot: int, position: float, name: str = "", color: str = ""):
        self.slot = slot                           # 0-based slot index
        self.position = position                   # Position in seconds
        self.name = name or f"Cue {slot + 1}"     # Display name
        self.color = color or CUE_COLORS[slot % len(CUE_COLORS)]

    def to_dict(self) -> dict:
        return {
            "slot": self.slot,
            "position": round(self.position, 3),
            "name": self.name,
            "color": self.color,
        }


class Loop:
    """Loop region with in/out points."""

    def __init__(self):
        self.enabled: bool = False
        self.in_point: float = 0.0       # Loop start in seconds
        self.out_point: float = 0.0      # Loop end in seconds
        self.in_frame: int = 0           # Pre-computed sample position
        self.out_frame: int = 0          # Pre-computed sample position

    def set_in(self, position_seconds: float) -> None:
        """Set the loop-in point."""
        self.in_point = max(0.0, position_seconds)
        self.in_frame = int(self.in_point * SAMPLE_RATE)

    def set_out(self, position_seconds: float) -> None:
        """Set the loop-out point. Must be after loop-in."""
        if position_seconds > self.in_point:
            self.out_point = position_seconds
            self.out_frame = int(self.out_point * SAMPLE_RATE)

    @property
    def length(self) -> float:
        """Loop length in seconds."""
        return max(0.0, self.out_point - self.in_point)

    @property
    def is_valid(self) -> bool:
        """Check if loop has valid in/out points."""
        return self.out_point > self.in_point and self.length > 0.01

    def to_dict(self) -> dict:
        return {
            "enabled": self.enabled,
            "in_point": round(self.in_point, 3),
            "out_point": round(self.out_point, 3),
            "length": round(self.length, 3),
            "is_valid": self.is_valid,
        }


class Deck:
    """
    A single DJ deck that can load, play, pause, and seek through an audio track.
    Audio frames are read by the engine's audio callback.
    Includes EQ, effects, cue points, and loop processing.
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

        # Per-deck EQ
        self.eq = ThreeBandEQ(SAMPLE_RATE)

        # Per-deck effects chain
        self.effects = EffectsChain(SAMPLE_RATE)

        # Cue points (8 hot cue slots)
        self.cue_points: dict[int, CuePoint] = {}

        # Loop
        self.loop = Loop()

        # BPM / Beat detection
        self.beat_info: dict = {"bpm": 0.0, "beat_times": [], "beat_count": 0,
                                "downbeat_times": []}

        # Tempo controller (playback speed)
        self.tempo = TempoController()

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
            # Reset EQ filter state for new track
            self.eq.low.reset_state()
            self.eq.mid.reset_state()
            self.eq.high.reset_state()
            # Clear cue points and loop for new track
            self.cue_points.clear()
            self.loop = Loop()
            # Reset tempo
            self.tempo.reset()

        # Detect BPM (outside lock — can be slow)
        try:
            self.beat_info = detect_bpm(audio_data)
            self.tempo.original_bpm = self.beat_info["bpm"]
            print(f"[Deck {self.deck_id}] BPM detected: {self.beat_info['bpm']}")
        except Exception as e:
            print(f"[Deck {self.deck_id}] BPM detection failed: {e}")
            self.beat_info = {"bpm": 0.0, "beat_times": [], "beat_count": 0,
                              "downbeat_times": []}

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

    # ─── Cue Point Operations ───────────────────────

    def set_cue(self, slot: int, position: float | None = None,
                name: str = "") -> dict:
        """
        Set a cue point at the given slot (0-7).
        If position is None, uses the current playback position.
        """
        if slot < 0 or slot >= MAX_CUE_POINTS:
            raise ValueError(f"Invalid cue slot: {slot}. Use 0-{MAX_CUE_POINTS - 1}.")

        pos = position if position is not None else self.get_position_seconds()
        self.cue_points[slot] = CuePoint(slot, pos, name)
        return self.get_status()

    def delete_cue(self, slot: int) -> dict:
        """Delete a cue point from a slot."""
        self.cue_points.pop(slot, None)
        return self.get_status()

    def jump_to_cue(self, slot: int) -> dict:
        """Jump playback to a cue point position."""
        cue = self.cue_points.get(slot)
        if cue and self.audio_data is not None:
            target_frame = int(cue.position * SAMPLE_RATE)
            self.cursor = max(0, min(target_frame, self.total_frames - 1))
        return self.get_status()

    # ─── Loop Operations ───────────────────────────

    def set_loop_in(self, position: float | None = None) -> dict:
        """Set loop-in point. Uses current position if None."""
        pos = position if position is not None else self.get_position_seconds()
        self.loop.set_in(pos)
        return self.get_status()

    def set_loop_out(self, position: float | None = None) -> dict:
        """Set loop-out point and activate loop. Uses current position if None."""
        pos = position if position is not None else self.get_position_seconds()
        self.loop.set_out(pos)
        if self.loop.is_valid:
            self.loop.enabled = True
        return self.get_status()

    def toggle_loop(self) -> dict:
        """Toggle loop on/off."""
        if self.loop.is_valid:
            self.loop.enabled = not self.loop.enabled
        return self.get_status()

    def clear_loop(self) -> dict:
        """Clear loop points and disable."""
        self.loop = Loop()
        return self.get_status()

    def halve_loop(self) -> dict:
        """Halve the loop length (move out-point to midpoint)."""
        if self.loop.is_valid:
            mid = self.loop.in_point + self.loop.length / 2.0
            self.loop.set_out(mid)
        return self.get_status()

    def double_loop(self) -> dict:
        """Double the loop length (extend out-point)."""
        if self.loop.is_valid:
            new_out = self.loop.in_point + self.loop.length * 2.0
            if new_out <= self.duration:
                self.loop.set_out(new_out)
        return self.get_status()

    # ─── Audio Processing ──────────────────────────

    def get_frames(self, num_frames: int) -> np.ndarray:
        """
        Read the next chunk of audio frames from this deck.
        Called by the audio engine in the real-time callback.

        Processing chain:
            1. Read raw audio from buffer (with loop + tempo handling)
            2. Resample if speed != 1.0
            3. Apply volume
            4. Apply 3-band EQ
            5. Apply effects chain

        Returns a numpy array of shape (num_frames, channels).
        """
        output = np.zeros((num_frames, CHANNELS), dtype=np.float32)

        if self.state != DeckState.PLAYING or self.audio_data is None:
            return output

        with self._lock:
            # Calculate how many source frames to read for this speed
            speed = self.tempo.speed
            if abs(speed - 1.0) > 0.001:
                source_frames_needed, new_acc = self.tempo.compute_read_frames(num_frames)
            else:
                source_frames_needed = num_frames
                new_acc = 0.0

            # Read source frames (with loop handling)
            raw = np.zeros((source_frames_needed, CHANNELS), dtype=np.float32)

            if self.loop.enabled and self.loop.is_valid:
                frames_written = 0
                while frames_written < source_frames_needed:
                    if self.cursor >= self.loop.out_frame:
                        self.cursor = self.loop.in_frame

                    frames_until_loop_end = self.loop.out_frame - self.cursor
                    frames_needed = source_frames_needed - frames_written
                    frames_to_read = min(frames_needed, frames_until_loop_end)

                    remaining = self.total_frames - self.cursor
                    if remaining <= 0:
                        self.cursor = self.loop.in_frame
                        continue
                    frames_to_read = min(frames_to_read, remaining)

                    if frames_to_read > 0:
                        raw[frames_written:frames_written + frames_to_read] = \
                            self.audio_data[self.cursor:self.cursor + frames_to_read]
                        self.cursor += frames_to_read
                        frames_written += frames_to_read
            else:
                remaining = self.total_frames - self.cursor
                if remaining <= 0:
                    self.state = DeckState.LOADED
                    self.cursor = 0
                    return output

                frames_to_read = min(source_frames_needed, remaining)
                raw[:frames_to_read] = self.audio_data[self.cursor:self.cursor + frames_to_read]
                self.cursor += frames_to_read

            # Resample if speed != 1.0
            if abs(speed - 1.0) > 0.001:
                output = self.tempo.resample_block(raw, num_frames)
                self.tempo._accumulator = new_acc
            else:
                output[:] = raw[:num_frames]

            # 1. Apply volume
            output *= self.volume

            # 2. Apply 3-band EQ
            output = self.eq.process(output)

            # 3. Apply effects chain
            output = self.effects.process(output)

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
            "eq": self.eq.get_state(),
            "effects": self.effects.get_state(),
            "cue_points": [cp.to_dict() for cp in sorted(
                self.cue_points.values(), key=lambda c: c.slot)],
            "loop": self.loop.to_dict(),
            "bpm": self.beat_info.get("bpm", 0.0),
            "beat_count": self.beat_info.get("beat_count", 0),
            "tempo": self.tempo.get_state(),
        }
