/**
 * Cadence DJ System — EQ Controls Component
 *
 * 3-band EQ knobs (Low / Mid / High) for a single deck.
 * Vertical sliders from -12 dB to +12 dB.
 */

import { setEQBand, resetEQ } from "../../api/client";
import type { EQState } from "../../api/client";

interface EQControlsProps {
  deckId: string;
  eq: EQState | null;
  accentColor: string;
  onAction: () => void;
}

function EQSlider({
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
  const displayVal = value > 0 ? `+${value.toFixed(0)}` : value.toFixed(0);
  const isActive = Math.abs(value) > 0.5;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-[9px] font-mono font-semibold"
        style={{ color: isActive ? accentColor : "#6b7280" }}
      >
        {displayVal}
      </span>
      <input
        type="range"
        min={-12}
        max={12}
        step={0.5}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-16 w-3 appearance-none rounded-full cursor-pointer"
        style={{
          writingMode: "vertical-lr",
          direction: "rtl",
          accentColor: accentColor,
        }}
      />
      <span className="text-[9px] uppercase tracking-wider text-text-muted font-semibold">
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
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
          EQ
        </span>
        <button
          onClick={handleReset}
          className="text-[8px] px-1 py-0.5 rounded bg-bg-control border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all"
          title="Reset EQ to flat"
        >
          RST
        </button>
      </div>
      <div className="flex items-center gap-2">
        <EQSlider
          label="HI"
          value={high}
          onChange={(v) => handleBand("high", v)}
          accentColor={accentColor}
        />
        <EQSlider
          label="MID"
          value={mid}
          onChange={(v) => handleBand("mid", v)}
          accentColor={accentColor}
        />
        <EQSlider
          label="LO"
          value={low}
          onChange={(v) => handleBand("low", v)}
          accentColor={accentColor}
        />
      </div>
    </div>
  );
}
