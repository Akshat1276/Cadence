/**
 * Cadence DJ System — Waveform Display
 * Elite Performance Console Style — Recessed waveform well with playhead
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
  const [zoom, setZoom] = useState(1);
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

    // Clear — deep black recessed background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = "#1c1b1d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(w, centerY);
    ctx.stroke();

    if (!waveform || waveform.length === 0) {
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

      const barProgress = i / numPeaks;
      const isPlayed = barProgress < position / duration;

      ctx.fillStyle = accentColor;
      ctx.globalAlpha = isPlayed ? 0.85 : 0.3;

      const posHeight = peakPos * (centerY - 2);
      ctx.fillRect(x, centerY - posHeight, Math.max(barWidth - 0.5, 0.5), posHeight);

      const negHeight = Math.abs(peakNeg) * (centerY - 2);
      ctx.fillRect(x, centerY, Math.max(barWidth - 0.5, 0.5), negHeight);
    }

    ctx.globalAlpha = 1.0;

    // Playhead line with glow
    if (status && status.state !== "empty") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [waveform, status?.position, status?.duration, status?.state, accentColor]);

  useEffect(() => { draw(); }, [draw]);

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
    <div className="h-28 bg-surface-inset relative flex items-center justify-center overflow-hidden border-b border-surface-raised shadow-inner">
      {/* Label */}
      <div className="absolute top-2 left-4 text-xs text-outline uppercase tracking-widest font-bold z-10">
        Waveform
      </div>

      {/* Zoom controls */}
      <div className="absolute top-2 right-4 flex gap-1.5 z-10 bg-surface-container/80 backdrop-blur rounded p-1">
        <button
          onClick={() => setZoom(Math.max(1, zoom / 2))}
          className="w-6 h-6 rounded bg-surface hover:bg-surface-raised text-outline hover:text-white
                     flex items-center justify-center font-bold text-lg leading-none"
          disabled={zoom <= 1}
        >
          -
        </button>
        <span className="text-on-surface text-xs font-mono flex items-center px-1">{zoom}x</span>
        <button
          onClick={() => setZoom(Math.min(16, zoom * 2))}
          className="w-6 h-6 rounded bg-surface hover:bg-surface-raised text-outline hover:text-white
                     flex items-center justify-center font-bold text-lg leading-none"
          disabled={zoom >= 16}
        >
          +
        </button>
      </div>

      {/* Center playhead indicator */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 49%, ${accentColor} 50%, transparent 51%)`,
        }}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ display: "block" }}
      />

      {/* Empty state overlay */}
      {(!waveform || waveform.length === 0) && (
        <span className="text-outline/40 text-sm uppercase tracking-widest font-semibold z-10 pointer-events-none">
          No waveform data
        </span>
      )}
    </div>
  );
}
