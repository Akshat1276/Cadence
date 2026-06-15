/**
 * Cadence DJ System — Track List Component
 * Elite Performance Console Style — Library drawer in footer
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
  const [expanded, setExpanded] = useState(false);
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
    <div>
      {/* Library Header Bar */}
      <div
        className="h-12 px-6 flex justify-between items-center cursor-pointer hover:bg-surface-container-high transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 text-on-surface">
          <span className="material-symbols-outlined text-[22px]">library_music</span>
          <span className="font-bold text-base tracking-wide">Library</span>
          <span className="text-sm text-outline font-mono bg-surface-inset px-2 py-0.5 rounded ml-2">
            {tracks.length} tracks
          </span>
        </div>

        {tracks.length === 0 && !expanded && (
          <div className="text-sm text-outline/60 italic font-medium">
            No tracks imported yet. Click "Import" to add audio files.
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            id="import-track"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={loading}
            className="btn-small !py-1.5 !px-3 flex items-center gap-2 text-sm disabled:opacity-50"
            style={{ borderColor: "rgba(0,242,255,0.3)", color: "#00f2ff" }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            {loading ? "Importing..." : "Import"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleImportFile}
            className="hidden"
          />
          <span className="material-symbols-outlined text-outline text-[20px]">
            {expanded ? "expand_more" : "expand_less"}
          </span>
        </div>
      </div>

      {/* Expanded Track Table */}
      {expanded && tracks.length > 0 && (
        <div className="max-h-[200px] overflow-auto border-t border-surface-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-outline uppercase tracking-wider text-xs bg-surface-container-low sticky top-0 z-10">
                <th className="text-left py-2 px-4 font-bold w-10">#</th>
                <th className="text-left py-2 px-4 font-bold">Title</th>
                <th className="text-left py-2 px-4 font-bold">Artist</th>
                <th className="text-right py-2 px-4 font-bold w-20">Time</th>
                <th className="text-right py-2 px-4 font-bold w-16">BPM</th>
                <th className="text-center py-2 px-4 font-bold w-28">Load</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track, idx) => (
                <tr
                  key={track.id}
                  className="border-b border-surface-raised/50 hover:bg-surface-container-high/50 transition-colors group"
                >
                  <td className="py-2 px-4 text-outline font-mono text-xs">{idx + 1}</td>
                  <td className="py-2 px-4 text-on-surface font-medium truncate max-w-[200px]">{track.title}</td>
                  <td className="py-2 px-4 text-on-surface-variant truncate max-w-[150px]">{track.artist}</td>
                  <td className="py-2 px-4 text-outline font-mono text-right text-xs">{formatDuration(track.duration)}</td>
                  <td className="py-2 px-4 text-outline font-mono text-right text-xs">{track.bpm ? track.bpm.toFixed(0) : "—"}</td>
                  <td className="py-2 px-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoadToDeck(track.id, "A")}
                        className="btn-small !text-[10px] !px-2 !py-0.5 text-deck-a border-deck-a/30"
                      >A</button>
                      <button
                        onClick={() => handleLoadToDeck(track.id, "B")}
                        className="btn-small !text-[10px] !px-2 !py-0.5 text-deck-b border-deck-b/30"
                      >B</button>
                      <button
                        onClick={() => handleRemoveTrack(track.id)}
                        className="btn-small !text-[10px] !px-1.5 !py-0.5 text-alert-critical"
                      >✕</button>
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
