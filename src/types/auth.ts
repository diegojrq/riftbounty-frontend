/** API contract: /v1/auth/* */

export interface UserAddress {
  countryCode: string | null;
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  slug: string;
  email: string;
  displayName: string | null;
  role?: UserRole;
  address?: UserAddress | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  slug: string;
  displayName?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

/** Card summary in public profile (GET /auth/profile/:slug) and match/offerable (GET /auth/profile/:slug/match) */
export interface PublicProfileCard {
  uuid: string;
  scraperId?: string;
  name: string | null;
  slug?: string;
  cardSet?: string | null;
  rarity?: string | null;
  type?: string | null;
  image_key?: string | null;
  imageUrl?: string | null;
}

/** Item in publicCollection (GET /auth/profile/:slug) */
export interface PublicCollectionItem {
  cardUuid: string;
  quantity: number;
  card: PublicProfileCard;
}

/** Public profile with optional public collection. GET /auth/profile/:slug */
export interface PublicUser {
  id: string;
  slug: string;
  displayName: string | null;
  publicCollection?: PublicCollectionItem[];
}

/** Item in match result (GET /auth/profile/:slug/match) — cards they have more of that I want */
export interface MatchItem {
  cardUuid: string;
  card: PublicProfileCard | null;
  theirQuantity: number;
  myQuantity: number;
  need: number;
}

/** Item in offerable result (GET /auth/profile/:slug/match) — cards I have more of that I can offer */
export interface OfferableItem {
  cardUuid: string;
  card: PublicProfileCard | null;
  myQuantity: number;
  theirQuantity: number;
  canOffer: number;
}
