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

// ─── Types ─────────────────────────────────────────────

export interface CuePoint {
  slot: number;
  position: number;
  name: string;
  color: string;
}

export interface LoopState {
  enabled: boolean;
  in_point: number;
  out_point: number;
  length: number;
  is_valid: boolean;
}

export interface TempoState {
  speed: number;
  original_bpm: number;
  effective_bpm: number;
}

export interface DeckStatus {
  deck_id: string;
  state: "empty" | "loaded" | "playing" | "paused";
  track_name: string;
  position: number;
  duration: number;
  volume: number;
  file_path: string;
  eq: EQState;
  effects: EffectsState;
  cue_points: CuePoint[];
  loop: LoopState;
  bpm: number;
  beat_count: number;
  tempo: TempoState;
}

export interface EQState {
  enabled: boolean;
  low_db: number;
  mid_db: number;
  high_db: number;
}

export interface FilterState {
  enabled: boolean;
  type: string;
  cutoff: number;
  resonance: number;
}

export interface ReverbState {
  enabled: boolean;
  mix: number;
  decay: number;
  room_size: number;
}

export interface DelayState {
  enabled: boolean;
  time_ms: number;
  feedback: number;
  mix: number;
}

export interface FlangerState {
  enabled: boolean;
  rate: number;
  depth: number;
  mix: number;
}

export interface BitcrusherState {
  enabled: boolean;
  bit_depth: number;
  downsample: number;
}

export interface EffectsState {
  filter: FilterState;
  reverb: ReverbState;
  delay: DelayState;
  flanger: FlangerState;
  bitcrusher: BitcrusherState;
}

export interface MixerState {
  crossfader: number;
  master_volume: number;
  gain_a_db: number;
  gain_b_db: number;
  crossfader_curve: string;
}

export interface PeakLevels {
  peak_l: number;
  peak_r: number;
  rms_l: number;
  rms_r: number;
  peak_db_l: number;
  peak_db_r: number;
  rms_db_l: number;
  rms_db_r: number;
}

export interface LevelsState {
  deck_a: PeakLevels;
  deck_b: PeakLevels;
  master: PeakLevels;
}

export interface WaveformData {
  peaks_positive: number[];
  peaks_negative: number[];
  length: number;
  duration?: number;
  start?: number;
  end?: number;
}

export interface EngineState {
  deck_a: DeckStatus;
  deck_b: DeckStatus;
  mixer: MixerState;
  levels: LevelsState;
  running: boolean;
}

// ─── Deck API ──────────────────────────────────────────

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

export async function getWaveform(
  deckId: string,
  start?: number,
  end?: number,
  peaks?: number
): Promise<WaveformData> {
  const params: Record<string, number> = {};
  if (start !== undefined) params.start = start;
  if (end !== undefined) params.end = end;
  if (peaks !== undefined) params.peaks = peaks;
  const res = await api.get(`/deck/${deckId}/waveform`, { params });
  return res.data.waveform;
}

// ─── Mixer API ─────────────────────────────────────────

export async function setCrossfader(position: number): Promise<MixerState> {
  const res = await api.post("/mixer/crossfader", { position });
  return res.data.mixer;
}

export async function setMasterVolume(volume: number): Promise<MixerState> {
  const res = await api.post("/mixer/master-volume", { volume });
  return res.data.mixer;
}

export async function setGain(
  deckId: string,
  gain_db: number
): Promise<MixerState> {
  const res = await api.post(`/mixer/gain/${deckId}`, { gain_db });
  return res.data.mixer;
}

export async function setCrossfaderCurve(curve: string): Promise<MixerState> {
  const res = await api.post("/mixer/crossfader-curve", { curve });
  return res.data.mixer;
}

export async function getMixerState(): Promise<MixerState> {
  const res = await api.get("/mixer/state");
  return res.data.mixer;
}

// ─── EQ & Effects API ──────────────────────────────────

export async function setEQ(
  deckId: string,
  low_db: number,
  mid_db: number,
  high_db: number
): Promise<EQState> {
  const res = await api.post(`/effects/${deckId}/eq`, { low_db, mid_db, high_db });
  return res.data.eq;
}

export async function setEQBand(
  deckId: string,
  band: "low" | "mid" | "high",
  gain_db: number
): Promise<EQState> {
  const res = await api.post(`/effects/${deckId}/eq/${band}`, { gain_db });
  return res.data.eq;
}

