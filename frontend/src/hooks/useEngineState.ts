/**
 * Cadence DJ System — WebSocket Hook
 *
 * Connects to the backend WebSocket endpoint for real-time
 * engine state updates. Replaces the polling approach from PR 1.
 * Falls back to REST polling if WebSocket connection fails.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { EngineState } from "../api/client";
import { getEngineState } from "../api/client";

const WS_URL = `ws://${window.location.hostname}:8000/ws/state`;
const RECONNECT_DELAY = 2000;
const POLL_FALLBACK_INTERVAL = 250;

export function useEngineState() {
  const [state, setState] = useState<EngineState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual refresh — still useful after user actions for immediate feedback
  const refresh = useCallback(async () => {
    try {
      const engineState = await getEngineState();
      setState(engineState);
      setError(null);
    } catch {
      // Silently fail — WS will update soon
    }
  }, []);

  // Start WebSocket connection
  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
      setError(null);
      // Stop polling fallback when WS connects
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const engineState: EngineState = JSON.parse(event.data);
        setState(engineState);
        setError(null);
      } catch {
        // Ignore parse errors
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection error");
      setConnected(false);
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      // Start polling fallback
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(async () => {
          try {
            const engineState = await getEngineState();
            setState(engineState);
            setError(null);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Failed to connect to backend"
            );
          }
        }, POLL_FALLBACK_INTERVAL);
      }

      // Schedule reconnection
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [connect]);

  return { state, error, connected, refresh };
}
