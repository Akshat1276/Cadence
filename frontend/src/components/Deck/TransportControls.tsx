/**
 * Cadence DJ System — Transport Controls Component
 *
 * Play, Pause, Stop buttons for a single deck.
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

  const handlePlay = async () => {
    await playDeck(deckId);
    onAction();
  };

  const handlePause = async () => {
    await pauseDeck(deckId);
    onAction();
  };

  const handleStop = async () => {
    await stopDeck(deckId);
    onAction();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Play / Pause toggle */}
      {isPlaying ? (
        <button
          id={`deck-${deckId}-pause`}
          onClick={handlePause}
          className="w-12 h-12 rounded-full flex items-center justify-center
                     bg-accent-cyan/20 border border-accent-cyan/40
                     hover:bg-accent-cyan/30 hover:border-accent-cyan/60
                     transition-all duration-200 text-accent-cyan"
          title="Pause"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>
      ) : (
        <button
          id={`deck-${deckId}-play`}
          onClick={handlePlay}
          disabled={!isLoaded}
          className="w-12 h-12 rounded-full flex items-center justify-center
                     bg-accent-green/20 border border-accent-green/40
                     hover:bg-accent-green/30 hover:border-accent-green/60
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all duration-200 text-accent-green"
          title="Play"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="6,3 20,12 6,21" />
          </svg>
        </button>
      )}

      {/* Stop */}
      <button
        id={`deck-${deckId}-stop`}
        onClick={handleStop}
        disabled={!isLoaded}
        className="w-10 h-10 rounded-full flex items-center justify-center
                   bg-bg-control border border-border
                   hover:bg-bg-hover hover:border-border-active
                   disabled:opacity-30 disabled:cursor-not-allowed
                   transition-all duration-200 text-text-secondary"
        title="Stop"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
      </button>
    </div>
  );
}
