/**
 * Cadence DJ System — Effects Panel Component
 * Elite Performance Console Style — Effects Unit rack
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
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-outline w-10 text-right font-semibold">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-20 h-1"
      />
      <span className="text-[10px] font-mono text-on-surface-variant w-14">
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

  const effectButtons = [
    { label: "FLT", enabled: filter.enabled, toggle: () => handleFilter({ enabled: !filter.enabled }) },
    { label: "REV", enabled: reverb.enabled, toggle: () => handleReverb({ enabled: !reverb.enabled }) },
    { label: "DLY", enabled: delay.enabled, toggle: () => handleDelay({ enabled: !delay.enabled }) },
    { label: "FLG", enabled: flanger.enabled, toggle: () => handleFlanger({ enabled: !flanger.enabled }) },
    { label: "BIT", enabled: bitcrusher.enabled, toggle: () => handleBitcrusher({ enabled: !bitcrusher.enabled }) },
  ];

  return (
    <div className="flex-1 bg-surface-inset p-3 rounded-lg border border-surface-raised relative flex flex-col shadow-inner h-full">
      <div className="text-xs text-outline uppercase tracking-widest font-bold mb-3">
        Effects Unit {deckId}
      </div>

      {/* Effect Toggle Buttons */}
      <div className="flex gap-2 justify-start items-center mb-3">
        {effectButtons.map((fx) => (
          <button
            key={fx.label}
            onClick={fx.toggle}
            className="btn-small h-9 w-14 transition-all"
            style={{
              opacity: fx.enabled ? 1 : 0.6,
              color: fx.enabled ? accentColor : undefined,
              borderColor: fx.enabled ? `${accentColor}50` : undefined,
              boxShadow: fx.enabled ? `0 0 10px ${accentColor}20` : undefined,
            }}
          >
            {fx.label}
          </button>
        ))}
      </div>

      {/* Active Effect Parameters */}
      <div className="flex flex-col gap-1.5">
        {filter.enabled && (
          <div className="flex items-center gap-2">
            <select
              value={filter.type}
              onChange={(e) => handleFilter({ type: e.target.value })}
              className="text-[10px] bg-surface px-1.5 py-1 rounded text-on-surface-variant cursor-pointer"
            >
              <option value="lowpass">LP</option>
              <option value="highpass">HP</option>
            </select>
            <ParamSlider label="Freq" value={filter.cutoff} min={20} max={20000} step={10}
              onChange={(v) => handleFilter({ cutoff: v })} unit="Hz" />
          </div>
        )}
        {reverb.enabled && (
          <div className="flex flex-col gap-1">
            <ParamSlider label="Mix" value={reverb.mix} min={0} max={1} step={0.05}
              onChange={(v) => handleReverb({ mix: v })} />
            <ParamSlider label="Decay" value={reverb.decay} min={0} max={1} step={0.05}
              onChange={(v) => handleReverb({ decay: v })} />
          </div>
        )}
        {delay.enabled && (
          <div className="flex flex-col gap-1">
            <ParamSlider label="Time" value={delay.time_ms} min={10} max={2000} step={5}
              onChange={(v) => handleDelay({ time_ms: v })} unit="ms" />
            <ParamSlider label="FB" value={delay.feedback} min={0} max={0.9} step={0.05}
              onChange={(v) => handleDelay({ feedback: v })} />
            <ParamSlider label="Mix" value={delay.mix} min={0} max={1} step={0.05}
              onChange={(v) => handleDelay({ mix: v })} />
          </div>
        )}
        {flanger.enabled && (
          <div className="flex flex-col gap-1">
            <ParamSlider label="Rate" value={flanger.rate} min={0.05} max={5} step={0.05}
              onChange={(v) => handleFlanger({ rate: v })} unit="Hz" />
            <ParamSlider label="Depth" value={flanger.depth} min={0} max={1} step={0.05}
              onChange={(v) => handleFlanger({ depth: v })} />
          </div>
        )}
        {bitcrusher.enabled && (
          <div className="flex flex-col gap-1">
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
