"""
Cadence DJ System — Mixer API Routes

REST endpoints for controlling the mixer: crossfader, master volume,
per-deck gain trim, and crossfader curve selection.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from audio.engine import AudioEngine

router = APIRouter(prefix="/api/mixer", tags=["mixer"])


class CrossfaderRequest(BaseModel):
    position: float = Field(..., ge=0.0, le=1.0, description="0.0=full A, 1.0=full B")


class MasterVolumeRequest(BaseModel):
    volume: float = Field(..., ge=0.0, le=1.0, description="Master output volume")


class GainRequest(BaseModel):
    gain_db: float = Field(..., ge=-12.0, le=12.0, description="Gain trim in dB")


class CrossfaderCurveRequest(BaseModel):
    curve: str = Field(..., description="Curve type: linear, constant_power, sharp")


@router.post("/crossfader")
async def set_crossfader(body: CrossfaderRequest):
    """Set crossfader position (0.0 = full Deck A, 1.0 = full Deck B)."""
    engine = AudioEngine()
    engine.mixer.crossfader = body.position
    return {"status": "ok", "mixer": engine.mixer.get_state()}


@router.post("/master-volume")
async def set_master_volume(body: MasterVolumeRequest):
    """Set master output volume (0.0 to 1.0)."""
    engine = AudioEngine()
    engine.mixer.master_volume = body.volume
    return {"status": "ok", "mixer": engine.mixer.get_state()}


@router.post("/gain/{deck_id}")
async def set_gain(deck_id: str, body: GainRequest):
    """Set per-deck gain trim in dB (-12 to +12)."""
    engine = AudioEngine()
    deck_id = deck_id.upper()
    if deck_id == "A":
        engine.mixer.gain_a_db = body.gain_db
    elif deck_id == "B":
        engine.mixer.gain_b_db = body.gain_db
    else:
        return {"status": "error", "detail": "Invalid deck ID. Use 'A' or 'B'."}
    return {"status": "ok", "mixer": engine.mixer.get_state()}


@router.post("/crossfader-curve")
async def set_crossfader_curve(body: CrossfaderCurveRequest):
    """Set crossfader curve type (linear, constant_power, sharp)."""
    valid_curves = ["linear", "constant_power", "sharp"]
    if body.curve not in valid_curves:
        return {"status": "error", "detail": f"Invalid curve. Choose from: {valid_curves}"}
    engine = AudioEngine()
    engine.mixer.crossfader_curve = body.curve
    return {"status": "ok", "mixer": engine.mixer.get_state()}


@router.get("/state")
async def get_mixer_state():
    """Get the full mixer state."""
    engine = AudioEngine()
    return {"status": "ok", "mixer": engine.mixer.get_state()}
