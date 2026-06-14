/**
 * Cadence DJ System — Crossfader Component
 *
 * Horizontal slider that blends audio between Deck A and Deck B.
 * Position: 0.0 = full A, 0.5 = center (equal mix), 1.0 = full B.
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

  // Calculate which side is dominant for the indicator
  const aPercent = Math.round((1 - position) * 100);
  const bPercent = Math.round(position * 100);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
        Crossfader
      </span>

      <div className="flex items-center gap-3 w-full max-w-md">
        {/* Deck A indicator */}
        <div className="flex flex-col items-center w-10">
          <span className="text-[10px] font-bold text-accent-cyan">A</span>
          <span className="text-[10px] font-mono text-text-muted">
            {aPercent}%
          </span>
        </div>

        {/* Slider track with custom gradient */}
        <div className="flex-1 relative">
          <div
            className="absolute inset-0 h-[4px] top-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `linear-gradient(to right, #00d4ff, #7c3aed, #ff006e)`,
              opacity: 0.3,
            }}
          />
          <input
            id="crossfader"
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={position}
            onChange={handleChange}
            className="relative z-10 w-full"
          />
        </div>

        {/* Deck B indicator */}
        <div className="flex flex-col items-center w-10">
          <span className="text-[10px] font-bold text-accent-magenta">B</span>
          <span className="text-[10px] font-mono text-text-muted">
            {bPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
