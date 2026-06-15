/**
 * Cadence DJ System — Root App Component
 *
 * Assembles the full DJ interface: dual decks, mixer,
 * playback monitor, and track library.
 */

import { useEngineState } from "./hooks/useEngineState";
import { DeckPanel } from "./components/Deck/DeckPanel";
import { Crossfader } from "./components/Mixer/Crossfader";
import { MasterControls } from "./components/Mixer/MasterControls";
import { PlaybackInfo } from "./components/Monitor/PlaybackInfo";
import { TrackList } from "./components/Library/TrackList";
import { PeakMeter } from "./components/Meter/PeakMeter";
import { RecordingPanel } from "./components/Recording/RecordingPanel";

export default function App() {
  const { state, error, connected, refresh } = useEngineState();

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-6 py-3
                      border-b border-border bg-bg-secondary"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full bg-accent-cyan
                           shadow-[0_0_8px_rgba(0,212,255,0.6)]"
            />
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              Cadence
            </h1>
          </div>
          <span className="text-xs text-text-muted font-mono">DJ System</span>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              error
                ? "bg-accent-magenta"
                : connected
                  ? "bg-accent-green"
                  : "bg-accent-yellow"
            }`}
          />
          <span className="text-xs text-text-muted">
            {error
              ? "Disconnected"
              : connected
                ? "Live"
                : "Connecting..."}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 gap-3 overflow-auto">
        {/* Error Banner */}
        {error && (
          <div
            className="p-3 rounded-lg bg-accent-magenta/10 border border-accent-magenta/30
                        text-accent-magenta text-sm"
          >
            <strong>Connection Error:</strong> {error}
            <br />
            <span className="text-xs text-text-muted mt-1 block">
              Make sure the backend is running:{" "}
              <code className="text-accent-cyan">
                uvicorn main:app --reload
              </code>
            </span>
          </div>
        )}

        {/* ─── Playback Monitor ──────────────────────── */}
        <PlaybackInfo
          deckA={state?.deck_a ?? null}
          deckB={state?.deck_b ?? null}
        />

        {/* ─── Dual Deck Layout ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DeckPanel
            deckId="A"
            label="Deck A"
            status={state?.deck_a ?? null}
            onAction={refresh}
            accentColor="#00d4ff"
          />
          <DeckPanel
            deckId="B"
            label="Deck B"
            status={state?.deck_b ?? null}
            onAction={refresh}
            accentColor="#ff006e"
          />
        </div>

        {/* ─── Mixer + Meters Section ────────────────── */}
        <div className="flex items-stretch gap-3">
          {/* Deck A Meter */}
          <PeakMeter
            levels={state?.levels?.deck_a ?? null}
            label="A"
            height={80}
          />

          {/* Mixer Controls */}
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex justify-center">
              <Crossfader
                position={state?.mixer?.crossfader ?? 0.5}
                onAction={refresh}
              />
            </div>
            <MasterControls mixer={state?.mixer ?? null} onAction={refresh} />
          </div>

          {/* Master Meter */}
          <PeakMeter
            levels={state?.levels?.master ?? null}
            label="MST"
            height={80}
          />

          {/* Deck B Meter */}
          <PeakMeter
            levels={state?.levels?.deck_b ?? null}
            label="B"
            height={80}
          />
        </div>

        {/* ─── Recording ───────────────────────────────── */}
        <RecordingPanel
          recording={state?.recording ?? null}
          onAction={refresh}
        />

        {/* ─── Track Library ─────────────────────────── */}
        <TrackList engineState={state} onAction={refresh} />

        {/* Engine Status Footer */}
        <footer
          className="flex items-center justify-center gap-6 py-2
                       text-xs text-text-muted border-t border-border"
        >
          <span>
            Master:{" "}
            <span className="text-accent-purple font-mono font-semibold">
              {state?.mixer
                ? Math.round(state.mixer.master_volume * 100)
                : "--"}
              %
            </span>
          </span>
          <span>
            Crossfader:{" "}
            <span className="text-text-secondary font-mono">
              {state?.mixer?.crossfader?.toFixed(2) ?? "--"}
            </span>
          </span>
          <span>
            Curve:{" "}
            <span className="text-text-secondary">
              {state?.mixer?.crossfader_curve ?? "--"}
            </span>
          </span>
          <span>
            Engine:{" "}
            <span
              className={
                state?.running ? "text-accent-green" : "text-accent-magenta"
              }
            >
              {state?.running ? "Running" : "Stopped"}
            </span>
          </span>
        </footer>
      </main>
    </div>
  );
}
