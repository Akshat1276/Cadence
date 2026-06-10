"""
Cadence DJ System — Library Data Models

Pydantic models for tracks and playlists used across the
library system, API routes, and storage layer.
"""

from pydantic import BaseModel, Field
from typing import Optional
import uuid
import time


class Track(BaseModel):
    """Represents a single audio track in the library."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = ""
    artist: str = ""
    album: str = ""
    genre: str = ""
    duration: float = 0.0          # seconds
    bpm: Optional[float] = None    # beats per minute (detected later)
    key: Optional[str] = None      # musical key (detected later)
    file_path: str = ""
    file_name: str = ""
    file_size: int = 0             # bytes
    sample_rate: int = 44100
    added_at: float = Field(default_factory=time.time)

    def to_display(self) -> dict:
        """Return a display-friendly dict for the frontend."""
        return {
            "id": self.id,
            "title": self.title or self.file_name,
            "artist": self.artist or "Unknown",
            "album": self.album,
            "genre": self.genre,
            "duration": round(self.duration, 2),
            "bpm": round(self.bpm, 1) if self.bpm else None,
            "key": self.key,
            "file_path": self.file_path,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "added_at": self.added_at,
        }


class Playlist(BaseModel):
    """Represents a named playlist containing track references."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    description: str = ""
    track_ids: list[str] = Field(default_factory=list)
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
