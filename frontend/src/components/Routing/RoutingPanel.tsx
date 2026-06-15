/**
 * Cadence DJ System — Audio Routing Panel
 *
 * Device selector for master/cue outputs and per-deck cue monitoring
 * toggles. Allows DJs to preview tracks in headphones while the
 * master output plays on the main speakers.
 */

import { useState, useEffect } from "react";
import type { RoutingState, AudioDevice } from "../../api/client";
import {
  listDevices,
  setMasterDevice,
  setCueDevice,
  toggleDeckCue,
  setCueVolume,
} from "../../api/client";

interface RoutingPanelProps {
  routing: RoutingState | null;
  onAction: () => void;
}

export function RoutingPanel({ routing, onAction }: RoutingPanelProps) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (showPanel) {
      listDevices().then(setDevices).catch(console.error);
    }
  }, [showPanel]);

  const handleMasterDevice = async (id: string) => {
    await setMasterDevice(id === "" ? null : parseInt(id));
    onAction();
  };

  const handleCueDevice = async (id: string) => {
    await setCueDevice(id === "" ? null : parseInt(id));
    onAction();
  };

  const handleCueToggle = async (deckId: string) => {
    await toggleDeckCue(deckId);
    onAction();
  };

  const handleCueVolume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setCueVolume(parseFloat(e.target.value));
    onAction();
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Compact toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="text-[10px] px-2.5 py-1 rounded-lg border border-border
                     bg-bg-panel text-text-muted hover:text-text-primary
                     hover:border-border-active transition-all"
        >
          🎧 {showPanel ? "Hide Routing" : "Audio Routing"}
        </button>

        {/* Inline Cue Buttons */}
        <button
          onClick={() => handleCueToggle("A")}
          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all
            ${
              routing?.cue_deck_a
                ? "bg-accent-cyan/15 border-accent-cyan/50 text-accent-cyan"
                : "bg-transparent border-border text-text-muted hover:text-text-primary"
            }`}
          title="Cue monitor Deck A in headphones"
        >
          CUE A
        </button>
        <button
          onClick={() => handleCueToggle("B")}
          className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all
            ${
              routing?.cue_deck_b
                ? "bg-accent-magenta/15 border-accent-magenta/50 text-accent-magenta"
                : "bg-transparent border-border text-text-muted hover:text-text-primary"
            }`}
          title="Cue monitor Deck B in headphones"
        >
          CUE B
        </button>

        {routing?.cue_enabled && (
          <span className="text-[8px] text-accent-green font-mono">
            ● CUE ACTIVE
          </span>
        )}
      </div>

      {/* Expanded Panel */}
      {showPanel && (
        <div className="p-3 rounded-xl bg-bg-panel border border-border flex flex-col gap-3">
          {/* Master Device */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
              Master Output
            </span>
            <select
              value={routing?.master_device_id ?? ""}
              onChange={(e) => handleMasterDevice(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg bg-bg-control border border-border
                         text-text-primary focus:border-accent-cyan/50 outline-none"
            >
              <option value="">System Default</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cue Device */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
              Cue Output (Headphones)
            </span>
            <select
              value={routing?.cue_device_id ?? ""}
              onChange={(e) => handleCueDevice(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg bg-bg-control border border-border
                         text-text-primary focus:border-accent-magenta/50 outline-none"
            >
              <option value="">Disabled</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cue Volume */}
          {routing?.cue_enabled && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-text-muted">Cue Vol</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={routing?.cue_volume ?? 1}
                onChange={handleCueVolume}
                className="flex-1 h-1"
                style={{ accentColor: "#a855f7" }}
              />
              <span className="text-[10px] font-mono text-text-secondary w-8 text-right">
                {Math.round((routing?.cue_volume ?? 1) * 100)}%
              </span>
            </div>
          )}

          <span className="text-[8px] text-text-muted italic">
            Master device change requires engine restart.
          </span>
        </div>
      )}
    </div>
  );
}
