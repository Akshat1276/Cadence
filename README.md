# Cadence — Real-Time DJ Mixing & Audio Processing System

A lightweight digital DJ platform capable of real-time audio processing, mixing, and monitoring.

## Tech Stack

- **Backend**: Python, FastAPI, sounddevice, librosa, NumPy, SciPy
- **Frontend**: React, TypeScript, TailwindCSS v4, Vite

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8000`.

## Features (PR 1)

- [x] Dual-deck audio playback engine
- [x] Play / Pause / Stop / Seek controls
- [x] Per-deck volume control
- [x] Real-time engine state polling
- [x] File upload and audio loading via librosa