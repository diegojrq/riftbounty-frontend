import { getCardDomains } from "@/lib/trade-offer-grouping";
import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";

/** Alinhado ao deck builder: `src/app/decks/[id]/page.tsx` */
export const DECK_STAT_TYPE_ORDER = [
  "legend",
  "champion",
  "unit",
  "limit",
  "gear",
  "spell",
  "rune",
  "battlefield",
  "other",
] as const;

export type DeckStatTypeKey = (typeof DECK_STAT_TYPE_ORDER)[number];

/** Domínios conhecidos na UI + incolor para cartas sem domínio */
export const DECK_STAT_DOMAIN_ORDER = [
  "fury",
  "calm",
  "mind",
  "body",
  "chaos",
  "order",
  "colorless",
] as const;

export type DeckStatDomainKey = (typeof DECK_STAT_DOMAIN_ORDER)[number];

function normalizeMainItemTypeKey(card: Card | undefined): DeckStatTypeKey {
  if (!card) return "other";
  const t = (card.type ?? "").toLowerCase();
  const key = DECK_STAT_TYPE_ORDER.includes(t as DeckStatTypeKey) ? t : "other";
  return key as DeckStatTypeKey;
}

/** Custo para curva: só `energy` ou `cmc` finitos (sem might). */
export function mainDeckCardCost(card: Card | undefined): number | null {
  if (!card) return null;
  const e = card.energy;
  if (typeof e === "number" && Number.isFinite(e)) return Math.floor(e);
  const c = card.cmc;
  if (typeof c === "number" && Number.isFinite(c)) return Math.floor(c);
  return null;
}

/** Índice 0–6 = custo exato; 7 = custo ≥ 7 (rótulo "7+"). */
export function costToCurveBucket(cost: number): number {
  return Math.min(7, Math.max(0, cost));
}

const CMC_BUCKET_LABEL_KEYS = [
  "decks.statsCmc0",
  "decks.statsCmc1",
  "decks.statsCmc2",
  "decks.statsCmc3",
  "decks.statsCmc4",
  "decks.statsCmc5",
  "decks.statsCmc6",
  "decks.statsCmc7Plus",
] as const;

export interface DeckTypeRow {
  key: DeckStatTypeKey;
  count: number;
  pct: number;
}

export interface DeckCmcRow {
  bucket: number;
  /** i18n key for row label */
  labelKey: (typeof CMC_BUCKET_LABEL_KEYS)[number];
  count: number;
  pct: number;
}

export interface DeckDomainRow {
  key: DeckStatDomainKey;
  count: number;
  pct: number;
}

/**
 * Contagem por tipo (cópias): legend, champion, main, runas, battlefields.
 * Sideboard excluído.
 */
export function buildDeckTypeCounts(deck: Deck): { rows: DeckTypeRow[]; total: number } {
  const counts: Record<string, number> = Object.fromEntries(
    DECK_STAT_TYPE_ORDER.map((k) => [k, 0])
  );

  const legend = deck.legendCard ?? deck.legend;
  const champion = deck.championCard ?? deck.champion;
  if (legend) counts.legend += 1;
  if (champion) counts.champion += 1;

  for (const item of deck.mainItems ?? []) {
    const q = item.quantity;
    const key = normalizeMainItemTypeKey(item.card as Card | undefined);
    counts[key] = (counts[key] ?? 0) + q;
  }

  for (const item of deck.runeItems ?? []) {
    const q = item.quantity;
    const key = normalizeMainItemTypeKey(item.card as Card | undefined);
    counts[key] = (counts[key] ?? 0) + q;
  }

  for (const bf of deck.battlefields ?? []) {
    if (bf.card) counts.battlefield += 1;
  }

  /** Legend e champion são sempre 0–1 cada — não entram nas estatísticas de composição. */
  const typeKeysForStats = DECK_STAT_TYPE_ORDER.filter((k) => k !== "legend" && k !== "champion");

  const total = typeKeysForStats.reduce((s, k) => s + (counts[k] ?? 0), 0);

  const rows: DeckTypeRow[] = typeKeysForStats
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((key) => {
      const count = counts[key] ?? 0;
      return { key, count, pct: total > 0 ? (count / total) * 100 : 0 };
    });

  return { rows, total };
}

