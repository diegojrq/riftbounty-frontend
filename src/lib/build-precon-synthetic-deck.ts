import { findCardForPreRift, resolvePreconLegendCard } from "@/components/events/pre-rift-card-thumb";
import { PRECON_CHAMPION_DECKS } from "@/data/precon-champion-decks";
import {
  getPreconDeckViewData,
  type PreconDeckSlug,
} from "@/data/precon-champion-deck-lists";
import { getCardId } from "@/lib/card-id";
import type { Card } from "@/types/card";
import type { Deck, DeckBattlefield, DeckMainItem, DeckRuneItem } from "@/types/deck";

/** Se o anúncio difere do catálogo, tenta nomes alternativos (mesma carta). */
const MAIN_NAME_ALIASES: Record<string, string[]> = {
  Mooch: ["Monch"],
  "Revitalized Spring": ["Herald of Spring"],
  Iacyra: ["Iascylla"],
  "Evelyn, Entrancing": ["Evelynn, Entrancing", "Evelynn"],
  /** Artigo Riot com typo; catálogo usa grafia correta. */
  "Carrion Dredger": ["Carion Dredger"],
  /** Vírgula opcional no nome exibido. */
  "Mageseeker Investigator": ["Mageseeker, Investigator"],
  /** Carta / grafia no set OGN. */
  "Grand Strategem": ["Grand Strategy"],
  "Pakaa Cub": ["Pakaa, Cub"],
  "Jaull-Fish": ["Jaull Fish"],
  "B.F. Sword": ["BF Sword", "B.F Sword"],
};

function resolveMainRowCard(cards: Card[], displayName: string): Card | undefined {
  let c = findCardForPreRift(cards, displayName);
  if (c) return c;
  for (const alt of MAIN_NAME_ALIASES[displayName] ?? []) {
    c = findCardForPreRift(cards, alt);
    if (c) return c;
  }
  return undefined;
}

function resolveRuneCard(cards: Card[], displayName: string): Card | undefined {
  let c = findCardForPreRift(cards, displayName);
  if (c) return c;
  return undefined;
}

/**
 * Monta um `Deck` compatível com a view / stats / mulligan a partir das listas do anúncio + catálogo.
 */
export function buildPreconSyntheticDeck(
  slug: string,
  cards: Card[],
  displayName: string
): Deck | null {
  const data = getPreconDeckViewData(slug);
  if (!data) return null;
  const s = slug as PreconDeckSlug;

  const deckId = `precon-${s}`;
  const def = PRECON_CHAMPION_DECKS.find((d) => d.slug === s);

  const legend = resolvePreconLegendCard(cards, data.legend, def?.legendCollector ?? undefined);
  let championCard = def ? findCardForPreRift(cards, def.champion, def.championCollector) : undefined;
  if (!championCard && s === "vex") {
    championCard =
      findCardForPreRift(cards, "Vex, Cheerless") ?? findCardForPreRift(cards, "Vex, Mocking");
  }
  if (!championCard && s === "jinx") {
    championCard = findCardForPreRift(cards, "Vi, Destructive");
  }
  if (!championCard && s === "lee-sin") {
    championCard = findCardForPreRift(cards, "Udyr, Wildman");
  }
  if (!championCard && s === "viktor") {
    championCard = findCardForPreRift(cards, "Heimerdinger, Inventor");
  }
  if (!championCard && s === "rumble") {
    championCard = findCardForPreRift(cards, "Rumble, Scrapper");
  }
  if (!championCard && s === "fiora") {
    championCard = findCardForPreRift(cards, "Fiora, Peerless");
  }

  const mainItems: DeckMainItem[] = data.mainDeck.map((row, i) => {
    const card = resolveMainRowCard(cards, row.name);
    return {
      deckId,
      cardId: card ? getCardId(card) : `missing-main-${i}`,
      quantity: row.qty,
      card,
    };
  });

  const battlefields: DeckBattlefield[] = data.battlefields.map((name, i) => {
    const card = findCardForPreRift(cards, name);
    return {
      deckId,
      position: (i + 1) as 1 | 2 | 3,
      cardId: card ? getCardId(card) : null,
      card: card ?? null,
    };
  });

  const runeItems: DeckRuneItem[] = [];
  for (const r of data.runes) {
    const card = resolveRuneCard(cards, r.cardName);
    if (card) {
      runeItems.push({
        deckId,
        cardId: getCardId(card),
        quantity: r.qty,
        card,
      });
    }
  }

  return {
    id: deckId,
    userId: "precon",
    name: displayName,
    legendCardId: legend ? getCardId(legend) : null,
    championCardId: championCard ? getCardId(championCard) : null,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    legendCard: legend ?? null,
    championCard: championCard ?? null,
    mainItems,
    runeItems,
    sideboardItems: [],
    battlefields,
    validation: { valid: true, errors: [], warnings: [] },
  };
}
