/**
 * Simulação ilustrativa: 1 mini-deck Pre-Rift + 6 boosters UNL.
 * Probabilidades heurísticas — não replica colagem física da Riot.
 */
import { getCardSetFilterValue } from "@/lib/card-set";
import type { Card } from "@/types/card";
import type { PreRiftDeck } from "@/data/unleashed-pre-rift-decks";
import { UNLEASHED_PRE_RIFT_DECKS } from "@/data/unleashed-pre-rift-decks";

export type PreRiftSimSlotKind = "common" | "uncommon" | "rare_slot" | "foil" | "token_rune";

export interface SimulatedPull {
  card: Card;
  isFoil: boolean;
  slotKind: PreRiftSimSlotKind;
}

/** ~25% P(≥1 epic) com dois slots i.i.d.: p = 1 - √0.75 */
export const EPIC_PER_RARE_SLOT = 1 - Math.sqrt(0.75);

export const PRE_RIFT_SIM_DEFAULTS = {
  epicPerRareSlot: EPIC_PER_RARE_SLOT,
  showcasePerRareSlot: 1 / 144,
  foilWeights: { common: 50, uncommon: 35, rarePlus: 15 } as const,
} as const;

export type RandomFn = () => number;

export interface PreRiftSimOptions {
  random?: RandomFn;
  epicPerRareSlot?: number;
  showcasePerRareSlot?: number;
  foilWeights?: { common: number; uncommon: number; rarePlus: number };
}

export interface PreRiftSimResult {
  miniDeckIndex: number;
  miniDeck: PreRiftDeck;
  packs: SimulatedPull[][];
  warnings: string[];
}

function normalizeRarity(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  const r = raw.trim().toLowerCase();
  if (r === "overnumbered") return "showcase";
  return r;
}

function normType(card: Card): string {
  return (card.type ?? "").trim().toLowerCase();
}

const FIXED_OGN_RUNE_IMAGE_KEYS = new Set([
  "ogn-007-298",
  "ogn-042-298",
  "ogn-089a-298",
  "ogn-126-298",
  "ogn-166-298",
  "ogn-214-298",
]);

function normImageKey(card: Card): string {
  return String(card.image_key ?? "").trim().toLowerCase();
}

/** Cartas do slot token/rune do booster (UNL). */
export function isTokenOrRuneCard(card: Card): boolean {
  const t = normType(card);
  if (t === "rune") return true;
  if (t === "token") return true;
  const rt = String(card.record_type ?? card.recordType ?? "").toLowerCase();
  if (rt.includes("token")) return true;
  if (rt.includes("rune")) return true;
  return false;
}

function isUnl(card: Card): boolean {
  return getCardSetFilterValue(card) === "UNL";
}

export interface UnlPools {
  common: Card[];
  uncommon: Card[];
  rare: Card[];
  epic: Card[];
  showcase: Card[];
  tokenRune: Card[];
  /** Slot token/rune do simulador: runas OGN fixas definidas pelo produto. */
  ognRunes: Card[];
  /** Cartas jogáveis no slot foil (excl. token/rune). */
  foilPlayable: Card[];
}

export function buildUnlPools(cards: Card[]): UnlPools {
  const unl = cards.filter(isUnl);
  const common: Card[] = [];
  const uncommon: Card[] = [];
  const rare: Card[] = [];
  const epic: Card[] = [];
  const showcase: Card[] = [];
  const tokenRune: Card[] = [];
  const ognRunes: Card[] = [];
  const foilPlayable: Card[] = [];

  const ognRunesAll = cards.filter((c) => getCardSetFilterValue(c) === "OGN" && normType(c) === "rune");
  const ognRunesFixed = ognRunesAll.filter((c) => FIXED_OGN_RUNE_IMAGE_KEYS.has(normImageKey(c)));
  ognRunes.push(...(ognRunesFixed.length > 0 ? ognRunesFixed : ognRunesAll));

  for (const c of unl) {
    if (isTokenOrRuneCard(c)) {
      tokenRune.push(c);
      continue;
    }
    foilPlayable.push(c);
    const r = normalizeRarity(c.rarity);
    if (r === "common") common.push(c);
    else if (r === "uncommon") uncommon.push(c);
    else if (r === "rare") rare.push(c);
    else if (r === "epic") epic.push(c);
    else if (r === "showcase") showcase.push(c);
    else {
      // Sem raridade reconhecida: trata como comum para não sumir do simulador
      common.push(c);
    }
  }

  return { common, uncommon, rare, epic, showcase, tokenRune, ognRunes, foilPlayable };
}

function pickRandom<T>(pool: T[], rng: RandomFn): T | undefined {
  if (pool.length === 0) return undefined;
  const i = Math.floor(rng() * pool.length);
  return pool[i];
}

