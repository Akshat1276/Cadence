"""
Cadence DJ System — EQ & Effects API Routes

REST endpoints for controlling per-deck EQ and effects:
3-band EQ (low/mid/high), filter, reverb, delay, flanger, bitcrusher.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from audio.engine import AudioEngine

router = APIRouter(prefix="/api/effects", tags=["effects"])


# ─── Request Models ─────────────────────────────────

class EQRequest(BaseModel):
    low_db: float = Field(0.0, ge=-12.0, le=12.0)
    mid_db: float = Field(0.0, ge=-12.0, le=12.0)
    high_db: float = Field(0.0, ge=-12.0, le=12.0)


class EQBandRequest(BaseModel):
    gain_db: float = Field(..., ge=-12.0, le=12.0)


class FilterRequest(BaseModel):
    enabled: bool = True
    filter_type: str = "lowpass"
    cutoff: float = Field(1000.0, ge=20.0, le=20000.0)


class ReverbRequest(BaseModel):
    enabled: bool = True
    mix: float = Field(0.3, ge=0.0, le=1.0)
    decay: float = Field(0.5, ge=0.0, le=1.0)
    room_size: float = Field(0.7, ge=0.1, le=2.0)


class DelayRequest(BaseModel):
    enabled: bool = True
    time_ms: float = Field(375.0, ge=10.0, le=2000.0)
    feedback: float = Field(0.4, ge=0.0, le=0.9)
    mix: float = Field(0.3, ge=0.0, le=1.0)


class FlangerRequest(BaseModel):
    enabled: bool = True
    rate: float = Field(0.5, ge=0.05, le=5.0)
    depth: float = Field(0.5, ge=0.0, le=1.0)
    mix: float = Field(0.5, ge=0.0, le=1.0)


class BitcrusherRequest(BaseModel):
    enabled: bool = True
    bit_depth: int = Field(8, ge=2, le=16)
    downsample: int = Field(4, ge=1, le=32)


class ToggleRequest(BaseModel):
    enabled: bool


# ─── Helpers ────────────────────────────────────────

def _get_deck(deck_id: str):
    engine = AudioEngine()
    try:
        return engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── EQ Endpoints ──────────────────────────────────

@router.post("/{deck_id}/eq")
async def set_eq(deck_id: str, body: EQRequest):
    """Set all 3 EQ bands at once."""
    deck = _get_deck(deck_id)
    deck.eq.set_gains(body.low_db, body.mid_db, body.high_db)
    return {"status": "ok", "eq": deck.eq.get_state()}


@router.post("/{deck_id}/eq/low")
async def set_eq_low(deck_id: str, body: EQBandRequest):
    """Set low EQ band gain."""
    deck = _get_deck(deck_id)
    deck.eq.low.set_gain(body.gain_db)
    return {"status": "ok", "eq": deck.eq.get_state()}


@router.post("/{deck_id}/eq/mid")
async def set_eq_mid(deck_id: str, body: EQBandRequest):
    """Set mid EQ band gain."""
    deck = _get_deck(deck_id)
    deck.eq.mid.set_gain(body.gain_db)
    return {"status": "ok", "eq": deck.eq.get_state()}


@router.post("/{deck_id}/eq/high")
async def set_eq_high(deck_id: str, body: EQBandRequest):
    """Set high EQ band gain."""
    deck = _get_deck(deck_id)
    deck.eq.high.set_gain(body.gain_db)
    return {"status": "ok", "eq": deck.eq.get_state()}


@router.post("/{deck_id}/eq/reset")
async def reset_eq(deck_id: str):
    """Reset all EQ bands to 0 dB."""
    deck = _get_deck(deck_id)
    deck.eq.reset()
    return {"status": "ok", "eq": deck.eq.get_state()}


@router.post("/{deck_id}/eq/toggle")
async def toggle_eq(deck_id: str, body: ToggleRequest):
    """Enable/disable EQ processing."""
    deck = _get_deck(deck_id)
    deck.eq.enabled = body.enabled
    return {"status": "ok", "eq": deck.eq.get_state()}


# ─── Filter Endpoints ──────────────────────────────

@router.post("/{deck_id}/filter")
async def set_filter(deck_id: str, body: FilterRequest):
    """Configure the deck filter."""
    deck = _get_deck(deck_id)
    deck.effects.filter.enabled = body.enabled
    deck.effects.filter.set_type(body.filter_type)
    deck.effects.filter.set_cutoff(body.cutoff)
    return {"status": "ok", "filter": deck.effects.filter.get_state()}


# ─── Reverb Endpoints ─────────────────────────────

@router.post("/{deck_id}/reverb")
async def set_reverb(deck_id: str, body: ReverbRequest):
    """Configure the reverb effect."""
    deck = _get_deck(deck_id)
    fx = deck.effects.reverb
    fx.enabled = body.enabled
    fx.mix = body.mix
    fx.decay = body.decay
    fx.room_size = body.room_size
    fx._init_buffers()  # Re-init delay lines for new room size
    return {"status": "ok", "reverb": fx.get_state()}


# ─── Delay Endpoints ──────────────────────────────

@router.post("/{deck_id}/delay")
async def set_delay(deck_id: str, body: DelayRequest):
    """Configure the delay effect."""
    deck = _get_deck(deck_id)
    fx = deck.effects.delay
    fx.enabled = body.enabled
    fx.time_ms = body.time_ms
    fx.feedback = body.feedback
    fx.mix = body.mix
    return {"status": "ok", "delay": fx.get_state()}


# ─── Flanger Endpoints ────────────────────────────

@router.post("/{deck_id}/flanger")
async def set_flanger(deck_id: str, body: FlangerRequest):
    """Configure the flanger effect."""
    deck = _get_deck(deck_id)
    fx = deck.effects.flanger
    fx.enabled = body.enabled
    fx.rate = body.rate
    fx.depth = body.depth
    fx.mix = body.mix
    return {"status": "ok", "flanger": fx.get_state()}


# ─── Bitcrusher Endpoints ─────────────────────────

@router.post("/{deck_id}/bitcrusher")
async def set_bitcrusher(deck_id: str, body: BitcrusherRequest):
    """Configure the bitcrusher effect."""
    deck = _get_deck(deck_id)
    fx = deck.effects.bitcrusher
    fx.enabled = body.enabled
    fx.bit_depth = body.bit_depth
    fx.downsample = body.downsample
    return {"status": "ok", "bitcrusher": fx.get_state()}


# ─── Full Effects State ───────────────────────────

@router.get("/{deck_id}/state")
async def get_effects_state(deck_id: str):
    """Get the full EQ + effects state for a deck."""
    deck = _get_deck(deck_id)
    return {
        "status": "ok",
        "deck_id": deck.deck_id,
        "eq": deck.eq.get_state(),
        "effects": deck.effects.get_state(),
    }
