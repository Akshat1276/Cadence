/**
 * Cadence DJ System — Spectrum Analyzer
 *
 * Canvas-based FFT bar visualization. Draws 32 frequency bands
 * with gradient coloring from cyan → magenta, animated at WebSocket rate.
 */

import { useRef, useEffect } from "react";
import type { SpectrumState } from "../../api/client";

interface SpectrumAnalyzerProps {
  spectrum: SpectrumState | null;
  height?: number;
}

// Color gradient: cyan → purple → magenta
function bandColor(index: number, total: number): string {
  const t = index / (total - 1);
  // Cyan → Purple → Magenta gradient via HSL
  const h = 180 - t * 120; // 180 (cyan) → 60 → 300+ (magenta)
  const hue = h < 0 ? h + 360 : h;
  return `hsl(${hue}, 85%, 55%)`;
}

export function SpectrumAnalyzer({
  spectrum,
  height = 80,
}: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bands = spectrum?.bands ?? [];
    const numBands = bands.length || 32;

    // Handle DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    if (bands.length === 0) return;

    const barWidth = (w - (numBands - 1) * 1) / numBands; // 1px gap
    const cornerRadius = Math.min(barWidth / 3, 2);

    for (let i = 0; i < numBands; i++) {
      const value = Math.max(0, Math.min(1, bands[i] ?? 0));
      const barHeight = value * (h - 4); // Leave 4px padding

      if (barHeight < 1) continue;

      const x = i * (barWidth + 1);
      const y = h - barHeight;

      // Gradient fill per bar
      const gradient = ctx.createLinearGradient(x, h, x, y);
      const color = bandColor(i, numBands);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color.replace("55%", "75%"));

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.5 + value * 0.5; // Brighter when louder

      // Rounded top corners
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x, y + cornerRadius);
      ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
      ctx.lineTo(x + barWidth - cornerRadius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + cornerRadius);
      ctx.lineTo(x + barWidth, h);
      ctx.closePath();
      ctx.fill();

      // Glow effect for high-energy bands
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
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-bg-panel border border-border">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-text-muted font-semibold">
          Spectrum
        </span>
        {spectrum?.peak_freq ? (
          <span className="text-[9px] font-mono text-accent-cyan">
            {spectrum.peak_freq > 1000
              ? `${(spectrum.peak_freq / 1000).toFixed(1)}kHz`
              : `${Math.round(spectrum.peak_freq)}Hz`}
          </span>
        ) : null}
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: `${height}px` }}
        className="rounded"
      />
    </div>
  );
}
