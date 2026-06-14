"""
Cadence DJ System — JSON File Storage

Persists track library and playlists to JSON files on disk.
No database needed — simple, lightweight, portable.
"""

import os
import json
from library.models import Track, Playlist
from config import DATA_DIR


TRACKS_FILE = os.path.join(DATA_DIR, "tracks.json")
PLAYLISTS_FILE = os.path.join(DATA_DIR, "playlists.json")


def _ensure_data_dir():
    """Create the data directory if it doesn't exist."""
    os.makedirs(DATA_DIR, exist_ok=True)


def load_tracks() -> list[Track]:
    """Load all tracks from the JSON file."""
    _ensure_data_dir()
    if not os.path.exists(TRACKS_FILE):
        return []
    try:
        with open(TRACKS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [Track(**t) for t in data]
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Storage] Warning: Could not load tracks: {e}")
        return []


def save_tracks(tracks: list[Track]) -> None:
    """Save all tracks to the JSON file."""
    _ensure_data_dir()
    data = [t.model_dump() for t in tracks]
    with open(TRACKS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_playlists() -> list[Playlist]:
    """Load all playlists from the JSON file."""
    _ensure_data_dir()
    if not os.path.exists(PLAYLISTS_FILE):
        return []
    try:
        with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [Playlist(**p) for p in data]
    except (json.JSONDecodeError, Exception) as e:
        print(f"[Storage] Warning: Could not load playlists: {e}")
        return []


def save_playlists(playlists: list[Playlist]) -> None:
    """Save all playlists to the JSON file."""
    _ensure_data_dir()
    data = [p.model_dump() for p in playlists]
    with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
