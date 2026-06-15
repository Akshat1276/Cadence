/**
 * Cadence DJ System — Transport Controls Component
 * Elite Performance Console Style — Large tactile play/stop buttons
 */

import type { DeckStatus } from "../../api/client";
import { playDeck, pauseDeck, stopDeck } from "../../api/client";

interface TransportControlsProps {
  deckId: string;
  status: DeckStatus | null;
  onAction: () => void;
}

export function TransportControls({
  deckId,
  status,
  onAction,
}: TransportControlsProps) {
  const isPlaying = status?.state === "playing";
  const isLoaded = status?.state !== "empty";
  const accentColor = deckId === "A" ? "#00f2ff" : "#ff007f";
  const glowTextClass = deckId === "A" ? "glow-deck-a-text" : "glow-deck-b-text";

  const handlePlay = async () => { await playDeck(deckId); onAction(); };
  const handlePause = async () => { await pauseDeck(deckId); onAction(); };
  const handleStop = async () => { await stopDeck(deckId); onAction(); };

  return (
    <div className="flex items-center gap-3">
      {/* Play / Pause toggle */}
      {isPlaying ? (
        <button
          id={`deck-${deckId}-pause`}
          onClick={handlePause}
          className={`w-14 h-14 rounded-full tactile-btn flex items-center justify-center hover:text-white group`}
          style={{ color: accentColor }}
          title="Pause"
        >
          <span
            className={`material-symbols-outlined text-[32px] group-hover:${glowTextClass} transition-all`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            pause
          </span>
        </button>
      ) : (
        <button
          id={`deck-${deckId}-play`}
          onClick={handlePlay}
          disabled={!isLoaded}
          className="w-14 h-14 rounded-full tactile-btn flex items-center justify-center hover:text-white group disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: accentColor }}
          title="Play"
        >
          <span
            className={`material-symbols-outlined text-[32px] group-hover:${glowTextClass} transition-all`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            play_arrow
          </span>
        </button>
      )}

      {/* Stop */}
      <button
        id={`deck-${deckId}-stop`}
        onClick={handleStop}
        disabled={!isLoaded}
        className="w-14 h-14 rounded-full tactile-btn flex items-center justify-center
                   text-on-surface hover:text-on-surface group disabled:opacity-30 disabled:cursor-not-allowed"
        title="Stop"
      >
        <div className="w-5 h-5 bg-current rounded-sm" />
      </button>

      {/* Cue Button */}
      <div className="flex flex-col ml-2">
        <span className="text-xs text-outline uppercase tracking-widest font-semibold mb-1">
          CUE
        </span>
        <button className="btn-small w-14 h-9">CUE</button>
      </div>
    </div>
  );
}
