/**
 * Cadence DJ System — API Client
 *
 * Centralized HTTP client for communicating with the FastAPI backend.
 */

import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

// ─── Deck API ──────────────────────────────────────────

export interface DeckStatus {
  deck_id: string;
  state: "empty" | "loaded" | "playing" | "paused";
  track_name: string;
  position: number;
  duration: number;
  volume: number;
  file_path: string;
}

export interface EngineState {
  deck_a: DeckStatus;
  deck_b: DeckStatus;
  master_volume: number;
  crossfader: number;
  running: boolean;
}

export async function loadTrack(
  deckId: string,
  file: File
): Promise<DeckStatus> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/deck/${deckId}/load`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.deck;
}

export async function playDeck(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/play`);
  return res.data.deck;
}

export async function pauseDeck(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/pause`);
  return res.data.deck;
}

export async function stopDeck(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/stop`);
  return res.data.deck;
}

export async function seekDeck(
  deckId: string,
  position: number
): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/seek`, { position });
  return res.data.deck;
}

export async function setDeckVolume(
  deckId: string,
  volume: number
): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/volume`, { volume });
  return res.data.deck;
}

export async function getDeckStatus(deckId: string): Promise<DeckStatus> {
  const res = await api.get(`/deck/${deckId}/status`);
  return res.data.deck;
}

export async function getEngineState(): Promise<EngineState> {
  const res = await api.get(`/engine/state`);
  return res.data.engine;
}

export default api;
