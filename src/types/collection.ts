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