function drawRareSlot(
  pools: UnlPools,
  rng: RandomFn,
  pShowcase: number,
  pEpic: number,
  warnings: string[],
  label: string
): SimulatedPull {
  if (rng() < pShowcase) {
    const c = pickRandom(pools.showcase, rng);
    if (c) return { card: c, isFoil: false, slotKind: "rare_slot" };
  }
  if (rng() < pEpic) {
    const c = pickRandom(pools.epic, rng);
    if (c) return { card: c, isFoil: false, slotKind: "rare_slot" };
  }
  const c = pickRandom(pools.rare, rng);
  if (c) return { card: c, isFoil: false, slotKind: "rare_slot" };
  const fallback =
    pickRandom([...pools.epic, ...pools.showcase, ...pools.uncommon], rng) ??
    pickRandom(pools.foilPlayable, rng);
  if (fallback) {
    warnings.push(label);
    return { card: fallback, isFoil: false, slotKind: "rare_slot" };
  }
  warnings.push(`${label}_empty`);
  return {
    card: { id: "sim-fallback-rare", name: "?" } as Card,
    isFoil: false,
    slotKind: "rare_slot",
  };
}

function drawFoil(
  pools: UnlPools,
  rng: RandomFn,
  weights: { common: number; uncommon: number; rarePlus: number },
  warnings: string[]
): SimulatedPull {
  const wC = weights.common;
  const wU = weights.uncommon;
  const wR = weights.rarePlus;
  const total = wC + wU + wR;
  const roll = rng() * total;
  let pool: Card[] = [];
  if (roll < wC) pool = pools.common;
  else if (roll < wC + wU) pool = pools.uncommon;
  else pool = [...pools.rare, ...pools.epic, ...pools.showcase];

  let c = pickRandom(pool, rng);
  if (!c) {
    c = pickRandom(pools.foilPlayable, rng);
  }
  if (!c) {
    warnings.push("foil_fallback_empty");
    return { card: { id: "placeholder-foil", name: "?" } as Card, isFoil: true, slotKind: "foil" };
  }
  return { card: c, isFoil: true, slotKind: "foil" };
}

function drawTokenRune(pools: UnlPools, rng: RandomFn, warnings: string[]): SimulatedPull {
  // Regra do simulador: usar runas OGN fixas (image_key) para esse slot.
  const ogn = pickRandom(pools.ognRunes, rng);
  if (ogn) return { card: ogn, isFoil: false, slotKind: "token_rune" };

  warnings.push("ogn_rune_pool_empty");
  const c = pickRandom(pools.tokenRune, rng);
  if (c) return { card: c, isFoil: false, slotKind: "token_rune" };
  warnings.push("token_rune_pool_empty");
  const fb = pickRandom(pools.common, rng) ?? pickRandom(pools.foilPlayable, rng);
  if (fb) return { card: fb, isFoil: false, slotKind: "token_rune" };
  return { card: { id: "placeholder-tr", name: "?" } as Card, isFoil: false, slotKind: "token_rune" };
}

function simulateOneBooster(pools: UnlPools, rng: RandomFn, opt: PreRiftSimOptions, warnings: string[]): SimulatedPull[] {
  const pEpic = opt.epicPerRareSlot ?? PRE_RIFT_SIM_DEFAULTS.epicPerRareSlot;
  const pShow = opt.showcasePerRareSlot ?? PRE_RIFT_SIM_DEFAULTS.showcasePerRareSlot;
  const fw = opt.foilWeights ?? PRE_RIFT_SIM_DEFAULTS.foilWeights;
  const out: SimulatedPull[] = [];

  for (let i = 0; i < 7; i++) {
    const c = pickRandom(pools.common, rng);
    if (c) out.push({ card: c, isFoil: false, slotKind: "common" });
    else {
      warnings.push("common_pool_empty");
      const fb = pickRandom(pools.uncommon, rng) ?? pickRandom(pools.foilPlayable, rng);
      if (fb) out.push({ card: fb, isFoil: false, slotKind: "common" });
    }
  }
  for (let i = 0; i < 3; i++) {
    const c = pickRandom(pools.uncommon, rng);
    if (c) out.push({ card: c, isFoil: false, slotKind: "uncommon" });
    else {
      warnings.push("uncommon_pool_empty");
      const fb = pickRandom(pools.common, rng);
      if (fb) out.push({ card: fb, isFoil: false, slotKind: "uncommon" });
    }
  }

  out.push(drawRareSlot(pools, rng, pShow, pEpic, warnings, "rare_slot_1_fallback"));
  out.push(drawRareSlot(pools, rng, pShow, pEpic, warnings, "rare_slot_2_fallback"));

  out.push(drawFoil(pools, rng, fw, warnings));
  out.push(drawTokenRune(pools, rng, warnings));

  return out;
}

export function simulatePreRiftOpening(cards: Card[], options: PreRiftSimOptions = {}): PreRiftSimResult {
  const rng = options.random ?? Math.random;
  const pools = buildUnlPools(cards);
  const warnings: string[] = [];

  const decks = UNLEASHED_PRE_RIFT_DECKS;
  const miniDeckIndex = Math.floor(rng() * decks.length);
  const miniDeck = decks[miniDeckIndex]!;

  if (pools.foilPlayable.length === 0 && pools.tokenRune.length === 0) {
    warnings.push("no_unl_cards");
  }

  const packs: SimulatedPull[][] = [];
  for (let p = 0; p < 6; p++) {
    packs.push(simulateOneBooster(pools, rng, options, warnings));
  }

  return { miniDeckIndex, miniDeck, packs, warnings };
}
