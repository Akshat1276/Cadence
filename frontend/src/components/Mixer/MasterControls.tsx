/**
 * Cadence DJ System — Master Controls Component
 *
 * Master output volume, per-deck gain trim knobs, and crossfader curve selector.
 */

import type { MixerState } from "../../api/client";
import {
  setMasterVolume,
  setGain,
  setCrossfaderCurve,
} from "../../api/client";

interface MasterControlsProps {
  mixer: MixerState | null;
  onAction: () => void;
}

export function MasterControls({ mixer, onAction }: MasterControlsProps) {
  const masterVol = mixer?.master_volume ?? 0.8;
  const gainA = mixer?.gain_a_db ?? 0;
  const gainB = mixer?.gain_b_db ?? 0;
  const curve = mixer?.crossfader_curve ?? "constant_power";

  const handleMasterVolume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setMasterVolume(parseFloat(e.target.value));
    onAction();
  };

  const handleGainA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setGain("A", parseFloat(e.target.value));
    onAction();
  };

  const handleGainB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await setGain("B", parseFloat(e.target.value));
    onAction();
  };

  const handleCurve = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await setCrossfaderCurve(e.target.value);
    onAction();
  };

  return (
    <div
      className="flex items-center justify-between gap-6 px-4 py-3
                    rounded-xl bg-bg-panel border border-border"
    >
      {/* Deck A Gain Trim */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
          Trim A
        </span>
        <div className="flex items-center gap-1.5">
          <input
            id="gain-a"
            type="range"
            min={-12}
            max={12}
            step={0.5}
            value={gainA}
            onChange={handleGainA}
            className="w-20 accent-accent-cyan"
          />
          <span className="text-[10px] font-mono text-text-muted w-12 text-right">
            {gainA > 0 ? "+" : ""}
            {gainA.toFixed(1)} dB
          </span>
        </div>
      </div>

      {/* Master Volume */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
          Master
        </span>
        <div className="flex items-center gap-2">
          {/* Speaker icon */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-purple"
          >
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
            <path d="M15.54,8.46a5,5,0,0,1,0,7.07" />
            <path d="M19.07,4.93a10,10,0,0,1,0,14.14" />
          </svg>
          <input
            id="master-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVol}
            onChange={handleMasterVolume}
            className="w-28"
          />
          <span className="text-[10px] font-mono text-accent-purple w-8 text-right font-semibold">
            {Math.round(masterVol * 100)}%
          </span>
        </div>
      </div>

      {/* Crossfader Curve Selector */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
          Curve
        </span>
        <select
          id="crossfader-curve"
          value={curve}
          onChange={handleCurve}
          className="text-xs bg-bg-control border border-border rounded-lg px-2 py-1
                     text-text-secondary hover:border-border-active
                     focus:outline-none focus:border-accent-purple
                     transition-colors cursor-pointer"
        >
          <option value="constant_power">Smooth</option>
          <option value="linear">Linear</option>
          <option value="sharp">Sharp</option>
        </select>
      </div>

      {/* Deck B Gain Trim */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
          Trim B
        </span>
        <div className="flex items-center gap-1.5">
          <input
            id="gain-b"
            type="range"
            min={-12}
            max={12}
            step={0.5}
            value={gainB}
            onChange={handleGainB}
            className="w-20 accent-accent-magenta"
          />
          <span className="text-[10px] font-mono text-text-muted w-12 text-right">
            {gainB > 0 ? "+" : ""}
            {gainB.toFixed(1)} dB
          </span>
        </div>
      </div>
    </div>
  );
}
