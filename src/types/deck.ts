import type { Card } from "./card";

/** Deck (GET /v1/decks, GET /v1/decks/:id) */
export interface Deck {
  id: string;
  userId: string;
  name: string;
  legendCardId: string | null;
  championCardId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Card populado — backend pode retornar como `legendCard` ou `legend` */
  legendCard?: Card | null;
  legend?: Card | null;
  /** Card populado — backend pode retornar como `championCard` ou `champion` */
  championCard?: Card | null;
  champion?: Card | null;
  mainItems?: DeckMainItem[];
  runeItems?: DeckRuneItem[];
  battlefields?: DeckBattlefield[];
  validation?: DeckValidation;
}

export interface DeckMainItem {
  deckId: string;
  cardId: string;
  quantity: number;
  card?: Card;
}

export interface DeckRuneItem {
  deckId: string;
  cardId: string;
  quantity: number;
  card?: Card;
}

export interface DeckBattlefield {
  deckId: string;
  position: 1 | 2 | 3;
  cardId: string | null;
  card?: Card | null;
}

export interface DeckValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
