"use client";

import Link from "next/link";
import type { Card } from "@/types/card";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import { getCardDisplayName } from "@/lib/card-display-name";
import { useLocale } from "@/lib/locale-context";

const cardShellClass =
  "group flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 transition hover:border-gray-600 hover:shadow-xl";

function DeckSummaryImageSlot({
  card,
  side,
}: {
  card: Card | null | undefined;
  side: "legend" | "champion";
}) {
  const url = card && getCardImageUrl(card);
  if (url && card) {
    return (
      <CardImg
        src={url}
        alt={side === "legend" ? getCardDisplayName(card) : card.name}
        className="relative z-0 h-full w-1/2 object-cover object-top"
      />
    );
  }
  return (
    <div
      className={`relative z-0 h-full w-1/2 shrink-0 overflow-hidden bg-gray-800 ${
        side === "champion" ? "border-l border-gray-700" : ""
      }`}
      aria-hidden
    >
      <span className="animate-card-img-skeleton absolute inset-0 z-[1]" />
    </div>
  );
}

export interface DeckSummaryCardProps {
  /** Se omitido, o cartão é só visualização (sem navegação). */
  href?: string;
  legend: Card | null | undefined;
  champion: Card | null | undefined;
  name: string;
  mainCount: number;
  runeCount: number;
  bfCount: number;
  /** Mostra selo de validação (usado em My decks). */
  isValid?: boolean;
}

export function DeckSummaryCard({
  href,
  legend,
  champion,
  name,
  mainCount,
  runeCount,
  bfCount,
  isValid,
}: DeckSummaryCardProps) {
  const { t } = useLocale();
  const domains = legend?.cardDomains ?? [];

  const inner = (
    <>
      <div className="relative isolate z-0 flex h-28 bg-gray-900">
        <DeckSummaryImageSlot card={legend} side="legend" />
        <DeckSummaryImageSlot card={champion} side="champion" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-gray-800 via-gray-800/10 to-transparent" />
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-semibold text-white">{name}</p>
          {typeof isValid === "boolean" && (
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isValid
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-red-500/40 bg-red-500/15 text-red-300"
              }`}
            >
              {isValid ? t("decks.valid") : t("decks.invalid")}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className={mainCount === 39 ? "text-emerald-500" : ""}>
            {mainCount}/39 {t("decks.mainLabel")}
          </span>
          <span className={runeCount === 12 ? "text-emerald-500" : ""}>
            {runeCount}/12 {t("decks.runesLabel")}
          </span>
          <span className={bfCount === 3 ? "text-emerald-500" : ""}>
            {bfCount}/3 {t("decks.battlefieldsLabel")}
          </span>
        </div>
        {(legend || champion) && (
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            {legend && <span className="truncate">{getCardDisplayName(legend)}</span>}
            {legend && champion && <span>·</span>}
            {champion && <span className="truncate">{champion.name}</span>}
          </div>
        )}
        {domains.length > 0 && (
          <div className="mt-2 flex gap-1">
            {domains.map((cd) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={cd.domain.name}
                src={`/images/domains/${cd.domain.name.toLowerCase()}.webp`}
                alt={cd.domain.name}
                title={cd.domain.name}
                className="h-5 w-5 rounded-full border border-gray-600 bg-gray-900 object-contain p-0.5"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardShellClass}>
        {inner}
      </Link>
    );
  }

  return <div className={`${cardShellClass} cursor-default`}>{inner}</div>;
}

/** Skeleton alinhado ao layout do `DeckSummaryCard` (miniaturas + título + stats). */
export function DeckGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="relative isolate flex h-28 bg-gray-900">
            <div className="relative h-full w-1/2 shrink-0 overflow-hidden bg-gray-800">
              <span className="animate-card-img-skeleton absolute inset-0" aria-hidden />
            </div>
            <div className="relative h-full w-1/2 shrink-0 overflow-hidden border-l border-gray-700 bg-gray-800">
              <span className="animate-card-img-skeleton absolute inset-0" aria-hidden />
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-gray-800 via-gray-800/10 to-transparent"
              aria-hidden
            />
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="h-4 max-w-[78%] animate-pulse rounded-md bg-gray-700/80" aria-hidden />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <div className="h-3 w-[4.5rem] animate-pulse rounded bg-gray-700/50" aria-hidden />
              <div className="h-3 w-[4.25rem] animate-pulse rounded bg-gray-700/50" aria-hidden />
              <div className="h-3 w-[5.5rem] animate-pulse rounded bg-gray-700/50" aria-hidden />
            </div>
            <div className="h-3 max-w-[55%] animate-pulse rounded bg-gray-700/40" aria-hidden />
          </div>
        </li>
      ))}
    </ul>
  );
}
