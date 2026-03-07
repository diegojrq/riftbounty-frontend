import type { Card } from "@/types/card";

/** Stable localStorage key — version is stored inside the entry, not in the key name. */
const CACHE_KEY = "rb_cards";

/** TTL de fallback: se o endpoint de versão falhar, expira em 24h. */
const CACHE_TTL_MS = 1 * 24 * 60 * 60 * 1000;

/** Threshold abaixo do qual o cache é considerado "muito fresco" (skip version check). */
export const CACHE_FRESH_MS = 5 * 60 * 1000; // 5 minutos

interface CardCacheEntry {
  cards: Card[];
  cachedAt: number;
  /** Versão retornada pelo backend (/v1/cards/catalog-version). */
  version?: string;
}

function stripUserFields(card: Card): Card {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { inCollection: _ic, collectionQuantity: _cq, imageUrl: _iu, image_path: _ip, ...rest } = card as any;
  return rest;
}

export function readCache(): CardCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CardCacheEntry;
    if (!Array.isArray(parsed.cards) || typeof parsed.cachedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCache(cards: Card[], version?: string): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CardCacheEntry = {
      cards: cards.map(stripUserFields),
      cachedAt: Date.now(),
      ...(version !== undefined ? { version } : {}),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    // Remove chaves antigas com versão no nome (rb_cards_v1, rb_cards_v2...)
    for (const key of Object.keys(localStorage)) {
      if (key !== CACHE_KEY && /^rb_cards/.test(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage pode estar cheio ou bloqueado
  }
}

export function isCacheStale(): boolean {
  const entry = readCache();
  if (!entry) return true;
  return Date.now() - entry.cachedAt > CACHE_TTL_MS;
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHE_KEY);
    for (const key of Object.keys(localStorage)) {
      if (/^rb_cards/.test(key)) localStorage.removeItem(key);
    }
  } catch {
    // ignora
  }
}
