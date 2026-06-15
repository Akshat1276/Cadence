/**
 * Cadence DJ System — Tempo & Sync Controls
 * Elite Performance Console Style — Vertical pitch fader + sync buttons
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
    <div className="w-44 bg-surface-container p-4 rounded-lg border border-surface-raised flex flex-col">
      {/* Header */}
      <div className="flex justify-between text-xs text-outline mb-4 uppercase tracking-widest font-bold">
        <span>Tempo</span>
        <span className="font-mono" style={{ color: accentColor }}>
          {speedLabel}%
        </span>
      </div>

      {/* Pitch Fader + Control Buttons */}
      <div className="flex gap-4 flex-1">
        {/* Vertical Slider Track */}
        <div className="flex-1 flex justify-center">
          <div className="relative w-8 h-full min-h-[100px]">
            <div className="absolute inset-0 slider-track rounded" />
            {/* Center line */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-surface-raised/80 z-0" />
            {/* Range input */}
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.001}
              value={speed}
              onChange={handleSpeed}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-10"
              style={{
                writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
                direction: "rtl",
              }}
            />
            {/* Visual thumb indicator */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-10 h-6 rounded slider-thumb z-5 flex items-center justify-center pointer-events-none"
              style={{
                top: `${((1.5 - speed) / 1.0) * 100}%`,
                transform: "translate(-50%, -50%)",
                borderColor: `${accentColor}30`,
              }}
            >
              <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: `${accentColor}80` }} />
            </div>
          </div>
        </div>

        {/* Side Buttons */}
        <div className="flex flex-col justify-between items-center py-2 gap-2">
          <button
            onClick={() => handleNudge(0.005)}
            className="btn-small w-10 h-8 flex items-center justify-center"
            title="Nudge faster"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            onClick={handleReset}
            className="btn-small w-10 h-8"
            title="Reset to original speed"
          >
            RST
          </button>
          <button
            onClick={() => handleNudge(-0.005)}
            className="btn-small w-10 h-8 flex items-center justify-center"
            title="Nudge slower"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            onClick={handleSync}
            disabled={bpm <= 0}
            className="btn-small w-10 h-8 disabled:opacity-30"
            style={{
              color: accentColor,
              borderColor: `${accentColor}50`,
              boxShadow: `0 0 10px ${accentColor}20`,
            }}
            title="Sync BPM to other deck"
          >
            SYNC
          </button>
        </div>
      </div>

      {/* BPM Readout */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-raised">
        <span className="text-xs text-outline uppercase tracking-wider font-bold">BPM</span>
        <span className="font-mono text-lg font-bold" style={{ color: accentColor }}>
          {effectiveBpm > 0 ? effectiveBpm.toFixed(1) : "---"}
        </span>
      </div>
    </div>
  );
}
