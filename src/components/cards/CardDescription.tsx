"use client";

import {
  parseCardDescription,
  getSymbolImageUrl,
  symbolToLabel,
  keywordTokens,
  keywordTokensRed,
  keywordTokensGray,
  type DescriptionSegment,
} from "@/lib/card-description";

const ICON_CLASS = "inline-block h-4 w-4 align-middle mx-0.5";

const KEYWORD_BADGE_GREEN =
  "inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide italic bg-emerald-900/50 text-emerald-200 border border-emerald-700/50 mr-1";

const KEYWORD_BADGE_RED =
  "inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide italic bg-red-900/50 text-red-200 border border-red-700/50 mr-1";

const KEYWORD_BADGE_GRAY =
  "inline-block rounded px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide italic bg-gray-600/60 text-gray-200 border border-gray-500/50 mr-1";

interface CardDescriptionProps {
  text: string;
  className?: string;
  /** Card domain for [C] rune icon (e.g. fury, calm, order). Uses {domain}_ac.webp */
  domain?: string;
}

function SymbolIcon({ token, domain }: { token: string; domain?: string }) {
  const src = getSymbolImageUrl(token, domain);
  const alt = symbolToLabel[token] ?? token;
  if (!src) {
    return <span className="text-gray-400">[{token}]</span>;
  }
  return (
    <span className={ICON_CLASS}>
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
    const innerSegments = parseCardDescription(segment.value);
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
  const token = segment.value;
  if (keywordTokens.has(token)) {
    const badgeClass = keywordTokensRed.has(token)
      ? KEYWORD_BADGE_RED
      : keywordTokensGray.has(token)
        ? KEYWORD_BADGE_GRAY
        : KEYWORD_BADGE_GREEN;
    return (
      <span key={index} className={badgeClass}>
        {token}
      </span>
    );
  }
  return (
    <SymbolIcon key={index} token={token} domain={domain} />
  );
}

export function CardDescription({ text, className = "", domain }: CardDescriptionProps) {
  const segments = parseCardDescription(text);
  if (segments.length === 0) return null;
  const domainLower = domain?.toLowerCase();
  return (
    <span className={`whitespace-pre-wrap ${className}`}>
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
    </span>
  );
}
