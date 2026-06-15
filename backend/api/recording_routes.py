"""
Cadence DJ System — Recording API Routes

REST endpoints for mix recording: start, stop, pause, resume,
export to different formats, list recordings, and download.
"""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from audio.engine import AudioEngine
from audio.recorder import export_recording, list_recordings

router = APIRouter(prefix="/api/recording", tags=["recording"])


# ─── Request Models ─────────────────────────────────

class StartRecordingRequest(BaseModel):
    name: str = ""


class ExportRequest(BaseModel):
    source_path: str
    format: str = Field(..., pattern=r"^(wav|flac|mp3)$")
    output_name: str = ""


# ─── Recording Control ────────────────────────────

@router.post("/start")
async def start_recording(body: StartRecordingRequest):
    """Start recording the master output."""
    engine = AudioEngine()
    result = engine.recorder.start(body.name)
    return {"status": "ok", "recording": result}


@router.post("/stop")
async def stop_recording():
    """Stop recording and finalize the file."""
    engine = AudioEngine()
    result = engine.recorder.stop()
    return {"status": "ok", "recording": result}


@router.post("/pause")
async def pause_recording():
    """Pause recording."""
    engine = AudioEngine()
    result = engine.recorder.pause()
    return {"status": "ok", "recording": result}


@router.post("/resume")
async def resume_recording():
    """Resume recording."""
    engine = AudioEngine()
    result = engine.recorder.resume()
    return {"status": "ok", "recording": result}


@router.get("/status")
async def recording_status():
    """Get the current recording status."""
    engine = AudioEngine()
    return {"status": "ok", "recording": engine.recorder.get_status()}


# ─── Export ───────────────────────────────────────

@router.post("/export")
async def export_mix(body: ExportRequest):
    """Export a recording to a different format (wav, flac, mp3)."""
    try:
        result = export_recording(body.source_path, body.format, body.output_name)
        return {"status": "ok", "export": result}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Recordings List ─────────────────────────────

@router.get("/list")
async def get_recordings():
    """List all recordings in the export directory."""
    recordings = list_recordings()
    return {"status": "ok", "recordings": recordings, "count": len(recordings)}


# ─── Download ────────────────────────────────────

@router.get("/download/{filename}")
async def download_recording(filename: str):
    """Download a recording file."""
    from config import EXPORT_DIR
    filepath = os.path.join(EXPORT_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    # Determine media type
    ext = os.path.splitext(filename)[1].lower()
    media_types = {
        ".wav": "audio/wav",
        ".flac": "audio/flac",
        ".mp3": "audio/mpeg",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=filename,
    )


# ─── Delete ──────────────────────────────────────

@router.delete("/{filename}")
async def delete_recording(filename: str):
    """Delete a recording file."""
    from config import EXPORT_DIR
    filepath = os.path.join(EXPORT_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filename}")

    os.remove(filepath)
    return {"status": "ok", "deleted": filename}
