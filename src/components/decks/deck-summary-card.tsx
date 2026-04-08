"use client";

import Link from "next/link";
import type { Card } from "@/types/card";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import { getCardDisplayName } from "@/lib/card-display-name";
import { useLocale } from "@/lib/locale-context";

const cardShellClass =
  "group flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 transition hover:border-gray-600 hover:shadow-xl";

export interface DeckSummaryCardProps {
  /** Se omitido, o cartão é só visualização (sem navegação). */
  href?: string;
  legend: Card | null | undefined;
  champion: Card | null | undefined;
  name: string;
  mainCount: number;
  runeCount: number;
  bfCount: number;
  isValid: boolean;
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
        {legend && getCardImageUrl(legend) ? (
          <CardImg
            src={getCardImageUrl(legend)!}
            alt={getCardDisplayName(legend)}
            className="relative z-0 h-full w-1/2 object-cover object-top"
          />
        ) : (
          <div className="relative z-0 flex h-full w-1/2 items-center justify-center bg-gray-800">
            <span className="px-2 text-center text-xs text-gray-500">
              {legend ? getCardDisplayName(legend) : t("decks.noLegend")}
            </span>
          </div>
        )}
        {champion && getCardImageUrl(champion) ? (
          <CardImg
            src={getCardImageUrl(champion)!}
            alt={champion.name}
            className="relative z-0 h-full w-1/2 object-cover object-top"
          />
        ) : (
          <div className="relative z-0 flex h-full w-1/2 items-center justify-center border-l border-gray-700 bg-gray-800">
            <span className="px-2 text-center text-xs text-gray-500">{champion?.name ?? t("decks.noChampion")}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-gray-800 via-gray-800/10 to-transparent" />
        <div className="absolute right-2 top-2 z-20">
          {isValid ? (
            <span className="flex items-center gap-1 rounded-full border border-emerald-700 bg-emerald-900/80 px-2 py-0.5 text-xs font-medium text-emerald-400 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {t("decks.valid")}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-gray-600 bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-gray-400 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
              {t("decks.building")}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="truncate font-semibold text-white">{name}</p>
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

/** Skeleton alinhado ao grid de decks (lista). */
export function DeckGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="flex h-28 bg-gray-900">
            <div className="h-full w-1/2 animate-pulse bg-gray-700/60" />
            <div className="h-full w-1/2 animate-pulse bg-gray-700/40" />
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-700" />
            <div className="flex gap-3">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-700/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-700/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-700/60" />
            </div>
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-700/40" />
          </div>
        </li>
      ))}
    </ul>
  );
}
