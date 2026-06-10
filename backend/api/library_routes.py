"""
Cadence DJ System — Library API Routes

REST endpoints for managing the track library and playlists:
import files/directories, list tracks, CRUD playlists, load tracks to decks.
"""

import os
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from library.manager import TrackLibrary
from audio.engine import AudioEngine
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/library", tags=["library"])

# Singleton library instance
_library: TrackLibrary | None = None


def get_library() -> TrackLibrary:
    """Get or create the singleton TrackLibrary instance."""
    global _library
    if _library is None:
        _library = TrackLibrary()
    return _library


# ─── Track Endpoints ────────────────────────────────


@router.get("/tracks")
async def list_tracks():
    """Get all tracks in the library."""
    lib = get_library()
    return {"status": "ok", "tracks": lib.get_all_tracks(), "count": len(lib.tracks)}


@router.post("/tracks/import")
async def import_track(file: UploadFile = File(...)):
    """Upload and import a track into the library."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    lib = get_library()
    track = lib.import_file(file_path)
    if track is None:
        return {"status": "skipped", "detail": "File already in library or unsupported format"}
    return {"status": "ok", "track": track.to_display()}


class ImportDirRequest(BaseModel):
    path: str


@router.post("/tracks/import-dir")
async def import_directory(body: ImportDirRequest):
    """Scan a local directory and import all audio files."""
    if not os.path.isdir(body.path):
        raise HTTPException(status_code=404, detail=f"Directory not found: {body.path}")

    lib = get_library()
    imported = lib.import_directory(body.path)
    return {
        "status": "ok",
        "imported_count": len(imported),
        "tracks": [t.to_display() for t in imported],
    }


@router.delete("/tracks/{track_id}")
async def remove_track(track_id: str):
    """Remove a track from the library."""
    lib = get_library()
    if lib.remove_track(track_id):
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Track not found")


@router.post("/tracks/{track_id}/load/{deck_id}")
async def load_track_to_deck(track_id: str, deck_id: str):
    """Load a library track onto a deck by track ID."""
    lib = get_library()
    track = lib.get_track_by_id(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    if not os.path.isfile(track.file_path):
        raise HTTPException(status_code=404, detail=f"File missing: {track.file_path}")

    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = deck.load_track(track.file_path, track_name=track.title or track.file_name)
    return {"status": "ok", "deck": result}


# ─── Playlist Endpoints ────────────────────────────


class CreatePlaylistRequest(BaseModel):
    name: str
    description: str = ""


class PlaylistTrackRequest(BaseModel):
    track_id: str


@router.get("/playlists")
async def list_playlists():
    """Get all playlists."""
    lib = get_library()
    return {"status": "ok", "playlists": lib.get_all_playlists()}


@router.post("/playlists")
async def create_playlist(body: CreatePlaylistRequest):
    """Create a new playlist."""
    lib = get_library()
    playlist = lib.create_playlist(body.name, body.description)
    return {"status": "ok", "playlist": playlist.model_dump()}


@router.get("/playlists/{playlist_id}")
async def get_playlist(playlist_id: str):
    """Get a playlist with its tracks."""
    lib = get_library()
    playlist = lib.get_playlist_by_id(playlist_id)
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    tracks = lib.get_playlist_tracks(playlist_id)
    return {"status": "ok", "playlist": playlist.model_dump(), "tracks": tracks}


@router.post("/playlists/{playlist_id}/tracks")
async def add_to_playlist(playlist_id: str, body: PlaylistTrackRequest):
    """Add a track to a playlist."""
    lib = get_library()
    if lib.add_track_to_playlist(playlist_id, body.track_id):
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Playlist or track not found")


@router.delete("/playlists/{playlist_id}/tracks/{track_id}")
async def remove_from_playlist(playlist_id: str, track_id: str):
    """Remove a track from a playlist."""
    lib = get_library()
    if lib.remove_track_from_playlist(playlist_id, track_id):
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Playlist or track not found")


@router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist."""
    lib = get_library()
    if lib.delete_playlist(playlist_id):
        return {"status": "ok"}
    raise HTTPException(status_code=404, detail="Playlist not found")
