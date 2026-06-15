"""
Cadence DJ System — Audio Effects

Real-time audio effects that can be applied per-deck:
  - Low-pass / High-pass filter
  - Reverb (Schroeder-style using delay lines)
  - Delay (echo)
  - Flanger (modulated delay)
  - Bitcrusher (bit depth + sample rate reduction)

Each effect maintains internal state for continuity across audio blocks.
"""

import numpy as np
from scipy.signal import sosfilt, butter
from config import SAMPLE_RATE


class Filter:
    """Resonant low-pass / high-pass filter with variable cutoff."""

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.enabled: bool = False
        self.filter_type: str = "lowpass"    # "lowpass" or "highpass"
        self.cutoff: float = 1000.0          # Hz (20–20000)
        self.resonance: float = 0.707        # Q factor
        self._sos = self._compute_sos()
        self._state: np.ndarray | None = None

    def _compute_sos(self) -> np.ndarray:
        """Compute butterworth filter coefficients."""
        nyq = self.sample_rate / 2.0
        freq = max(20.0, min(self.cutoff, nyq - 1.0))
        btype = "low" if self.filter_type == "lowpass" else "high"
        sos = butter(2, freq / nyq, btype=btype, output="sos")
        return sos

    def set_cutoff(self, cutoff: float) -> None:
        """Set filter cutoff frequency."""
        self.cutoff = max(20.0, min(20000.0, cutoff))
        self._sos = self._compute_sos()
        self._state = None  # Reset state on parameter change

    def set_type(self, filter_type: str) -> None:
        """Set filter type ('lowpass' or 'highpass')."""
        if filter_type in ("lowpass", "highpass"):
            self.filter_type = filter_type
            self._sos = self._compute_sos()
            self._state = None

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply the filter to audio frames."""
        if not self.enabled:
            return audio

        output = np.empty_like(audio, dtype=np.float64)
        
        # Grab local references to avoid thread race conditions with API updates
        current_state = self._state
        sos = self._sos
        
        if current_state is None or len(current_state) != audio.shape[1]:
            current_state = [None] * audio.shape[1]
            
        for ch in range(audio.shape[1]):
            zi = current_state[ch]
            if zi is None or zi.shape[0] != sos.shape[0]:
                zi = np.zeros((sos.shape[0], 2), dtype=np.float64)

            filtered, new_state = sosfilt(
                sos, audio[:, ch].astype(np.float64), zi=zi)
            output[:, ch] = filtered

            current_state[ch] = new_state
            
        self._state = current_state

        return output.astype(np.float32)

    def get_state(self) -> dict:
        return {
            "enabled": self.enabled,
            "type": self.filter_type,
            "cutoff": round(self.cutoff, 1),
            "resonance": round(self.resonance, 3),
        }


class Reverb:
    """Simple Schroeder reverb using parallel comb filters + allpass."""

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.enabled: bool = False
        self.mix: float = 0.3          # Wet/dry mix (0=dry, 1=wet)
        self.decay: float = 0.5        # Decay time factor (0–1)
        self.room_size: float = 0.7    # Room size (affects delay lengths)

        # Comb filter delay lines (4 parallel)
        self._comb_delays = [1557, 1617, 1491, 1422]  # Prime-ish samples
        self._comb_buffers: list[np.ndarray] = []
        self._comb_indices: list[int] = []
        self._init_buffers()

    def _init_buffers(self) -> None:
        """Initialize delay line buffers."""
        self._comb_buffers = []
        self._comb_indices = []
        for delay in self._comb_delays:
            scaled = int(delay * self.room_size)
            self._comb_buffers.append(np.zeros(max(scaled, 1), dtype=np.float32))
            self._comb_indices.append(0)

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply reverb to audio frames."""
        if not self.enabled or self.mix < 0.01:
            return audio

        # Work with mono sum for reverb, then mix back
        mono = np.mean(audio, axis=1)
        wet = np.zeros_like(mono)

        feedback = self.decay * 0.85

        # Parallel comb filters
        for i, (buf, idx) in enumerate(
                zip(self._comb_buffers, self._comb_indices)):
            buf_len = len(buf)
            if buf_len == 0:
                continue
            for s in range(len(mono)):
                delayed = buf[idx % buf_len]
                buf[idx % buf_len] = mono[s] + delayed * feedback
                wet[s] += delayed
                idx += 1
            self._comb_indices[i] = idx % buf_len

        # Normalize by number of comb filters
        wet /= len(self._comb_delays)

        # Mix wet/dry
        dry_gain = 1.0 - self.mix
        wet_gain = self.mix

        output = np.empty_like(audio)
        for ch in range(audio.shape[1]):
            output[:, ch] = audio[:, ch] * dry_gain + wet * wet_gain

        return output

    def get_state(self) -> dict:
        return {
            "enabled": self.enabled,
            "mix": round(self.mix, 2),
            "decay": round(self.decay, 2),
            "room_size": round(self.room_size, 2),
        }


