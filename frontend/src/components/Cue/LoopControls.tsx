/**
 * Cadence DJ System — Loop Controls Component
 * Elite Performance Console Style — Hardware loop buttons
 */

import type { LoopState } from "../../api/client";
import {
  setLoopIn,
  setLoopOut,
  toggleLoop,
  clearLoop,
  halveLoop,
  doubleLoop,
} from "../../api/client";

interface LoopControlsProps {
  deckId: string;
  loop: LoopState | null;
  accentColor: string;
  onAction: () => void;
}

function formatLoopTime(seconds: number): string {
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${seconds.toFixed(1)}s`;
}

export function LoopControls({
  deckId,
  loop,
  accentColor,
  onAction,
}: LoopControlsProps) {
  const isActive = loop?.enabled ?? false;
  const isValid = loop?.is_valid ?? false;

  const handleIn = async () => { await setLoopIn(deckId); onAction(); };
  const handleOut = async () => { await setLoopOut(deckId); onAction(); };
  const handleToggle = async () => { await toggleLoop(deckId); onAction(); };
  const handleClear = async () => { await clearLoop(deckId); onAction(); };
  const handleHalve = async () => { await halveLoop(deckId); onAction(); };
  const handleDouble = async () => { await doubleLoop(deckId); onAction(); };

  return (
    <div className="bg-surface-container p-3 rounded-lg border border-surface-raised">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-outline uppercase tracking-widest font-bold">
          Loop
        </span>
        {isValid && (
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{
              color: isActive ? accentColor : "var(--color-outline)",
              backgroundColor: isActive ? `${accentColor}15` : "transparent",
            }}
          >
            {formatLoopTime(loop?.length ?? 0)}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={handleIn} className="btn-small flex-1 h-10">IN</button>
        <button onClick={handleOut} className="btn-small flex-1 h-10">OUT</button>
        <button
          onClick={handleToggle}
          disabled={!isValid}
          className="btn-small flex-1 h-10 disabled:opacity-30"
          style={{
            color: isActive ? accentColor : undefined,
            borderColor: isActive ? `${accentColor}50` : undefined,
            boxShadow: isActive ? `0 0 10px ${accentColor}30` : undefined,
          }}
        >
          {isActive ? "ON" : "OFF"}
        </button>
        <button onClick={handleHalve} disabled={!isValid} className="btn-small w-12 h-10 disabled:opacity-30">/2</button>
        <button onClick={handleDouble} disabled={!isValid} className="btn-small w-12 h-10 disabled:opacity-30">x2</button>
        {isValid && (
          <button onClick={handleClear} className="btn-small w-12 h-10 text-alert-critical">CLR</button>
        )}
      </div>
    </div>
  );
}
