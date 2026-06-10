/**
 * Cadence DJ System — Track List Component
 *
 * Displays the library tracks in a sortable table with
 * load-to-deck buttons and metadata columns.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { EngineState } from "../../api/client";
import api from "../../api/client";

interface TrackData {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  bpm: number | null;
  file_path: string;
  file_name: string;
}

interface TrackListProps {
  engineState: EngineState | null;
  onAction: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function TrackList({ engineState: _engineState, onAction }: TrackListProps) {
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTracks = useCallback(async () => {
    try {
      const res = await api.get("/library/tracks");
      setTracks(res.data.tracks);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.post("/library/tracks/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await fetchTracks();
    } catch (err) {
      console.error("Import failed:", err);
    }
    setLoading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLoadToDeck = async (trackId: string, deckId: string) => {
    try {
      await api.post(`/library/tracks/${trackId}/load/${deckId}`);
      onAction();
    } catch (err) {
      console.error("Load to deck failed:", err);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await api.delete(`/library/tracks/${trackId}`);
      await fetchTracks();
    } catch (err) {
      console.error("Remove failed:", err);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg-panel border border-border p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-purple"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">
            Library
          </span>
          <span className="text-xs text-text-muted font-mono">
            {tracks.length} tracks
          </span>
        </div>

        <button
          id="import-track"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="text-[11px] px-3 py-1 rounded-lg bg-accent-purple/15 border border-accent-purple/30
                     text-accent-purple hover:bg-accent-purple/25 hover:border-accent-purple/50
                     disabled:opacity-50 transition-all duration-200"
        >
          {loading ? "Importing..." : "+ Import"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* Track Table */}
      {tracks.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-sm">
          No tracks imported yet. Click "Import" to add audio files.
        </div>
      ) : (
        <div className="overflow-auto max-h-[240px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted uppercase tracking-wider border-b border-border">
                <th className="text-left py-1.5 px-2 font-semibold">#</th>
                <th className="text-left py-1.5 px-2 font-semibold">Title</th>
                <th className="text-left py-1.5 px-2 font-semibold">Artist</th>
                <th className="text-right py-1.5 px-2 font-semibold">Time</th>
                <th className="text-right py-1.5 px-2 font-semibold">BPM</th>
                <th className="text-center py-1.5 px-2 font-semibold">Load</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => (
                <tr
                  key={track.id}
                  className="border-b border-border/50 hover:bg-bg-hover/50 transition-colors group"
                >
                  <td className="py-1.5 px-2 text-text-muted font-mono">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2 text-text-primary font-medium truncate max-w-[200px]">
                    {track.title}
                  </td>
                  <td className="py-1.5 px-2 text-text-secondary truncate max-w-[150px]">
                    {track.artist}
                  </td>
                  <td className="py-1.5 px-2 text-text-muted font-mono text-right">
                    {formatDuration(track.duration)}
                  </td>
                  <td className="py-1.5 px-2 text-text-muted font-mono text-right">
                    {track.bpm ? track.bpm.toFixed(0) : "—"}
                  </td>
                  <td className="py-1.5 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleLoadToDeck(track.id, "A")}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold
                                   bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30
                                   hover:bg-accent-cyan/30 transition-all opacity-0 group-hover:opacity-100"
                        title="Load to Deck A"
                      >
                        A
                      </button>
                      <button
                        onClick={() => handleLoadToDeck(track.id, "B")}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold
                                   bg-accent-magenta/15 text-accent-magenta border border-accent-magenta/30
                                   hover:bg-accent-magenta/30 transition-all opacity-0 group-hover:opacity-100"
                        title="Load to Deck B"
                      >
                        B
                      </button>
                      <button
                        onClick={() => handleRemoveTrack(track.id)}
                        className="px-1.5 py-0.5 rounded text-[10px]
                                   text-text-muted hover:text-accent-magenta
                                   transition-all opacity-0 group-hover:opacity-100"
                        title="Remove from library"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
