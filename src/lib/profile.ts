import { apiGet, apiPatch } from "./api";
import type { MatchItem, OfferableItem, PublicProfileCard, PublicUser, User } from "@/types/auth";

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
}

/** GET /auth/me — returns current user with address */
export async function getProfile(): Promise<User> {
  const res = await apiGet<User>("/auth/me");
  return res.data;
}

/** PATCH /auth/me — update profile and/or address; returns updated user */
export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  const res = await apiPatch<User>("/auth/me", payload);
  return res.data;
}

/** GET /auth/slug/available?slug=xxx — public, optional Bearer. Returns whether slug is available (or own user's). */
export async function checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
  const res = await apiGet<{ available: boolean }>("/auth/slug/available", { slug });
  return res.data;
}

/** GET /auth/profile/:slug — public profile by username (no auth). Returns 404 if not found. Includes publicCollection when isPublic. */
export async function getPublicProfile(slug: string): Promise<PublicUser> {
  const res = await apiGet<PublicUser>(`/auth/profile/${encodeURIComponent(slug)}`);
  const data = res.data;
  return {
    ...data,
    publicCollection: data.publicCollection?.map(normalizePublicCollectionItem),
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
