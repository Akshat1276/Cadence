/**
 * Cadence DJ System — Crossfader Component
 * Elite Performance Console Style — Hardware crossfader with gradient
 */

import { setCrossfader } from "../../api/client";

interface CrossfaderProps {
  position: number;
  onAction: () => void;
}

export function Crossfader({ position, onAction }: CrossfaderProps) {
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseFloat(e.target.value);
    await setCrossfader(pos);
    onAction();
  };

  return (
    <div className="flex-1 relative">
      {/* Track with gradient */}
      <div className="w-full h-3 slider-track relative rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full opacity-50"
          style={{
            width: `${position * 100}%`,
            background: "linear-gradient(to right, rgba(0,242,255,0.8), rgba(255,0,127,0.8))",
          }}
        />
      </div>

      {/* Range input (overlaid for interaction) */}
      <input
        id="crossfader"
        type="range"
        min={0}
        max={1}
        step={0.005}
        value={position}
        onChange={handleChange}
        className="absolute inset-0 w-full opacity-0 cursor-ew-resize z-10"
        style={{ height: "100%" }}
      />

      {/* Custom thumb indicator */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-6 h-8 bg-surface-raised border-2 border-outline-variant
                   rounded flex items-center justify-center cursor-ew-resize shadow-xl hover:border-outline transition-colors pointer-events-none z-5"
        style={{ left: `calc(${position * 100}% - 12px)` }}
      >
        <div className="w-0.5 h-5 bg-outline rounded-full" />
      </div>
    </div>
  );
}
