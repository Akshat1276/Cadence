/**
 * Cadence DJ System — Hot Cue Pads Component
 * Elite Performance Console Style — Tactile button grid
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
  const cueMap = new Map<number, CuePoint>();
  cuePoints.forEach((cp) => cueMap.set(cp.slot, cp));

  const handleClick = async (slot: number) => {
    if (cueMap.has(slot)) {
      await jumpToCue(deckId, slot);
    } else {
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
    <div className="bg-surface-container p-3 rounded-lg border border-surface-raised flex-1">
      <div className="text-xs text-outline mb-3 uppercase tracking-widest font-bold">
        Hot Cues
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }, (_, slot) => {
          const cue = cueMap.get(slot);
          const color = cue?.color || DEFAULT_COLORS[slot];
          const isSet = !!cue;

          return (
            <button
              key={slot}
              onClick={() => handleClick(slot)}
              onContextMenu={(e) => handleRightClick(slot, e)}
              className="tactile-btn rounded h-10 flex flex-col items-center justify-center
                         text-sm font-mono font-bold transition-colors"
              style={{
                color: isSet ? color : "var(--color-on-surface)",
                borderColor: isSet ? `${color}60` : undefined,
                boxShadow: isSet ? `0 0 8px ${color}30` : undefined,
              }}
              title={
                isSet
                  ? `${cue.name} @ ${formatCueTime(cue.position)}\nRight-click to delete`
                  : `Set cue ${slot + 1}`
              }
            >
              <span>{slot + 1}</span>
              {isSet && (
                <span className="text-[9px] opacity-70 font-mono">
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
