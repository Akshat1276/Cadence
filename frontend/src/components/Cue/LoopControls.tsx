/**
 * Cadence DJ System — Loop Controls Component
 *
 * Controls for setting loop in/out points, toggling loop,
 * and adjusting loop length (halve/double).
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

  const handleIn = async () => {
    await setLoopIn(deckId);
    onAction();
  };

  const handleOut = async () => {
    await setLoopOut(deckId);
    onAction();
  };

  const handleToggle = async () => {
    await toggleLoop(deckId);
    onAction();
  };

  const handleClear = async () => {
    await clearLoop(deckId);
    onAction();
  };

  const handleHalve = async () => {
    await halveLoop(deckId);
    onAction();
  };

  const handleDouble = async () => {
    await doubleLoop(deckId);
    onAction();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
          Loop
        </span>
        {isValid && (
          <span
            className="text-[8px] font-mono px-1 rounded"
            style={{
              color: isActive ? accentColor : "#6b7280",
              backgroundColor: isActive ? `${accentColor}15` : "transparent",
            }}
          >
            {formatLoopTime(loop?.length ?? 0)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Loop In */}
        <button
          onClick={handleIn}
          className="text-[9px] font-bold px-2 py-1 rounded-md border transition-all duration-150"
          style={{
            color: isValid ? accentColor : "#6b7280",
            borderColor: isValid ? `${accentColor}40` : "#2a2a3e",
            backgroundColor: isValid ? `${accentColor}10` : "transparent",
          }}
          title="Set loop-in point at current position"
        >
          IN
        </button>

        {/* Loop Out */}
        <button
          onClick={handleOut}
          className="text-[9px] font-bold px-2 py-1 rounded-md border transition-all duration-150"
          style={{
            color: isValid ? accentColor : "#6b7280",
            borderColor: isValid ? `${accentColor}40` : "#2a2a3e",
            backgroundColor: isValid ? `${accentColor}10` : "transparent",
          }}
          title="Set loop-out point at current position"
        >
          OUT
        </button>

        {/* Toggle Loop */}
        <button
          onClick={handleToggle}
          disabled={!isValid}
          className="text-[9px] font-bold px-2 py-1 rounded-md border transition-all duration-150
                     disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: isActive ? "#0d0d15" : accentColor,
            borderColor: isActive ? accentColor : `${accentColor}40`,
            backgroundColor: isActive ? accentColor : "transparent",
          }}
          title={isActive ? "Disable loop" : "Enable loop"}
        >
          {isActive ? "ON" : "OFF"}
        </button>

        {/* Halve Loop */}
        <button
          onClick={handleHalve}
          disabled={!isValid}
          className="text-[9px] font-mono px-1.5 py-1 rounded-md border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Halve loop length"
        >
          ÷2
        </button>

        {/* Double Loop */}
        <button
          onClick={handleDouble}
          disabled={!isValid}
          className="text-[9px] font-mono px-1.5 py-1 rounded-md border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Double loop length"
        >
          ×2
        </button>

        {/* Clear Loop */}
        {isValid && (
          <button
            onClick={handleClear}
            className="text-[8px] px-1 py-0.5 rounded border border-border
                       text-text-muted hover:text-accent-magenta hover:border-accent-magenta/40
                       transition-all"
            title="Clear loop"
          >
            CLR
          </button>
        )}
      </div>
    </div>
  );
}
