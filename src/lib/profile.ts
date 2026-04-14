import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type {
  ForSalePriceMode,
  MatchItem,
  OfferableItem,
  ProfileCardListItem,
  PublicProfileCard,
  PublicUser,
  User,
} from "@/types/auth";

/** API legada pode enviar `cardUuid`; normaliza para `cardId` + `PublicProfileCard.id`. */
function normalizePublicProfileCard(card: PublicProfileCard | null): PublicProfileCard | null {
  if (!card) return null;
  const id = card.id ?? card.uuid ?? "";
  return { ...card, id };
}

function normalizeMatchItem(m: MatchItem & { cardUuid?: string }): MatchItem {
  return {
    ...m,
    cardId: m.cardId ?? m.cardUuid ?? "",
    card: normalizePublicProfileCard(m.card),
  };
}

function normalizeOfferableItem(m: OfferableItem & { cardUuid?: string }): OfferableItem {
  return {
    ...m,
    cardId: m.cardId ?? m.cardUuid ?? "",
    card: normalizePublicProfileCard(m.card),
  };
}

function normalizePublicCollectionItem(
  item: import("@/types/auth").PublicCollectionItem & { cardUuid?: string }
): import("@/types/auth").PublicCollectionItem {
  return {
    ...item,
    cardId: item.cardId ?? item.cardUuid ?? "",
    card: normalizePublicProfileCard(item.card) as PublicProfileCard,
  };
}

type ProfileCardListItemLike = Partial<ProfileCardListItem> & {
  cardUuid?: string;
  card_id?: string;
  card_uuid?: string;
  price_per_card?: number | null;
  price_mode?: ForSalePriceMode;
  price_percent?: number | null;
};

function normalizeProfileCardListItem(item: ProfileCardListItemLike): ProfileCardListItem {
  const price =
    typeof item.pricePerCard === "number" && Number.isFinite(item.pricePerCard)
      ? item.pricePerCard
      : typeof item.price_per_card === "number" && Number.isFinite(item.price_per_card)
        ? item.price_per_card
        : null;
  return {
    cardId: item.cardId ?? item.cardUuid ?? item.card_id ?? item.card_uuid ?? "",
    quantity: typeof item.quantity === "number" && Number.isFinite(item.quantity) ? item.quantity : 1,
    pricePerCard: price,
    priceMode:
      item.priceMode === "liga_minus_percent" || item.priceMode === "tcgplayer_minus_percent" || item.priceMode === "numeric"
        ? item.priceMode
        : item.price_mode === "liga_minus_percent" || item.price_mode === "tcgplayer_minus_percent" || item.price_mode === "numeric"
          ? item.price_mode
          : "numeric",
    pricePercent:
      typeof item.pricePercent === "number" && Number.isFinite(item.pricePercent)
        ? item.pricePercent
        : typeof item.price_percent === "number" && Number.isFinite(item.price_percent)
          ? item.price_percent
          : null,
    card: normalizePublicProfileCard((item.card as PublicProfileCard | null) ?? null),
  };
}

function normalizeProfileCardList(items: unknown): ProfileCardListItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeProfileCardListItem((item ?? {}) as ProfileCardListItemLike));
}

export interface UpdateProfileCardListItemInput {
  cardId: string;
  quantity: number;
  pricePerCard?: number | null;
  priceMode?: ForSalePriceMode;
  pricePercent?: number | null;
}

/** Payload for PATCH /auth/me — all fields optional */
export interface UpdateProfilePayload {
  displayName?: string;
  slug?: string;
  countryCode?: string | null;
  postalCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  wishlist?: UpdateProfileCardListItemInput[];
  forSale?: UpdateProfileCardListItemInput[];
}

/** GET /auth/me — returns current user with address */
export async function getProfile(): Promise<User> {
  const res = await apiGet<User>("/auth/me");
  const data = res.data;
  return {
    ...data,
    wishlist: normalizeProfileCardList((data as User & { wishlist?: unknown }).wishlist),
    forSale: normalizeProfileCardList((data as User & { forSale?: unknown }).forSale),
  };
}

/** PATCH /auth/me — update profile and/or address; returns updated user */
export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const res = await apiPatch<User>("/auth/me", payload);
  return res.data;
}

export interface AddMissingWishlistPayload {
  limit?: number;
  setCode?: string;
}

export interface AddMissingWishlistResponse {
  limit: number;
  added: number;
  totalWishlist: number;
  setCode?: string;
  processedFromSet?: number;
}

/** POST /auth/me/wishlist/add-missing — merge missing collection cards into wishlist */
export async function addMissingWishlistCards(payload: AddMissingWishlistPayload = {}): Promise<AddMissingWishlistResponse> {
  const res = await apiPost<AddMissingWishlistResponse>("/auth/me/wishlist/add-missing", payload);
  return res.data;
}

export interface ClearWishlistResponse {
  removed: number;
}

/** DELETE /auth/me/wishlist — remove todos os itens da wishlist do utilizador logado */
export async function clearWishlist(): Promise<ClearWishlistResponse> {
  const res = await apiDelete<ClearWishlistResponse>("/auth/me/wishlist");
  return res.data;
}

export interface ClearForSaleResponse {
  removed: number;
}

/** DELETE /auth/me/for-sale — remove todos os itens da lista de venda do utilizador logado */
export async function clearForSale(): Promise<ClearForSaleResponse> {
  const res = await apiDelete<ClearForSaleResponse>("/auth/me/for-sale");
  return res.data;
}

/** GET /auth/slug/available?slug=xxx — public, optional Bearer. Returns whether slug is available (or own user's). */
export async function checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
  const res = await apiGet<{ available: boolean }>("/auth/slug/available", { slug });
  return res.data;
}

/**
 * GET /auth/profile/:slug — public profile by username (no auth). Returns 404 if not found.
 * Includes publicCollection when isPublic.
 *
 * Para a aba Wishlist em /{slug}, o backend precisa enviar a lista no payload (ex.: `wishlist`,
 * no mesmo formato de GET /auth/me). Sem esse campo, o front não tem como exibir itens.
 * Aceitamos também aliases comuns (`publicWishlist`, `wishList`) caso o back use outro nome.
 */
export async function getPublicProfile(slug: string): Promise<PublicUser> {
  const res = await apiGet<PublicUser>(`/auth/profile/${encodeURIComponent(slug)}`);
  const data = res.data;
  const raw = data as PublicUser & { publicWishlist?: unknown; wishList?: unknown };
  const wishlistRaw = raw.wishlist ?? raw.publicWishlist ?? raw.wishList;
  return {
    ...data,
    publicCollection: data.publicCollection?.map(normalizePublicCollectionItem),
    wishlist: normalizeProfileCardList(wishlistRaw),
    forSale: normalizeProfileCardList((data as PublicUser & { forSale?: unknown }).forSale),
  };
}

/** GET /auth/profile/:slug/match — authenticated. Returns match (what they have more of) and offerable (what I can offer). */
export interface ProfileMatchResponse {
  match: MatchItem[];
  offerable: OfferableItem[];
}

export async function getProfileMatch(slug: string): Promise<ProfileMatchResponse> {
  const res = await apiGet<ProfileMatchResponse>(`/auth/profile/${encodeURIComponent(slug)}/match`);
  return {
    match: (res.data?.match ?? []).map((m) => normalizeMatchItem(m as MatchItem & { cardUuid?: string })),
    offerable: (res.data?.offerable ?? []).map((m) => normalizeOfferableItem(m as OfferableItem & { cardUuid?: string })),
  };
}
