/**
 * Parser for card description text: extracts [symbols], _(italic)_ and plain text.
 * Symbols are mapped to local images under /images/desc/ (no direct CDN links).
 */

import { normalizeBracketInner } from "./card-ability-filter";

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
  "Assault 4": `${DESC_IMG_BASE}/assault.svg`,
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
  /** Legado `:rb_energy:` sem número — ícone genérico de custo. */
  Energy: `${DESC_IMG_BASE}/a.svg`,
  RuneFury: `${DESC_IMG_BASE}/fury_ac.webp`,
  RuneCalm: `${DESC_IMG_BASE}/calm_ac.webp`,
  RuneOrder: `${DESC_IMG_BASE}/order_ac.webp`,
  RuneMind: `${DESC_IMG_BASE}/mind_ac.webp`,
  RuneBody: `${DESC_IMG_BASE}/body_ac.webp`,
  RuneChaos: `${DESC_IMG_BASE}/chaos_ac.webp`,
  /** Runa “arco-íris” / multicolor — usa anyrune até haver arte dedicada. */
  RuneRainbow: `${DESC_IMG_BASE}/anyrune.webp`,
};

/**
 * API envia placeholders `:rb_might:`, `:rb_energy_3:`, `:rb_rune_fury:` etc.
 * Converte para o formato `[token]` entendido por {@link parseCardDescription}.
 *
 * Padrões atuais (exemplos):
 * - `:rb_energy_0:` … `:rb_energy_7:` → ícones `[0]` … `[7]` (dígitos encadeados se `rb_energy_10` → `[1][0]`).
 * - `:rb_might:` → might `[S]`, `:rb_exhaust:` → `[T]`
 * - `:rb_rune_*:` → runas de domínio / rainbow
 */
export function normalizeRbColonTokens(text: string): string {
  return text.replace(/:([a-z0-9_]+):/gi, (_full, raw: string) => {
    const k = raw.toLowerCase();

    const energyDigits = /^rb_energy_(\d+)$/.exec(k);
    if (energyDigits) {
      return energyDigits[1]
        .split("")
        .map((d) => `[${d}]`)
        .join("");
    }

    const map: Record<string, string> = {
      rb_might: "[S]",
      rb_exhaust: "[T]",
      rb_tap: "[T]",
      rb_energy: "[Energy]",
      rb_rune_fury: "[RuneFury]",
      rb_rune_calm: "[RuneCalm]",
      rb_rune_order: "[RuneOrder]",
      rb_rune_mind: "[RuneMind]",
      rb_rune_body: "[RuneBody]",
      rb_rune_chaos: "[RuneChaos]",
      rb_rune_rainbow: "[RuneRainbow]",
    };
    return map[k] ?? `:${raw}:`;
  });
}

/**
 * `[Level N][>]` ou `[Level N]` sozinho (N = 1–16) → `[__LV_N__]` (badge no front).
 * Ordem: primeiro o par com `[>]`, depois `[Level N]` solto.
 */
export function normalizeLevelBracketTags(text: string): string {
  let s = text.replace(/\[Level\s+(\d+)\]\s*\[>\]/gi, (full, raw: string) => {
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= 16) return `[__LV_${n}__]`;
    return full;
  });
  s = s.replace(/\[Level\s+(\d+)\]/gi, (full, raw: string) => {
    const n = parseInt(raw, 10);
    if (n >= 1 && n <= 16) return `[__LV_${n}__]`;
    return full;
  });
  return s;
}

/** Entidades HTML comuns no texto da API dentro de colchetes. */
export function normalizeBracketEntities(text: string): string {
  return text.replace(/\[&gt;\]/g, "[>]").replace(/\[&amp;\]/g, "[&]");
}

/**
 * Normaliza o interior de cada `[…]` (NBSP, espaços duplicados) para bater com
 * `keywordTokens` — ex.: `[Hunt 2]` vindo com espaço estranho entre Hunt e 2.
 */
export function normalizeBracketInnerWhitespace(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, (_full, inner: string) => {
    const n = inner.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    return `[${n}]`;
  });
}

/**
 * Legibilidade: `)[Hunt 2]` colado vira quebra antes do próximo `[` (ex.: duas linhas de efeito Hunt).
 */
export function normalizeParenBeforeBracket(text: string): string {
  return text.replace(/\)\s*\[/g, ")\n[");
}

/** Ordem: entidades → colchetes → `)`+`[` → `:rb_*:` → levels → parse. */
export function normalizeDescriptionForParse(text: string): string {
  let s = normalizeBracketEntities(text);
  s = normalizeBracketInnerWhitespace(s);
  s = normalizeParenBeforeBracket(s);
  s = normalizeRbColonTokens(s);
  s = normalizeLevelBracketTags(s);
  return s;
}

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

