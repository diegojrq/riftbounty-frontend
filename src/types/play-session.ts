/** Resposta GET/PATCH /v1/play/sessions/:id (campos usados no lobby/tabuleiro). */
export interface PlaySession {
  id: string;
  ownerUserId: string;
  playerBUserId: string | null;
  playerADeckId: string | null;
  playerBDeckId: string | null;
  joinCode: string | null;
  status: string;
  schemaVersion: number;
  stateVersion: number;
  currentState: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
