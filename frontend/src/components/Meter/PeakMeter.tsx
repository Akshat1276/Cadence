/**
 * Cadence DJ System — Peak Meter Component
 * Elite Performance Console Style — Segmented LED meter
 */

import type { PeakLevels } from "../../api/client";

interface PeakMeterProps {
  levels: PeakLevels | null;
  label?: string;
  height?: number;
}

const SEGMENTS = 6;
const SEGMENT_COLORS = [
  "#39ff14", "#39ff14", "#39ff14",  // Green (bottom 3)
  "#ffea00",                         // Yellow
  "#ff4d4d", "#ff4d4d",             // Red (top 2)
];

function LEDMeter({ value }: { value: number }) {
  const litSegments = Math.round(Math.min(1, Math.max(0, value)) * SEGMENTS);

  return (
    <div className="w-3 bg-surface-inset rounded border border-surface-raised p-0.5 flex flex-col-reverse gap-0.5 shadow-inner h-full">
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const isLit = i < litSegments;
        return (
          <div
            key={i}
            className="w-full flex-1 rounded-sm transition-opacity duration-75"
            style={{
              backgroundColor: SEGMENT_COLORS[i] || "#39ff14",
              opacity: isLit ? 0.9 : 0.15,
              boxShadow: isLit ? `0 0 4px ${SEGMENT_COLORS[i]}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export function PeakMeter({ levels, label, height = 64 }: PeakMeterProps) {
  const rmsL = levels?.rms_l ?? 0;
  const rmsR = levels?.rms_r ?? 0;
  const peakDbL = levels?.peak_db_l ?? -60;
  const peakDbR = levels?.peak_db_r ?? -60;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <span className="text-[10px] uppercase tracking-widest text-outline font-bold">
          {label}
        </span>
      )}
      <div className="flex gap-0.5" style={{ height }}>
        <LEDMeter value={rmsL} />
        <LEDMeter value={rmsR} />
      </div>
      <span className="text-[10px] font-mono text-outline">
        {Math.max(peakDbL, peakDbR) > -60
          ? `${Math.max(peakDbL, peakDbR).toFixed(0)}`
          : "-∞"}
      </span>
    </div>
  );
}