/** Keywords que viram badge colorido (não ícone em /images/desc), salvo exceções no renderer. */
export const keywordTokens = new Set([
  "Hidden",
  "Action",
  "Ganking",
  "Assault",
  "Assault 2",
  "Assault 3",
  "Assault 4",
  "Weaponmaster",
  "Deflect",
  "Deflect 2",
  "Shield",
  "Shield 2",
  "Shield 3",
  "Shield 5",
  "Tank",
  "Vision",
  "Deathknell",
  "Accelerate",
  "Equip",
  "Quick-Draw",
  /** Mesmo badge verde que Ganking / Deflect (KEYWORD_BADGE_GREEN no front). */
  "Temporary",
  "Repeat",
  "Repeat 2",
  "Add",
  "Reaction",
  "Legion",
  "Mighty",
  "Unique",
  "ADD",
  "Ambush",
  "Buff",
  "Backline",
  "Hunt",
  "Hunt 2",
  "Predict",
  "Stun",
]);

/** Keywords em destaque vermelho (combate / dano / controle pesado / escudos / posição na fila). Ambush fica verde como Reaction. */
export const keywordTokensRed = new Set([
  "Assault",
  "Assault 2",
  "Assault 3",
  "Assault 4",
  "Backline",
  "Shield",
  "Shield 2",
  "Shield 3",
  "Shield 5",
  "Tank",
]);

/** Keywords com badge cinza (equipamento / ADD / Unique / Buff / Stun / Mighty / Vision / Predict / …). */
export const keywordTokensGray = new Set([
  "Add",
  "ADD",
  "Equip",
  "Unique",
  "Stun",
  "Buff",
  "Mighty",
  "Vision",
  "Predict",
]);

/** Mesma cor do Level (`#98af46`) — Deflect, Ganking, Hunt, Deathknell, Temporary, … */
export const keywordTokensLevelTwin = new Set([
  "Deflect",
  "Deflect 2",
  "Ganking",
  "Hunt",
  "Hunt 2",
  "Deathknell",
  "Temporary",
]);

/** Classes Tailwind dos badges de keyword (iguais ao CardDescription; sem `mr-1` para chips de filtro). */
export const KEYWORD_BADGE_CLASS_GREEN =
  "inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide italic bg-[#3d7061] text-emerald-50 border border-teal-950/35 shadow-sm";

/** Assault, Tank, Shield, Backline, … — cor de carta (`#b4426c`), não confundir com Level oliva. */
export const KEYWORD_BADGE_CLASS_RED =
  "inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide italic bg-[#b4426c] text-gray-100 border border-pink-950/40 shadow-sm";

export const KEYWORD_BADGE_CLASS_GRAY =
  "inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide italic bg-gray-600/60 text-gray-200 border border-gray-500/50";

export const KEYWORD_BADGE_CLASS_LEVEL =
  "inline-block rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide italic bg-[#98af46] text-gray-900 border border-lime-900/30 shadow-sm";

/** `[>]` extraído como `&gt;` / `>` — mesmo destaque âmbar do texto da carta. */
export const KEYWORD_BADGE_CLASS_GT =
  "inline-block rounded px-1.5 py-0.5 text-xs font-bold text-amber-300/90 border border-amber-500/30 bg-amber-950/20";

export const KEYWORD_BADGE_CLASS_FALLBACK =
  "inline-block rounded px-1.5 py-0.5 text-xs font-bold italic bg-gray-700/60 text-gray-200 border border-gray-600/50";

