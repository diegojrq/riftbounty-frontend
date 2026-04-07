"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card } from "@/types/card";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { getCardImageUrl } from "@/lib/cards";
import { getCardDisplayName } from "@/lib/card-display-name";
const CARD_BACK = "/images/card-back.webp";

function isBattlefieldForHover(card: Card | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? card.recordType ?? "").toLowerCase();
  return t === "battlefield" || (r.length > 0 && r.includes("battleground"));
}

/** Normaliza nome para comparação com o catálogo (case, apóstrofos, espaços). */
function normalizeCardName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");
}

function normalizeCollector(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Resolve carta no catálogo: prioriza número de colecionador; com vários nomes iguais,
 * prefere Unleashed (UNL-*) — o primeiro match por nome costumava ser outro set e a imagem quebrava.
 */
export function findCardForPreRift(
  cards: Card[],
  displayName: string,
  collectorHint?: string
): Card | undefined {
  if (collectorHint?.trim()) {
    const want = normalizeCollector(collectorHint);
    const byCol = cards.find(
      (c) => normalizeCollector(c.collectorNumber ?? c.collector_number) === want
    );
    if (byCol) return byCol;
  }

  const want = normalizeCardName(displayName);
  /** Legends: `name` na API é só o título (ex. Green Father); subtype vira "Ivern" — igual ao resto do app. */
  const matches = cards.filter(
    (c) => normalizeCardName(getCardDisplayName(c)) === want
  );

  if (matches.length === 0) {
    const comma = displayName.indexOf(",");
    if (comma > 0) {
      const shortName = displayName.slice(comma + 1).trim();
      if (shortName && shortName.length < displayName.length) {
        return findCardForPreRift(cards, shortName, undefined);
      }
    }
    return undefined;
  }

  if (matches.length === 1) return matches[0];

  const unl = matches.filter((c) => {
    const n = (c.collectorNumber ?? c.collector_number ?? "").toUpperCase();
    return n.startsWith("UNL-");
  });
  if (unl.length >= 1) {
    unl.sort((a, b) =>
      String(a.collectorNumber ?? a.collector_number ?? "").localeCompare(
        String(b.collectorNumber ?? b.collector_number ?? ""),
        undefined,
        { numeric: true }
      )
    );
    return unl[0];
  }

  return matches[0];
}

interface PreRiftCardThumbProps {
  cards: Card[];
  /** Nome exibido no evento (match com catálogo). */
  name: string;
  /** Ex.: UNL-195/219 — desempata quando o nome existe em mais de um set. */
  collectorNumber?: string;
  className?: string;
}

export function PreRiftCardThumb({ cards, name, collectorNumber, className = "" }: PreRiftCardThumbProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const card = useMemo(
    () => findCardForPreRift(cards, name, collectorNumber),
    [cards, name, collectorNumber]
  );
  const url = card && !imgFailed ? getCardImageUrl(card) : null;
  const a11yLabel = card ? getCardDisplayName(card) : name;

  useEffect(() => {
    setImgFailed(false);
  }, [name, collectorNumber, card?.id]);

  const inner = (
    <div
      title={a11yLabel}
      className={`relative aspect-[5/7] w-full overflow-hidden rounded-lg border border-gray-700/80 bg-gray-800/50 shadow-inner transition-colors hover:border-emerald-500/45 ${className}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- catálogo/CDN dinâmico
        <img
          src={url}
          alt={a11yLabel}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CARD_BACK}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );

  return (
    <CardHoverPreview card={card} battlefieldAsLandscape={isBattlefieldForHover(card)}>
      {inner}
    </CardHoverPreview>
  );
}

interface PreRiftPromoThumbProps {
  cards: Card[];
  name: string;
  collectorNumber: string;
  className?: string;
}

/** Promo com fallback por collector_number (UNL-169/219) se o nome não bater. */
export function PreRiftPromoThumb({
  cards,
  name,
  collectorNumber,
  className = "",
}: PreRiftPromoThumbProps) {
  const card = useMemo(() => {
    const byName = findCardForPreRift(cards, name, undefined);
    if (byName) return byName;
    const want = collectorNumber.trim().toLowerCase();
    return cards.find(
      (c) =>
        (c.collectorNumber ?? c.collector_number ?? "").trim().toLowerCase() === want
    );
  }, [cards, name, collectorNumber]);

  const a11yLabel = card ? getCardDisplayName(card) : name;
  const url = card ? getCardImageUrl(card) : null;

  const imageBlock = (
    <div className="relative aspect-[5/7] w-full overflow-hidden rounded-lg border border-gray-700/80 bg-gray-800/50 transition-colors hover:border-amber-500/40">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={a11yLabel}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CARD_BACK}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-90"
          loading="lazy"
        />
      )}
    </div>
  );

  return (
    <div
      className={`relative mx-auto max-w-[200px] overflow-hidden rounded-xl border border-amber-600/40 bg-gradient-to-b from-amber-950/30 to-gray-900/80 p-3 shadow-lg shadow-amber-900/20 ${className}`}
    >
      <CardHoverPreview card={card} battlefieldAsLandscape={isBattlefieldForHover(card)}>
        <div title={a11yLabel}>{imageBlock}</div>
      </CardHoverPreview>
      <p className="mt-3 text-center text-xs tabular-nums text-amber-200/90">{collectorNumber}</p>
    </div>
  );
}
