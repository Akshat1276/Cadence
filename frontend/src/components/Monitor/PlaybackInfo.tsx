/**
 * Cadence DJ System — Playback Info Monitor
 *
 * Displays real-time playback information for both decks:
 * track name, state, position/duration, and a progress bar.
 */

import type { DeckStatus } from "../../api/client";

interface PlaybackInfoProps {
  deckA: DeckStatus | null;
  deckB: DeckStatus | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function DeckMonitor({
  deck,
  label,
  accentColor,
}: {
  deck: DeckStatus | null;
  label: string;
  accentColor: string;
}) {
  const isEmpty = !deck || deck.state === "empty";
  const position = deck?.position ?? 0;
  const duration = deck?.duration ?? 1;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const remaining = Math.max(0, duration - position);

  return (
    <div className="flex-1 flex flex-col gap-1.5 px-3 py-2 rounded-lg bg-bg-control border border-border">
      {/* Label + State */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{
              color: accentColor,
              backgroundColor: `${accentColor}15`,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {label}
          </span>
          {deck?.state === "playing" && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-glow"
              style={{ backgroundColor: accentColor }}
            />
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
          {deck?.state ?? "empty"}
        </span>
      </div>

      {/* Track Name */}
      <div className="text-xs text-text-primary font-medium truncate min-h-[1rem]">
        {isEmpty ? (
          <span className="text-text-muted italic">No track</span>
        ) : (
          deck?.track_name
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${progress}%`,
            backgroundColor: accentColor,
            boxShadow: `0 0 4px ${accentColor}60`,
          }}
        />
      </div>

      {/* Time */}
      <div className="flex justify-between text-[10px] font-mono text-text-muted">
        <span>{formatTime(position)}</span>
        <span>-{formatTime(remaining)}</span>
      </div>
    </div>
  );
}

export function PlaybackInfo({ deckA, deckB }: PlaybackInfoProps) {
  return (
    <div className="flex gap-3">
      <DeckMonitor deck={deckA} label="A" accentColor="#00d4ff" />
      <DeckMonitor deck={deckB} label="B" accentColor="#ff006e" />
    </div>
  );
}
