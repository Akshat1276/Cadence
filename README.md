<![CDATA[# 🎛️ Cadence — Real-Time DJ Mixing & Audio Processing System

<div align="center">

**A lightweight digital DJ platform capable of real-time audio processing, mixing, monitoring, and recording — built with Python and React.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## 📖 Overview

Cadence is a **full-stack DJ application** that demonstrates real-time audio systems engineering. It processes, mixes, and routes dual audio streams with sub-23ms latency using Python's scientific computing stack (NumPy, SciPy, librosa) for DSP and sounddevice for hardware-level audio I/O. The React frontend provides a professional DJ interface with waveforms, meters, spectrum visualization, and comprehensive controls — all synced via WebSocket at 20 Hz.

**This project focuses on audio systems engineering** — low-latency callback design, DSP filter mathematics, real-time buffer management, and multi-device audio routing — rather than UI polish alone.

---

## ✨ Features

### Core Audio Engine
- **Dual-Deck Playback** — Two independent audio players with play/pause/stop/seek
- **Real-Time Mixing** — Crossfader with 3 curve types (linear, equal-power, hard-cut) + master volume
- **Per-Deck Volume** — Independent volume control for each deck
- **Low-Latency Callback** — 1024-sample blocks at 44.1 kHz (~23ms latency)

### DSP & Effects
- **3-Band Parametric EQ** — Low/Mid/High bands using biquad peaking filters (Audio EQ Cookbook) with Second-Order Sections for numerical stability
- **5 Real-Time Effects** — Each with adjustable parameters:
  - **Filter** — 2nd-order Butterworth (LP/HP) with variable cutoff
  - **Reverb** — Schroeder-style with 4 parallel comb filters
  - **Delay** — Stereo ping-pong with feedback control
  - **Flanger** — LFO-modulated delay line
  - **Bitcrusher** — Sample-rate and bit-depth reduction

### BPM & Beat Sync
- **Automatic BPM Detection** — librosa onset envelope + auto-correlation + dynamic programming beat tracking
- **Tempo Control** — Playback speed adjustment (±50%) with linear-interpolation resampling and fractional sample accumulator
- **Beat Sync** — One-click tempo matching between decks (`speed = other_bpm / this_bpm`)
- **Nudge Controls** — Fine ±0.5% speed adjustment for manual beat alignment

### Performance Features
- **Hot Cue Points** — 8 color-coded slots per deck (set/jump/delete)
- **Loop Engine** — Set in/out points, toggle, halve/double loop length, sample-accurate cursor wrapping
- **Mix Recording** — Non-blocking recording pipeline (callback → ring buffer → writer thread → WAV file)
- **Format Export** — WAV (32-bit float), FLAC (lossless via soundfile), MP3 (VBR via ffmpeg)

### Visualization & Monitoring
- **Interactive Waveforms** — Server-generated peak data rendered on frontend with click-to-seek
- **Peak Metering** — Real-time RMS + peak dBFS per channel (per-deck + master)
- **Spectrum Analyzer** — 32-band FFT with Hann windowing and logarithmic frequency binning (20 Hz – 20 kHz)
- **WebSocket State Push** — Full engine state broadcast at 20 Hz for responsive UI

### Audio Routing
- **Multi-Output Routing** — Separate master (speakers) and cue (headphones) output devices
- **Cue Monitoring** — Pre-fader deck preview in headphones while master plays for audience
- **Device Enumeration** — Lists all available audio output devices via sounddevice

### Library Management
- **Track Import** — Upload audio files (WAV, MP3, FLAC, OGG, AIFF)
- **Metadata Extraction** — ID3/Vorbis tag reading via mutagen (title, artist, album, genre, duration)
- **Playlist System** — Create, rename, delete playlists with drag-to-deck loading
- **JSON Persistence** — File-based storage (no database dependency)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React + TS)                   │
│  Decks │ Mixer │ Waveforms │ Spectrum │ Library │ Meters │
└───────────────────┬──────────────┬──────────────────────┘
                    │ REST API     │ WebSocket (20 Hz)
┌───────────────────┴──────────────┴──────────────────────┐
│                  Backend (FastAPI + Python)              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Audio Engine (Singleton)            │    │
│  │                                                  │    │
│  │  Deck A ──┐                    ┌── Deck B       │    │
│  │    │      │                    │      │         │    │
│  │   EQ    Volume               Volume   EQ       │    │
│  │    │      │                    │      │         │    │
│  │  Effects  │                    │   Effects      │    │
│  │    │      │                    │      │         │    │
│  │    └──────┤     ┌────────┐    ├──────┘         │    │
│  │           ├────▶│ Mixer  │◀───┤                │    │
│  │           │     │(xfader)│    │                │    │
│  │    Cue ◀──┤     └───┬────┘    ├──▶ Cue         │    │
│  │  Router   │         │        │   Router        │    │
│  │           │    ┌────┴────┐   │                │    │
│  │           │    │ Master  │   │                │    │
│  │           │    │ Output  │   │                │    │
│  │           │    └────┬────┘   │                │    │
│  │           │    Spectrum │ Metering │ Recorder  │    │
│  └───────────┴─────────┴───┴──────┴──────────────┘    │
│                                                         │
│  Library Manager │ Metadata │ JSON Storage              │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   🔊 Speakers                    🎧 Headphones
   (Master Out)                   (Cue Out)
```

### Audio Processing Chain (per deck)

```
Raw Audio Buffer → Tempo Resample → Volume → EQ (3-band) → Filter → Reverb → Delay → Flanger → Bitcrusher → Mixer
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.11+, FastAPI, sounddevice, librosa, NumPy, SciPy, soundfile, mutagen |
| **Frontend** | React 19, TypeScript 6, TailwindCSS v4, Vite 8, Axios |
| **Communication** | REST API (FastAPI) + WebSocket (real-time state at 20 Hz) |
| **Audio I/O** | sounddevice (PortAudio wrapper) for low-latency playback |
| **DSP** | NumPy (buffer ops), SciPy (Butterworth/SOS filters), librosa (BPM detection) |
| **Export** | soundfile (WAV/FLAC), ffmpeg (MP3) |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Python** | 3.11+ | Backend runtime |
| **Node.js** | 18+ | Frontend build |
| **ffmpeg** | Any | MP3 export (optional) |
| **Audio Device** | Any | Speakers/headphones for playback |

### 1. Clone the Repository

```bash
git clone https://github.com/Akshat1276/Cadence.git
cd Cadence
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. You can verify with:
```bash
curl http://localhost:8000/api/health
# → {"status": "ok", "service": "cadence-dj"}
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend runs at **http://localhost:5173** and automatically proxies API requests to the backend.

### 4. Using Cadence

1. Open **http://localhost:5173** in your browser
2. Click **Import Folder** in the Track Library to add audio files
3. Click **A** or **B** next to a track to load it onto a deck
4. Press **▶ Play** on each deck
5. Use the **crossfader** to blend between decks
6. Adjust **EQ**, **effects**, **tempo**, and **loops** as desired
7. Click **● REC** to record your mix

---

## 📁 Project Structure

```
Cadence/
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── config.py                  # Global settings (sample rate, block size)
│   ├── requirements.txt           # Python dependencies
│   ├── audio/
│   │   ├── engine.py              # Singleton audio engine (manages everything)
│   │   ├── deck.py                # Deck: load, play, seek, cues, loops, tempo
│   │   ├── mixer.py               # Crossfader + master volume
│   │   ├── loader.py              # FFmpeg/librosa audio file decoding
│   │   ├── eq.py                  # 3-band parametric EQ (biquad filters)
│   │   ├── effects.py             # Effects chain (filter/reverb/delay/flanger/bitcrusher)
│   │   ├── bpm.py                 # BPM detection via librosa beat tracker
│   │   ├── tempo.py               # Playback speed with resampling
│   │   ├── metering.py            # RMS + peak level computation
│   │   ├── waveform.py            # Waveform peak generation for display
│   │   ├── spectrum.py            # FFT spectrum analyzer (32 bands)
│   │   ├── recorder.py            # Mix recording + format export
│   │   ├── router.py              # Master/cue output routing
│   │   └── devices.py             # Audio device enumeration
│   ├── api/
│   │   ├── deck_routes.py         # Deck control endpoints
│   │   ├── mixer_routes.py        # Mixer/crossfader endpoints
│   │   ├── effects_routes.py      # EQ + effects endpoints
│   │   ├── cue_routes.py          # Hot cue + loop endpoints
│   │   ├── sync_routes.py         # BPM/tempo/sync endpoints
│   │   ├── recording_routes.py    # Recording control + export
│   │   ├── device_routes.py       # Device selection + routing
│   │   ├── library_routes.py      # Track library CRUD
│   │   └── ws_routes.py           # WebSocket state broadcast
│   └── library/
│       ├── manager.py             # Track library manager
│       ├── metadata.py            # ID3/Vorbis tag extraction
│       ├── models.py              # Track/Playlist data models
│       └── storage.py             # JSON file persistence
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx                # Root layout (dual decks, mixer, spectrum)
│       ├── main.tsx               # React entry point
│       ├── style.css              # TailwindCSS v4 design system
│       ├── api/
│       │   └── client.ts          # Axios REST client + TypeScript types
│       ├── hooks/
│       │   └── useEngineState.ts  # WebSocket state hook (20 Hz updates)
│       └── components/
│           ├── Deck/              # DeckPanel, TransportControls
│           ├── Mixer/             # Crossfader, MasterControls
│           ├── Waveform/          # WaveformDisplay
│           ├── EQ/                # EQControls (3-band sliders)
│           ├── Effects/           # EffectsPanel (5 effects with params)
│           ├── Cue/               # HotCues (8 pads), LoopControls
│           ├── Sync/              # TempoSync (BPM + speed slider)
│           ├── Meter/             # PeakMeter (LED-style L/R)
│           ├── Spectrum/          # SpectrumAnalyzer (canvas FFT bars)
│           ├── Recording/         # RecordingPanel (REC/stop/export)
│           ├── Routing/           # RoutingPanel (device selector + cue)
│           ├── Library/           # TrackList, TrackRow, ImportButton
│           └── Monitor/           # PlaybackInfo
└── README.md
```

---

## 🔌 API Reference

### Deck Control
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deck/{id}/load` | Load audio file (multipart upload) |
| POST | `/api/deck/{id}/play` | Start playback |
| POST | `/api/deck/{id}/pause` | Pause playback |
| POST | `/api/deck/{id}/stop` | Stop and reset |
| POST | `/api/deck/{id}/seek` | Seek to position (seconds) |
| POST | `/api/deck/{id}/volume` | Set volume (0.0–1.0) |
| GET | `/api/deck/{id}/status` | Get deck state |
| GET | `/api/deck/{id}/waveform` | Get waveform peak data |

### Mixer
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mixer/crossfader` | Set crossfader (0.0–1.0) |
| POST | `/api/mixer/master-volume` | Set master volume |
| POST | `/api/mixer/crossfader-curve` | Set curve type |

### EQ & Effects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/effects/{id}/eq` | Set 3-band EQ gains |
| POST | `/api/effects/{id}/filter` | Set LP/HP filter |
| POST | `/api/effects/{id}/reverb` | Set reverb params |
| POST | `/api/effects/{id}/delay` | Set delay params |
| POST | `/api/effects/{id}/flanger` | Set flanger params |
| POST | `/api/effects/{id}/bitcrusher` | Set bitcrusher params |

### Cue Points & Loops
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deck/{id}/cue/{slot}` | Set hot cue |
| DELETE | `/api/deck/{id}/cue/{slot}` | Delete hot cue |
| POST | `/api/deck/{id}/cue/{slot}/jump` | Jump to cue |
| POST | `/api/deck/{id}/loop/in` | Set loop-in point |
| POST | `/api/deck/{id}/loop/out` | Set loop-out point |
| POST | `/api/deck/{id}/loop/toggle` | Toggle loop |
| POST | `/api/deck/{id}/loop/halve` | Halve loop length |
| POST | `/api/deck/{id}/loop/double` | Double loop length |

### BPM & Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/deck/{id}/bpm` | Get detected BPM |
| GET | `/api/deck/{id}/beats` | Get beat timestamps |
| POST | `/api/deck/{id}/tempo/speed` | Set playback speed |
| POST | `/api/deck/{id}/tempo/nudge` | Nudge speed ±0.5% |
| POST | `/api/deck/{id}/sync` | Sync to other deck's BPM |

### Recording
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recording/start` | Start recording |
| POST | `/api/recording/stop` | Stop and finalize |
| POST | `/api/recording/pause` | Pause recording |
| POST | `/api/recording/export` | Export to FLAC/MP3 |
| GET | `/api/recording/list` | List recordings |
| GET | `/api/recording/download/{file}` | Download recording |

### Routing & Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List output devices |
| POST | `/api/devices/master` | Set master device |
| POST | `/api/devices/cue` | Set cue device |
| POST | `/api/deck/{id}/cue/toggle` | Toggle cue monitor |

### Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/engine/state` | Full engine state |
| GET | `/api/health` | Health check |
| WS | `/ws/state` | Real-time state (20 Hz) |

---

## 🧪 Testing the System

### Quick Smoke Test

```bash
# 1. Health check
curl http://localhost:8000/api/health

# 2. List audio devices
curl http://localhost:8000/api/devices

# 3. Check engine state
curl http://localhost:8000/api/engine/state

# 4. Load a track (replace with your audio file path)
curl -X POST http://localhost:8000/api/deck/A/load \
  -F "file=@/path/to/song.mp3"

# 5. Play
curl -X POST http://localhost:8000/api/deck/A/play

# 6. Check BPM was detected
curl http://localhost:8000/api/deck/A/bpm
```

### Supported Audio Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| WAV | `.wav` | Uncompressed, best quality |
| MP3 | `.mp3` | Most common, lossy |
| FLAC | `.flac` | Lossless compressed |
| OGG Vorbis | `.ogg` | Open-source lossy |
| AIFF | `.aiff` | Apple lossless |

---

## 🎯 Design Decisions & Assumptions

### Audio Engine
- **Singleton pattern** for the AudioEngine ensures a single audio stream and consistent state
- **1024-sample block size** balances latency (~23ms) with CPU efficiency
- **44.1 kHz sample rate** (CD quality) — standard for DJ software
- All audio processed as **32-bit float** to prevent clipping during mixing

### DSP Choices
- **Biquad filters via Audio EQ Cookbook** formulas — industry standard, numerically stable with SOS (Second-Order Sections)
- **Schroeder reverb** (4 comb + 2 allpass) — lightweight, suitable for real-time processing
- **Linear interpolation resampling** for tempo changes — good quality/performance tradeoff

### Non-Blocking Recording
- Audio callback must complete within 23ms or audio glitches occur
- Recording uses a **3-stage pipeline**: callback → thread-safe buffer → background writer thread
- `push_block()` takes ~1μs (just a list append), giving a **23,000× safety margin**

### BPM Detection
- Runs **outside the audio lock** on track load (takes 1–5 seconds)
- Uses librosa's 3-stage pipeline: onset strength → auto-correlation → dynamic programming
- Beat grid assumes **4/4 time** (standard for dance/electronic music)

---

## 🔮 Future Enhancements

- **Beatmatching Overlay** — Visual beat grid on waveforms for alignment
- **Quantized Cue Points** — Snap cues to nearest beat
- **BPM-Synced Loops** — Loop lengths tied to beat grid (1/2/4/8 bars)
- **Key Detection** — Harmonic mixing suggestions using Camelot wheel
- **MIDI Controller Support** — Map hardware DJ controllers to API endpoints
- **Session Persistence** — Save/load full DJ session state
- **Pitch-Independent Tempo** — Time-stretching without pitch shift (phase vocoder)
- **Crossfader MIDI Learn** — Assign any parameter to external MIDI CC
- **Rust DSP Backend** — Offload CPU-intensive DSP to compiled module for lower latency

---

## 📜 License

This project was built as part of the **GDSC Open Source Project** initiative.

---

<div align="center">
  <strong>Built with 🎵 by the Cadence team</strong>
</div>
]]>