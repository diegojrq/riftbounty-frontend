import { apiGet } from "./api";
import type { Card } from "@/types/card";

/** GET /v1/cards/:uuid – get a single card by UUID */
export async function getCard(uuid: string): Promise<Card> {
  const res = await apiGet<Card>(`/cards/${encodeURIComponent(uuid)}`);
  return res.data;
}

/**
 * Returns the local static image path for a card from public/images/cards/.
 * Uses scraper_id (or scraperId) as the filename; falls back to slug.
 * e.g. scraper_id "ahri-alluring__OGN-066_298" → /images/cards/ahri-alluring__OGN-066_298.png
 */
export function getCardImageUrl(card: {
  scraper_id?: string;
  scraperId?: string;
  slug?: string;
}): string | null {
  const id = card.scraper_id ?? card.scraperId;
  if (id) return `/images/cards/${id}.png`;
  if (card.slug) return `/images/cards/${card.slug}.png`;
  return null;
}
