/** API contract: /v1/cards – data.items (cards with relations), data.totalCount. */

export interface Card {
  id: string;
  name: string;
  slug?: string;
  set?: string;
  rarity?: string;
  orientation?: string;
  record_type?: string;
  domain?: string;
  illustrator?: string;
  cost?: string;
  power?: string;
  energy?: number;
  might?: number;
  cmc?: number;
  type?: string;
  /** Ready-to-use image URL from API (backend /v1/assets/cards/ or DB fallback). */
  imageUrl?: string;
  attributes?: string[] | Record<string, unknown>;
  subtypes?: string[];
  supertypes?: string[];
  cardAttributes?: unknown[];
  cardSubtypes?: unknown[];
  cardSupertypes?: unknown[];
  /** True if at least 1 in collection; false otherwise. Always present (false when not logged in). */
  inCollection?: boolean;
  /** Quantity in collection; always number (0 when not in collection). Same format logged in or not. */
  collectionQuantity?: number;
  /** Collector number (e.g. "19/296" or set-specific index). */
  collector_number?: string;
}

/** GET /v1/cards response: items (cards with imageUrl, relations), totalCount. */
export interface CardsListResponse {
  items: Card[];
  totalCount: number;
}

export interface CardsQueryParams {
  limit?: number;
  offset?: number;
  name?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  set?: string;
  rarity?: string;
  orientation?: string;
  record_type?: string;
  domain?: string;
  illustrator?: string;
  cost?: string;
  power?: string;
  energy?: number;
  might?: number;
  cmc?: number;
  type?: string;
  attribute?: string;
  subtype?: string;
  supertype?: string;
}
