"""
Cadence DJ System — Mix Recorder

Records the master output in real-time by capturing audio blocks
from the audio callback. Supports pause/resume and exports to
WAV, MP3, and FLAC formats via soundfile and subprocess (ffmpeg).
"""

import os
import time
import threading
import numpy as np
import soundfile as sf
from enum import Enum
from config import SAMPLE_RATE, CHANNELS, EXPORT_DIR


class RecordingState(str, Enum):
    IDLE = "idle"
    RECORDING = "recording"
    PAUSED = "paused"


class MixRecorder:
    """
    Records the master audio output to a file.

    Architecture:
        - The audio callback pushes blocks into a thread-safe buffer.
        - A background writer thread drains the buffer to disk.
        - This ensures recording never blocks the real-time callback.

    Recording pipeline:
        Audio Callback → ring buffer → Writer Thread → WAV file on disk
    """

    def __init__(self):
        self.state = RecordingState.IDLE
        self._lock = threading.Lock()

        # Recording metadata
        self.recording_name: str = ""
        self.start_time: float = 0.0
        self.elapsed_seconds: float = 0.0

        # Buffer for audio blocks (list of numpy arrays)
        self._buffer: list[np.ndarray] = []
        self._buffer_lock = threading.Lock()

        # Output file
        self._output_path: str = ""
        self._sf_file: sf.SoundFile | None = None

        # Writer thread
        self._writer_thread: threading.Thread | None = None
        self._writer_running = False

        # Stats
        self.total_samples: int = 0
        self.file_size_bytes: int = 0

    def start(self, name: str = "") -> dict:
        """
        Start recording the master output.

        Args:
            name: Optional recording name. Defaults to timestamp.
        """
        with self._lock:
            if self.state == RecordingState.RECORDING:
                return self.get_status()

            # Generate filename
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            self.recording_name = name or f"mix_{timestamp}"
            safe_name = self.recording_name.replace(" ", "_").replace("/", "_")
            self._output_path = os.path.join(EXPORT_DIR, f"{safe_name}.wav")

            # Ensure export directory exists
            os.makedirs(EXPORT_DIR, exist_ok=True)

            # Open WAV file for writing
            self._sf_file = sf.SoundFile(
                self._output_path,
                mode="w",
                samplerate=SAMPLE_RATE,
                channels=CHANNELS,
                format="WAV",
                subtype="FLOAT",
            )

            # Reset state
            self._buffer.clear()
            self.total_samples = 0
            self.file_size_bytes = 0
            self.start_time = time.time()
            self.elapsed_seconds = 0.0

            # Start writer thread
            self._writer_running = True
            self._writer_thread = threading.Thread(
                target=self._writer_loop, daemon=True, name="RecorderWriter"
            )
            self._writer_thread.start()

            self.state = RecordingState.RECORDING
            print(f"[Recorder] Started: {self._output_path}")
            return self.get_status()

    def stop(self) -> dict:
        """Stop recording, flush buffer, and close the file."""
        with self._lock:
            if self.state == RecordingState.IDLE:
                return self.get_status()

            self.state = RecordingState.IDLE

            # Stop writer thread
            self._writer_running = False
            if self._writer_thread and self._writer_thread.is_alive():
                self._writer_thread.join(timeout=5.0)

            # Flush remaining buffer
            self._flush_buffer()

            # Close file
            if self._sf_file is not None:
                self._sf_file.close()
                self._sf_file = None

            # Update file size
            if os.path.exists(self._output_path):
                self.file_size_bytes = os.path.getsize(self._output_path)

            self.elapsed_seconds = time.time() - self.start_time
            print(f"[Recorder] Stopped. Duration: {self.elapsed_seconds:.1f}s, "
                  f"Size: {self.file_size_bytes / 1024 / 1024:.1f}MB")
            return self.get_status()

    def pause(self) -> dict:
        """Pause recording (stop capturing blocks)."""
        with self._lock:
            if self.state == RecordingState.RECORDING:
                self.state = RecordingState.PAUSED
                self.elapsed_seconds = time.time() - self.start_time
                print("[Recorder] Paused")
            return self.get_status()

    def resume(self) -> dict:
        """Resume recording."""
        with self._lock:
            if self.state == RecordingState.PAUSED:
                self.state = RecordingState.RECORDING
                print("[Recorder] Resumed")
            return self.get_status()

    def push_block(self, audio: np.ndarray) -> None:
        """
        Push an audio block to the recording buffer.
        Called from the audio callback — MUST be non-blocking.
        """
        if self.state != RecordingState.RECORDING:
            return

        # Copy to avoid reference issues with the audio callback buffer
        with self._buffer_lock:
            self._buffer.append(audio.copy())

    def _writer_loop(self) -> None:
        """Background thread that writes buffered audio to disk."""
        while self._writer_running:
            self._flush_buffer()
            time.sleep(0.05)  # 50ms write interval

    def _flush_buffer(self) -> None:
        """Write all buffered blocks to the WAV file."""
        with self._buffer_lock:
            blocks = list(self._buffer)
            self._buffer.clear()

        if not blocks or self._sf_file is None:
            return

        for block in blocks:
            self._sf_file.write(block)
            self.total_samples += block.shape[0]

    def get_duration(self) -> float:
        """Get recording duration in seconds."""
        if self.state == RecordingState.IDLE:
            return self.elapsed_seconds
        return time.time() - self.start_time

    def get_status(self) -> dict:
        """Get the current recording status."""
        return {
            "state": self.state.value,
            "name": self.recording_name,
            "duration": round(self.get_duration(), 1),
            "file_path": self._output_path if self.state != RecordingState.IDLE else "",
            "total_samples": self.total_samples,
            "file_size_mb": round(self.file_size_bytes / 1024 / 1024, 2)
                            if self.file_size_bytes > 0 else 0.0,
        }


