"""
Cadence DJ System — BPM & Sync API Routes

REST endpoints for tempo control, BPM analysis, and beat sync.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from audio.engine import AudioEngine
from audio.bpm import compute_phase_offset

router = APIRouter(prefix="/api/deck", tags=["bpm-sync"])


# ─── Request Models ─────────────────────────────────

class SpeedRequest(BaseModel):
    speed: float = Field(..., ge=0.5, le=2.0)


class NudgeRequest(BaseModel):
    amount: float = Field(..., ge=-0.1, le=0.1)


class BPMOverrideRequest(BaseModel):
    bpm: float = Field(..., ge=20.0, le=300.0)


# ─── Helpers ────────────────────────────────────────

def _get_deck(deck_id: str):
    engine = AudioEngine()
    try:
        return engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Tempo Control ─────────────────────────────────

@router.post("/{deck_id}/tempo/speed")
async def set_speed(deck_id: str, body: SpeedRequest):
    """Set playback speed (0.5–2.0)."""
    deck = _get_deck(deck_id)
    deck.tempo.set_speed(body.speed)
    return {"status": "ok", "tempo": deck.tempo.get_state()}


@router.post("/{deck_id}/tempo/nudge")
async def nudge_speed(deck_id: str, body: NudgeRequest):
    """Temporarily nudge speed for beat alignment."""
    deck = _get_deck(deck_id)
    deck.tempo.nudge(body.amount)
    return {"status": "ok", "tempo": deck.tempo.get_state()}


@router.post("/{deck_id}/tempo/reset")
async def reset_speed(deck_id: str):
    """Reset speed to 1.0."""
    deck = _get_deck(deck_id)
    deck.tempo.reset()
    return {"status": "ok", "tempo": deck.tempo.get_state()}


# ─── BPM Info ──────────────────────────────────────

@router.get("/{deck_id}/bpm")
async def get_bpm(deck_id: str):
    """Get BPM and beat info for a deck."""
    deck = _get_deck(deck_id)
    return {
        "status": "ok",
        "bpm": deck.beat_info,
        "tempo": deck.tempo.get_state(),
    }


@router.get("/{deck_id}/beats")
async def get_beats(deck_id: str):
    """Get beat positions for waveform overlay."""
    deck = _get_deck(deck_id)
    return {
        "status": "ok",
        "beat_times": deck.beat_info.get("beat_times", []),
        "downbeat_times": deck.beat_info.get("downbeat_times", []),
        "bpm": deck.beat_info.get("bpm", 0.0),
    }


@router.post("/{deck_id}/bpm/override")
async def override_bpm(deck_id: str, body: BPMOverrideRequest):
    """Manually override the detected BPM."""
    deck = _get_deck(deck_id)
    deck.beat_info["bpm"] = body.bpm
    deck.tempo.original_bpm = body.bpm
    return {"status": "ok", "bpm": deck.beat_info["bpm"],
            "tempo": deck.tempo.get_state()}


# ─── Sync ──────────────────────────────────────────

@router.post("/{deck_id}/sync")
async def sync_to_other(deck_id: str):
    """
    Sync this deck's tempo to the other deck's BPM.
    Adjusts playback speed to match the other deck's effective BPM.
    """
    engine = AudioEngine()
    try:
        this_deck = engine.get_deck(deck_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get the other deck
    other_id = "B" if deck_id.upper() == "A" else "A"
    other_deck = engine.get_deck(other_id)

    this_bpm = this_deck.tempo.original_bpm
    other_effective = other_deck.tempo.effective_bpm

    if this_bpm <= 0 or other_effective <= 0:
        raise HTTPException(
            status_code=400,
            detail="Both decks must have detected BPM for sync"
        )

    # Calculate speed to match other deck's effective BPM
    new_speed = other_effective / this_bpm
    new_speed = max(0.5, min(2.0, new_speed))
    this_deck.tempo.set_speed(new_speed)

    return {
        "status": "ok",
        "synced_to": other_id,
        "original_bpm": this_bpm,
        "target_bpm": other_effective,
        "new_speed": round(new_speed, 4),
        "tempo": this_deck.tempo.get_state(),
    }


@router.get("/sync/phase")
async def get_phase_offset():
    """Get the beat phase offset between the two decks."""
    engine = AudioEngine()
    deck_a = engine.deck_a
    deck_b = engine.deck_b

    offset = compute_phase_offset(
        deck_a.beat_info.get("beat_times", []),
        deck_a.get_position_seconds(),
        deck_b.beat_info.get("beat_times", []),
        deck_b.get_position_seconds(),
    )

    return {
        "status": "ok",
        "phase_offset": offset,
        "bpm_a": deck_a.tempo.effective_bpm,
        "bpm_b": deck_b.tempo.effective_bpm,
    }
