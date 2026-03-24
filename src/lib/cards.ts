import { apiGet } from "./api";
import type { Card } from "@/types/card";

/** Verifica se a carta tem uma flag pelo `id` (case-insensitive). */
export function cardHasFlag(card: Pick<Card, "flags"> | null | undefined, flagId: string): boolean {
  if (!card?.flags?.length) return false;
  const want = flagId.toLowerCase();
  return card.flags.some((f) => (f.id ?? "").toLowerCase() === want);
}
import type { PublicProfileCard } from "@/types/auth";
import { getCardId } from "./card-id";

/** URLs antigas que apontavam para GET /v1/assets/cards/... no backend — preferir CDN, image_key ou imageUrl novo. */
export function isLegacyApiCardAssetUrl(url: string | null | undefined): boolean {
  if (url == null || typeof url !== "string") return false;
  const u = url.trim().toLowerCase();
  if (!u) return false;
  return u.includes("/v1/assets/cards");
}

/**
 * Perfil público / match podem embutir imageUrl apontando para a API; o catálogo em memória tem CDN/R2.
 * Usar em previews (ex.: CardHoverPreview) quando houver `cached` do useCards().
 */
export function mergePublicProfileCardWithCatalog(
  profile: PublicProfileCard | null | undefined,
  catalog: Card | undefined,
  fallbackCardId: string
): Card {
  const p = profile;
  const c = catalog;
  if (!p && !c) {
    return { id: fallbackCardId, name: "" } as Card;
  }
  if (!p) {
    return { ...c!, id: getCardId(c!) || fallbackCardId };
  }
  if (!c) {
    const id = getCardId(p as unknown as Card) || fallbackCardId;
    return { ...p, id } as unknown as Card;
  }
  const pImg = p.imageUrl ?? p.image_url;
  const mergedId = getCardId(p as unknown as Card) || getCardId(c) || fallbackCardId;
  return {
    ...c,
    ...p,
    id: mergedId,
    uuid: p.uuid ?? c.uuid,
    name: (p.name ?? c.name ?? "") as string,
    imageUrl: c.imageUrl ?? c.image_url ?? pImg ?? undefined,
    image_url: c.image_url ?? c.imageUrl ?? pImg,
    image_key: c.image_key ?? p.image_key ?? undefined,
    orientation: c.orientation,
    record_type: c.record_type ?? c.recordType,
    recordType: c.recordType ?? c.record_type,
    type: p.type ?? c.type,
  } as Card;
}

/** GET /v1/cards/:id — `id` é o identificador retornado pelo catálogo. */
export async function getCard(cardId: string): Promise<Card> {
  const res = await apiGet<Card>(`/cards/${encodeURIComponent(cardId)}`);
  return res.data;
}

/** Stem do arquivo no R2: minúsculas, hífens (ex.: sfd-070-221, ogn-001-298). */
function normalizeCardImageStem(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, "-");
}

/** Pasta do set no CDN: ex. SFD, OGN — a partir do stem (prefixo antes do 1º hífen). */
function parseSetCodeFromStem(stem: string): string | null {
  const m = /^([a-z]{2,4})-/.exec(stem);
  return m ? m[1].toUpperCase() : null;
}

/** "SFD-070/221" → sfd-070-221 */
function stemFromCollectorNumber(num: string): string | null {
  const t = num.trim();
  const m = t.match(/^([A-Za-z]{2,4})-(\d+)\/(\d+)$/);
  if (m) return `${m[1].toLowerCase()}-${m[2]}-${m[3]}`;
  return null;
}

function resolveCardImageStem(card: {
  id?: string;
  image_key?: string;
  scraper_id?: string;
  scraperId?: string;
  slug?: string;
  collector_number?: string;
  collectorNumber?: string;
}): string | null {
  const fromCollector =
    stemFromCollectorNumber(card.collectorNumber ?? "") ??
    stemFromCollectorNumber(card.collector_number ?? "");
  if (card.image_key?.trim()) return normalizeCardImageStem(card.image_key);
  if (fromCollector) return fromCollector;
  const idLike = card.id?.trim();
  if (idLike && /^[a-z0-9]+([-][a-z0-9]+)+$/i.test(idLike)) {
    return normalizeCardImageStem(idLike);
  }
  const scraper = (card.scraperId ?? card.scraper_id ?? card.slug)?.trim();
  if (!scraper) return null;
  return normalizeCardImageStem(scraper);
}

function cdnSetFolder(card: {
  set?: string;
  cardSet?: string;
  card_set?: string;
  image_key?: string;
  id?: string;
  collector_number?: string;
  collectorNumber?: string;
  scraper_id?: string;
  scraperId?: string;
  slug?: string;
}, stem: string): string | null {
  const s = (card.set ?? card.cardSet ?? card.card_set)?.trim();
  if (s && /^[A-Za-z]{2,4}$/.test(s)) return s.toUpperCase();
  return parseSetCodeFromStem(stem);
}

/**
 * Returns the image path for a card.
 * CDN (R2): `{CDN}/cards/{SET}/{stem}.png` — ex. .../cards/SFD/sfd-070-221.png
 * Local: `/images/cards/{key}.png` com fallbacks scraper/slug.
 */
export function getCardImageUrl(card: {
  id?: string;
  image_key?: string;
  imageUrl?: string;
  image_url?: string;
  set?: string;
  cardSet?: string;
  card_set?: string;
  collector_number?: string;
  collectorNumber?: string;
  scraper_id?: string;
  scraperId?: string;
  slug?: string;
}): string | null {
  const directRaw = (card.imageUrl ?? card.image_url)?.trim();
  if (directRaw && !isLegacyApiCardAssetUrl(directRaw)) {
    return directRaw;
  }

  const usingCdn = typeof process !== "undefined" && !!process.env.NEXT_PUBLIC_IMAGES_CDN_URL;
  const base = usingCdn
    ? process.env.NEXT_PUBLIC_IMAGES_CDN_URL!.replace(/\/$/, "")
    : "/images";

  if (usingCdn) {
    const stem = resolveCardImageStem(card);
    if (!stem) return null;
    const setFolder = cdnSetFolder(card, stem);
    if (setFolder) {
      return `${base}/cards/${setFolder}/${stem}.png`;
    }
    return `${base}/cards/${stem}.png`;
  }

  const key = card.image_key ?? card.scraper_id ?? card.scraperId ?? card.slug;
  if (!key) return null;
  return `${base}/cards/${key}.png`;
}