class Delay:
    """Stereo ping-pong delay effect."""

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.enabled: bool = False
        self.time_ms: float = 375.0    # Delay time in ms
        self.feedback: float = 0.4     # Feedback amount (0–0.9)
        self.mix: float = 0.3          # Wet/dry

        # Delay buffer
        max_delay = int(2.0 * sample_rate)  # 2 seconds max
        self._buffer = np.zeros((max_delay, 2), dtype=np.float32)
        self._write_pos = 0

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply delay effect."""
        if not self.enabled or self.mix < 0.01:
            return audio

        delay_samples = int(self.time_ms * self.sample_rate / 1000.0)
        delay_samples = max(1, min(delay_samples, len(self._buffer) - 1))
        buf_len = len(self._buffer)

        output = np.empty_like(audio)
        for s in range(len(audio)):
            # Read from delay line
            read_pos = (self._write_pos - delay_samples) % buf_len
            delayed = self._buffer[read_pos]

            # Write input + feedback to delay line
            self._buffer[self._write_pos] = audio[s] + delayed * self.feedback
            self._write_pos = (self._write_pos + 1) % buf_len

            # Mix
            output[s] = audio[s] * (1.0 - self.mix) + delayed * self.mix

        return output

    def get_state(self) -> dict:
        return {
            "enabled": self.enabled,
            "time_ms": round(self.time_ms, 1),
            "feedback": round(self.feedback, 2),
            "mix": round(self.mix, 2),
        }


class Flanger:
    """Classic flanger effect using a modulated short delay."""

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.enabled: bool = False
        self.rate: float = 0.5         # LFO rate in Hz
        self.depth: float = 0.5        # Modulation depth (0–1)
        self.mix: float = 0.5          # Wet/dry

        # Internal state
        max_delay = int(0.01 * sample_rate)  # 10ms max flange delay
        self._buffer = np.zeros((max_delay + 1, 2), dtype=np.float32)
        self._write_pos = 0
        self._lfo_phase = 0.0

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply flanger effect."""
        if not self.enabled or self.mix < 0.01:
            return audio

        max_delay = len(self._buffer) - 1
        buf_len = len(self._buffer)
        lfo_inc = 2.0 * np.pi * self.rate / self.sample_rate

        output = np.empty_like(audio)
        for s in range(len(audio)):
            # LFO generates a sinusoidal delay modulation
            lfo_val = (np.sin(self._lfo_phase) + 1.0) / 2.0  # 0 to 1
            delay = lfo_val * self.depth * max_delay

            # Fractional delay via linear interpolation
            delay_int = int(delay)
            delay_frac = delay - delay_int

            read_pos1 = (self._write_pos - delay_int) % buf_len
            read_pos2 = (self._write_pos - delay_int - 1) % buf_len

            delayed = self._buffer[read_pos1] * (1.0 - delay_frac) + \
                       self._buffer[read_pos2] * delay_frac

            # Write to buffer
            self._buffer[self._write_pos] = audio[s]
            self._write_pos = (self._write_pos + 1) % buf_len
            self._lfo_phase += lfo_inc

            # Mix
            output[s] = audio[s] * (1.0 - self.mix) + delayed * self.mix

        return output

    def get_state(self) -> dict:
        return {
            "enabled": self.enabled,
            "rate": round(self.rate, 2),
            "depth": round(self.depth, 2),
            "mix": round(self.mix, 2),
        }


class Bitcrusher:
    """Bit depth and sample rate reduction for lo-fi distortion."""

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.enabled: bool = False
        self.bit_depth: int = 8          # Target bit depth (2–16)
        self.downsample: int = 4         # Downsample factor (1–32)

        self._hold_sample = np.zeros(2, dtype=np.float32)
        self._hold_counter = 0

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply bitcrusher effect."""
        if not self.enabled:
            return audio

        output = np.empty_like(audio)
        levels = 2.0 ** self.bit_depth

        for s in range(len(audio)):
            self._hold_counter += 1
            if self._hold_counter >= self.downsample:
                self._hold_counter = 0
                # Quantize to bit depth
                self._hold_sample = np.floor(audio[s] * levels) / levels

            output[s] = self._hold_sample

        return output

    def get_state(self) -> dict:
        return {
            "enabled": self.enabled,
            "bit_depth": self.bit_depth,
            "downsample": self.downsample,
        }


class EffectsChain:
    """
    Ordered chain of audio effects for a single deck.
    Processing order: Filter → EQ → Reverb → Delay → Flanger → Bitcrusher
    (EQ is managed separately on the Deck.)
    """

    def __init__(self, sample_rate: int = SAMPLE_RATE):
        self.filter = Filter(sample_rate)
        self.reverb = Reverb(sample_rate)
        self.delay = Delay(sample_rate)
        self.flanger = Flanger(sample_rate)
        self.bitcrusher = Bitcrusher(sample_rate)

    def process(self, audio: np.ndarray) -> np.ndarray:
        """Apply all enabled effects in order."""
        output = self.filter.process(audio)
        output = self.reverb.process(output)
        output = self.delay.process(output)
        output = self.flanger.process(output)
        output = self.bitcrusher.process(output)
        return output

    def get_state(self) -> dict:
        return {
            "filter": self.filter.get_state(),
            "reverb": self.reverb.get_state(),
            "delay": self.delay.get_state(),
            "flanger": self.flanger.get_state(),
            "bitcrusher": self.bitcrusher.get_state(),
        }
