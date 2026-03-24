"use client";

import {
  parseCardDescription,
  getSymbolImageUrl,
  symbolToLabel,
  keywordTokensRed,
  keywordTokensGray,
  keywordTokensLevelTwin,
  KEYWORD_BADGE_CLASS_GREEN,
  KEYWORD_BADGE_CLASS_RED,
  KEYWORD_BADGE_CLASS_GRAY,
  KEYWORD_BADGE_CLASS_LEVEL,
  normalizeDescriptionForParse,
  resolveKeywordToken,
  mergeEquipRuneSegments,
  mergeRepeatNumberSegments,
  normalizeSymbolBracketContent,
  type DescriptionSegment,
} from "@/lib/card-description";
import {
  looksLikeHtmlDescription,
  sanitizeCardDescriptionHtml,
  htmlToPlainTextForCardDescription,
} from "@/lib/html-description";

const ICON_CLASS = "inline-block h-4 w-4 align-middle mx-0.5";

const KEYWORD_BADGE_GREEN = `${KEYWORD_BADGE_CLASS_GREEN} mr-1`;
const KEYWORD_BADGE_RED = `${KEYWORD_BADGE_CLASS_RED} mr-1`;
const KEYWORD_BADGE_GRAY = `${KEYWORD_BADGE_CLASS_GRAY} mr-1`;
const KEYWORD_BADGE_LEVEL = `${KEYWORD_BADGE_CLASS_LEVEL} mr-1`;

function LevelBadge({ level }: { level: number }) {
  return <span className={KEYWORD_BADGE_LEVEL}>{`Level ${level} >`}</span>;
}

/** Dígitos [0]–[9] de `/images/desc` dentro do badge Repeat N (como Equip + runa). */
function RepeatDigitIcons({ num, domain }: { num: string; domain?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {num.split("").map((ch, i) =>
        /^[0-9]$/.test(ch) ? (
          <SymbolIcon
            key={`${i}-${ch}`}
            token={ch}
            domain={domain}
            iconClassName="inline-block h-3.5 w-3.5 align-middle shrink-0"
          />
        ) : null,
      )}
    </span>
  );
}

function RepeatInlineBadge({ num, domain }: { num: string; domain?: string }) {
  return (
    <span
      className={`${KEYWORD_BADGE_GREEN} inline-flex items-center gap-1 align-middle flex-wrap mr-1`}
    >
      <span>Repeat</span>
      <RepeatDigitIcons num={num} domain={domain} />
    </span>
  );
}

interface CardDescriptionProps {
  text: string;
  className?: string;
  /** Card domain for [C] rune icon (e.g. fury, calm, order). Uses {domain}_ac.webp */
  domain?: string;
}

function SymbolIcon({
  token,
  domain,
  iconClassName,
}: {
  token: string;
  domain?: string;
  /** Ex.: ícone menor dentro do badge Equip */
  iconClassName?: string;
}) {
  const src = getSymbolImageUrl(token, domain);
  const alt = symbolToLabel[token] ?? token;
  const wrapperClass = iconClassName ?? ICON_CLASS;
  if (!src) {
    return <span className="text-gray-400">[{token}]</span>;
  }
  return (
    <span className={wrapperClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        loading="lazy"
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const fallback = el.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = "inline";
        }}
      />
      <span className="hidden text-gray-400" aria-hidden>
        [{token}]
      </span>
    </span>
  );
}

