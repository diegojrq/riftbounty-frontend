import { describe, expect, it } from "vitest";
import type { Card } from "@/types/card";
import {
  buildUnlPools,
  isTokenOrRuneCard,
  simulatePreRiftOpening,
} from "@/lib/unleashed-pre-rift-sim";

function c(partial: Partial<Card> & Pick<Card, "id" | "name">): Card {
  return partial as Card;
}

/** LCG determinístico para testes (0 <= x < 1). */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("unleashed-pre-rift-sim", () => {
  it("isTokenOrRuneCard detects rune and token types", () => {
    expect(isTokenOrRuneCard(c({ id: "1", name: "R", type: "rune" }))).toBe(true);
    expect(isTokenOrRuneCard(c({ id: "2", name: "T", type: "token" }))).toBe(true);
    expect(isTokenOrRuneCard(c({ id: "3", name: "U", type: "unit" }))).toBe(false);
  });

  it("buildUnlPools buckets UNL cards by rarity and token/rune", () => {
    const cards: Card[] = [
      c({ id: "c1", name: "C1", collectorNumber: "UNL-1/219", rarity: "common", type: "unit" }),
      c({ id: "u1", name: "U1", collectorNumber: "UNL-2/219", rarity: "uncommon", type: "spell" }),
      c({ id: "r1", name: "R1", collectorNumber: "UNL-3/219", rarity: "rare", type: "unit" }),
      c({ id: "e1", name: "E1", collectorNumber: "UNL-4/219", rarity: "epic", type: "unit" }),
      c({ id: "s1", name: "S1", collectorNumber: "UNL-5/219", rarity: "showcase", type: "unit" }),
      c({ id: "tr", name: "TR", collectorNumber: "UNL-T1/219", rarity: "common", type: "rune" }),
      c({ id: "ogr-fixed", name: "Order Rune", collectorNumber: "OGN-146/298", image_key: "OGN-007-298", rarity: "common", type: "rune" }),
      c({ id: "ogr-other", name: "Mind Rune", collectorNumber: "OGN-147/298", image_key: "OGN-999-298", rarity: "common", type: "rune" }),
      c({ id: "og", name: "OG", collectorNumber: "OGN-1/296", rarity: "common", type: "unit" }),
    ];
    const p = buildUnlPools(cards);
    expect(p.common.map((x) => x.id)).toEqual(["c1"]);
    expect(p.uncommon.map((x) => x.id)).toEqual(["u1"]);
    expect(p.rare.map((x) => x.id)).toEqual(["r1"]);
    expect(p.epic.map((x) => x.id)).toEqual(["e1"]);
    expect(p.showcase.map((x) => x.id)).toEqual(["s1"]);
    expect(p.tokenRune.map((x) => x.id)).toEqual(["tr"]);
    expect(p.ognRunes.map((x) => x.id)).toEqual(["ogr-fixed"]);
    expect(p.foilPlayable.some((x) => x.id === "tr")).toBe(false);
  });

  it("simulatePreRiftOpening is deterministic with fixed RNG", () => {
    const cards: Card[] = [];
    for (let i = 0; i < 20; i++) {
      cards.push(
        c({
          id: `c-${i}`,
          name: `Common ${i}`,
          collectorNumber: `UNL-${100 + i}/219`,
          rarity: "common",
          type: "unit",
        })
      );
    }
    for (let i = 0; i < 10; i++) {
      cards.push(
        c({
          id: `u-${i}`,
          name: `Uncommon ${i}`,
          collectorNumber: `UNL-${200 + i}/219`,
          rarity: "uncommon",
          type: "unit",
        })
      );
    }
    cards.push(
      c({ id: "r", name: "Rare", collectorNumber: "UNL-300/219", rarity: "rare", type: "unit" }),
      c({ id: "e", name: "Epic", collectorNumber: "UNL-301/219", rarity: "epic", type: "unit" }),
      c({ id: "s", name: "Show", collectorNumber: "UNL-302/219", rarity: "showcase", type: "unit" }),
      c({ id: "run", name: "Rune", collectorNumber: "UNL-T99/219", rarity: "common", type: "rune" }),
      c({ id: "ogr-fixed", name: "Order Rune", collectorNumber: "OGN-146/298", image_key: "OGN-007-298", rarity: "common", type: "rune" }),
      c({ id: "ogr-other", name: "Mind Rune", collectorNumber: "OGN-147/298", image_key: "OGN-999-298", rarity: "common", type: "rune" })
    );

    const rng = makeRng(42);
    const a = simulatePreRiftOpening(cards, { random: rng });
    const rng2 = makeRng(42);
    const b = simulatePreRiftOpening(cards, { random: rng2 });

    expect(a.miniDeckIndex).toBe(b.miniDeckIndex);
    expect(a.packs.length).toBe(6);
    expect(a.packs.every((pk) => pk.length === 14)).toBe(true);
    const idsA = a.packs.map((pk) => pk.map((x) => x.card.id).join(","));
    const idsB = b.packs.map((pk) => pk.map((x) => x.card.id).join(","));
    expect(idsA).toEqual(idsB);
    const tokenRuneIds = a.packs.map((pk) => pk[13]?.card.id);
    expect(tokenRuneIds.every((id) => id === "ogr-fixed")).toBe(true);
  });
});
