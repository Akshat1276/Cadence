/**
 * Cadence DJ System — Master Controls Component
 * Elite Performance Console Style — Trim sliders + Master + Curve
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
    <div className="flex flex-col gap-4 flex-1 max-w-[280px]">
      {/* Trim A */}
      <div className="flex flex-col">
        <div className="flex justify-between w-full text-xs text-outline mb-2 font-bold uppercase tracking-wider">
          <span>Trim A</span>
          <span className="text-deck-a font-mono">
            {gainA > 0 ? "+" : ""}{gainA.toFixed(1)} dB
          </span>
        </div>
        <div className="w-full h-2.5 slider-track relative">
          <input
            id="gain-a"
            type="range"
            min={-12}
            max={12}
            step={0.5}
            value={gainA}
            onChange={handleGainA}
            className="w-full absolute inset-0"
          />
        </div>
      </div>

      {/* Master Volume */}
      <div className="flex flex-col">
        <div className="flex justify-between w-full text-xs text-outline mb-2 font-bold uppercase tracking-wider">
          <span>Master</span>
          <span className="text-on-surface font-mono">
            {Math.round(masterVol * 100)}%
          </span>
        </div>
        <div className="w-full h-2.5 slider-track relative">
          <input
            id="master-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVol}
            onChange={handleMasterVolume}
            className="w-full absolute inset-0"
          />
        </div>
      </div>

      {/* Trim B */}
      <div className="flex flex-col">
        <div className="flex justify-between w-full text-xs text-outline mb-2 font-bold uppercase tracking-wider">
          <span>Trim B</span>
          <span className="text-deck-b font-mono">
            {gainB > 0 ? "+" : ""}{gainB.toFixed(1)} dB
          </span>
        </div>
        <div className="w-full h-2.5 slider-track relative">
          <input
            id="gain-b"
            type="range"
            min={-12}
            max={12}
            step={0.5}
            value={gainB}
            onChange={handleGainB}
            className="w-full absolute inset-0"
          />
        </div>
      </div>

      {/* Curve Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-outline uppercase tracking-wider font-bold">Curve</span>
        <select
          id="crossfader-curve"
          value={curve}
          onChange={handleCurve}
          className="text-xs px-2 py-1 rounded bg-surface-container text-on-surface cursor-pointer"
        >
          <option value="constant_power">Smooth</option>
          <option value="linear">Linear</option>
          <option value="sharp">Sharp</option>
        </select>
      </div>
    </div>
  );
}
