/**
 * Cadence DJ System — Audio Routing Panel (Compact for footer status bar)
 * Elite Performance Console Style
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
    <div className="flex items-center gap-3 relative">
      <span className="opacity-60 uppercase tracking-widest text-[10px]">Audio Routing</span>

      {/* Inline Cue Buttons */}
      <button
        onClick={() => handleCueToggle("A")}
        className="border px-2 py-0.5 rounded text-[10px] font-bold transition-all"
        style={{
          borderColor: routing?.cue_deck_a ? "rgba(0,242,255,0.5)" : "var(--color-outline-variant)",
          color: routing?.cue_deck_a ? "#00f2ff" : "var(--color-outline)",
          backgroundColor: routing?.cue_deck_a ? "rgba(0,242,255,0.1)" : "transparent",
        }}
      >
        CUE A
      </button>
      <button
        onClick={() => handleCueToggle("B")}
        className="border px-2 py-0.5 rounded text-[10px] font-bold transition-all"
        style={{
          borderColor: routing?.cue_deck_b ? "rgba(255,0,127,0.5)" : "var(--color-outline-variant)",
          color: routing?.cue_deck_b ? "#ff007f" : "var(--color-outline)",
          backgroundColor: routing?.cue_deck_b ? "rgba(255,0,127,0.1)" : "transparent",
        }}
      >
        CUE B
      </button>

      {/* Settings toggle */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="btn-small !text-[10px] !px-2 !py-1"
      >
        🎧 {showPanel ? "Hide" : "Setup"}
      </button>

      {/* Expanded Panel (Dropdown) */}
      {showPanel && (
        <div className="absolute bottom-full left-0 mb-2 w-80
                       bg-surface-container-high border border-surface-raised rounded-lg shadow-xl p-4 flex flex-col gap-4 z-50">
          {/* Master Device */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-widest text-outline font-bold">
              Master Output
            </span>
            <select
              value={routing?.master_device_id ?? ""}
              onChange={(e) => handleMasterDevice(e.target.value)}
              className="text-xs px-2 py-1.5 rounded bg-surface-container text-on-surface"
            >
              <option value="">System Default</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cue Device */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-widest text-outline font-bold">
              Cue Output (Headphones)
            </span>
            <select
              value={routing?.cue_device_id ?? ""}
              onChange={(e) => handleCueDevice(e.target.value)}
              className="text-xs px-2 py-1.5 rounded bg-surface-container text-on-surface"
            >
              <option value="">Disabled</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Cue Volume */}
          {routing?.cue_enabled && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-outline">Cue Vol</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={routing?.cue_volume ?? 1}
                onChange={handleCueVolume}
                className="flex-1 h-1"
              />
              <span className="text-[10px] font-mono text-on-surface-variant w-10 text-right">
                {Math.round((routing?.cue_volume ?? 1) * 100)}%
              </span>
            </div>
          )}

          <span className="text-[9px] text-outline italic">
            Master device change requires engine restart.
          </span>
        </div>
      )}
    </div>
  );
}
