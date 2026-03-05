import { apiGet, apiPatch } from "./api";
import type { PublicUser, User } from "@/types/auth";

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
  return res.data;
}
