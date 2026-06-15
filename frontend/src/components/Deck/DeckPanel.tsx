/**
 * Cadence DJ System — Deck Panel Component
 * Elite Performance Console Style
 *
 * Hardware-inspired deck with: accent top-bar, track header,
 * waveform, transport controls, hotcues, loops, tempo, EQ, effects.
 */

import { useRef } from "react";
import type { DeckStatus } from "../../api/client";
import { loadTrack, seekDeck, setDeckVolume } from "../../api/client";
import { TransportControls } from "./TransportControls";
import { WaveformDisplay } from "../Waveform/WaveformDisplay";
import { EQControls } from "../EQ/EQControls";
import { EffectsPanel } from "../Effects/EffectsPanel";
import { HotCues } from "../Cue/HotCues";
import { LoopControls } from "../Cue/LoopControls";
import { TempoSync } from "../Sync/TempoSync";

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
  const glowClass = deckId === "A" ? "glow-deck-a" : "glow-deck-b";
  const glowTextClass = deckId === "A" ? "glow-deck-a-text" : "glow-deck-b-text";

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
    <div className="flex-1 flex flex-col bg-surface-container-low rounded-xl border border-surface-raised shadow-lg overflow-hidden relative">
      {/* ─── Accent Top Bar (LED Strip) ─── */}
      <div
        className={`absolute top-0 left-0 w-full h-1 opacity-80 z-10 ${glowClass}`}
        style={{ backgroundColor: accentColor }}
      />

      {/* ─── Header: Deck Badge + Track Info + BPM ─── */}
      <div className="flex justify-between items-start p-4 bg-surface-container border-b border-surface-raised">
        <div className="w-full flex gap-4 items-center">
          {/* Deck Badge */}
          <div
            className="w-14 h-14 bg-surface-inset rounded border flex items-center justify-center relative overflow-hidden"
            style={{ borderColor: `${accentColor}30` }}
          >
            <span
              className={`font-black text-2xl z-10 ${glowTextClass}`}
              style={{ color: accentColor }}
            >
              {label}
            </span>
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `${accentColor}10` }}
            />
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-[22px] text-on-surface font-bold leading-none tracking-tight truncate">
                {isEmpty ? "No track loaded" : status?.track_name}
              </h2>
              <span
                className="font-mono text-xl font-bold ml-4 shrink-0"
                style={{ color: accentColor }}
              >
                {status?.bpm?.toFixed(1) ?? "---"}
              </span>
            </div>
            <div className="flex justify-between text-sm text-outline font-mono font-semibold">
              <span className="text-on-surface text-lg">
                {formatTime(position)}
              </span>
              <span>-{formatTime(Math.max(0, duration - position))}</span>
            </div>
          </div>

          {/* Load Button */}
          <button
            id={`deck-${deckId}-load`}
            onClick={() => fileInputRef.current?.click()}
            className="btn-small !py-2 !px-4 flex items-center gap-2 text-sm shrink-0"
            style={{ borderColor: `${accentColor}30`, color: accentColor }}
          >
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Load
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* ─── Waveform Area ─── */}
      <WaveformDisplay
        deckId={deckId}
        status={status}
        accentColor={accentColor}
        onAction={onAction}
      />

      {/* ─── Seek Bar ─── */}
      <div className="px-4 py-2 bg-surface-container-low border-b border-surface-raised">
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
      </div>

      {/* ─── Lower Deck Controls ─── */}
      <div className="flex-1 p-4 flex flex-col gap-4 bg-surface-container-low">
        {/* Playback & Volume */}
        <div className="flex justify-between items-center bg-surface-container p-3 rounded-lg border border-surface-raised">
          <TransportControls
            deckId={deckId}
            status={status}
            onAction={onAction}
          />

          {/* Volume */}
          <div className="flex items-center gap-3 bg-surface-inset p-3 rounded-lg border border-surface-raised">
            <span className="material-symbols-outlined text-[20px] text-outline">
              volume_up
            </span>
            <input
              id={`deck-${deckId}-volume`}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolume}
              className="w-28"
            />
            <span
              className="text-sm font-mono font-bold w-10 text-right"
              style={{ color: accentColor }}
            >
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>

        {/* Hotcues & Loops & Pitch */}
        <div className="flex gap-4 flex-1">
          {/* Left Col: Pads & Loops */}
          <div className="flex-1 flex flex-col gap-4">
            <HotCues
              deckId={deckId}
              cuePoints={status?.cue_points ?? []}
              onAction={onAction}
            />
            <LoopControls
              deckId={deckId}
              loop={status?.loop ?? null}
              accentColor={accentColor}
              onAction={onAction}
            />
          </div>

          {/* Right Col: Tempo & Sync */}
          <TempoSync
            deckId={deckId}
            status={status}
            accentColor={accentColor}
            onAction={onAction}
          />
        </div>

        {/* EQ & Effects */}
        <div className="flex gap-4">
          <EQControls
            deckId={deckId}
            eq={status?.eq ?? null}
            accentColor={accentColor}
            onAction={onAction}
          />
          <div className="flex-1">
            <EffectsPanel
              deckId={deckId}
              effects={status?.effects ?? null}
              accentColor={accentColor}
              onAction={onAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
