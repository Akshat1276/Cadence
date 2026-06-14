"""
Cadence DJ System — Deck API Routes

REST endpoints for controlling deck playback:
load, play, pause, stop, seek, status, and waveform data.
"""

import os
import shutil
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException
from pydantic import BaseModel
from audio.engine import AudioEngine
from audio.waveform import generate_waveform_peaks, generate_zoomed_waveform
from config import UPLOAD_DIR

router = APIRouter(prefix="/api/deck", tags=["deck"])

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


class SeekRequest(BaseModel):
    position: float  # seconds


class VolumeRequest(BaseModel):
    volume: float  # 0.0 to 1.0


@router.post("/{deck_id}/load")
async def load_track(deck_id: str, file: UploadFile = File(...)):
    """Upload and load a track onto a deck."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        result = deck.load_track(file_path, track_name=file.filename)
        return {"status": "ok", "deck": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load track: {e}")


@router.post("/{deck_id}/load-local")
async def load_local_track(deck_id: str, file_path: str = Form(...)):
    """Load a track from a local file path onto a deck."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    try:
        result = deck.load_track(file_path)
        return {"status": "ok", "deck": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load track: {e}")


@router.post("/{deck_id}/play")
async def play_deck(deck_id: str):
    """Start or resume playback on a deck."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = deck.play()
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/pause")
async def pause_deck(deck_id: str):
    """Pause playback on a deck."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = deck.pause()
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/stop")
async def stop_deck(deck_id: str):
    """Stop playback and reset cursor."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = deck.stop()
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/seek")
async def seek_deck(deck_id: str, body: SeekRequest):
    """Seek to a specific position in seconds."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = deck.seek(body.position)
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/volume")
async def set_volume(deck_id: str, body: VolumeRequest):
    """Set deck volume (0.0 to 1.0)."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    deck.volume = max(0.0, min(1.0, body.volume))
    return {"status": "ok", "deck": deck.get_status()}


@router.get("/{deck_id}/status")
async def get_deck_status(deck_id: str):
    """Get the current status of a deck."""
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "ok", "deck": deck.get_status()}


@router.get("/{deck_id}/waveform")
async def get_waveform(
    deck_id: str,
    start: float = Query(None, description="Zoom start time in seconds"),
    end: float = Query(None, description="Zoom end time in seconds"),
    peaks: int = Query(None, description="Number of peaks to generate"),
):
    """
    Get waveform peak data for visualization.
    Without start/end params: returns full track overview.
    With start/end params: returns zoomed region.
    """
    engine = AudioEngine()
    try:
        deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if deck.audio_data is None:
        raise HTTPException(status_code=400, detail="No track loaded on this deck")

    if start is not None and end is not None:
        # Zoomed waveform
        waveform = generate_zoomed_waveform(
            deck.audio_data, start, end,
            num_peaks=peaks or 1800
        )
    else:
        # Full overview
        waveform = generate_waveform_peaks(
            deck.audio_data,
            num_peaks=peaks or 1800
        )

    return {"status": "ok", "waveform": waveform}
