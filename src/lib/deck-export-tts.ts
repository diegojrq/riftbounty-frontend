import type { Card } from "@/types/card";
import type { Deck, DeckMainItem } from "@/types/deck";
import { getCardId } from "@/lib/card-id";
import { getCardDisplayName } from "@/lib/card-display-name";

const TYPE_ORDER = ["legend", "champion", "unit", "limit", "gear", "spell", "rune", "battlefield", "other"];

function groupByType(items: DeckMainItem[]) {
  const grouped: Record<string, DeckMainItem[]> = {};
  for (const item of items) {
    const t = item.card?.type?.toLowerCase() ?? "other";
    const key = TYPE_ORDER.includes(t) ? t : "other";
    (grouped[key] ??= []).push(item);
  }
  return grouped;
}

/** Une linhas duplicadas da mesma carta (estado inválido) para um único par qty + nome. */
function mergeMainItemsByCardId(items: DeckMainItem[]): DeckMainItem[] {
  const map = new Map<string, DeckMainItem>();
  for (const item of items) {
    const id = getCardId(item.card as Card) || item.cardId;
    if (!id) continue;
    const existing = map.get(id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      map.set(id, { ...item });
    }
  }
  return [...map.values()];
}

function cardName(item: { card?: Card | null; cardId?: string }): string {
  if (item.card) return getCardDisplayName(item.card);
  if (item.cardId) return item.cardId;
  return "?";
}

function mergeRuneItems(
  items: NonNullable<Deck["runeItems"]>
): Array<{ quantity: number; name: string }> {
  const map = new Map<string, { quantity: number; name: string }>();
  for (const item of items) {
    const id = getCardId(item.card as Card) || item.cardId;
    if (!id) continue;
    const name = cardName(item);
    const prev = map.get(id);
    if (prev) prev.quantity += item.quantity;
    else map.set(id, { quantity: item.quantity, name });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "en"));
}

/**
 * Formato texto para Tabletop Simulator (TTS).
 * Seções e rótulos em inglês, como no modelo do jogo.
 */
export function buildDeckTtsText(deck: Deck): string {
  const legend = deck.legendCard ?? deck.legend;
  const champion = deck.championCard ?? deck.champion;

  const parts: string[] = [];

  parts.push("Legend:");
  if (legend) parts.push(`1 ${getCardDisplayName(legend)}`);
  parts.push("");
  parts.push("Champion:");
  if (champion) parts.push(`1 ${champion.name}`);
  parts.push("");
  parts.push("MainDeck:");

  const mergedMain = mergeMainItemsByCardId(deck.mainItems ?? []);
  const grouped = groupByType(mergedMain);
  const orderedKeys = TYPE_ORDER.filter((k) => grouped[k]?.length);
  for (const typeKey of orderedKeys) {
    for (const item of grouped[typeKey]!) {
      parts.push(`${item.quantity} ${cardName(item)}`);
    }
  }

  parts.push("");
  parts.push("Battlefields:");
  for (const pos of [1, 2, 3] as const) {
    const bf = deck.battlefields?.find((b) => b.position === pos);
    const c = bf?.card;
    if (c?.name) parts.push(`1 ${getCardDisplayName(c)}`);
  }

  parts.push("");
  parts.push("Runes:");
  for (const { quantity, name } of mergeRuneItems(deck.runeItems ?? [])) {
    parts.push(`${quantity} ${name}`);
  }

  parts.push("");
  parts.push("Sideboard:");
  for (const item of deck.sideboardItems ?? []) {
    parts.push(`${item.quantity} ${cardName(item)}`);
  }

  return parts.join("\n");
}

export function sanitizeDeckExportFilename(name: string): string {
  const s = name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim();
  return s.length > 0 ? s : "deck";
}
