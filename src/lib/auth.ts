/**
 * Client-side token storage.
 * API returns access_token; we store it in localStorage.
 * For better security later: use httpOnly cookie if the backend sends Set-Cookie.
 */

import type { User } from "@/types/auth";

const TOKEN_KEY = "rb_token";
const USER_KEY = "rb_user";

/** Migra chaves antigas para o padrão rb_* uma única vez */
function migrateKeys(): void {
  const legacy: Record<string, string> = {
    riftbounty_access_token: TOKEN_KEY,
    riftbounty_user: USER_KEY,
  };
  for (const [old, next] of Object.entries(legacy)) {
    const val = localStorage.getItem(old);
    if (val !== null) {
      localStorage.setItem(next, val);
      localStorage.removeItem(old);
    }
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  migrateKeys();
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