function decodeHtmlEntitiesForAbility(s: string): string {
  return s
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Runas de domínio em `[RuneCalm]` etc. — combinam com `[Equip]` no badge. */
export const RUNE_DOMAIN_TOKENS = new Set([
  "RuneFury",
  "RuneCalm",
  "RuneOrder",
  "RuneMind",
  "RuneBody",
  "RuneChaos",
  "RuneRainbow",
]);

/**
 * API pode enviar `[DEFLECT]`, `[ganking]` etc.; `keywordTokens` usa Title Case.
 * Sem isso, o match falha e o renderer usa o SVG de `/images/desc/` (cores fixas,
 * mais escuras) em vez do badge Tailwind — ex.: Accelerate casa e fica “certo”.
 */
const KEYWORD_TOKENS_CI = (() => {
  const m = new Map<string, string>();
  for (const k of keywordTokens) {
    m.set(k.toLowerCase(), k);
  }
  return m;
})();

/**
 * Conteúdo capturado em `[…]` — colapsa whitespace, NBSP e remove zero-width,
 * para `[ASSAULT  3]` / HTML estranho casar com `Assault 3` (badge, não SVG).
 */
export function normalizeSymbolBracketContent(raw: string): string {
  return raw
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resolve para o token canônico de {@link keywordTokens}, ou null. */
export function resolveKeywordToken(raw: string): string | null {
  const t = normalizeSymbolBracketContent(raw);
  if (keywordTokens.has(t)) return t;
  return KEYWORD_TOKENS_CI.get(t.toLowerCase()) ?? null;
}

/**
 * Label para chip de filtro: decodifica entidades (`&gt;` → `>`) e remove colchetes externos se for `[…]`.
 */
export function formatAbilityFilterLabel(raw: string): string {
  return normalizeBracketInner(decodeHtmlEntitiesForAbility(raw.trim()));
}

/**
 * Classe Tailwind do chip de Abilities alinhada ao badge da descrição da carta.
 */
export function resolveAbilityFilterChipClass(raw: string): string {
  const decoded = decodeHtmlEntitiesForAbility(raw.trim());
  const inner = normalizeBracketInner(decoded);

  if (inner === ">") {
    return KEYWORD_BADGE_CLASS_GT;
  }

  const levelOnly = /^Level\s+(\d+)(?:\s*>)?$/i.exec(inner);
  if (levelOnly) {
    const n = Number(levelOnly[1]);
    if (n >= 1 && n <= 16) {
      return KEYWORD_BADGE_CLASS_LEVEL;
    }
  }

  const kw = resolveKeywordToken(inner);
  if (kw) {
    if (/^Repeat (\d+)$/.exec(kw)) {
      return KEYWORD_BADGE_CLASS_GREEN;
    }
    if (keywordTokensRed.has(kw)) return KEYWORD_BADGE_CLASS_RED;
    if (keywordTokensGray.has(kw)) return KEYWORD_BADGE_CLASS_GRAY;
    if (keywordTokensLevelTwin.has(kw)) return KEYWORD_BADGE_CLASS_LEVEL;
    return KEYWORD_BADGE_CLASS_GREEN;
  }

  return KEYWORD_BADGE_CLASS_FALLBACK;
}

function isWhitespaceOnlyText(seg: DescriptionSegment | undefined): boolean {
  return seg?.type === "text" && /^[\s\u00a0]*$/.test(seg.value);
}

/** Só `(1)` / `( 2 )` etc., sem texto extra. */
function extractParenCostOnly(text: string): string | null {
  const m = /^\s*(\(\s*\d+\s*\))\s*$/.exec(text);
  return m ? m[1].replace(/\s+/g, "") : null;
}

/**
 * Junta `[Equip]`, custo opcional `(N)` e a primeira runa de domínio num único segmento
 * (badge cinza com ícone da runa dentro, como na carta física).
 */
export function mergeEquipRuneSegments(segments: DescriptionSegment[]): DescriptionSegment[] {
  const out: DescriptionSegment[] = [];
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    if (seg.type === "symbol" && resolveKeywordToken(seg.value) === "Equip") {
      let j = i + 1;
      let cost: string | undefined;
      while (j < segments.length && isWhitespaceOnlyText(segments[j])) j++;
      if (j < segments.length) {
        const mid = segments[j];
        if (mid.type === "text") {
          const c = extractParenCostOnly(mid.value);
          if (c !== null) {
            cost = c;
            j++;
          }
        }
      }
      while (j < segments.length && isWhitespaceOnlyText(segments[j])) j++;
      const next = segments[j];
      if (next?.type === "symbol" && RUNE_DOMAIN_TOKENS.has(next.value)) {
        out.push({ type: "equipInline", cost, runeToken: next.value });
        i = j + 1;
        continue;
      }
    }
    out.push(seg);
    i++;
  }
  return out;
}

/**
 * Junta `[Repeat]` + `[2]` (ou outro dígito) num único badge, como Equip + runa.
 */
export function mergeRepeatNumberSegments(segments: DescriptionSegment[]): DescriptionSegment[] {
  const out: DescriptionSegment[] = [];
  let i = 0;
  while (i < segments.length) {
    const seg = segments[i];
    if (seg.type === "symbol" && resolveKeywordToken(seg.value) === "Repeat") {
      let j = i + 1;
      while (j < segments.length && isWhitespaceOnlyText(segments[j])) j++;
      const next = segments[j];
      if (next?.type === "symbol" && /^[0-9]+$/.test(next.value.trim())) {
        out.push({ type: "repeatInline", num: next.value.trim() });
        i = j + 1;
        continue;
      }
    }
    out.push(seg);
    i++;
  }
  return out;
}

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
  "Assault 4": "Assault 4",
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
  "Repeat 2": "Repeat 2",
  Add: "Add",
  Reaction: "Reaction",
  Legion: "Legion",
  Mighty: "Mighty",
  Unique: "Unique",
  ADD: "Add",
  Ambush: "Ambush",
  Buff: "Buff",
  Backline: "Backline",
  Hunt: "Hunt",
  "Hunt 2": "Hunt 2",
  Predict: "Predict",
  Stun: "Stun",
  ">": "Greater than",
  Energy: "Energy",
  RuneFury: "Fury rune",
  RuneCalm: "Calm rune",
  RuneOrder: "Order rune",
  RuneMind: "Mind rune",
  RuneBody: "Body rune",
  RuneChaos: "Chaos rune",
  RuneRainbow: "Rainbow rune",
};

export type DescriptionSegment =
  | { type: "text"; value: string }
  | { type: "italic"; value: string }
  | { type: "symbol"; value: string }
  | { type: "equipInline"; cost?: string; runeToken: string }
  | { type: "repeatInline"; num: string };

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
      segments.push({ type: "symbol", value: normalizeSymbolBracketContent(m[2]) });
    }
    lastEnd = RE_ITALIC_OR_SYMBOL.lastIndex;
  }
  if (lastEnd < text.length) {
    segments.push({ type: "text", value: text.slice(lastEnd) });
  }
  return segments;
}
