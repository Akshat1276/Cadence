"""
Cadence DJ System — FastAPI Application Entry Point

Initializes the FastAPI app, mounts routers, configures CORS,
and starts the audio engine on startup.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from audio.engine import AudioEngine
from api.deck_routes import router as deck_router
from config import UPLOAD_DIR, DATA_DIR, EXPORT_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage audio engine lifecycle."""
    # Startup: create directories and start audio engine
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)

    engine = AudioEngine()
    engine.start()
    print("[Cadence] Audio engine started")

    yield

    # Shutdown: stop audio engine
    engine.stop()
    print("[Cadence] Audio engine stopped")


app = FastAPI(
    title="Cadence DJ System",
    description="Real-Time DJ Mixing and Audio Processing API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(deck_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "cadence-dj"}


@app.get("/api/engine/state")
async def get_engine_state():
    """Get the full state of the audio engine."""
    engine = AudioEngine()
    return {"status": "ok", "engine": engine.get_state()}
