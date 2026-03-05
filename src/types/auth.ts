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

export interface User {
  id: string;
  slug: string;
  email: string;
  displayName: string | null;
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

/** Card summary in public profile (GET /auth/profile/:slug) */
export interface PublicProfileCard {
  uuid: string;
  scraperId?: string;
  name: string;
  cardSet?: string;
  rarity?: string;
  type?: string;
  imagePath?: string;
  imageUrl?: string;
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
