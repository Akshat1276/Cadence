/**
 * Cadence DJ System — Effects Panel Component
 *
 * Per-deck effects controls: filter, reverb, delay, flanger, bitcrusher.
 * Each effect has an enable toggle and parameter sliders.
 */

import type { EffectsState } from "../../api/client";
import {
  setFilter,
  setReverb,
  setDelay,
  setFlanger,
  setBitcrusher,
} from "../../api/client";

interface EffectsPanelProps {
  deckId: string;
  effects: EffectsState | null;
  accentColor: string;
  onAction: () => void;
}

function EffectToggle({
  label,
  enabled,
  onToggle,
  accentColor,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md
                 border transition-all duration-200"
      style={{
        color: enabled ? accentColor : "#6b7280",
        backgroundColor: enabled ? `${accentColor}15` : "transparent",
        borderColor: enabled ? `${accentColor}40` : "#2a2a3e",
      }}
    >
      {label}
    </button>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-text-muted w-8 text-right">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-16 h-1"
      />
      <span className="text-[9px] font-mono text-text-muted w-12">
        {typeof value === "number" && value % 1 === 0
          ? value
          : value.toFixed(1)}
        {unit || ""}
      </span>
    </div>
  );
}

export function EffectsPanel({
  deckId,
  effects,
  accentColor,
  onAction,
}: EffectsPanelProps) {
  if (!effects) return null;

  const { filter, reverb, delay, flanger, bitcrusher } = effects;

  const handleFilter = async (updates: Partial<typeof filter>) => {
    await setFilter(deckId, {
      enabled: updates.enabled ?? filter.enabled,
      filter_type: updates.type ?? filter.type,
      cutoff: updates.cutoff ?? filter.cutoff,
    });
    onAction();
  };

  const handleReverb = async (updates: Partial<typeof reverb>) => {
    await setReverb(deckId, { ...reverb, ...updates });
    onAction();
  };

  const handleDelay = async (updates: Partial<typeof delay>) => {
    await setDelay(deckId, { ...delay, ...updates });
    onAction();
  };

  const handleFlanger = async (updates: Partial<typeof flanger>) => {
    await setFlanger(deckId, { ...flanger, ...updates });
    onAction();
  };

  const handleBitcrusher = async (updates: Partial<typeof bitcrusher>) => {
    await setBitcrusher(deckId, { ...bitcrusher, ...updates });
    onAction();
  };

  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg bg-bg-control border border-border">
      <span className="text-[10px] uppercase tracking-widest text-text-muted font-semibold text-center">
        Effects
      </span>

      <div className="flex flex-wrap gap-1 justify-center">
        {/* Effect toggles */}
        <EffectToggle
          label="FLT"
          enabled={filter.enabled}
          onToggle={() => handleFilter({ enabled: !filter.enabled })}
          accentColor={accentColor}
        />
        <EffectToggle
          label="REV"
          enabled={reverb.enabled}
          onToggle={() => handleReverb({ enabled: !reverb.enabled })}
          accentColor={accentColor}
        />
        <EffectToggle
          label="DLY"
          enabled={delay.enabled}
          onToggle={() => handleDelay({ enabled: !delay.enabled })}
          accentColor={accentColor}
        />
        <EffectToggle
          label="FLG"
          enabled={flanger.enabled}
          onToggle={() => handleFlanger({ enabled: !flanger.enabled })}
          accentColor={accentColor}
        />
        <EffectToggle
          label="BIT"
          enabled={bitcrusher.enabled}
          onToggle={() => handleBitcrusher({ enabled: !bitcrusher.enabled })}
          accentColor={accentColor}
        />
      </div>

      {/* Expanded parameters for active effects */}
      <div className="flex flex-col gap-1.5">
        {filter.enabled && (
          <div className="flex flex-col gap-0.5 px-1">
            <div className="flex items-center gap-1">
              <select
                value={filter.type}
                onChange={(e) => handleFilter({ type: e.target.value })}
                className="text-[9px] bg-bg-primary border border-border rounded px-1 py-0.5
                           text-text-secondary cursor-pointer"
              >
                <option value="lowpass">LP</option>
                <option value="highpass">HP</option>
              </select>
              <ParamSlider
                label="Freq"
                value={filter.cutoff}
                min={20}
                max={20000}
                step={10}
                onChange={(v) => handleFilter({ cutoff: v })}
                unit="Hz"
              />
            </div>
          </div>
        )}

        {reverb.enabled && (
          <div className="flex flex-col gap-0.5 px-1">
            <ParamSlider label="Mix" value={reverb.mix} min={0} max={1} step={0.05}
              onChange={(v) => handleReverb({ mix: v })} />
            <ParamSlider label="Decay" value={reverb.decay} min={0} max={1} step={0.05}
              onChange={(v) => handleReverb({ decay: v })} />
          </div>
        )}

        {delay.enabled && (
          <div className="flex flex-col gap-0.5 px-1">
            <ParamSlider label="Time" value={delay.time_ms} min={10} max={2000} step={5}
              onChange={(v) => handleDelay({ time_ms: v })} unit="ms" />
            <ParamSlider label="FB" value={delay.feedback} min={0} max={0.9} step={0.05}
              onChange={(v) => handleDelay({ feedback: v })} />
            <ParamSlider label="Mix" value={delay.mix} min={0} max={1} step={0.05}
              onChange={(v) => handleDelay({ mix: v })} />
          </div>
        )}

        {flanger.enabled && (
          <div className="flex flex-col gap-0.5 px-1">
            <ParamSlider label="Rate" value={flanger.rate} min={0.05} max={5} step={0.05}
              onChange={(v) => handleFlanger({ rate: v })} unit="Hz" />
            <ParamSlider label="Depth" value={flanger.depth} min={0} max={1} step={0.05}
              onChange={(v) => handleFlanger({ depth: v })} />
          </div>
        )}

        {bitcrusher.enabled && (
          <div className="flex flex-col gap-0.5 px-1">
            <ParamSlider label="Bits" value={bitcrusher.bit_depth} min={2} max={16} step={1}
              onChange={(v) => handleBitcrusher({ bit_depth: Math.round(v) })} />
            <ParamSlider label="Crush" value={bitcrusher.downsample} min={1} max={32} step={1}
              onChange={(v) => handleBitcrusher({ downsample: Math.round(v) })} />
          </div>
        )}
      </div>
    </div>
  );
}
