/**
 * Listas de decks pré-construídos de campeã (UNL, OGN Origins, Spiritforged).
 * @see https://riftbound.leagueoflegends.com/en-us/news/announcements/spiritforged-precons-fiora-rumble/
 */
export type PreconDeckSlug =
  | "vex"
  | "vi"
  | "lee-sin"
  | "jinx"
  | "viktor"
  | "rumble"
  | "fiora";

export type PreconDeckTitleKey =
  | "vexTitle"
  | "viTitle"
  | "leeSinTitle"
  | "jinxTitle"
  | "viktorTitle"
  | "rumbleTitle"
  | "fioraTitle";

export interface QtyName {
  qty: number;
  name: string;
}

export interface PreconDeckViewData {
  slug: PreconDeckSlug;
  titleKey: PreconDeckTitleKey;
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

/**
 * OGN Lee Sin — main 40. Udyr e Lee Centered são opções de campeão (não repetidos no main).
 * Stalwart Poro ×2 (lista física ×3): ajuste para manter 40 no main com 57 cartas no produto.
 */
const LEE_SIN: PreconDeckViewData = {
  slug: "lee-sin",
  titleKey: "leeSinTitle",
  legend: "Lee Sin, Blind Monk",
  championOptions: [
    { qty: 1, name: "Lee Sin, Centered" },
    { qty: 1, name: "Udyr, Wildman" },
  ],
  mainDeck: [
    { qty: 2, name: "Pakaa Cub" },
    { qty: 1, name: "Mistfall" },
    { qty: 3, name: "Wildclaw Shaman" },
    { qty: 2, name: "Mountain Drake" },
    { qty: 2, name: "Stormclaw Ursine" },
    { qty: 3, name: "Pit Rookie" },
    { qty: 3, name: "First Mate" },
    { qty: 3, name: "Challenge" },
    { qty: 2, name: "Bilgewater Bully" },
    { qty: 3, name: "Wizened Elder" },
    { qty: 1, name: "Mask of Foresight" },
    { qty: 3, name: "Discipline" },
    { qty: 3, name: "Wielder of Water" },
    { qty: 2, name: "Stand United" },
    { qty: 2, name: "Stalwart Poro" },
    { qty: 2, name: "Charm" },
  ],
  battlefields: ["Targon's Peak", "Monastery of Hirana", "Grove of the God-Willow"],
  runes: [
    { qty: 6, cardName: "Calm Rune" },
    { qty: 6, cardName: "Body Rune" },
  ],
  tokensNote: "Tokens included in packaging (if any).",
};

/**
 * OGN Jinx — main 40. Jinx e Vi são opções de campeão (Vi não está no main).
 * Scrapheap ×4 (lista ×3) + Traveling ×2 para compensar a Vi fora do main.
 */
const JINX: PreconDeckViewData = {
  slug: "jinx",
  titleKey: "jinxTitle",
  legend: "Jinx, Loose Cannon",
  championOptions: [
    { qty: 1, name: "Jinx, Demolitionist" },
    { qty: 1, name: "Vi, Destructive" },
  ],
  mainDeck: [
    { qty: 1, name: "Rhasa the Sunderer" },
    { qty: 2, name: "Traveling Merchant" },
    { qty: 4, name: "Scrapheap" },
    { qty: 2, name: "Fading Memories" },
    { qty: 2, name: "Undercover Agent" },
    { qty: 3, name: "Gust" },
    { qty: 3, name: "Fight or Flight" },
    { qty: 2, name: "Blazing Scorcher" },
    { qty: 2, name: "Cemetery Attendant" },
    { qty: 2, name: "Void Seeker" },
    { qty: 3, name: "Raging Soul" },
    { qty: 1, name: "Magma Wurm" },
    { qty: 2, name: "Get Excited!" },
    { qty: 3, name: "Flame Chompers" },
    { qty: 3, name: "Chemtech Enforcer" },
    { qty: 3, name: "Brazen Buccaneer" },
  ],
  battlefields: ["Zaun Warrens", "Targon's Peak", "Reaver's Row"],
  runes: [
    { qty: 6, cardName: "Chaos Rune" },
    { qty: 6, cardName: "Fury Rune" },
  ],
  tokensNote: "Tokens included in packaging (if any).",
};

/** OGN Viktor — main 40 (sem alterações às quantidades da tua lista). */
const VIKTOR: PreconDeckViewData = {
  slug: "viktor",
  titleKey: "viktorTitle",
  legend: "Viktor, Herald of the Arcane",
  championOptions: [
    { qty: 1, name: "Viktor, Innovator" },
    { qty: 1, name: "Heimerdinger, Inventor" },
  ],
  mainDeck: [
    { qty: 1, name: "Wraith of Echoes" },
    { qty: 1, name: "Grand Strategem" },
    { qty: 3, name: "Noxian Drummer" },
    { qty: 3, name: "Soaring Scout" },
    { qty: 2, name: "Hidden Blade" },
    { qty: 3, name: "Cull the Weak" },
    { qty: 3, name: "Cruel Patron" },
    { qty: 2, name: "Back to Back" },
    { qty: 2, name: "Consult the Past" },
    { qty: 3, name: "Ravenbloom Student" },
    { qty: 2, name: "Mushroom Pouch" },
    { qty: 2, name: "Stupefy" },
    { qty: 2, name: "Sprite Call" },
    { qty: 2, name: "Smoke Screen" },
    { qty: 2, name: "Orb of Regret" },
    { qty: 2, name: "Jeweled Colossus" },
    { qty: 3, name: "Eager Apprentice" },
  ],
  battlefields: ["Trifarian War Camp", "The Grand Plaza", "Altar to Unity"],
  runes: [
    { qty: 6, cardName: "Order Rune" },
    { qty: 6, cardName: "Mind Rune" },
  ],
  tokensNote: "Tokens included in packaging (if any).",
};

/**
 * Spiritforged — Rumble. Lenda: Mechanized Menace; campeões: Rumble Scrapper + Hotheaded (×2).
 * Main 38 (57 − lenda − campeões − 3 BF − 12 runas).
 */
const RUMBLE: PreconDeckViewData = {
  slug: "rumble",
  titleKey: "rumbleTitle",
  legend: "Mechanized Menace",
  championOptions: [
    { qty: 1, name: "Rumble, Scrapper" },
    { qty: 2, name: "Rumble, Hotheaded" },
  ],
  mainDeck: [
    { qty: 2, name: "Ferrous Forerunner" },
    { qty: 3, name: "Gem Jammer" },
    { qty: 3, name: "Dangerous Duo" },
    { qty: 3, name: "Forecaster" },
    { qty: 3, name: "Bubble Bot" },
    { qty: 3, name: "Plundering Poro" },
    { qty: 2, name: "Breakneck Mech" },
    { qty: 2, name: "Consult the Past" },
    { qty: 1, name: "Singularity" },
    { qty: 2, name: "Wages of Pain" },
    { qty: 2, name: "Frigid Touch" },
    { qty: 3, name: "Production Surge" },
    { qty: 2, name: "Stupefy" },
    { qty: 3, name: "Void Seeker" },
    { qty: 1, name: "Danger Zone" },
    { qty: 1, name: "Assembly Rig" },
    { qty: 1, name: "Long Sword" },
  ],
  battlefields: ["Ravenbloom Conservatory", "Treasure Hoard", "Minefield"],
  runes: [
    { qty: 6, cardName: "Mind Rune" },
    { qty: 6, cardName: "Fury Rune" },
  ],
  tokensNote: "7 Mech Tokens (SFD-T01).",
};

/**
 * Spiritforged — Fiora. Lenda: Grand Duelist; campeões: Fiora Worthy + Peerless (×2).
 * Main 37 (56 − lenda − campeões − 3 BF − 12 runas).
 */
const FIORA: PreconDeckViewData = {
  slug: "fiora",
  titleKey: "fioraTitle",
  legend: "Grand Duelist",
  championOptions: [
    { qty: 1, name: "Fiora, Worthy" },
    { qty: 2, name: "Fiora, Peerless" },
  ],
  mainDeck: [
    { qty: 2, name: "Jaull-Fish" },
    { qty: 2, name: "Laurent Duelist" },
    { qty: 2, name: "Lucian, Merciless" },
    { qty: 2, name: "Veteran Poro" },
    { qty: 2, name: "Pit Rookie" },
    { qty: 2, name: "Dauntless Vanguard" },
    { qty: 2, name: "Unsung Hero" },
    { qty: 2, name: "Royal Guard" },
    { qty: 1, name: "Yone, Blademaster" },
    { qty: 2, name: "Punch First" },
    { qty: 3, name: "Strike Down" },
    { qty: 2, name: "Vengeance" },
    { qty: 1, name: "Riposte" },
    { qty: 2, name: "Show of Strength" },
    { qty: 3, name: "B.F. Sword" },
    { qty: 3, name: "Warmog's Armor" },
    { qty: 1, name: "Sacred Shears" },
    { qty: 3, name: "Doran's Blade" },
  ],
  battlefields: ["Ornn's Forge", "Veiled Temple", "Sunken Temple"],
  runes: [
    { qty: 6, cardName: "Order Rune" },
    { qty: 6, cardName: "Body Rune" },
  ],
  tokensNote: "5 Sand Soldier Tokens (SFD-T02).",
};

const BY_SLUG: Record<PreconDeckSlug, PreconDeckViewData> = {
  vex: VEX,
  vi: VI,
  "lee-sin": LEE_SIN,
  jinx: JINX,
  viktor: VIKTOR,
  rumble: RUMBLE,
  fiora: FIORA,
};

export const PRECON_VIEW_SLUGS: PreconDeckSlug[] = [
  "vex",
  "vi",
  "rumble",
  "fiora",
  "jinx",
  "lee-sin",
  "viktor",
];

export function getPreconDeckViewData(slug: string): PreconDeckViewData | undefined {
  return BY_SLUG[slug as PreconDeckSlug];
}

export function mainDeckTotalCards(data: PreconDeckViewData): number {
  return data.mainDeck.reduce((s, row) => s + row.qty, 0);
}