def export_recording(source_path: str, output_format: str,
                     output_name: str = "") -> dict:
    """
    Export a WAV recording to a different format.

    Supported formats: wav, flac, mp3 (mp3 requires ffmpeg).

    Args:
        source_path: Path to the source WAV file.
        output_format: Target format ('wav', 'flac', 'mp3').
        output_name: Optional output filename (without extension).

    Returns:
        Dict with export path, format, and file size.
    """
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"Source file not found: {source_path}")

    output_format = output_format.lower()
    if output_format not in ("wav", "flac", "mp3"):
        raise ValueError(f"Unsupported format: {output_format}. Use wav, flac, or mp3.")

    # Generate output path
    base_name = output_name or os.path.splitext(os.path.basename(source_path))[0]
    output_path = os.path.join(EXPORT_DIR, f"{base_name}.{output_format}")

    if output_format == "wav":
        # Already WAV — just copy or return the path
        if os.path.abspath(source_path) != os.path.abspath(output_path):
            import shutil
            shutil.copy2(source_path, output_path)
        return _export_result(output_path, output_format)

    elif output_format == "flac":
        # Use soundfile for lossless FLAC conversion
        data, sr = sf.read(source_path, dtype="float32")
        sf.write(output_path, data, sr, format="FLAC", subtype="PCM_16")
        return _export_result(output_path, output_format)

    elif output_format == "mp3":
        # Use ffmpeg for MP3 encoding
        import subprocess
        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-i", source_path,
                    "-codec:a", "libmp3lame",
                    "-qscale:a", "2",  # High quality VBR (~190kbps)
                    output_path,
                ],
                capture_output=True, text=True, timeout=120,
            )
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg error: {result.stderr[:500]}")
            return _export_result(output_path, output_format)
        except FileNotFoundError:
            raise RuntimeError(
                "ffmpeg not found. Install ffmpeg to export MP3. "
                "Download from https://ffmpeg.org/download.html"
            )

    return {"error": f"Unknown format: {output_format}"}


def _export_result(path: str, fmt: str) -> dict:
    """Build export result dict."""
    size = os.path.getsize(path) if os.path.exists(path) else 0
    return {
        "path": path,
        "format": fmt,
        "file_size_mb": round(size / 1024 / 1024, 2),
        "filename": os.path.basename(path),
    }


def list_recordings() -> list[dict]:
    """List all recordings in the export directory."""
    if not os.path.exists(EXPORT_DIR):
        return []

    recordings = []
    for filename in sorted(os.listdir(EXPORT_DIR)):
        filepath = os.path.join(EXPORT_DIR, filename)
        if os.path.isfile(filepath):
            ext = os.path.splitext(filename)[1].lower()
            if ext in (".wav", ".flac", ".mp3"):
                size = os.path.getsize(filepath)
                # Estimate duration from file size for WAV
                duration = 0.0
                if ext == ".wav":
                    try:
                        info = sf.info(filepath)
                        duration = info.duration
                    except Exception:
                        duration = size / (SAMPLE_RATE * CHANNELS * 4)  # rough estimate

                recordings.append({
                    "filename": filename,
                    "path": filepath,
                    "format": ext[1:],
                    "file_size_mb": round(size / 1024 / 1024, 2),
                    "duration": round(duration, 1),
                })

    return recordings
