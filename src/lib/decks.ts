import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";
import type { Deck, DeckValidation } from "@/types/deck";

const BASE = "/decks";

/** GET /v1/decks – list current user's decks */
export async function getDecks(): Promise<Deck[]> {
  const res = await apiGet<Deck[]>(BASE);
  return Array.isArray(res.data) ? res.data : (res.data as { items?: Deck[] }).items ?? [];
}

/** GET /v1/decks/:id – get one deck (optional ?validate=true) */
export async function getDeck(deckId: string, validate = false): Promise<Deck> {
  const res = await apiGet<Deck>(`${BASE}/${encodeURIComponent(deckId)}`, validate ? { validate: "true" } : undefined);
  return res.data;
}

/** GET /v1/decks/:id/validate – validation only */
export async function getDeckValidation(deckId: string): Promise<DeckValidation> {
  const res = await apiGet<DeckValidation>(`${BASE}/${encodeURIComponent(deckId)}/validate`);
  return res.data;
}

/** POST /v1/decks – create empty deck */
export async function createDeck(name?: string): Promise<Deck> {
  const res = await apiPost<Deck>(BASE, name != null ? { name } : {});
  return res.data;
}

/** PATCH /v1/decks/:id – update name */
export async function updateDeckName(deckId: string, name: string): Promise<Deck> {
  const res = await apiPatch<Deck>(`${BASE}/${encodeURIComponent(deckId)}`, { name });
  return res.data;
}

/** PUT /v1/decks/:id/legend */
export async function setLegend(deckId: string, cardId: string): Promise<Deck> {
  const res = await apiPut<Deck>(`${BASE}/${encodeURIComponent(deckId)}/legend`, { cardId });
  return res.data;
}

/** PUT /v1/decks/:id/champion */
export async function setChampion(deckId: string, cardId: string): Promise<Deck> {
  const res = await apiPut<Deck>(`${BASE}/${encodeURIComponent(deckId)}/champion`, { cardId });
  return res.data;
}

/** POST /v1/decks/:id/main – add or increment main card */
export async function addMainCard(deckId: string, cardId: string, quantity = 1): Promise<Deck> {
  const res = await apiPost<Deck>(`${BASE}/${encodeURIComponent(deckId)}/main`, { cardId, quantity });
  return res.data;
}

/** PATCH /v1/decks/:id/main/:cardId – set quantity */
export async function setMainCardQuantity(deckId: string, cardId: string, quantity: number): Promise<Deck> {
  const res = await apiPatch<Deck>(
    `${BASE}/${encodeURIComponent(deckId)}/main/${encodeURIComponent(cardId)}`,
    { quantity }
  );
  return res.data;
}

/** DELETE /v1/decks/:id/main/:cardId */
export async function removeMainCard(deckId: string, cardId: string): Promise<Deck> {
  const res = await apiDelete<Deck>(`${BASE}/${encodeURIComponent(deckId)}/main/${encodeURIComponent(cardId)}`);
  return res.data;
}

/** POST /v1/decks/:id/rune */
export async function addRuneCard(deckId: string, cardId: string, quantity = 1): Promise<Deck> {
  const res = await apiPost<Deck>(`${BASE}/${encodeURIComponent(deckId)}/rune`, { cardId, quantity });
  return res.data;
}

/** PATCH /v1/decks/:id/rune/:cardId */
export async function setRuneCardQuantity(deckId: string, cardId: string, quantity: number): Promise<Deck> {
  const res = await apiPatch<Deck>(
    `${BASE}/${encodeURIComponent(deckId)}/rune/${encodeURIComponent(cardId)}`,
    { quantity }
  );
  return res.data;
}

/** DELETE /v1/decks/:id/rune/:cardId */
export async function removeRuneCard(deckId: string, cardId: string): Promise<Deck> {
  const res = await apiDelete<Deck>(`${BASE}/${encodeURIComponent(deckId)}/rune/${encodeURIComponent(cardId)}`);
  return res.data;
}

/** PUT /v1/decks/:id/battlefields/:position (1, 2, or 3); pass null to clear */
export async function setBattlefield(deckId: string, position: 1 | 2 | 3, cardId: string | null): Promise<Deck> {
  const res = await apiPut<Deck>(
    `${BASE}/${encodeURIComponent(deckId)}/battlefields/${position}`,
    { cardId }
  );
  return res.data;
}

/** DELETE /v1/decks/:id */
export async function deleteDeck(deckId: string): Promise<void> {
  await apiDelete(`${BASE}/${encodeURIComponent(deckId)}`);
}
