/**
 * Listas dos Unleashed Champion Decks (Vi & Vex) conforme o anúncio oficial da Riot.
 * @see https://riftbound.leagueoflegends.com/en-us/news/announcements/vi--vex-champion-decks/
 */
export type PreconDeckSlug = "vex" | "vi";

export interface QtyName {
  qty: number;
  name: string;
}

export interface PreconDeckViewData {
  slug: PreconDeckSlug;
  titleKey: "vexTitle" | "viTitle";
  legend: string;
  championOptions: QtyName[];
  mainDeck: QtyName[];
  battlefields: string[];
  /** Nomes exatos no catálogo (ex.: Calm Rune ×6). */
  runes: { qty: number; cardName: string }[];
  tokensNote: string;
}

export const OFFICIAL_VI_VEX_ARTICLE =
  "https://riftbound.leagueoflegends.com/en-us/news/announcements/vi--vex-champion-decks/";

const VEX: PreconDeckViewData = {
  slug: "vex",
  titleKey: "vexTitle",
  legend: "Vex, Gloomist",
  championOptions: [
    { qty: 1, name: "Vex, Apathetic" },
    { qty: 1, name: "Vex, Cheerless" },
    { qty: 1, name: "Vex, Mocking" },
  ],
  mainDeck: [
    { qty: 2, name: "Mutated Mouser" },
    { qty: 1, name: "Mooch" },
    { qty: 2, name: "Existential Dread" },
    { qty: 2, name: "Allay, Eager Admirer" },
    { qty: 3, name: "Back Off" },
    { qty: 1, name: "Enthusiastic Promoter" },
    { qty: 2, name: "Trevor Snoozebottom" },
    { qty: 2, name: "Blast Cone" },
    { qty: 1, name: "Megatusk" },
    { qty: 1, name: "Evelyn, Entrancing" },
    { qty: 1, name: "Nami, Headstrong" },
    { qty: 1, name: "Iacyra" },
    { qty: 1, name: "Shadow" },
    { qty: 1, name: "Scryer's Bloom" },
    { qty: 2, name: "Soul Sword" },
    { qty: 2, name: "Mister Root" },
    { qty: 2, name: "Skyward Strike" },
    { qty: 2, name: "Combat Experience" },
    { qty: 2, name: "Revitalized Spring" },
    { qty: 3, name: "Wuju Apprentice" },
    { qty: 2, name: "Mosstomper" },
  ],
  battlefields: ["Amateur Recital", "Gardens of Becoming", "Ripper's Bay"],
  runes: [
    { qty: 6, cardName: "Calm Rune" },
    { qty: 6, cardName: "Chaos Rune" },
  ],
  tokensNote: "1 XP/Buff Double-Faced Tokens, 3 Sprite/Buff Double-Faced Tokens",
};

const VI: PreconDeckViewData = {
  slug: "vi",
  titleKey: "viTitle",
  legend: "Vi, Piltover Enforcer",
  championOptions: [
    { qty: 1, name: "Vi, Destructive" },
    { qty: 1, name: "Vi, Hotheaded" },
    { qty: 2, name: "Vi, Peacekeeper" },
  ],
  mainDeck: [
    { qty: 2, name: "Vault Breaker" },
    { qty: 3, name: "Inferna" },
    { qty: 2, name: "Loyal Poro" },
    { qty: 2, name: "Crimson Pigeons" },
    { qty: 2, name: "Sharkling" },
    { qty: 2, name: "Square Up" },
    { qty: 1, name: "Hextech Gauntlets" },
    { qty: 2, name: "Right of Conquest" },
    { qty: 1, name: "Arena Kingpin" },
    { qty: 2, name: "Lord Broadmane" },
    { qty: 2, name: "Towering Pairofant" },
    { qty: 2, name: "Yeti Brawler" },
    { qty: 2, name: "Carrion Dredger" },
    { qty: 1, name: "Rengar, Unseen" },
    { qty: 2, name: "Serrated Dirk" },
    { qty: 1, name: "Tactical Retreat" },
    { qty: 2, name: "Divining Shells" },
    { qty: 2, name: "Mageseeker Investigator" },
    { qty: 1, name: "Xerath, Freed" },
    { qty: 1, name: "Upstage Comedy" },
    { qty: 1, name: "Soul Harvest" },
  ],
  battlefields: ["Trapping Grounds", "Star Spring", "Valley of Idols"],
  runes: [
    { qty: 6, cardName: "Order Rune" },
    { qty: 6, cardName: "Fury Rune" },
  ],
  tokensNote: "4 Bird/Gold Double-Faced Tokens",
};

const BY_SLUG: Record<PreconDeckSlug, PreconDeckViewData> = {
  vex: VEX,
  vi: VI,
};

export const PRECON_VIEW_SLUGS: PreconDeckSlug[] = ["vex", "vi"];

export function getPreconDeckViewData(slug: string): PreconDeckViewData | undefined {
  if (slug === "vex" || slug === "vi") return BY_SLUG[slug];
  return undefined;
}

export function mainDeckTotalCards(data: PreconDeckViewData): number {
  return data.mainDeck.reduce((s, row) => s + row.qty, 0);
}
