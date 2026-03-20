import type { Card } from "./card";

/** GET /v1/collections/me – item in user's collection */
export interface CollectionItem {
  collectionId: string;
  /** Backend may return cardUuid or cardId depending on version */
  cardUuid?: string;
  cardId?: string;
  quantity: number;
  card: Card;
}

/** GET /v1/collections/me response. collection visibility settings are user-level preferences. */
export interface CollectionResponse {
  collection: {
    id: string;
    userId: string;
    isPublic?: boolean;
    minKeepPrivate?: number;
    maxPublicCopies?: number | null;
    max_public_copies?: number | null;
  };
  items: CollectionItem[];
}

/** PATCH /v1/collections/me/visibility response */
export interface CollectionVisibilityResponse {
  isPublic: boolean;
  minKeepPrivate?: number;
  maxPublicCopies?: number | null;
  max_public_copies?: number | null;
}

/** POST /v1/collections/me/items (add) and PATCH (update quantity) can return this shape */
export interface CollectionItemResponse {
  quantity: number;
  collectionId: string;
  cardUuid?: string;
  cardId?: string;
  card: Card;
}

/** GET /v1/collections/me/stats – breakdown items (catalogTotal = total in catalog for that set/domain/rarity/type) */
export interface CollectionStatsBySet {
  set: string;
  uniqueCards: number;
  totalCopies: number;
  catalogTotal?: number;
}

export interface CollectionStatsByDomain {
  domain: string;
  uniqueCards: number;
  totalCopies: number;
  catalogTotal?: number;
}

export interface CollectionStatsByRarity {
  rarity: string;
  uniqueCards: number;
  totalCopies: number;
  catalogTotal?: number;
}

export interface CollectionStatsByType {
  type: string;
  uniqueCards: number;
  totalCopies: number;
  catalogTotal?: number;
}

/** GET /v1/collections/me/stats – most owned card (card with highest quantity in collection) */
export interface CollectionStatsMostOwnedCard {
  card: {
    uuid: string;
    scraperId?: string;
    scraper_id?: string;
    name: string;
    slug?: string;
    cardSet?: string;
    rarity?: string;
    type?: string;
    image_key?: string;
    collector_number?: string;
    collectorNumber?: string;
  };
  quantity: number;
}

/** GET /v1/collections/me/stats – full response data */
export interface CollectionStats {
  totalUniqueCards: number;
  totalCopies: number;
  totalInCatalog: number;
  completionPercent: number;
  missingCount: number;
  bySet: CollectionStatsBySet[];
  byDomain: CollectionStatsByDomain[];
  byRarity: CollectionStatsByRarity[];
  byType: CollectionStatsByType[];
  mostOwnedCard?: CollectionStatsMostOwnedCard;
}

/** GET /v1/collections/me/value – total collection value for authenticated user */
export interface CollectionValueResponse {
  totalValue?: number | string | null;
  total_value?: number | string | null;
  value?: number | string | null;
  collectionValue?: number | string | null;
  currency?: string | null;
}
