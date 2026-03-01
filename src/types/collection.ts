import type { Card } from "./card";

/** GET /v1/collections/me – item in user's collection */
export interface CollectionItem {
  collectionId: string;
  cardId: string;
  quantity: number;
  card: Card;
}

/** GET /v1/collections/me response */
export interface CollectionResponse {
  collection: { id: string; userId: string };
  items: CollectionItem[];
}

/** POST /v1/collections/me/items (add) and PATCH (update quantity) can return this shape */
export interface CollectionItemResponse {
  quantity: number;
  collectionId: string;
  cardId: string;
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
    name: string;
    cardSet?: string;
    rarity?: string;
    type?: string;
    /** Card image URL when provided by the API */
    imageUrl?: string;
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
