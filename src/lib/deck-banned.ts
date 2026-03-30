import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";

function isBanned(card: Card | null | undefined): boolean {
  return card?.banned === true;
}

/**
 * Nomes únicos de cartas banidas presentes em qualquer zona do deck (catálogo `banned`).
 * Cobre o caso em que a API de validação ainda não acusa banimento — a UI continua consistente.
 */
export function bannedCardNamesInDeck(deck: Deck): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (c: Card | null | undefined) => {
    if (!isBanned(c) || !c?.name?.trim()) return;
    const n = c.name.trim();
    const k = n.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(n);
  };

  add(deck.legendCard ?? deck.legend);
  add(deck.championCard ?? deck.champion);
  for (const bf of deck.battlefields ?? []) add(bf.card ?? undefined);
  for (const item of deck.mainItems ?? []) add(item.card as Card | undefined);
  for (const item of deck.runeItems ?? []) add(item.card as Card | undefined);
  for (const item of deck.sideboardItems ?? []) add(item.card as Card | undefined);

  return out;
}
