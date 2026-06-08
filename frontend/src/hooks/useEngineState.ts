/**
 * Cadence DJ System — Deck Status Polling Hook
 *
 * Polls the backend for the current state of both decks at a fixed interval.
 * Will be upgraded to WebSocket in PR 3.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { EngineState } from "../api/client";
import { getEngineState } from "../api/client";

const POLL_INTERVAL = 200; // ms

export function useEngineState() {
  const [state, setState] = useState<EngineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const engineState = await getEngineState();
      setState(engineState);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to backend"
      );
    }
  }, []);

  useEffect(() => {
    fetchState();
    intervalRef.current = setInterval(fetchState, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchState]);

  return { state, error, refresh: fetchState };
}
