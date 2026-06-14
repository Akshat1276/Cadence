/**
 * Cadence DJ System — Tempo & Sync Controls
 *
 * Tempo slider (±50%), BPM display, nudge buttons,
 * and a sync button to match the other deck's BPM.
 */

import type { DeckStatus } from "../../api/client";
import { setSpeed, nudgeSpeed, resetSpeed, syncDeck } from "../../api/client";

interface TempoSyncProps {
  deckId: string;
  status: DeckStatus | null;
  accentColor: string;
  onAction: () => void;
}

export function TempoSync({
  deckId,
  status,
  accentColor,
  onAction,
}: TempoSyncProps) {
  const bpm = status?.bpm ?? 0;
  const speed = status?.tempo?.speed ?? 1.0;
  const effectiveBpm = status?.tempo?.effective_bpm ?? 0;
  const speedPercent = ((speed - 1.0) * 100).toFixed(1);
  const speedLabel = speed >= 1.0 ? `+${speedPercent}` : speedPercent;

  const handleSpeed = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    await setSpeed(deckId, val);
    onAction();
  };

  const handleNudge = async (amount: number) => {
    await nudgeSpeed(deckId, amount);
    onAction();
  };

  const handleReset = async () => {
    await resetSpeed(deckId);
    onAction();
  };

  const handleSync = async () => {
    try {
      await syncDeck(deckId);
      onAction();
    } catch {
      console.warn("Sync failed — other deck may not have BPM");
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
          Tempo
        </span>
        {/* BPM Display */}
        <div className="flex items-center gap-1">
          <span
            className="text-sm font-mono font-bold"
            style={{ color: accentColor }}
          >
            {effectiveBpm > 0 ? effectiveBpm.toFixed(1) : "--"}
          </span>
          <span className="text-[9px] text-text-muted">BPM</span>
        </div>
      </div>

      {/* Speed Slider */}
      <div className="flex items-center gap-1.5">
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.001}
          value={speed}
          onChange={handleSpeed}
          className="flex-1 h-1"
          style={{ accentColor }}
        />
        <span
          className="text-[10px] font-mono w-12 text-right"
          style={{
            color: Math.abs(speed - 1.0) > 0.005 ? accentColor : "#6b7280",
          }}
        >
          {speedLabel}%
        </span>
      </div>

      {/* Controls Row */}
      <div className="flex items-center gap-1">
        {/* Nudge buttons */}
        <button
          onClick={() => handleNudge(-0.005)}
          className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all active:scale-95"
          title="Nudge slower (-0.5%)"
        >
          −
        </button>
        <button
          onClick={() => handleNudge(0.005)}
          className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all active:scale-95"
          title="Nudge faster (+0.5%)"
        >
          +
        </button>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="text-[8px] px-1.5 py-0.5 rounded border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all"
          title="Reset to original speed"
        >
          RST
        </button>

        {/* Sync */}
        <button
          onClick={handleSync}
          disabled={bpm <= 0}
          className="text-[10px] font-bold px-2.5 py-0.5 rounded-md border
                     transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                     active:scale-95"
          style={{
            color: accentColor,
            borderColor: `${accentColor}60`,
            backgroundColor: `${accentColor}15`,
          }}
          title="Sync BPM to other deck"
        >
          SYNC
        </button>

        {/* Original BPM (dimmed) */}
        {bpm > 0 && Math.abs(speed - 1.0) > 0.005 && (
          <span className="text-[8px] font-mono text-text-muted ml-auto">
            orig: {bpm.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  );
}
