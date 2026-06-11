/**
 * Cadence DJ System — Waveform Display
 *
 * Canvas-based waveform visualization that renders peak data
 * from the backend. Supports click-to-seek and a playhead indicator.
 * No external library needed — pure Canvas API.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { DeckStatus, WaveformData } from "../../api/client";
import { getWaveform, seekDeck } from "../../api/client";

interface WaveformDisplayProps {
  deckId: string;
  status: DeckStatus | null;
  accentColor: string;
  onAction: () => void;
}

export function WaveformDisplay({
  deckId,
  status,
  accentColor,
  onAction,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [zoom, setZoom] = useState(1); // 1 = full overview
  const loadedTrackRef = useRef<string>("");

  // Fetch waveform when track changes
  useEffect(() => {
    const trackKey = `${deckId}-${status?.track_name}-${status?.duration}`;
    if (
      status &&
      status.state !== "empty" &&
      trackKey !== loadedTrackRef.current
    ) {
      loadedTrackRef.current = trackKey;
      getWaveform(deckId)
        .then(setWaveform)
        .catch(() => setWaveform(null));
    } else if (!status || status.state === "empty") {
      setWaveform(null);
      loadedTrackRef.current = "";
    }
  }, [deckId, status?.track_name, status?.duration, status?.state]);

  // Draw waveform on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const centerY = h / 2;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0d0d15";
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = "#1e1e2e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    if (!waveform || waveform.length === 0) {
      // Empty state
      ctx.fillStyle = "#3a3a55";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No waveform data", w / 2, centerY + 4);
      return;
    }

    const { peaks_positive, peaks_negative } = waveform;
    const numPeaks = peaks_positive.length;
    const barWidth = w / numPeaks;
    const position = status?.position ?? 0;
    const duration = status?.duration ?? 1;
    const playheadX = (position / duration) * w;

    // Draw waveform bars
    for (let i = 0; i < numPeaks; i++) {
      const x = i * barWidth;
      const peakPos = peaks_positive[i];
      const peakNeg = peaks_negative[i];

      // Determine color: played portion vs upcoming
      const barProgress = i / numPeaks;
      const isPlayed = barProgress < position / duration;

      if (isPlayed) {
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.8;
      } else {
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.3;
      }

      // Positive peaks (above center)
      const posHeight = peakPos * (centerY - 2);
      ctx.fillRect(x, centerY - posHeight, Math.max(barWidth - 0.5, 0.5), posHeight);

      // Negative peaks (below center)
      const negHeight = Math.abs(peakNeg) * (centerY - 2);
      ctx.fillRect(x, centerY, Math.max(barWidth - 0.5, 0.5), negHeight);
    }

    ctx.globalAlpha = 1.0;

    // Playhead line
    if (status && status.state !== "empty") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [waveform, status?.position, status?.duration, status?.state, accentColor]);

  // Redraw on every state change
  useEffect(() => {
    draw();
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  // Click to seek
  const handleClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!status || status.state === "empty" || !status.duration) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const seekPos = ratio * status.duration;

    await seekDeck(deckId, seekPos);
    onAction();
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          Waveform
        </span>
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(1, zoom / 2))}
            className="text-[10px] px-1.5 py-0.5 rounded bg-bg-control border border-border
                       text-text-muted hover:text-text-primary hover:border-border-active
                       transition-all disabled:opacity-30"
            disabled={zoom <= 1}
          >
            −
          </button>
          <span className="text-[10px] font-mono text-text-muted w-6 text-center">
            {zoom}x
          </span>
          <button
            onClick={() => setZoom(Math.min(16, zoom * 2))}
            className="text-[10px] px-1.5 py-0.5 rounded bg-bg-control border border-border
                       text-text-muted hover:text-text-primary hover:border-border-active
                       transition-all disabled:opacity-30"
            disabled={zoom >= 16}
          >
            +
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-16 rounded-lg cursor-crosshair"
        style={{ display: "block" }}
      />
    </div>
  );
}
