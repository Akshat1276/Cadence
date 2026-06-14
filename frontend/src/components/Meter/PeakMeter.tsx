/**
 * Cadence DJ System — Peak Meter Component
 *
 * Vertical LED-style peak meter showing real-time audio levels
 * for Left and Right channels. Displays both RMS (bar fill) and
 * Peak (marker line) with green/yellow/red color zones.
 */

import type { PeakLevels } from "../../api/client";

interface PeakMeterProps {
  levels: PeakLevels | null;
  label?: string;
  height?: number;
}

function MeterBar({ value, peak }: { value: number; peak: number }) {
  // Clamp values to 0-1
  const rmsPercent = Math.min(1, Math.max(0, value)) * 100;
  const peakPercent = Math.min(1, Math.max(0, peak)) * 100;

  // Color zones: green (0-70%), yellow (70-90%), red (90-100%)
  const getGradient = () => {
    return `linear-gradient(to top, 
      #00ff88 0%, 
      #00ff88 60%, 
      #ffd600 75%, 
      #ff006e 95%, 
      #ff006e 100%)`;
  };

  return (
    <div className="relative w-3 rounded-sm overflow-hidden bg-bg-primary border border-border/50"
         style={{ height: "100%" }}>
      {/* RMS fill */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-75"
        style={{
          height: `${rmsPercent}%`,
          background: getGradient(),
          opacity: 0.85,
        }}
      />
      {/* Peak indicator line */}
      {peakPercent > 1 && (
        <div
          className="absolute left-0 right-0 h-[2px] transition-all duration-150"
          style={{
            bottom: `${peakPercent}%`,
            backgroundColor: peakPercent > 90 ? "#ff006e" : peakPercent > 70 ? "#ffd600" : "#00ff88",
            boxShadow: `0 0 4px ${peakPercent > 90 ? "#ff006e" : "#00ff88"}`,
          }}
        />
      )}
    </div>
  );
}

export function PeakMeter({ levels, label, height = 80 }: PeakMeterProps) {
  const rmsL = levels?.rms_l ?? 0;
  const rmsR = levels?.rms_r ?? 0;
  const peakL = levels?.peak_l ?? 0;
  const peakR = levels?.peak_r ?? 0;
  const peakDbL = levels?.peak_db_l ?? -60;
  const peakDbR = levels?.peak_db_r ?? -60;

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
          {label}
        </span>
      )}
      <div className="flex gap-0.5" style={{ height }}>
        <MeterBar value={rmsL} peak={peakL} />
        <MeterBar value={rmsR} peak={peakR} />
      </div>
      <span className="text-[9px] font-mono text-text-muted">
        {Math.max(peakDbL, peakDbR) > -60
          ? `${Math.max(peakDbL, peakDbR).toFixed(0)}`
          : "-∞"}
      </span>
    </div>
  );
}
