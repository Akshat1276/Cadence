"""
Cadence DJ System — Audio Device & Routing API Routes

REST endpoints for audio device selection, cue monitoring,
and spectrum analyzer data.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from audio.engine import AudioEngine
from audio.devices import list_output_devices
from audio.spectrum import get_band_frequencies

router = APIRouter(prefix="/api", tags=["devices-routing"])


# ─── Request Models ─────────────────────────────────

class DeviceRequest(BaseModel):
    device_id: Optional[int] = None


class CueVolumeRequest(BaseModel):
    volume: float = Field(..., ge=0.0, le=2.0)


# ─── Device Endpoints ──────────────────────────────

@router.get("/devices")
async def get_devices():
    """List all available audio output devices."""
    devices = list_output_devices()
    return {"status": "ok", "devices": devices, "count": len(devices)}


@router.post("/devices/master")
async def set_master_device(body: DeviceRequest):
    """Set the master output device (requires engine restart)."""
    engine = AudioEngine()
    result = engine.router.set_master_device(body.device_id)
    return {"status": "ok", "routing": result,
            "message": "Restart engine to apply master device change"}


@router.post("/devices/cue")
async def set_cue_device(body: DeviceRequest):
    """Set the cue output device and start cue stream."""
    engine = AudioEngine()
    result = engine.router.set_cue_device(body.device_id)
    return {"status": "ok", "routing": result}


# ─── Cue Monitoring ───────────────────────────────

@router.post("/deck/{deck_id}/cue/toggle")
async def toggle_cue(deck_id: str):
    """Toggle cue monitoring for a deck."""
    engine = AudioEngine()
    result = engine.router.toggle_cue(deck_id)
    return {"status": "ok", "routing": result}


@router.post("/cue/volume")
async def set_cue_volume(body: CueVolumeRequest):
    """Set cue output volume."""
    engine = AudioEngine()
    engine.router.cue_volume = body.volume
    return {"status": "ok", "routing": engine.router.get_state()}


# ─── Routing State ────────────────────────────────

@router.get("/routing/state")
async def get_routing_state():
    """Get the current audio routing state."""
    engine = AudioEngine()
    return {"status": "ok", "routing": engine.router.get_state()}


# ─── Spectrum ─────────────────────────────────────

@router.get("/spectrum/bands")
async def get_spectrum_bands():
    """Get the current spectrum analyzer band frequencies."""
    freqs = get_band_frequencies()
    return {"status": "ok", "frequencies": freqs, "count": len(freqs)}
