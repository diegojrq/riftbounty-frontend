/**
 * Parser for card description text: extracts [symbols], _(italic)_ and plain text.
 * Symbols are mapped to local images under /images/desc/ (no direct CDN links).
 */

const DESC_IMG_BASE = "/images/desc";

/** Map token (e.g. "S", "1", "Hidden") to image path under /images/desc/ */
export const symbolToImage: Record<string, string> = {
  "0": `${DESC_IMG_BASE}/0.svg`,
  "1": `${DESC_IMG_BASE}/1.svg`,
  "2": `${DESC_IMG_BASE}/2.svg`,
  "3": `${DESC_IMG_BASE}/3.svg`,
  "4": `${DESC_IMG_BASE}/4.svg`,
  "5": `${DESC_IMG_BASE}/5.svg`,
  "6": `${DESC_IMG_BASE}/6.svg`,
  "7": `${DESC_IMG_BASE}/7.svg`,
  "8": `${DESC_IMG_BASE}/8.svg`,
  "9": `${DESC_IMG_BASE}/9.svg`,
  S: `${DESC_IMG_BASE}/S.svg`,
  A: `${DESC_IMG_BASE}/anyrune.webp`,
  C: `${DESC_IMG_BASE}/C.svg`, // fallback when domain unknown; use getSymbolImageUrl(token, domain) for [C]
  T: `${DESC_IMG_BASE}/t.svg`,
  R: `${DESC_IMG_BASE}/r.svg`,
  B: `${DESC_IMG_BASE}/b.svg`,
  Y: `${DESC_IMG_BASE}/y.svg`,
  Hidden: `${DESC_IMG_BASE}/hidden.svg`,
  Action: `${DESC_IMG_BASE}/action.svg`,
  Ganking: `${DESC_IMG_BASE}/ganking.svg`,
  Assault: `${DESC_IMG_BASE}/assault.svg`,
  "Assault 2": `${DESC_IMG_BASE}/assault-2.svg`,
  "Assault 3": `${DESC_IMG_BASE}/assault-3.svg`,
  Weaponmaster: `${DESC_IMG_BASE}/weaponmaster.svg`,
  Deflect: `${DESC_IMG_BASE}/deflect.svg`,
  "Deflect 2": `${DESC_IMG_BASE}/deflect-2.svg`,
  Shield: `${DESC_IMG_BASE}/shield.svg`,
  "Shield 2": `${DESC_IMG_BASE}/shield-2.svg`,
  "Shield 3": `${DESC_IMG_BASE}/shield-3.svg`,
  "Shield 5": `${DESC_IMG_BASE}/shield-5.svg`,
  Tank: `${DESC_IMG_BASE}/tank.svg`,
  Vision: `${DESC_IMG_BASE}/vision.svg`,
  Deathknell: `${DESC_IMG_BASE}/deathknell.svg`,
  Accelerate: `${DESC_IMG_BASE}/accelerate.svg`,
  Equip: `${DESC_IMG_BASE}/equip.svg`,
  "Quick-Draw": `${DESC_IMG_BASE}/quick-draw.svg`,
  Temporary: `${DESC_IMG_BASE}/temporary.svg`,
  Repeat: `${DESC_IMG_BASE}/repeat.svg`,
  Add: `${DESC_IMG_BASE}/add.svg`,
  Reaction: `${DESC_IMG_BASE}/reaction.svg`,
  Legion: `${DESC_IMG_BASE}/legion.svg`,
  Mighty: `${DESC_IMG_BASE}/mighty.svg`,
  Unique: `${DESC_IMG_BASE}/unique.svg`,
  ADD: `${DESC_IMG_BASE}/add.svg`,
};

/**
 * Resolves image path for a symbol. [C] uses the card's domain: fury_ac.webp, order_ac.webp, etc.
 * @param domain - lowercase domain (e.g. fury, calm, order, mind, body, chaos)
 */
export function getSymbolImageUrl(token: string, domain?: string): string | undefined {
  if (token === "C" && domain) {
    return `${DESC_IMG_BASE}/${domain}_ac.webp`;
  }
  return symbolToImage[token];
}

/** Keywords that appear on the card with green highlight — render as text badge, not icon */
export const keywordTokens = new Set([
  "Hidden", "Action", "Ganking", "Assault", "Assault 2", "Assault 3", "Weaponmaster",
  "Deflect", "Deflect 2", "Shield", "Shield 2", "Shield 3", "Shield 5", "Tank", "Vision",
  "Deathknell", "Accelerate", "Equip", "Quick-Draw", "Temporary", "Repeat", "Add",
  "Reaction", "Legion", "Mighty", "Unique", "ADD",
]);

/** Keywords highlighted in red (Assault, Shield, Tank and variants) */
export const keywordTokensRed = new Set([
  "Assault", "Assault 2", "Assault 3", "Shield", "Shield 2", "Shield 3", "Shield 5", "Tank",
]);

/** Keywords with neutral gray badge (e.g. ADD) */
export const keywordTokensGray = new Set(["Add", "ADD"]);

/** Human-readable label for symbol (for alt text) */
export const symbolToLabel: Record<string, string> = {
  "0": "0",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  S: "Might",
  A: "Action",
  C: "Cost",
  T: "Tap",
  R: "Rune",
  B: "Rune",
  Y: "Rune",
  Hidden: "Hidden",
  Action: "Action",
  Ganking: "Ganking",
  Assault: "Assault",
  "Assault 2": "Assault 2",
  "Assault 3": "Assault 3",
  Weaponmaster: "Weaponmaster",
  Deflect: "Deflect",
  "Deflect 2": "Deflect 2",
  Shield: "Shield",
  "Shield 2": "Shield 2",
  "Shield 3": "Shield 3",
  "Shield 5": "Shield 5",
  Tank: "Tank",
  Vision: "Vision",
  Deathknell: "Deathknell",
  Accelerate: "Accelerate",
  Equip: "Equip",
  "Quick-Draw": "Quick-Draw",
  Temporary: "Temporary",
  Repeat: "Repeat",
  Add: "Add",
  Reaction: "Reaction",
  Legion: "Legion",
  Mighty: "Mighty",
  Unique: "Unique",
  ADD: "Add",
};

export type DescriptionSegment =
  | { type: "text"; value: string }
  | { type: "italic"; value: string }
  | { type: "symbol"; value: string };

const RE_ITALIC_OR_SYMBOL = /_([^_]+)_|(?:\\)?\[([^\]]+)\]/g;

/**
 * Parses card description into segments: text, italic _(...)_, and symbol [...].
 * Escaped brackets \[...] are treated as the same symbol.
 */
export function parseCardDescription(text: string): DescriptionSegment[] {
  if (!text || typeof text !== "string") return [];
  const segments: DescriptionSegment[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  RE_ITALIC_OR_SYMBOL.lastIndex = 0;
  while ((m = RE_ITALIC_OR_SYMBOL.exec(text)) !== null) {
    if (m.index > lastEnd) {
      segments.push({ type: "text", value: text.slice(lastEnd, m.index) });
    }
    if (m[1] !== undefined) {
      segments.push({ type: "italic", value: m[1] });
    } else if (m[2] !== undefined) {
      segments.push({ type: "symbol", value: m[2].trim() });
    }
    lastEnd = RE_ITALIC_OR_SYMBOL.lastIndex;
  }
  if (lastEnd < text.length) {
    segments.push({ type: "text", value: text.slice(lastEnd) });
  }
  return segments;
}
