import { getToken } from "./auth";
import { getLocale } from "./locale";
import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type {
  CollectionItemResponse,
  CollectionResponse,
  CollectionStats,
  CollectionValueResponse,
  CollectionVisibilityResponse,
} from "@/types/collection";

const EXPORT_MISSING_PATH = "cards/export/missing-cards";

/** Parâmetros opcionais para exportar faltantes (mesmos filtros do GET /v1/cards). */
export interface ExportMissingParams {
  set?: string;
  type?: string;
  rarity?: string;
  domain?: string;
  /** Outros query params aceitos pelo backend (ex.: atributos). */
  [key: string]: string | undefined;
}

/** GET /v1/collections/me – returns user's collection (creates on first call). Includes collection.isPublic and collection.minKeepPrivate. */
export async function getCollection(): Promise<CollectionResponse> {
  const res = await apiGet<CollectionResponse>("/collections/me");
  return res.data;
}

/** PATCH /v1/collections/me/visibility – set collection visibility and public display rules. */
export async function setCollectionVisibility(
  isPublic: boolean,
  minKeepPrivate?: number,
  maxPublicCopies?: number | null
): Promise<CollectionVisibilityResponse> {
  const body: { isPublic: boolean; minKeepPrivate?: number; maxPublicCopies?: number | null } = { isPublic };
  if (minKeepPrivate !== undefined) body.minKeepPrivate = minKeepPrivate;
  if (maxPublicCopies !== undefined) body.maxPublicCopies = maxPublicCopies;
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

/** GET /v1/collections/me/value – total collection value for authenticated user */
export async function getCollectionValue(): Promise<CollectionValueResponse> {
  const res = await apiGet<CollectionValueResponse>("/collections/me/value");
  return res.data;
}

/**
 * GET /v1/cards/export/missing-cards – exporta lista de cartas faltantes (uma linha por nome).
 * Resposta: arquivo de texto; dispara download no navegador (missing-cards.txt).
 * Requer Bearer. Params opcionais: set, type, rarity, domain, etc. (mesmos do GET /v1/cards).
 */
export const exportMissingCards = async (params?: ExportMissingParams): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("exportMissingCards is only available in the browser");
  }
  const token = getToken();
  if (!token) {
    throw new Error("Login required");
  }
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") search.set(k, String(v));
    }
  }
  const qs = search.toString();
  const url = `/api/proxy/${EXPORT_MISSING_PATH}${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Accept-Language": getLocale(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message: string;
    try {
      const json = JSON.parse(text);
      message = json?.message ?? json?.detail ?? `Error ${res.status}`;
    } catch {
      message = text || `Error ${res.status}`;
    }
    throw new Error(typeof message === "string" ? message : String(message));
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "missing-cards.txt";
  a.click();
  URL.revokeObjectURL(objectUrl);
};
