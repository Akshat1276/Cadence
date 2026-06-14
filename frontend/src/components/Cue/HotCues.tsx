/**
 * Cadence DJ System — Hot Cue Pads Component
 *
 * 8 hot cue pads for quick-access cue points.
 * Click empty pad = set cue at current position.
 * Click filled pad = jump to that cue.
 * Right-click filled pad = delete cue.
 */

import type { CuePoint } from "../../api/client";
import { setCuePoint, deleteCuePoint, jumpToCue } from "../../api/client";

const DEFAULT_COLORS = [
  "#ff006e", "#00d4ff", "#ffd600", "#00ff88",
  "#ff6b35", "#a855f7", "#06b6d4", "#f43f5e",
];

interface HotCuesProps {
  deckId: string;
  cuePoints: CuePoint[];
  onAction: () => void;
}

function formatCueTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

export function HotCues({ deckId, cuePoints, onAction }: HotCuesProps) {
  // Build a map of slot → CuePoint for quick lookup
  const cueMap = new Map<number, CuePoint>();
  cuePoints.forEach((cp) => cueMap.set(cp.slot, cp));

  const handleClick = async (slot: number) => {
    if (cueMap.has(slot)) {
      // Jump to existing cue
      await jumpToCue(deckId, slot);
    } else {
      // Set cue at current position
      await setCuePoint(deckId, slot);
    }
    onAction();
  };

  const handleRightClick = async (slot: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (cueMap.has(slot)) {
      await deleteCuePoint(deckId, slot);
      onAction();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
        Hot Cues
      </span>
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }, (_, slot) => {
          const cue = cueMap.get(slot);
          const color = cue?.color || DEFAULT_COLORS[slot];
          const isSet = !!cue;

          return (
            <button
              key={slot}
              onClick={() => handleClick(slot)}
              onContextMenu={(e) => handleRightClick(slot, e)}
              className="relative flex flex-col items-center justify-center
                         h-8 rounded-md border transition-all duration-150
                         text-[9px] font-bold"
              style={{
                backgroundColor: isSet ? `${color}20` : "transparent",
                borderColor: isSet ? `${color}60` : "#2a2a3e",
                color: isSet ? color : "#4a4a6a",
                boxShadow: isSet ? `0 0 8px ${color}30` : "none",
              }}
              title={
                isSet
                  ? `${cue.name} @ ${formatCueTime(cue.position)}\nRight-click to delete`
                  : `Set cue ${slot + 1}`
              }
            >
              <span>{slot + 1}</span>
              {isSet && (
                <span className="text-[7px] opacity-70 font-mono">
                  {formatCueTime(cue.position)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
