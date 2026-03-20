"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCollection, getCollectionStats, getCollectionValue } from "@/lib/collections";
import { getCard, getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import { useLocale } from "@/lib/locale-context";
import type { CollectionStats as CollectionStatsType } from "@/types/collection";
import type { Card } from "@/types/card";

const DOMAIN_ORDER = ["fury", "calm", "mind", "body", "chaos", "order"];

const TYPE_ICON: Record<string, string> = {
  legend: "/images/types/legend.webp",
  champion: "/images/types/champion.webp",
  unit: "/images/types/unit.webp",
  limit: "/images/types/unit.webp",
  gear: "/images/types/gear.webp",
  spell: "/images/types/spell.webp",
  rune: "/images/types/runes.webp",
  battlefield: "/images/types/battlefields.webp",
  battlefields: "/images/types/battlefields.webp",
};
const DOMAIN_IMAGE_SLUGS = new Set(["fury", "calm", "mind", "body", "chaos", "order"]);

const SET_DISPLAY_NAMES: Record<string, string> = {
  OGN: "Origins Main Set (OGN)",
  ogn: "Origins Main Set (OGN)",
  Ogn: "Origins Main Set (OGN)",
  SFD: "Spiritforged (SFD)",
  sfd: "Spiritforged (SFD)",
  Sfd: "Spiritforged (SFD)",
};

function formatLabel(s: string): string {
  if (!s || s.startsWith("(")) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function setDisplayName(setValue: string): string {
  return SET_DISPLAY_NAMES[setValue] ?? formatLabel(setValue);
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getCardTcgPrice(card: Card): number | null {
  return (
    parseNumeric(card.tcgMarketPrice ?? card.tcg_market_price) ??
    parseNumeric(card.tcgMidPrice ?? card.tcg_mid_price) ??
    parseNumeric(card.tcgLowPrice ?? card.tcg_low_price) ??
    parseNumeric(card.tcgHighPrice ?? card.tcg_high_price)
  );
}

function formatCurrency(value: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

function parseCollectionValueAmount(data: {
  totalValue?: unknown;
  total_value?: unknown;
  value?: unknown;
  collectionValue?: unknown;
}): number | null {
  return (
    parseNumeric(data.totalValue) ??
    parseNumeric(data.total_value) ??
    parseNumeric(data.value) ??
    parseNumeric(data.collectionValue)
  );
}

interface MostValuableCardData {
  card: Card;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

function BarRow({
  label,
  value,
  sub,
  catalogTotal,
  icon,
  uniqueLabel = "unique",
  copiesLabel = "copies",
}: {
  label: string;
  value: number;
  sub?: number;
  catalogTotal?: number;
  icon?: React.ReactNode;
  uniqueLabel?: string;
  copiesLabel?: string;
}) {
  /** Completion = unique / catalogTotal; fallback to unique / copies */
  const pct =
    catalogTotal != null && catalogTotal > 0
      ? (value / catalogTotal) * 100
      : sub != null && sub > 0
        ? (value / sub) * 100
        : value > 0
          ? 100
          : 0;

  return (
    <div className="group space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {icon}
          <span className="truncate text-sm font-medium text-gray-200">
            {label.includes(" (") ? label : formatLabel(label)}
          </span>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-400">
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-700/60">
        <div
          className="h-full rounded-full bg-emerald-500/90 transition-all duration-500 ease-out group-hover:bg-emerald-400"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[11px] tabular-nums text-gray-500">
        {value}{catalogTotal != null ? ` / ${catalogTotal}` : ""} {uniqueLabel}
        {sub != null ? ` · ${sub} ${copiesLabel}` : ""}
      </p>
    </div>
  );
}

interface CollectionStatsProps {
  /** Increment to refetch (e.g. after collection changes) */
  refreshTrigger?: number;
  /** When false, only show completion block (no breakdown). Default true. */
  breakdown?: boolean;
}

function StatsSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-6 shadow-lg"
      aria-hidden
    >
      <div className={`flex flex-wrap items-center gap-8 ${compact ? "" : "mb-8"}`}>
        <div className="flex items-center gap-6">
          <div className="size-24 shrink-0 animate-pulse rounded-full bg-gray-600/80" />
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-600/80" />
            <div className="h-8 w-24 animate-pulse rounded bg-gray-600/80" />
            <div className="h-3 w-40 animate-pulse rounded bg-gray-600/80" />
          </div>
        </div>
      </div>
      {!compact && (
        <div className="border-t border-gray-600 pt-4">
          <div className="h-10 w-full animate-pulse rounded bg-gray-600/40" />
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
                <div className="mb-3 h-3 w-16 animate-pulse rounded bg-gray-600/80" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-8 w-full animate-pulse rounded bg-gray-600/40" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function CollectionStats({ refreshTrigger = 0, breakdown = true }: CollectionStatsProps) {
  const { t, locale } = useLocale();
  const [stats, setStats] = useState<CollectionStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostOwnedFull, setMostOwnedFull] = useState<Card | null>(null);
  const [collectionValue, setCollectionValue] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [mostValuableCard, setMostValuableCard] = useState<MostValuableCardData | null>(null);
  const [topValuableCards, setTopValuableCards] = useState<MostValuableCardData[]>([]);
  const [pricedUniqueCount, setPricedUniqueCount] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, valueData, collectionData] = await Promise.all([
        getCollectionStats(),
        getCollectionValue().catch(() => null),
        getCollection().catch(() => null),
      ]);
      setStats(statsData);

      const amount = valueData ? parseCollectionValueAmount(valueData) : null;
      setCollectionValue(amount);
      const nextCurrency = valueData?.currency?.trim().toUpperCase();
      setCurrency(nextCurrency && nextCurrency.length === 3 ? nextCurrency : "USD");

      if (collectionData?.items?.length) {
        let best: MostValuableCardData | null = null;
        const ranking: MostValuableCardData[] = [];
        let pricedCount = 0;
        let computedTotalValue = 0;
        for (const item of collectionData.items) {
          const qty = Number(item.quantity ?? 0);
          if (!item.card || !Number.isFinite(qty) || qty <= 0) continue;
          const unitPrice = getCardTcgPrice(item.card);
          if (unitPrice == null || unitPrice <= 0) continue;
          pricedCount += 1;
          const total = unitPrice * qty;
          computedTotalValue += total;
          ranking.push({
            card: item.card,
            quantity: qty,
            unitPrice,
            totalValue: total,
          });
          if (!best || total > best.totalValue) {
            best = {
              card: item.card,
              quantity: qty,
              unitPrice,
              totalValue: total,
            };
          }
        }
        ranking.sort((a, b) => b.totalValue - a.totalValue);
        setTopValuableCards(ranking.slice(0, 10));
        setMostValuableCard(best);
        setPricedUniqueCount(pricedCount);
        if (amount == null && computedTotalValue > 0) {
          setCollectionValue(computedTotalValue);
        }
      } else {
        setMostValuableCard(null);
        setTopValuableCards([]);
        setPricedUniqueCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("collectionStats.failedToLoadStats"));
      setStats(null);
      setCollectionValue(null);
      setCurrency("USD");
      setMostValuableCard(null);
      setTopValuableCards([]);
      setPricedUniqueCount(0);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  useEffect(() => {
    if (!stats?.mostOwnedCard) { setMostOwnedFull(null); return; }
    const card = stats.mostOwnedCard.card;
    if (getCardImageUrl(card)) { setMostOwnedFull(null); return; }
    let cancelled = false;
    getCard(card.uuid).then((full) => { if (!cancelled) setMostOwnedFull(full); }).catch(() => {});
    return () => { cancelled = true; };
  }, [stats?.mostOwnedCard]);

  if (loading && !stats) {
    return <StatsSkeleton compact={!breakdown} />;
  }

  if (error && !stats) {
    return (
      <section className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-6">
        <p className="text-center text-sm text-red-300">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mx-auto mt-3 block rounded bg-gray-600 px-3 py-1.5 text-sm hover:bg-gray-500"
        >
          {t("collectionStats.tryAgain")}
        </button>
      </section>
    );
  }

  if (!stats) return null;

  const byDomainOrdered = [...stats.byDomain].sort((a, b) => {
    const i = DOMAIN_ORDER.indexOf(a.domain.toLowerCase());
    const j = DOMAIN_ORDER.indexOf(b.domain.toLowerCase());
    if (i === -1 && j === -1) return a.domain.localeCompare(b.domain);
    if (i === -1) return 1;
    if (j === -1) return -1;
    return i - j;
  });

  const sortedDomains = stats.byDomain.length > 0
    ? [...stats.byDomain].filter((d) => DOMAIN_IMAGE_SLUGS.has(d.domain.toLowerCase()))
    : [];

  const topDomain = sortedDomains.length > 0
    ? [...sortedDomains].sort((a, b) => b.uniqueCards - a.uniqueCards)[0]
    : null;

  const bottomDomain = sortedDomains.length > 1
    ? [...sortedDomains].sort((a, b) => a.uniqueCards - b.uniqueCards)[0]
    : null;

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-gray-700/60 bg-gray-800/40 p-6 shadow-lg"
      aria-label={t("collectionStats.ariaStats")}
    >
      <div className="relative">
      {/* Hero: completion + main numbers */}
      <div
        className={`flex flex-wrap items-start gap-4 sm:gap-8 ${breakdown ? "mb-8" : ""}`}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative flex size-24 shrink-0 items-center justify-center">
            <svg className="size-24 -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-gray-700"
                strokeWidth="2.5"
                fill="none"
                d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
              />
              <path
                className="stroke-emerald-500 transition-all duration-700 ease-out"
                strokeWidth="2.5"
                strokeDasharray={`${stats.completionPercent} 100`}
                strokeLinecap="round"
                fill="none"
                d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
              />
            </svg>
            <span className="absolute text-xl font-bold tabular-nums text-white">
              {stats.completionPercent.toFixed(1)}%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500">{t("collectionStats.completion")}</p>
            <p className="mt-0.5 text-2xl font-bold text-white tabular-nums">
              {stats.totalUniqueCards}
              <span className="text-gray-400 font-normal"> / {stats.totalInCatalog}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {stats.missingCount} {t("collectionStats.missing")} · {stats.totalCopies} {t("collectionStats.totalCopies")}
            </p>
          </div>
          {topDomain && (
            <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-700/60 bg-gray-800 ring-2 ring-emerald-600/30"
                title={t("collectionStats.tooltipMostUnique", { domain: topDomain.domain, count: topDomain.uniqueCards })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/domains/${topDomain.domain.toLowerCase()}.webp`}
                  alt={topDomain.domain}
                  className="size-14 object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                  {t(`collectionStats.domainTopLabel_${topDomain.domain.toLowerCase()}`)}
                </p>
                <p className="mt-0.5 text-lg font-bold capitalize text-white">
                  {topDomain.domain}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {topDomain.uniqueCards} {t("collectionStats.uniqueInYourCollection")}
                </p>
              </div>
            </div>
          )}
          {bottomDomain && (
            <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-red-800/50 bg-gray-800 ring-2 ring-red-700/20"
                title={t("collectionStats.tooltipLeastUnique", { domain: bottomDomain.domain, count: bottomDomain.uniqueCards })}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/domains/${bottomDomain.domain.toLowerCase()}.webp`}
                  alt={bottomDomain.domain}
                  className="size-14 object-cover opacity-60 grayscale"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  {t(`collectionStats.domainBottomLabel_${bottomDomain.domain.toLowerCase()}`)}
                </p>
                <p className="mt-0.5 text-lg font-bold capitalize text-white">
                  {bottomDomain.domain}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {bottomDomain.uniqueCards} {t("collectionStats.uniqueInYourCollection")}
                </p>
              </div>
            </div>
          )}
          {stats.mostOwnedCard && (() => {
            const mostOwnedImgUrl = getCardImageUrl(mostOwnedFull ?? stats.mostOwnedCard.card);
            return (
            <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-600 bg-gray-800 ring-2 ring-gray-700/80"
                title={stats.mostOwnedCard.card.name}
              >
                {mostOwnedImgUrl ? (
                  <CardImg
                    src={mostOwnedImgUrl}
                    alt={stats.mostOwnedCard.card.name}
                    className="size-full object-cover object-[center_10%] opacity-80"
                  />
                ) : (
                  <span className="text-2xl text-gray-500" aria-hidden>🃏</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                  {t("collectionStats.mostOwnedCard")}
                </p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {stats.mostOwnedCard.card.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {stats.mostOwnedCard.quantity} {stats.mostOwnedCard.quantity === 1 ? t("collectionStats.copy") : t("collectionStats.copies")}
                </p>
              </div>
            </div>
            );
          })()}
          {mostValuableCard && (() => {
            const mostValuableImgUrl = getCardImageUrl(mostValuableCard.card);
            return (
              <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
                <div
                  className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-600/70 bg-gray-800 ring-2 ring-emerald-500/30"
                  title={mostValuableCard.card.name}
                >
                  {mostValuableImgUrl ? (
                    <CardImg
                      src={mostValuableImgUrl}
                      alt={mostValuableCard.card.name}
                      className="size-full object-cover object-[center_10%] opacity-85"
                    />
                  ) : (
                    <span className="text-2xl text-emerald-300" aria-hidden>💰</span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
                    {t("collectionStats.mostValuableCard")}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-white">
                    {mostValuableCard.card.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-300">
                    {formatCurrency(mostValuableCard.totalValue, currency, locale)}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {!breakdown && (
        <div className="mt-3 flex justify-end">
          <Link
            href="/collection/stats"
            className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            {t("collectionStats.viewFullStats")}
          </Link>
        </div>
      )}

      {breakdown && (
      <>
      <div className="border-t border-gray-600 pt-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">{t("collectionStats.totalValue")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">
              {collectionValue != null ? formatCurrency(collectionValue, currency, locale) : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{t("collectionStats.avgValuePerUnique")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">
              {collectionValue != null && stats.totalUniqueCards > 0
                ? formatCurrency(collectionValue / stats.totalUniqueCards, currency, locale)
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{t("collectionStats.avgValuePerCopy")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">
              {collectionValue != null && stats.totalCopies > 0
                ? formatCurrency(collectionValue / stats.totalCopies, currency, locale)
                : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{t("collectionStats.pricedCards")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-white">
              {pricedUniqueCount}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-gray-600 pt-4">
          <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                {
                  title: t("collectionStats.top10ByValue"),
                  rows:
                    topValuableCards.length === 0
                      ? []
                      : topValuableCards.map((entry, index) => (
                          <div
                            key={`${entry.card.uuid}-${index}`}
                            className="grid grid-cols-[20px_1fr_auto] items-center gap-2 rounded border border-gray-700/40 bg-gray-800/30 px-2 py-1.5"
                          >
                            <span className="text-xs font-semibold tabular-nums text-emerald-400">#{index + 1}</span>
                            <p className="truncate text-xs font-medium text-gray-100">{entry.card.name}</p>
                            <p className="text-xs font-semibold tabular-nums text-white">
                              {formatCurrency(entry.totalValue, currency, locale)}
                            </p>
                          </div>
                        )),
                  empty: t("collectionStats.noValueData"),
                },
                {
                  title: t("collectionStats.bySet"),
                  rows: stats.bySet.map((row) => (
                    <BarRow
                      key={row.set}
                      label={setDisplayName(row.set)}
                      value={row.uniqueCards}
                      sub={row.totalCopies}
                      catalogTotal={row.catalogTotal}
                      uniqueLabel={t("collectionStats.unique")}
                      copiesLabel={t("collectionStats.copies")}
                    />
                  )),
                  empty: t("collectionStats.noSetData"),
                },
                {
                  title: t("collectionStats.byDomain"),
                  rows: byDomainOrdered.map((row) => (
                    <BarRow
                      key={row.domain}
                      label={row.domain}
                      value={row.uniqueCards}
                      sub={row.totalCopies}
                      catalogTotal={row.catalogTotal}
                      uniqueLabel={t("collectionStats.unique")}
                      copiesLabel={t("collectionStats.copies")}
                      icon={
                        DOMAIN_IMAGE_SLUGS.has(row.domain.toLowerCase()) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/images/domains/${row.domain.toLowerCase()}.webp`}
                            alt={row.domain}
                            className="h-4 w-4 shrink-0 rounded-full object-contain"
                          />
                        ) : undefined
                      }
                    />
                  )),
                  empty: t("collectionStats.noDomainData"),
                },
                {
                  title: t("collectionStats.byRarity"),
                  rows: stats.byRarity.map((row) => (
                    <BarRow
                      key={row.rarity}
                      label={row.rarity}
                      value={row.uniqueCards}
                      sub={row.totalCopies}
                      catalogTotal={row.catalogTotal}
                      uniqueLabel={t("collectionStats.unique")}
                      copiesLabel={t("collectionStats.copies")}
                    />
                  )),
                  empty: t("collectionStats.noRarityData"),
                },
                {
                  title: t("collectionStats.byType"),
                  rows: stats.byType.map((row) => {
                    const iconSrc = TYPE_ICON[row.type.toLowerCase()];
                    return (
                      <BarRow
                        key={row.type}
                        label={row.type}
                        value={row.uniqueCards}
                        sub={row.totalCopies}
                        catalogTotal={row.catalogTotal}
                        uniqueLabel={t("collectionStats.unique")}
                        copiesLabel={t("collectionStats.copies")}
                        icon={
                          iconSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={iconSrc}
                              alt={row.type}
                              className="h-4 w-4 shrink-0 object-contain"
                            />
                          ) : undefined
                        }
                      />
                    );
                  }),
                  empty: t("collectionStats.noTypeData"),
                },
              ] as { title: string; rows: React.ReactNode[]; empty: string }[]
            ).map(({ title, rows, empty }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-700/50 bg-gray-900/60 p-5"
              >
                <h3 className="mb-4 border-b border-gray-700/60 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {title}
                </h3>
                <div className="space-y-4">
                  {rows.length === 0 ? (
                    <p className="text-xs text-gray-500">{empty}</p>
                  ) : (
                    rows
                  )}
                </div>
              </div>
            ))}
          </div>
      </div>
      </>
      )}
      </div>
    </section>
  );
}
