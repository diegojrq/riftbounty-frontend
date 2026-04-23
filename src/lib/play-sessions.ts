import { apiGet, apiPatch, apiPost } from "./api";
import type { PlaySession } from "@/types/play-session";

const BASE = "/play/sessions";

export async function createPlayLobby(): Promise<PlaySession> {
  const res = await apiPost<PlaySession>(BASE, {});
  return res.data;
}

export async function joinPlaySessionByCode(joinCode: string): Promise<PlaySession> {
  const res = await apiPost<PlaySession>(`${BASE}/join`, { joinCode: joinCode.trim() });
  return res.data;
}

export async function getPlaySession(sessionId: string): Promise<PlaySession> {
  const res = await apiGet<PlaySession>(`${BASE}/${encodeURIComponent(sessionId)}`);
  return res.data;
}

export async function selectDeckForPlaySession(sessionId: string, deckId: string): Promise<PlaySession> {
  const res = await apiPatch<PlaySession>(
    `${BASE}/${encodeURIComponent(sessionId)}/deck`,
    { deckId }
  );
  return res.data;
}