function SegmentNode({
  segment,
  index,
  trimLeadingSpace,
  domain,
}: {
  segment: DescriptionSegment;
  index: number;
  trimLeadingSpace?: boolean;
  domain?: string;
}) {
  if (segment.type === "text") {
    const value = trimLeadingSpace ? segment.value.replace(/^\s+/, "") : segment.value;
    return <span key={index}>{value}</span>;
  }
  if (segment.type === "italic") {
    const innerSegments = mergeRepeatNumberSegments(
      mergeEquipRuneSegments(parseCardDescription(normalizeDescriptionForParse(segment.value))),
    );
    const isExplanation = segment.value.trim().endsWith(".)");
    return (
      <span key={index}>
        <em className="italic text-gray-400">
          {innerSegments.map((seg, i) => (
            <SegmentNode key={`${index}-${i}`} segment={seg} index={i} trimLeadingSpace={false} domain={domain} />
          ))}
        </em>
        {isExplanation && <br />}
      </span>
    );
  }
  if (segment.type === "equipInline") {
    return (
      <span
        key={index}
        className={`${KEYWORD_BADGE_GRAY} inline-flex items-center gap-1.5 align-middle flex-wrap mr-1`}
      >
        <span>Equip</span>
        {segment.cost != null && segment.cost !== "" && (
          <span className="text-[10px] font-bold tabular-nums opacity-95 leading-none">{segment.cost}</span>
        )}
        <SymbolIcon
          token={segment.runeToken}
          domain={domain}
          iconClassName="inline-block h-3.5 w-3.5 align-middle shrink-0"
        />
      </span>
    );
  }
  if (segment.type === "repeatInline") {
    return <RepeatInlineBadge key={index} num={segment.num} domain={domain} />;
  }
  const token = normalizeSymbolBracketContent(segment.value);
  const levelMatch = /^__LV_(\d+)__$/.exec(token);
  if (levelMatch) {
    const lv = Number(levelMatch[1]);
    if (lv >= 1 && lv <= 16) {
      return <LevelBadge key={index} level={lv} />;
    }
  }
  /** `[&gt;]` na API → `[>]` → símbolo `>` (seta / separador). */
  if (token === ">") {
    return (
      <span key={index} className="mx-0.5 inline font-bold text-amber-300/90">
        &gt;
      </span>
    );
  }
  {
    const kw = resolveKeywordToken(token);
    if (kw) {
      const repeatMatch = /^Repeat (\d+)$/.exec(kw);
      if (repeatMatch) {
        return <RepeatInlineBadge key={index} num={repeatMatch[1]} domain={domain} />;
      }
      const badgeClass = keywordTokensRed.has(kw)
        ? KEYWORD_BADGE_RED
        : keywordTokensGray.has(kw)
          ? KEYWORD_BADGE_GRAY
          : keywordTokensLevelTwin.has(kw)
            ? KEYWORD_BADGE_LEVEL
            : KEYWORD_BADGE_GREEN;
      return (
        <span key={index} className={badgeClass}>
          {kw}
        </span>
      );
    }
  }
  return (
    <SymbolIcon key={index} token={token} domain={domain} />
  );
}

function ParsedDescription({
  segments,
  domain,
  className,
  as: Tag = "span",
}: {
  segments: DescriptionSegment[];
  domain?: string;
  className: string;
  as?: "span" | "div";
}) {
  const domainLower = domain?.toLowerCase();
  const TagName = Tag;
  return (
    <TagName className={`whitespace-pre-wrap ${className}`}>
      {segments.map((seg, i) => {
        const prev = i > 0 ? segments[i - 1] : null;
        const prevWasExplanation =
          prev?.type === "italic" && prev.value.trim().endsWith(".)");
        return (
          <SegmentNode
            key={i}
            segment={seg}
            index={i}
            trimLeadingSpace={prevWasExplanation}
            domain={domainLower}
          />
        );
      })}
    </TagName>
  );
}

function parseSegmentsNormalized(text: string): DescriptionSegment[] {
  return mergeRepeatNumberSegments(
    mergeEquipRuneSegments(parseCardDescription(normalizeDescriptionForParse(text))),
  );
}

export function CardDescription({ text, className = "", domain }: CardDescriptionProps) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return null;

  /**
   * API envia HTML (`<p>`, `<br />`, …). Sanitiza → texto → `:rb_*:` → `[token]` → mesmo parser
   * de sempre (badges verde/vermelho, ícones [S], [T], runas, etc.).
   */
  if (looksLikeHtmlDescription(trimmed)) {
    const safe = sanitizeCardDescriptionHtml(trimmed);
    if (!safe.trim()) return null;
    /**
     * Um único `<p>` com `<br />` entre linhas vira um texto com `\n`, não vários `<p>`.
     * Antes só aplicávamos `gap` com `splitHtmlIntoParagraphInnerHtmls` (>1 `<p>`), então
     * as linhas ficavam “coladas” (só line-height). Aqui quebramos por `\n` e cada linha
     * vira um bloco com espaço vertical (`gap`).
     */
    const plain = htmlToPlainTextForCardDescription(safe);
    const lines = plain
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      return (
        <div className={`flex flex-col gap-2.5 ${className}`}>
          {lines.map((line, i) => {
            const segments = parseSegmentsNormalized(line);
            if (segments.length === 0) return null;
            return (
              <div key={i} className="text-inherit leading-relaxed">
                <ParsedDescription as="div" segments={segments} domain={domain} className="" />
              </div>
            );
          })}
        </div>
      );
    }
    const segments = parseSegmentsNormalized(plain);
    if (segments.length === 0) return null;
    return <ParsedDescription segments={segments} domain={domain} className={className} />;
  }

  const segments = parseSegmentsNormalized(trimmed);
  if (segments.length === 0) return null;
  return <ParsedDescription segments={segments} domain={domain} className={className} />;
}
