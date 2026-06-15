/**
 * Cadence DJ System — Recording Panel (Compact for footer status bar)
 * Elite Performance Console Style
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

  const recState = recording?.state ?? "idle";
  const isRecording = recState === "recording";
  const isPaused = recState === "paused";
  const isIdle = recState === "idle";

  useEffect(() => {
    if (showList) {
      listRecordings().then(setRecordings).catch(console.error);
    }
  }, [showList]);

  const handleStart = async () => { await startRecording(); onAction(); };
  const handleStop = async () => {
    await stopRecording(); onAction();
    if (showList) { const recs = await listRecordings(); setRecordings(recs); }
  };
  const handlePause = async () => { await pauseRecording(); onAction(); };
  const handleResume = async () => { await resumeRecording(); onAction(); };

  const handleExport = async (rec: RecordingInfo, format: string) => {
    setExporting(rec.filename);
    try {
      await exportRecording(rec.path, format);
      const recs = await listRecordings();
      setRecordings(recs);
    } catch (err) { console.error("Export failed:", err); }
    setExporting(null);
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteRecording(filename);
      setRecordings((prev) => prev.filter((r) => r.filename !== filename));
    } catch (err) { console.error("Delete failed:", err); }
  };

  return (
    <div className="flex items-center gap-3 relative">
      {/* REC indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 text-alert-critical bg-alert-critical/10 px-2 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-alert-critical animate-rec-pulse" />
          <span className="uppercase tracking-widest font-bold text-[10px]">REC</span>
          <span className="font-mono text-[10px]">{formatDuration(recording?.duration ?? 0)}</span>
        </div>
      )}
      {isPaused && (
        <div className="flex items-center gap-2 text-accent-yellow bg-accent-yellow/10 px-2 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-accent-yellow" />
          <span className="uppercase tracking-widest font-bold text-[10px]">PAUSED</span>
          <span className="font-mono text-[10px]">{formatDuration(recording?.duration ?? 0)}</span>
        </div>
      )}

      {/* Controls */}
      {isIdle ? (
        <button onClick={handleStart} className="btn-small !text-[10px] !px-2 !py-1 text-alert-critical border-alert-critical/30">
          ● REC
        </button>
      ) : (
        <>
          <button onClick={handleStop} className="btn-small !text-[10px] !px-2 !py-1">■</button>
          {isRecording ? (
            <button onClick={handlePause} className="btn-small !text-[10px] !px-2 !py-1 text-accent-yellow">❚❚</button>
          ) : (
            <button onClick={handleResume} className="btn-small !text-[10px] !px-2 !py-1 text-active-sync">▶</button>
          )}
        </>
      )}

      {/* Files toggle */}
      <button
        onClick={() => setShowList(!showList)}
        className="btn-small !text-[10px] !px-2 !py-1"
      >
        {showList ? "Hide" : "Files"}
        {recordings.length > 0 && ` (${recordings.length})`}
      </button>

      {/* Recordings dropdown */}
      {showList && (
        <div className="absolute bottom-full left-0 mb-2 w-96 max-h-60 overflow-y-auto
                       bg-surface-container-high border border-surface-raised rounded-lg shadow-xl p-3 flex flex-col gap-2 z-50">
          {recordings.length === 0 ? (
            <span className="text-xs text-outline italic text-center py-3">No recordings yet</span>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.filename}
                className="flex items-center justify-between px-3 py-2 rounded bg-surface-container border border-surface-raised text-xs"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-on-surface truncate font-medium">{rec.filename}</span>
                  <span className="text-outline font-mono text-[10px]">
                    {rec.file_size_mb}MB{rec.duration > 0 && ` • ${formatDuration(rec.duration)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  {rec.format === "wav" && (
                    <>
                      <button onClick={() => handleExport(rec, "flac")} disabled={exporting === rec.filename}
                        className="btn-small !text-[9px] !px-1.5 !py-0.5 disabled:opacity-30">FLAC</button>
                      <button onClick={() => handleExport(rec, "mp3")} disabled={exporting === rec.filename}
                        className="btn-small !text-[9px] !px-1.5 !py-0.5 disabled:opacity-30">MP3</button>
                    </>
                  )}
                  <a href={`/api/recording/download/${rec.filename}`} download
                    className="btn-small !text-[9px] !px-1.5 !py-0.5">↓</a>
                  <button onClick={() => handleDelete(rec.filename)}
                    className="btn-small !text-[9px] !px-1.5 !py-0.5 text-alert-critical">×</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
