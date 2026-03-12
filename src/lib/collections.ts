import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type {
  CollectionItemResponse,
  CollectionResponse,
  CollectionStats,
  CollectionVisibilityResponse,
} from "@/types/collection";

/** GET /v1/collections/me – returns user's collection (creates on first call). Includes collection.isPublic and collection.minKeepPrivate. */
export async function getCollection(): Promise<CollectionResponse> {
  const res = await apiGet<CollectionResponse>("/collections/me");
  return res.data;
}

/** PATCH /v1/collections/me/visibility – set collection visibility on public profile. minKeepPrivate 0–999 optional. */
export async function setCollectionVisibility(
  isPublic: boolean,
  minKeepPrivate?: number
): Promise<CollectionVisibilityResponse> {
  const body: { isPublic: boolean; minKeepPrivate?: number } = { isPublic };
  if (minKeepPrivate !== undefined) body.minKeepPrivate = minKeepPrivate;
  const res = await apiPatch<CollectionVisibilityResponse>("/collections/me/visibility", body);
  return res.data;
}

/** POST /v1/collections/me/items – add card to collection (or increase quantity) */
export async function addToCollection(cardId: string, quantity = 1): Promise<unknown> {
  const res = await apiPost<unknown>("/collections/me/items", { cardId, quantity });
  return res.data;
}

/** DELETE /v1/collections/me/items/:cardId – remove card from collection */
export async function removeFromCollection(cardId: string): Promise<void> {
  await apiDelete("/collections/me/items/" + encodeURIComponent(cardId));
}

/** PATCH /v1/collections/me/items/:cardId – set quantity for a card in the collection. */
export async function updateCollectionItem(
  cardId: string,
  payload: { quantity: number }
): Promise<CollectionItemResponse> {
  const res = await apiPatch<CollectionItemResponse>(
    "/collections/me/items/" + encodeURIComponent(cardId),
    payload
  );
  return res.data;
}

/** Set quantity for a card in the collection. */
export async function updateQuantity(cardId: string, quantity: number): Promise<CollectionItemResponse> {
  return updateCollectionItem(cardId, { quantity });
}

/** GET /v1/collections/me/stats – collection statistics for authenticated user */
export async function getCollectionStats(): Promise<CollectionStats> {
  const res = await apiGet<CollectionStats>("/collections/me/stats");
  return res.data;
}
