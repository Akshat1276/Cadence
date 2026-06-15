/**
 * Cadence DJ System — Spectrum Analyzer
 * Elite Performance Console Style — Master Spectrum bar at top
 */

import { useRef, useEffect } from "react";
import type { SpectrumState } from "../../api/client";

interface SpectrumAnalyzerProps {
  spectrum: SpectrumState | null;
  height?: number;
}

// LED gradient: green → yellow → red
function bandColor(index: number, total: number): string {
  const t = index / (total - 1);
  const h = 180 - t * 120;
  const hue = h < 0 ? h + 360 : h;
  return `hsl(${hue}, 85%, 55%)`;
}

export function SpectrumAnalyzer({
  spectrum,
  height = 96,
}: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bands = spectrum?.bands ?? [];
    const numBands = bands.length || 32;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (bands.length === 0) return;

    const barWidth = (w - (numBands - 1) * 1) / numBands;
    const cornerRadius = Math.min(barWidth / 3, 2);

    for (let i = 0; i < numBands; i++) {
      const value = Math.max(0, Math.min(1, bands[i] ?? 0));
      const barHeight = value * (h - 4);

      if (barHeight < 1) continue;

      const x = i * (barWidth + 1);
      const y = h - barHeight;

      const gradient = ctx.createLinearGradient(x, h, x, y);
      const color = bandColor(i, numBands);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color.replace("55%", "75%"));

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.5 + value * 0.5;

      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x, y + cornerRadius);
      ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
      ctx.lineTo(x + barWidth - cornerRadius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + cornerRadius);
      ctx.lineTo(x + barWidth, h);
      ctx.closePath();
      ctx.fill();

      if (value > 0.7) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    }
  }, [spectrum, height]);

  return (
    <section className="bg-surface-inset rounded-lg border border-surface-raised relative overflow-hidden flex flex-col shadow-inner"
      style={{ height, minHeight: height, flexShrink: 0 }}>
      <div className="absolute top-2 left-4 text-xs text-outline uppercase tracking-[0.15em] font-bold z-10">
        Master Spectrum
      </div>
      {spectrum?.peak_freq && (
        <div className="absolute top-2 right-4 text-xs font-mono text-deck-a z-10">
          {spectrum.peak_freq > 1000
            ? `${(spectrum.peak_freq / 1000).toFixed(1)}kHz`
            : `${Math.round(spectrum.peak_freq)}Hz`}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-deck-a/40" />
    </section>
  );
}
