"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getCollectionStats } from "@/lib/collections";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import type { CollectionStats as CollectionStatsType } from "@/types/collection";

const DOMAIN_ORDER = ["fury", "calm", "mind", "body", "chaos", "order"];

const DOMAIN_TOP_LABEL: Record<string, string> = {
  fury:       "Anger issues?",
  calm:       "Too calm...",
  mind:       "Big brain energy",
  body:       "What a physique!",
  chaos:      "Absolute chaos",
  order:      "Control freak",
  colorless:  "No style points",
};

const DOMAIN_BOTTOM_LABEL: Record<string, string> = {
  fury:       "Too chill for you",
  calm:       "Stressed out today?",
  mind:       "Not thinking much",
  body:       "Skipping leg day?",
  chaos:      "Too organized?",
  order:      "A bit of a rebel",
  colorless:  "At least you tried",
};

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

function BarRow({
  label,
  value,
  sub,
  catalogTotal,
  icon,
}: {
  label: string;
  value: number;
  sub?: number;
  catalogTotal?: number;
  icon?: React.ReactNode;
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
        {value}{catalogTotal != null ? ` / ${catalogTotal}` : ""} unique
        {sub != null ? ` · ${sub} copies` : ""}
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
  const [stats, setStats] = useState<CollectionStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCollectionStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

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
          Try again
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
      aria-label="Collection statistics"
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
            <p className="text-sm font-medium uppercase tracking-wider text-gray-500">Completion</p>
            <p className="mt-0.5 text-2xl font-bold text-white tabular-nums">
              {stats.totalUniqueCards}
              <span className="text-gray-400 font-normal"> / {stats.totalInCatalog}</span>
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {stats.missingCount} missing · {stats.totalCopies} total copies
            </p>
          </div>
          {topDomain && (
            <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-700/60 bg-gray-800 ring-2 ring-emerald-600/30"
                title={`Most unique: ${topDomain.domain} (${topDomain.uniqueCards})`}
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
                  {DOMAIN_TOP_LABEL[topDomain.domain.toLowerCase()] ?? "Most in collection"}
                </p>
                <p className="mt-0.5 text-lg font-bold capitalize text-white">
                  {topDomain.domain}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {topDomain.uniqueCards} unique in your collection
                </p>
              </div>
            </div>
          )}
          {bottomDomain && (
            <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-red-800/50 bg-gray-800 ring-2 ring-red-700/20"
                title={`Least unique: ${bottomDomain.domain} (${bottomDomain.uniqueCards})`}
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
                  {DOMAIN_BOTTOM_LABEL[bottomDomain.domain.toLowerCase()] ?? "Least in collection"}
                </p>
                <p className="mt-0.5 text-lg font-bold capitalize text-white">
                  {bottomDomain.domain}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {bottomDomain.uniqueCards} unique in your collection
                </p>
              </div>
            </div>
          )}
          {stats.mostOwnedCard && (
            <div className="hidden w-full items-center gap-3 sm:flex sm:w-auto">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-600 bg-gray-800 ring-2 ring-gray-700/80"
                title={stats.mostOwnedCard.card.name}
              >
                {getCardImageUrl(stats.mostOwnedCard.card) ? (
                  <CardImg
                    src={getCardImageUrl(stats.mostOwnedCard.card)!}
                    alt={stats.mostOwnedCard.card.name}
                    className="size-full object-cover object-[center_10%] opacity-80"
                  />
                ) : (
                  <span className="text-2xl text-gray-500" aria-hidden>🃏</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                  Most owned card
                </p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {stats.mostOwnedCard.card.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {stats.mostOwnedCard.quantity} {stats.mostOwnedCard.quantity === 1 ? "copy" : "copies"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {!breakdown && (
        <div className="mt-3 flex justify-end">
          <Link
            href="/collection/stats"
            className="text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            View full stats →
          </Link>
        </div>
      )}

      {breakdown && (
      <>
      <div className="border-t border-gray-600 pt-4">
          <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                {
                  title: "By set",
                  rows: stats.bySet.map((row) => (
                    <BarRow
                      key={row.set}
                      label={setDisplayName(row.set)}
                      value={row.uniqueCards}
                      sub={row.totalCopies}
                      catalogTotal={row.catalogTotal}
                    />
                  )),
                  empty: "No set data",
                },
                {
                  title: "By domain",
                  rows: byDomainOrdered.map((row) => (
                    <BarRow
                      key={row.domain}
                      label={row.domain}
                      value={row.uniqueCards}
                      sub={row.totalCopies}
                      catalogTotal={row.catalogTotal}
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
                  empty: "No domain data",
                },
                {
                  title: "By rarity",
                  rows: stats.byRarity.map((row) => (
                    <BarRow
                      key={row.rarity}
                      label={row.rarity}
                      value={row.uniqueCards}
                      sub={row.totalCopies}
                      catalogTotal={row.catalogTotal}
                    />
                  )),
                  empty: "No rarity data",
                },
                {
                  title: "By type",
                  rows: stats.byType.map((row) => {
                    const iconSrc = TYPE_ICON[row.type.toLowerCase()];
                    return (
                      <BarRow
                        key={row.type}
                        label={row.type}
                        value={row.uniqueCards}
                        sub={row.totalCopies}
                        catalogTotal={row.catalogTotal}
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
                  empty: "No type data",
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