/** Curva de custo só do deck principal (39 slots). Cartas sem energy/cmc finitos são ignoradas. */
export function buildMainDeckCmcBuckets(deck: Deck): { rows: DeckCmcRow[]; total: number } {
  const bucketCounts = [0, 0, 0, 0, 0, 0, 0, 0];

  for (const item of deck.mainItems ?? []) {
    const card = item.card as Card | undefined;
    const cost = mainDeckCardCost(card);
    if (cost === null) continue;
    const b = costToCurveBucket(cost);
    bucketCounts[b] += item.quantity;
  }

  const total = bucketCounts.reduce((a, b) => a + b, 0);

  const rows: DeckCmcRow[] = bucketCounts.map((count, bucket) => ({
    bucket,
    labelKey: CMC_BUCKET_LABEL_KEYS[bucket],
    count,
    pct: total > 0 ? (count / total) * 100 : 0,
  }));

  return { rows, total };
}

const KNOWN_DOMAIN_SLUGS = new Set<string>(["fury", "calm", "mind", "body", "chaos", "order"]);

function isRuneCardForStats(card: Card | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? card.recordType ?? "").toLowerCase();
  return t === "rune" || r.includes("rune");
}

/**
 * Muitas runas no catálogo vêm sem `cardDomains`; para estatísticas de domínio,
 * infere Calm/Chaos/etc. pelo nome (ex.: "Calm Rune") para não somar tudo em Incolor.
 */
function inferDomainSlugFromRuneName(card: Card | undefined): DeckStatDomainKey | null {
  if (!card || !isRuneCardForStats(card)) return null;
  const n = (card.name ?? "").toLowerCase();
  /** Ordem: nomes mais específicos antes de substrings genéricas. */
  const pairs: [string, DeckStatDomainKey][] = [
    ["calm", "calm"],
    ["chaos", "chaos"],
    ["order", "order"],
    ["fury", "fury"],
    ["mind", "mind"],
    ["body", "body"],
  ];
  for (const [needle, slug] of pairs) {
    if (n.includes(needle)) return slug;
  }
  return null;
}

function primaryDomainSlug(card: Card | undefined): DeckStatDomainKey {
  if (!card) return "colorless";
  const domains = getCardDomains(card);
  const first = domains[0]?.toLowerCase();
  if (first && KNOWN_DOMAIN_SLUGS.has(first)) return first as DeckStatDomainKey;
  const inferred = inferDomainSlugFromRuneName(card);
  if (inferred) return inferred;
  return "colorless";
}

/**
 * Uma cópia = um voto no primeiro domínio da carta; sem domínio → colorless.
 */
export function buildDeckDomainCounts(deck: Deck): { rows: DeckDomainRow[]; total: number } {
  const counts: Record<string, number> = Object.fromEntries(DECK_STAT_DOMAIN_ORDER.map((k) => [k, 0]));

  const addCard = (card: Card | undefined, qty: number) => {
    const slug = primaryDomainSlug(card);
    counts[slug] = (counts[slug] ?? 0) + qty;
  };

  const legend = deck.legendCard ?? deck.legend;
  const champion = deck.championCard ?? deck.champion;
  if (legend) addCard(legend as Card, 1);
  if (champion) addCard(champion as Card, 1);

  for (const item of deck.mainItems ?? []) {
    addCard(item.card as Card | undefined, item.quantity);
  }
  for (const item of deck.runeItems ?? []) {
    addCard(item.card as Card | undefined, item.quantity);
  }
  for (const bf of deck.battlefields ?? []) {
    if (bf.card) addCard(bf.card as Card, 1);
  }

  const total = DECK_STAT_DOMAIN_ORDER.reduce((s, k) => s + (counts[k] ?? 0), 0);

  const rows: DeckDomainRow[] = DECK_STAT_DOMAIN_ORDER.filter((k) => (counts[k] ?? 0) > 0).map((key) => {
    const count = counts[key] ?? 0;
    return { key, count, pct: total > 0 ? (count / total) * 100 : 0 };
  });

  return { rows, total };
}

/** Pool do simulador de mulligan: uma entrada por cópia no main. */
export function expandMainDeckToCards(deck: Deck): Card[] {
  const out: Card[] = [];
  for (const item of deck.mainItems ?? []) {
    const card = item.card as Card | undefined;
    if (!card) continue;
    for (let i = 0; i < item.quantity; i++) out.push(card);
  }
  return out;
}

export function shuffleInPlace<T>(arr: T[]): T[] {
  const a = arr;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawOpeningHand(pool: Card[], handSize: number): Card[] {
  if (pool.length === 0) return [];
  const copy = [...pool];
  shuffleInPlace(copy);
  return copy.slice(0, Math.min(handSize, copy.length));
}
