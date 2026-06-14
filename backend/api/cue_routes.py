"""
Cadence DJ System — Cue Points & Looping API Routes

REST endpoints for managing hot cue points and loop regions per deck.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from audio.engine import AudioEngine

router = APIRouter(prefix="/api/deck", tags=["cue-loop"])


# ─── Request Models ─────────────────────────────────

class SetCueRequest(BaseModel):
    position: Optional[float] = Field(None, description="Position in seconds (None = current)")
    name: str = ""


class SetLoopPointRequest(BaseModel):
    position: Optional[float] = Field(None, description="Position in seconds (None = current)")


# ─── Helpers ────────────────────────────────────────

def _get_deck(deck_id: str):
    engine = AudioEngine()
    try:
        return engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Cue Point Endpoints ──────────────────────────

@router.post("/{deck_id}/cue/{slot}")
async def set_cue_point(deck_id: str, slot: int, body: SetCueRequest):
    """Set a cue point at the given slot (0-7)."""
    deck = _get_deck(deck_id)
    try:
        result = deck.set_cue(slot, body.position, body.name)
        return {"status": "ok", "deck": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{deck_id}/cue/{slot}")
async def delete_cue_point(deck_id: str, slot: int):
    """Delete a cue point from a slot."""
    deck = _get_deck(deck_id)
    result = deck.delete_cue(slot)
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/cue/{slot}/jump")
async def jump_to_cue(deck_id: str, slot: int):
    """Jump playback to a cue point."""
    deck = _get_deck(deck_id)
    result = deck.jump_to_cue(slot)
    return {"status": "ok", "deck": result}


# ─── Loop Endpoints ───────────────────────────────

@router.post("/{deck_id}/loop/in")
async def set_loop_in(deck_id: str, body: SetLoopPointRequest):
    """Set the loop-in point."""
    deck = _get_deck(deck_id)
    result = deck.set_loop_in(body.position)
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/loop/out")
async def set_loop_out(deck_id: str, body: SetLoopPointRequest):
    """Set the loop-out point and activate the loop."""
    deck = _get_deck(deck_id)
    result = deck.set_loop_out(body.position)
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/loop/toggle")
async def toggle_loop(deck_id: str):
    """Toggle the loop on/off."""
    deck = _get_deck(deck_id)
    result = deck.toggle_loop()
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/loop/clear")
async def clear_loop(deck_id: str):
    """Clear loop points and disable looping."""
    deck = _get_deck(deck_id)
    result = deck.clear_loop()
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/loop/halve")
async def halve_loop(deck_id: str):
    """Halve the loop length."""
    deck = _get_deck(deck_id)
    result = deck.halve_loop()
    return {"status": "ok", "deck": result}


@router.post("/{deck_id}/loop/double")
async def double_loop(deck_id: str):
    """Double the loop length."""
    deck = _get_deck(deck_id)
    result = deck.double_loop()
    return {"status": "ok", "deck": result}
