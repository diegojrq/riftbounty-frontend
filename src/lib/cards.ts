import { apiGet } from "./api";
import type { Card } from "@/types/card";

/** GET /v1/cards/:uuid – get a single card by UUID */
export async function getCard(uuid: string): Promise<Card> {
  const res = await apiGet<Card>(`/cards/${encodeURIComponent(uuid)}`);
  return res.data;
}

/**
 * Returns the image path for a card.
 * Uses image_key (collector-number style, e.g. OGN-001_298) which matches R2 filenames.
 * Falls back to scraper_id/slug only when serving from local /images (no CDN).
 * Base path: /images/cards/ (or IMAGES_CDN_URL when using R2).
 */
export function getCardImageUrl(card: {
  image_key?: string;
  scraper_id?: string;
  scraperId?: string;
  slug?: string;
}): string | null {
  const usingCdn = typeof process !== "undefined" && !!process.env.NEXT_PUBLIC_IMAGES_CDN_URL;
  const key = usingCdn
    ? card.image_key
    : (card.image_key ?? card.scraper_id ?? card.scraperId ?? card.slug);
  if (!key) return null;
  const base = usingCdn
    ? process.env.NEXT_PUBLIC_IMAGES_CDN_URL!.replace(/\/$/, "")
    : "/images";
  return `${base}/cards/${key}.png`;
}
