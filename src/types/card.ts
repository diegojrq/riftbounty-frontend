/** API contract: /v1/cards – data.items (cards with relations), data.totalCount. */

/** Flags de exibição (ex.: `{ "id": "new", "label": "New" }`). */
export interface CardFlag {
  id: string;
  label: string;
}

export interface Card {
  /** Primary key from GET /v1/cards. */
  id: string;
  /** @deprecated Legado; preferir `id`. */
  uuid?: string;
  /** ID do scraper (legado); único, não é PK. API retorna camelCase. */
  scraper_id?: string;
  scraperId?: string;
  name: string;
  description?: string;
  altText?: string;
  slug?: string;
  /** API retorna "set", "cardSet" ou "card_set" dependendo do endpoint. */
  set?: string;
  cardSet?: string;
  card_set?: string;
  rarity?: string;
  orientation?: string;
  /** API retorna "record_type" ou "recordType". */
  record_type?: string;
  recordType?: string;
  /** API retorna "domain" (string), "domains" (string[]) ou "cardDomains" (objetos). */
  domain?: string;
  domains?: string[];
  illustrator?: string;
  cost?: string;
  /** Power as integer (1=C, 2=CC, 3=CCC) */
  power?: number | null;
  energy?: number;
  might?: number;
  cmc?: number;
  type?: string;
  attributes?: string[] | Record<string, unknown>;
  subtypes?: string[];
  supertypes?: string[];
  cardAttributes?: unknown[];
  cardSubtypes?: unknown[];
  cardSupertypes?: unknown[];
  cardDomains?: { domain: { id: number; name: string } }[];
  /** True if at least 1 in collection; false otherwise. Always present (false when not logged in). */
  inCollection?: boolean;
  /** Quantity in collection; always number (0 when not in collection). Same format logged in or not. */
  collectionQuantity?: number;
  /** Collector number (e.g. "SFD-109/221" or "19/296"). API pode enviar snake_case ou camelCase. */
  collector_number?: string;
  collectorNumber?: string;
  /** Chave para imagem: nome do arquivo sem extensão (ex.: OGN-001-298). Usado em getCardImageUrl. */
  image_key?: string;
  /** URL completa da imagem (quando backend já resolve caminho final). */
  imageUrl?: string;
  image_url?: string;
  /** TCGplayer product ID vinculado à carta. */
  tcg_product_id?: number | null;
  tcgProductId?: number | null;
  /** TCG prices in USD. API pode enviar snake_case ou camelCase. */
  tcg_low_price?: number | null;
  tcgLowPrice?: number | null;
  tcg_mid_price?: number | null;
  tcgMidPrice?: number | null;
  tcg_high_price?: number | null;
  tcgHighPrice?: number | null;
  tcg_market_price?: number | null;
  tcgMarketPrice?: number | null;
  tcg_price_updated_at?: string | null;
  tcgPriceUpdatedAt?: string | null;
  /** Liga prices in BRL. API pode enviar snake_case ou camelCase. */
  liga_min_price?: number | string | null;
  ligaMinPrice?: number | string | null;
  liga_mid_price?: number | string | null;
  ligaMidPrice?: number | string | null;
  liga_max_price?: number | string | null;
  ligaMaxPrice?: number | string | null;
  liga_price_updated_at?: string | null;
  ligaPriceUpdatedAt?: string | null;
  /** Ex.: `[{ "id": "new", "label": "New" }]` — usado para chips na UI. */
  flags?: CardFlag[];
  /** Banida para jogo (equivale a bannedAt != null no backend). */
  banned?: boolean;
  /** ISO 8601; null se não banida. */
  bannedAt?: string | null;
  /** URL do comunicado oficial (B&R); pode ser null mesmo com banned true. */
  banAnnouncementUrl?: string | null;
}

/** GET /v1/cards response: items (cards with relations), totalCount. */
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
  /** Filter by power (integer: 1=C, 2=CC, 3=CCC). Single value or use powerMin/powerMax for range. */
  power?: number;
  powerMin?: number;
  powerMax?: number;
  energy?: number;
  energyMin?: number;
  energyMax?: number;
  might?: number;
  mightMin?: number;
  mightMax?: number;
  cmc?: number;
  type?: string;
  attribute?: string;
  subtype?: string;
  supertype?: string;
  /** Filter by supertype ID (e.g. 33 for champion). */
  supertype_id?: number;
  /** When false, returns only cards not in the user's collection (missing cards). */
  inCollection?: boolean;
}
