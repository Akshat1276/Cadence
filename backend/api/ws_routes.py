"""
Cadence DJ System — WebSocket State Broadcasting

WebSocket endpoint that pushes real-time engine state to connected
frontend clients. Replaces the polling-based approach with push updates.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from audio.engine import AudioEngine
from config import WS_UPDATE_INTERVAL

router = APIRouter(tags=["websocket"])

# Track all connected WebSocket clients
_clients: set[WebSocket] = set()


@router.websocket("/ws/state")
async def websocket_state(ws: WebSocket):
    """
    WebSocket endpoint for real-time engine state updates.
    
    Once connected, the server pushes the full engine state
    (both decks + mixer) at a fixed interval (~20 updates/sec).
    The client doesn't need to send anything — it's a push-only stream.
    """
    await ws.accept()
    _clients.add(ws)
    print(f"[WS] Client connected. Total: {len(_clients)}")

    engine = AudioEngine()

    try:
        while True:
            # Build state snapshot
            state = engine.get_state()
            state_json = json.dumps(state)

            # Push to this client
            await ws.send_text(state_json)

            # Wait before next update
            await asyncio.sleep(WS_UPDATE_INTERVAL)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WS] Error: {e}")
    finally:
        _clients.discard(ws)
        print(f"[WS] Client disconnected. Total: {len(_clients)}")
