import type { Card } from "@/types/card";
import type { TradeItem } from "@/types/trade";

export function compareSetOrder(a: string, b: string, setOrder: string[]): number {
  const ai = setOrder.indexOf(a);
  const bi = setOrder.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

export const TYPE_ORDER = ["legend", "champion", "unit", "limit", "gear", "spell", "rune", "battlefield"];

export const TYPE_LABEL: Record<string, string> = {
  legend: "Legend",
  champion: "Champion",
  unit: "Unit",
  limit: "Limit",
  gear: "Gear",
  spell: "Spell",
  rune: "Rune",
  battlefield: "Battlefield",
};

export const TYPE_IMAGE: Record<string, string> = {
  legend: "/images/types/legend.webp",
  champion: "/images/types/champion.webp",
  unit: "/images/types/unit.webp",
  limit: "/images/types/unit.webp",
  gear: "/images/types/gear.webp",
  spell: "/images/types/spell.webp",
  rune: "/images/types/runes.webp",
  battlefield: "/images/types/battlefields.webp",
};

const NO_DOMAIN_ICON = "/images/types/unit.webp";
const BATTLEFIELD_ICON = "/images/types/battlefields.webp";
const VALID_DOMAIN_SLUGS = new Set(["fury", "calm", "mind", "body", "chaos", "order"]);

export function getCardDomains(
  card:
    | {
        domain?: string | null;
        domains?: Array<string | null> | null;
        cardDomains?: Array<{ domain?: { name?: string | null } | null } | null> | null;
      }
    | undefined
): string[] {
  if (!card) return [];
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if (card.domains) {
    result.push(
      ...card.domains
        .filter((d): d is string => typeof d === "string" && d.length > 0)
        .map((d) => d.toLowerCase())
    );
  }
  if (card.cardDomains) {
    result.push(
      ...card.cardDomains
        .map((cd) => cd?.domain?.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0)
        .map((name) => name.toLowerCase())
    );
  }
  return [...new Set(result)];
}

export function getDisplayDomainIcons(domains: string[]): string[] {
  return domains.filter((d) => VALID_DOMAIN_SLUGS.has(d));
}

function isBattlefieldCard(card: { type?: string | null; record_type?: string | null } | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? "").toLowerCase();
  return t === "battlefield" || r.includes("battleground") || t === "battleground";
}

export function getNoDomainIcon(card: { type?: string | null; record_type?: string | null } | undefined): string {
  return isBattlefieldCard(card) ? BATTLEFIELD_ICON : NO_DOMAIN_ICON;
}

export function getRarityIcon(rarity?: string | null): string | null {
  if (!rarity) return null;
  const key = rarity.toLowerCase().replace(/\s+/g, "");
  const normalized = key === "overnumbered" ? "showcase" : key;
  const known = ["common", "uncommon", "rare", "epic", "showcase"];
  return known.includes(normalized) ? `/images/rarities/${normalized}.svg` : null;
}

export type GroupedTradeOfferType = {
  type: string;
  label: string;
  icon: string | undefined;
  total: number;
  items: TradeItem[];
};

export type GroupedTradeOfferSet = {
  set: string;
  label: string;
  types: GroupedTradeOfferType[];
};

/**
 * Agrupa itens de troca por set → tipo (mesma lógica visual do basket no perfil).
 */
export function groupTradeItemsBySetAndType(
  items: TradeItem[],
  cardCacheMap: Map<string, Card>,
  scraperIdMap: Map<string, Card>,
  setOrder: string[],
  labelForSet: (set: string) => string
): GroupedTradeOfferSet[] {
  const bySet = new Map<string, Map<string, TradeItem[]>>();
  for (const item of items) {
    const cached = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
    const card = item.card ?? cached;
    const set = (cached?.cardSet ?? (card as Card | undefined)?.cardSet ?? "—").toString();
    const type = ((cached?.type ?? (card as { type?: string })?.type) ?? "other").toString().toLowerCase();
    if (!bySet.has(set)) bySet.set(set, new Map());
    const byType = bySet.get(set)!;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(item);
  }
  return [...bySet.entries()]
    .sort(([a], [b]) => compareSetOrder(a, b, setOrder))
    .map(([set, byType]) => ({
      set,
      label: labelForSet(set),
      types: [...byType.entries()]
        .sort(([a], [b]) => {
          const ai = TYPE_ORDER.indexOf(a);
          const bi = TYPE_ORDER.indexOf(b);
          if (ai === -1 && bi === -1) return a.localeCompare(b);
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        })
        .map(([type, typeItems]) => ({
          type,
          label: TYPE_LABEL[type] ?? (type.charAt(0).toUpperCase() + type.slice(1)),
          icon: TYPE_IMAGE[type],
          total: typeItems.reduce((s, i) => s + i.quantity, 0),
          items: typeItems,
        })),
    }));
}
