/**
 * Cadence DJ System — Root App Component
 * Elite Performance Console Layout (from Stitch)
 *
 * Layout: Fixed Header → Spectrum → Dual Decks → Mixer → Fixed Footer
 */

import { useEngineState } from "./hooks/useEngineState";
import { DeckPanel } from "./components/Deck/DeckPanel";
import { Crossfader } from "./components/Mixer/Crossfader";
import { MasterControls } from "./components/Mixer/MasterControls";
import { TrackList } from "./components/Library/TrackList";
import { PeakMeter } from "./components/Meter/PeakMeter";
import { RecordingPanel } from "./components/Recording/RecordingPanel";
import { SpectrumAnalyzer } from "./components/Spectrum/SpectrumAnalyzer";
import { RoutingPanel } from "./components/Routing/RoutingPanel";

export default function App() {
  const { state, error, connected, refresh } = useEngineState();

  return (
    <div className="h-full flex flex-col bg-surface-base text-on-surface font-sans select-none">
      {/* ═══ Top App Bar (Fixed) ═══ */}
      <header
        className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-14
                   bg-surface-container-lowest/95 backdrop-blur-xl
                   shadow-[0_4px_24px_rgba(0,0,0,0.5)] border-b border-surface-raised"
      >
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-deck-a tracking-tighter leading-none flex items-center gap-3">
            <span className="w-4 h-4 rounded-full bg-deck-a glow-deck-a inline-block" />
            Cadence
          </h1>
          <span className="text-outline text-sm tracking-[0.2em] uppercase font-semibold">
            Pro DJ System
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection Status */}
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span
              className={`w-3 h-3 rounded-full ${
                error
                  ? "bg-alert-critical shadow-[0_0_8px_rgba(255,77,77,0.8)]"
                  : connected
                    ? "bg-active-sync glow-sync"
                    : "bg-accent-yellow"
              }`}
            />
            <span className="text-on-surface tracking-wider uppercase">
              {error ? "Error" : connected ? "Live" : "..."}
            </span>
          </div>

          <div className="h-6 w-px bg-outline-variant" />

          {/* Master Level */}
          <div className="text-right flex flex-col font-mono">
            <span className="text-xs text-outline uppercase tracking-wider">Master</span>
            <span className="text-on-surface text-sm font-bold">
              {state?.mixer
                ? `${Math.round(state.mixer.master_volume * 100)}%`
                : "0.0 dB"}
            </span>
          </div>
        </div>
      </header>

      {/* ═══ Main Workspace ═══ */}
      <main className="flex-1 flex flex-col p-4 gap-4 overflow-auto" style={{ paddingBottom: "220px", marginTop: "56px" }}>
        {/* Error Banner */}
        {error && (
          <div
            className="p-3 rounded-lg bg-alert-critical/10 border border-alert-critical/30
                        text-alert-critical text-sm flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-alert-critical shadow-[0_0_8px_rgba(255,77,77,0.8)]" />
            <div>
              <strong>Connection Error:</strong> {error}
              <br />
              <span className="text-xs text-outline mt-1 block">
                Start backend:{" "}
                <code className="text-deck-a font-mono">
                  uvicorn main:app --reload
                </code>
              </span>
            </div>
          </div>
        )}

        {/* ─── Spectrum Analyzer (Global) ─── */}
        <SpectrumAnalyzer spectrum={state?.spectrum ?? null} height={96} />

        {/* ─── Dual Deck Layout ─── */}
        <section className="flex flex-col gap-4">
          <div className="flex gap-4">
            <DeckPanel
              deckId="A"
              label="A"
              status={state?.deck_a ?? null}
              onAction={refresh}
              accentColor="#00f2ff"
            />
            <DeckPanel
              deckId="B"
              label="B"
              status={state?.deck_b ?? null}
              onAction={refresh}
              accentColor="#ff007f"
            />
          </div>
        </section>

        {/* ─── Mixer & Crossfader Section ─── */}
        <section
          className="bg-surface-container rounded-xl border border-surface-raised
                     flex flex-col justify-center p-6 shadow-lg relative"
          style={{ flexShrink: 0 }}
        >
          <div className="absolute top-3 left-6 text-xs text-outline uppercase tracking-[0.2em] font-bold">
            Mixer
          </div>

          <div className="flex items-center gap-8 pt-6">
            {/* Channel A Meter & Trim */}
            <div className="flex-1 flex items-center justify-end gap-6">
              <MasterControls mixer={state?.mixer ?? null} onAction={refresh} />
              <PeakMeter
                levels={state?.levels?.deck_a ?? null}
                label="A"
                height={64}
              />
            </div>

            {/* Crossfader */}
            <div className="flex-[1.5] flex flex-col items-center px-8 border-x border-outline-variant/30">
              <div className="text-xs text-outline mb-3 uppercase tracking-[0.2em] font-bold">
                Crossfader
              </div>
              <div className="w-full flex items-center gap-4">
                <span className="text-xl font-black text-deck-a glow-deck-a-text">A</span>
                <div className="flex-1">
                  <Crossfader
                    position={state?.mixer?.crossfader ?? 0.5}
                    onAction={refresh}
                  />
                </div>
                <span className="text-xl font-black text-deck-b glow-deck-b-text">B</span>
              </div>
            </div>

            {/* Channel B Meter & Master */}
            <div className="flex-1 flex items-center justify-start gap-6">
              <PeakMeter
                levels={state?.levels?.deck_b ?? null}
                label="B"
                height={64}
              />
              <PeakMeter
                levels={state?.levels?.master ?? null}
                label="MST"
                height={64}
              />
            </div>
          </div>
        </section>
      </main>

      {/* ═══ Footer (Fixed) ═══ */}
      <footer
        className="fixed bottom-0 left-0 w-full z-50 bg-surface-container-highest
                   border-t border-surface-raised flex flex-col
                   shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
      >
        {/* Status Bar */}
        <div
          className="h-10 px-6 flex justify-between items-center text-xs text-outline
                     border-b border-surface-raised bg-surface-container-low
                     font-semibold tracking-wide"
        >
          <div className="flex items-center gap-6">
            {/* Recording */}
            <RecordingPanel
              recording={state?.recording ?? null}
              onAction={refresh}
            />

            {/* Audio Routing */}
            <RoutingPanel
              routing={state?.routing ?? null}
              onAction={refresh}
            />
          </div>

          {/* Engine Stats */}
          <div className="flex items-center gap-6 font-mono text-[11px]">
            <span>
              Master:{" "}
              <span className="text-deck-a font-bold text-sm">
                {state?.mixer
                  ? `${Math.round(state.mixer.master_volume * 100)}%`
                  : "--"}
              </span>
            </span>
            <span>
              Crossfader:{" "}
              <span className="text-on-surface font-bold text-sm">
                {state?.mixer?.crossfader?.toFixed(2) ?? "--"}
              </span>
            </span>
            <span>
              Curve:{" "}
              <span className="text-on-surface">
                {state?.mixer?.crossfader_curve ?? "--"}
              </span>
            </span>
            <span>
              Engine:{" "}
              <span
                className={
                  state?.running
                    ? "text-active-sync glow-sync"
                    : "text-alert-critical"
                }
              >
                {state?.running ? "Running" : "Stopped"}
              </span>
            </span>
          </div>
        </div>

        {/* Library Drawer */}
        <div className="bg-surface-container">
          <TrackList engineState={state} onAction={refresh} />
        </div>
      </footer>
    </div>
  );
}
