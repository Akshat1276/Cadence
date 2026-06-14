"""
Cadence DJ System — Track Library Manager

Central manager for the track library and playlists. Handles
importing tracks, scanning directories, and CRUD operations.
"""

import os
from library.models import Track, Playlist
from library.metadata import extract_metadata
from library.storage import load_tracks, save_tracks, load_playlists, save_playlists

# Supported audio file extensions
AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".opus"}


class TrackLibrary:
    """
    Manages the track collection and playlists.
    Loads from disk on init, saves after mutations.
    """

    def __init__(self):
        self.tracks: list[Track] = load_tracks()
        self.playlists: list[Playlist] = load_playlists()

    # ─── Track Operations ───────────────────────────

    def import_file(self, file_path: str) -> Track | None:
        """
        Import a single audio file into the library.
        Extracts metadata and adds it to the collection.
        Returns the Track if successful, None if already exists or invalid.
        """
        file_path = os.path.abspath(file_path)

        # Check if already imported
        if any(t.file_path == file_path for t in self.tracks):
            return None

        # Check extension
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in AUDIO_EXTENSIONS:
            return None

        if not os.path.isfile(file_path):
            return None

        # Extract metadata
        track = extract_metadata(file_path)
        self.tracks.append(track)
        save_tracks(self.tracks)
        return track

    def import_directory(self, dir_path: str) -> list[Track]:
        """
        Recursively scan a directory and import all audio files.
        Returns list of newly imported tracks.
        """
        imported = []
        for root, _dirs, files in os.walk(dir_path):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                track = self.import_file(file_path)
                if track:
                    imported.append(track)
        return imported

    def get_all_tracks(self) -> list[dict]:
        """Get all tracks as display-friendly dicts."""
        return [t.to_display() for t in self.tracks]

    def get_track_by_id(self, track_id: str) -> Track | None:
        """Find a track by its ID."""
        for t in self.tracks:
            if t.id == track_id:
                return t
        return None

    def remove_track(self, track_id: str) -> bool:
        """Remove a track from the library by ID."""
        before = len(self.tracks)
        self.tracks = [t for t in self.tracks if t.id != track_id]
        if len(self.tracks) < before:
            # Also remove from all playlists
            for pl in self.playlists:
                pl.track_ids = [tid for tid in pl.track_ids if tid != track_id]
            save_tracks(self.tracks)
            save_playlists(self.playlists)
            return True
        return False

    def update_track_metadata(self, track_id: str, **kwargs) -> Track | None:
        """Update metadata fields on a track."""
        track = self.get_track_by_id(track_id)
        if not track:
            return None
        for key, value in kwargs.items():
            if hasattr(track, key):
                setattr(track, key, value)
        save_tracks(self.tracks)
        return track

    # ─── Playlist Operations ────────────────────────

    def create_playlist(self, name: str, description: str = "") -> Playlist:
        """Create a new empty playlist."""
        playlist = Playlist(name=name, description=description)
        self.playlists.append(playlist)
        save_playlists(self.playlists)
        return playlist

    def get_all_playlists(self) -> list[dict]:
        """Get all playlists as dicts."""
        return [p.model_dump() for p in self.playlists]

    def get_playlist_by_id(self, playlist_id: str) -> Playlist | None:
        """Find a playlist by its ID."""
        for p in self.playlists:
            if p.id == playlist_id:
                return p
        return None

    def add_track_to_playlist(self, playlist_id: str, track_id: str) -> bool:
        """Add a track to a playlist."""
        playlist = self.get_playlist_by_id(playlist_id)
        if not playlist:
            return False
        if track_id not in playlist.track_ids:
            playlist.track_ids.append(track_id)
            import time
            playlist.updated_at = time.time()
            save_playlists(self.playlists)
        return True

    def remove_track_from_playlist(self, playlist_id: str, track_id: str) -> bool:
        """Remove a track from a playlist."""
        playlist = self.get_playlist_by_id(playlist_id)
        if not playlist or track_id not in playlist.track_ids:
            return False
        playlist.track_ids.remove(track_id)
        import time
        playlist.updated_at = time.time()
        save_playlists(self.playlists)
        return True

    def delete_playlist(self, playlist_id: str) -> bool:
        """Delete a playlist by ID."""
        before = len(self.playlists)
        self.playlists = [p for p in self.playlists if p.id != playlist_id]
        if len(self.playlists) < before:
            save_playlists(self.playlists)
            return True
        return False

    def get_playlist_tracks(self, playlist_id: str) -> list[dict]:
        """Get all tracks in a playlist as display-friendly dicts."""
        playlist = self.get_playlist_by_id(playlist_id)
        if not playlist:
            return []
        tracks = []
        for tid in playlist.track_ids:
            track = self.get_track_by_id(tid)
            if track:
                tracks.append(track.to_display())
        return tracks