export async function resetEQ(deckId: string): Promise<EQState> {
  const res = await api.post(`/effects/${deckId}/eq/reset`);
  return res.data.eq;
}

export async function setFilter(
  deckId: string,
  params: { enabled: boolean; filter_type: string; cutoff: number }
): Promise<FilterState> {
  const res = await api.post(`/effects/${deckId}/filter`, params);
  return res.data.filter;
}

export async function setReverb(
  deckId: string,
  params: { enabled: boolean; mix: number; decay: number; room_size: number }
): Promise<ReverbState> {
  const res = await api.post(`/effects/${deckId}/reverb`, params);
  return res.data.reverb;
}

export async function setDelay(
  deckId: string,
  params: { enabled: boolean; time_ms: number; feedback: number; mix: number }
): Promise<DelayState> {
  const res = await api.post(`/effects/${deckId}/delay`, params);
  return res.data.delay;
}

export async function setFlanger(
  deckId: string,
  params: { enabled: boolean; rate: number; depth: number; mix: number }
): Promise<FlangerState> {
  const res = await api.post(`/effects/${deckId}/flanger`, params);
  return res.data.flanger;
}

export async function setBitcrusher(
  deckId: string,
  params: { enabled: boolean; bit_depth: number; downsample: number }
): Promise<BitcrusherState> {
  const res = await api.post(`/effects/${deckId}/bitcrusher`, params);
  return res.data.bitcrusher;
}

// ─── Cue & Loop API ────────────────────────────────────

export async function setCuePoint(
  deckId: string,
  slot: number,
  position?: number,
  name?: string
): Promise<DeckStatus> {
  const body: Record<string, unknown> = {};
  if (position !== undefined) body.position = position;
  if (name !== undefined) body.name = name;
  const res = await api.post(`/deck/${deckId}/cue/${slot}`, body);
  return res.data.deck;
}

export async function deleteCuePoint(
  deckId: string,
  slot: number
): Promise<DeckStatus> {
  const res = await api.delete(`/deck/${deckId}/cue/${slot}`);
  return res.data.deck;
}

export async function jumpToCue(
  deckId: string,
  slot: number
): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/cue/${slot}/jump`);
  return res.data.deck;
}

export async function setLoopIn(
  deckId: string,
  position?: number
): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/loop/in`, {
    position: position ?? null,
  });
  return res.data.deck;
}

export async function setLoopOut(
  deckId: string,
  position?: number
): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/loop/out`, {
    position: position ?? null,
  });
  return res.data.deck;
}

export async function toggleLoop(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/loop/toggle`);
  return res.data.deck;
}

export async function clearLoop(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/loop/clear`);
  return res.data.deck;
}

export async function halveLoop(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/loop/halve`);
  return res.data.deck;
}

export async function doubleLoop(deckId: string): Promise<DeckStatus> {
  const res = await api.post(`/deck/${deckId}/loop/double`);
  return res.data.deck;
}

// ─── Tempo & Sync API ──────────────────────────────────

export async function setSpeed(
  deckId: string,
  speed: number
): Promise<TempoState> {
  const res = await api.post(`/deck/${deckId}/tempo/speed`, { speed });
  return res.data.tempo;
}

export async function nudgeSpeed(
  deckId: string,
  amount: number
): Promise<TempoState> {
  const res = await api.post(`/deck/${deckId}/tempo/nudge`, { amount });
  return res.data.tempo;
}

export async function resetSpeed(deckId: string): Promise<TempoState> {
  const res = await api.post(`/deck/${deckId}/tempo/reset`);
  return res.data.tempo;
}

export async function syncDeck(deckId: string): Promise<Record<string, unknown>> {
  const res = await api.post(`/deck/${deckId}/sync`);
  return res.data;
}

export async function getBeats(deckId: string): Promise<{
  beat_times: number[];
  downbeat_times: number[];
  bpm: number;
}> {
  const res = await api.get(`/deck/${deckId}/beats`);
  return res.data;
}

// ─── Engine API ────────────────────────────────────────

export async function getEngineState(): Promise<EngineState> {
  const res = await api.get(`/engine/state`);
  return res.data.engine;
}

export default api;
