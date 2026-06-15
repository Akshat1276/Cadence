/**
 * Cadence DJ System — Recording Panel Component
 *
 * Controls for recording the master output. Shows recording state,
 * elapsed time, and lists past recordings with export/download/delete.
 */

import { useState, useEffect } from "react";
import type { RecordingState, RecordingInfo } from "../../api/client";
import {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  listRecordings,
  exportRecording,
  deleteRecording,
} from "../../api/client";

interface RecordingPanelProps {
  recording: RecordingState | null;
  onAction: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function RecordingPanel({ recording, onAction }: RecordingPanelProps) {
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [showList, setShowList] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const state = recording?.state ?? "idle";
  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const isIdle = state === "idle";

  // Refresh recordings list when panel opens
  useEffect(() => {
    if (showList) {
      listRecordings().then(setRecordings).catch(console.error);
    }
  }, [showList]);

  const handleStart = async () => {
    await startRecording();
    onAction();
  };

  const handleStop = async () => {
    await stopRecording();
    onAction();
    // Refresh recordings list after stopping
    if (showList) {
      const recs = await listRecordings();
      setRecordings(recs);
    }
  };

  const handlePause = async () => {
    await pauseRecording();
    onAction();
  };

  const handleResume = async () => {
    await resumeRecording();
    onAction();
  };

  const handleExport = async (rec: RecordingInfo, format: string) => {
    setExporting(rec.filename);
    try {
      await exportRecording(rec.path, format);
      const recs = await listRecordings();
      setRecordings(recs);
    } catch (err) {
      console.error("Export failed:", err);
    }
    setExporting(null);
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteRecording(filename);
      setRecordings((prev) => prev.filter((r) => r.filename !== filename));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-bg-panel border border-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Recording indicator */}
          {isRecording && (
            <span
              className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"
              style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
            />
          )}
          {isPaused && (
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          )}
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Record
          </span>
          {!isIdle && (
            <span className="text-xs font-mono text-text-secondary">
              {formatDuration(recording?.duration ?? 0)}
            </span>
          )}
        </div>

        {/* Recordings list toggle */}
        <button
          onClick={() => setShowList(!showList)}
          className="text-[10px] px-2 py-0.5 rounded border border-border
                     text-text-muted hover:text-text-primary hover:border-border-active
                     transition-all"
        >
          {showList ? "Hide" : "Files"}{" "}
          {recordings.length > 0 && `(${recordings.length})`}
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {isIdle ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5
                       rounded-lg border border-red-500/40 bg-red-500/10
                       text-red-400 hover:bg-red-500/20 hover:border-red-500/60
                       transition-all active:scale-95"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            REC
          </button>
        ) : (
          <>
            {/* Stop */}
            <button
              onClick={handleStop}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg
                         border border-border bg-bg-control
                         text-text-secondary hover:text-text-primary
                         hover:border-border-active transition-all active:scale-95"
              title="Stop recording"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>

            {/* Pause / Resume */}
            {isRecording ? (
              <button
                onClick={handlePause}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg
                           border border-yellow-500/40 bg-yellow-500/10
                           text-yellow-400 hover:bg-yellow-500/20
                           transition-all active:scale-95"
                title="Pause recording"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleResume}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg
                           border border-accent-green/40 bg-accent-green/10
                           text-accent-green hover:bg-accent-green/20
                           transition-all active:scale-95"
                title="Resume recording"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>
            )}

            {/* Recording name */}
            <span className="text-[10px] text-text-muted font-mono truncate ml-1">
              {recording?.name}
            </span>
          </>
        )}
      </div>

      {/* Recordings List */}
      {showList && (
        <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto">
          {recordings.length === 0 ? (
            <span className="text-[10px] text-text-muted italic text-center py-2">
              No recordings yet
            </span>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.filename}
                className="flex items-center justify-between px-2 py-1
                           rounded bg-bg-control border border-border text-[10px]"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-text-primary truncate font-medium">
                    {rec.filename}
                  </span>
                  <span className="text-text-muted font-mono">
                    {rec.file_size_mb}MB
                    {rec.duration > 0 && ` • ${formatDuration(rec.duration)}`}
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {/* Export buttons */}
                  {rec.format === "wav" && (
                    <>
                      <button
                        onClick={() => handleExport(rec, "flac")}
                        disabled={exporting === rec.filename}
                        className="px-1.5 py-0.5 rounded border border-border
                                   text-text-muted hover:text-accent-cyan
                                   hover:border-accent-cyan/40
                                   transition-all disabled:opacity-30"
                        title="Export as FLAC"
                      >
                        FLAC
                      </button>
                      <button
                        onClick={() => handleExport(rec, "mp3")}
                        disabled={exporting === rec.filename}
                        className="px-1.5 py-0.5 rounded border border-border
                                   text-text-muted hover:text-accent-purple
                                   hover:border-accent-purple/40
                                   transition-all disabled:opacity-30"
                        title="Export as MP3"
                      >
                        MP3
                      </button>
                    </>
                  )}

                  {/* Download */}
                  <a
                    href={`/api/recording/download/${rec.filename}`}
                    download
                    className="px-1.5 py-0.5 rounded border border-border
                               text-text-muted hover:text-accent-green
                               hover:border-accent-green/40 transition-all"
                    title="Download"
                  >
                    ↓
                  </a>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(rec.filename)}
                    className="px-1.5 py-0.5 rounded border border-border
                               text-text-muted hover:text-accent-magenta
                               hover:border-accent-magenta/40 transition-all"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
