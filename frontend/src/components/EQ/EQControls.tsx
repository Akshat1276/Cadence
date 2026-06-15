/**
 * Cadence DJ System — EQ Controls Component
 * Elite Performance Console Style — Knob-style rotary EQ
 */

import { setEQBand, resetEQ } from "../../api/client";
import type { EQState } from "../../api/client";

interface EQControlsProps {
  deckId: string;
  eq: EQState | null;
  accentColor: string;
  onAction: () => void;
}

function EQKnob({
  label,
  value,
  onChange,
  accentColor,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}) {
  const isActive = Math.abs(value) > 0.5;
  const displayVal = value > 0 ? `+${value.toFixed(0)}` : value.toFixed(0);
  // Rotation: -12dB → -135deg, 0dB → 0deg, +12dB → +135deg
  const rotation = (value / 12) * 135;

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="text-[10px] font-mono font-bold"
        style={{ color: isActive ? accentColor : "var(--color-outline)" }}
      >
        {displayVal}
      </span>
      <div
        className="w-10 h-10 rounded-full knob-bg relative group cursor-ns-resize"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.5 : 0.5;
          onChange(Math.max(-12, Math.min(12, value + delta)));
        }}
      >
        <div
          className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-3 rounded-sm transition-transform"
          style={{
            backgroundColor: accentColor,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            transformOrigin: "center 12px",
          }}
        />
      </div>
      {/* Hidden slider for keyboard/click control */}
      <input
        type="range"
        min={-12}
        max={12}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-10 h-1 opacity-0 absolute"
      />
      <span className="text-[10px] text-outline font-bold uppercase">
        {label}
      </span>
    </div>
  );
}

export function EQControls({
  deckId,
  eq,
  accentColor,
  onAction,
}: EQControlsProps) {
  const low = eq?.low_db ?? 0;
  const mid = eq?.mid_db ?? 0;
  const high = eq?.high_db ?? 0;

  const handleBand = async (band: "low" | "mid" | "high", val: number) => {
    await setEQBand(deckId, band, val);
    onAction();
  };

  const handleReset = async () => {
    await resetEQ(deckId);
    onAction();
  };

  return (
    <div className="bg-surface-container p-3 rounded-lg border border-surface-raised w-48">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-outline uppercase tracking-widest font-bold">
          EQ
        </span>
        <button
          onClick={handleReset}
          className="btn-small !text-[10px] !px-2 !py-1"
          title="Reset EQ to flat"
        >
          RST
        </button>
      </div>
      <div className="flex justify-between px-2">
        <EQKnob
          label="HI"
          value={high}
          onChange={(v) => handleBand("high", v)}
          accentColor={accentColor}
        />
        <EQKnob
          label="MID"
          value={mid}
          onChange={(v) => handleBand("mid", v)}
          accentColor={accentColor}
        />
        <EQKnob
          label="LOW"
          value={low}
          onChange={(v) => handleBand("low", v)}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
}
