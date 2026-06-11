/**
 * Cadence DJ System — Deck Panel Component
 *
 * Full deck UI: waveform display, track info, file loader,
 * transport controls, volume slider, and seek bar.
 */

import { useRef } from "react";
import type { DeckStatus } from "../../api/client";
import { loadTrack, seekDeck, setDeckVolume } from "../../api/client";
import { TransportControls } from "./TransportControls";
import { WaveformDisplay } from "../Waveform/WaveformDisplay";

interface DeckPanelProps {
  deckId: string;
  label: string;
  status: DeckStatus | null;
  onAction: () => void;
  accentColor: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DeckPanel({
  deckId,
  label,
  status,
  onAction,
  accentColor,
}: DeckPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await loadTrack(deckId, file);
      onAction();
    } catch (err) {
      console.error("Failed to load track:", err);
    }
  };

  const handleSeek = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseFloat(e.target.value);
    await seekDeck(deckId, pos);
    onAction();
  };

  const handleVolume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    await setDeckVolume(deckId, vol);
    onAction();
  };

  const isEmpty = !status || status.state === "empty";
  const position = status?.position ?? 0;
  const duration = status?.duration ?? 0;
  const volume = status?.volume ?? 1.0;

  return (
    <div
      className="flex flex-col gap-2 p-3 rounded-xl bg-bg-panel border border-border
                    hover:border-border-active transition-colors duration-300"
    >
      {/* Header: Label + Load Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              color: accentColor,
              backgroundColor: `${accentColor}20`,
              border: `1px solid ${accentColor}40`,
            }}
          >
            {label}
          </span>

          {/* Playing indicator */}
          {status?.state === "playing" && (
            <span
              className="w-2 h-2 rounded-full animate-pulse-glow"
              style={{ backgroundColor: accentColor }}
            />
          )}
        </div>

        <button
          id={`deck-${deckId}-load`}
          onClick={() => fileInputRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded-lg bg-bg-control border border-border
                     hover:bg-bg-hover hover:border-border-active
                     text-text-secondary hover:text-text-primary
                     transition-all duration-200"
        >
          Load Track
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Track Info */}
      <div className="min-h-[1.25rem] flex items-center">
        {isEmpty ? (
          <span className="text-text-muted text-sm italic">
            No track loaded
          </span>
        ) : (
          <span className="text-text-primary text-sm font-medium truncate">
            {status?.track_name}
          </span>
        )}
      </div>

      {/* Waveform Display */}
      <WaveformDisplay
        deckId={deckId}
        status={status}
        accentColor={accentColor}
        onAction={onAction}
      />

      {/* Seek Bar */}
      <div className="flex flex-col gap-0.5">
        <input
          id={`deck-${deckId}-seek`}
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={position}
          onChange={handleSeek}
          disabled={isEmpty}
          className="w-full disabled:opacity-30"
        />
        <div className="flex justify-between text-xs font-mono text-text-muted">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Row: Transport + Volume */}
      <div className="flex items-center justify-between">
        <TransportControls
          deckId={deckId}
          status={status}
          onAction={onAction}
        />

        {/* Volume */}
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-muted"
          >
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
            <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
            <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
          </svg>
          <input
            id={`deck-${deckId}-volume`}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
            className="w-20"
          />
          <span className="text-xs font-mono text-text-muted w-8 text-right">
            {Math.round(volume * 100)}
          </span>
        </div>
      </div>
    </div>
  );
}
