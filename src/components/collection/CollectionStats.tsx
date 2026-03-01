"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getCollectionStats } from "@/lib/collections";
import type { CollectionStats as CollectionStatsType } from "@/types/collection";

const DOMAIN_ORDER = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];
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
}: {
  label: string;
  value: number;
  sub?: number;
  catalogTotal?: number;
}) {
  /** Bar = proportion unique/total for this row (e.g. 35 unique · 80 total → 43.75%) */
  const pct =
    sub != null && sub > 0 ? (value / sub) * 100 : value > 0 ? 100 : 0;
  return (
    <div className="group flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate font-medium text-gray-300">
          {label.includes(" (") ? label : formatLabel(label)}
        </span>
        <span className="shrink-0 tabular-nums text-gray-400">
          {value} unique{sub != null ? ` · ${sub} total` : ""}
          {catalogTotal != null && catalogTotal > 0 ? ` / ${catalogTotal} in catalog` : ""}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-700/80">
        <div
          className="h-full rounded-full bg-emerald-500/90 transition-all duration-500 ease-out group-hover:bg-emerald-400"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
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
  const [breakdownOpen, setBreakdownOpen] = useState(true);

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
    const i = DOMAIN_ORDER.indexOf(a.domain);
    const j = DOMAIN_ORDER.indexOf(b.domain);
    if (i === -1 && j === -1) return a.domain.localeCompare(b.domain);
    if (i === -1) return 1;
    if (j === -1) return -1;
    return i - j;
  });

  /** Domain with most unique cards (that has a rune image) for the circle */
  const topDomain = stats.byDomain.length > 0
    ? [...stats.byDomain]
        .sort((a, b) => b.uniqueCards - a.uniqueCards)
        .find((d) => DOMAIN_IMAGE_SLUGS.has(d.domain.toLowerCase())) ?? null
    : null;
  const topDomainSlug = topDomain ? topDomain.domain.toLowerCase() : null;

  return (
    <section
      className="relative overflow-hidden rounded-xl border border-gray-700/60 bg-gray-800/40 p-6 shadow-lg"
      aria-label="Collection statistics"
    >
      <div className="relative">
      {/* Hero: completion + main numbers */}
      <div
        className={`flex flex-wrap items-center gap-8 ${breakdown ? "mb-8" : ""}`}
      >
        <div className="flex items-center gap-6">
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
            <div className="flex shrink-0 items-center gap-3">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-600 bg-gray-800 ring-2 ring-gray-700/80"
                title={`Most unique in your collection: ${topDomain.domain} (${topDomain.uniqueCards} unique)`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/${topDomain.domain.toLowerCase()}.webp`}
                  alt={topDomain.domain}
                  className="size-14 object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
                  Most in collection
                </p>
                <p className="mt-0.5 text-lg font-bold text-white tabular-nums">
                  {topDomain.domain}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {topDomain.uniqueCards} unique in your collection
                </p>
              </div>
            </div>
          )}
          {stats.mostOwnedCard && (
            <div className="flex shrink-0 items-center gap-3">
              <div
                className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-600 bg-gray-800 ring-2 ring-gray-700/80"
                title={stats.mostOwnedCard.card.name}
              >
                {stats.mostOwnedCard.card.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={stats.mostOwnedCard.card.imageUrl}
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
      {/* Collapsible divider + breakdown */}
      <div className="border-t border-gray-600 pt-4">
        <button
          type="button"
          onClick={() => setBreakdownOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded py-2 text-left text-sm font-medium text-gray-400 transition hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          aria-expanded={breakdownOpen}
        >
          <span>Breakdown by set, domain, rarity & type</span>
          <svg
            className={`size-5 shrink-0 transition-transform ${breakdownOpen ? "rotate-180" : ""}`}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {breakdownOpen && (
          <div className="grid gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">By set</h3>
          <div className="space-y-3">
            {stats.bySet.length === 0 ? (
              <p className="text-xs text-gray-500">No set data</p>
            ) : (
              stats.bySet.map((row) => (
                <BarRow
                  key={row.set}
                  label={setDisplayName(row.set)}
                  value={row.uniqueCards}
                  sub={row.totalCopies}
                  catalogTotal={row.catalogTotal}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">By domain</h3>
          <div className="space-y-3">
            {stats.byDomain.length === 0 ? (
              <p className="text-xs text-gray-500">No domain data</p>
            ) : (
              byDomainOrdered.map((row) => (
                <BarRow
                  key={row.domain}
                  label={row.domain}
                  value={row.uniqueCards}
                  sub={row.totalCopies}
                  catalogTotal={row.catalogTotal}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">By rarity</h3>
          <div className="space-y-3">
            {stats.byRarity.length === 0 ? (
              <p className="text-xs text-gray-500">No rarity data</p>
            ) : (
              stats.byRarity.map((row) => (
                <BarRow
                  key={row.rarity}
                  label={row.rarity}
                  value={row.uniqueCards}
                  sub={row.totalCopies}
                  catalogTotal={row.catalogTotal}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700/50 bg-gray-900/50 p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">By type</h3>
          <div className="space-y-3">
            {stats.byType.length === 0 ? (
              <p className="text-xs text-gray-500">No type data</p>
            ) : (
              stats.byType.map((row) => (
                <BarRow
                  key={row.type}
                  label={row.type}
                  value={row.uniqueCards}
                  sub={row.totalCopies}
                  catalogTotal={row.catalogTotal}
                />
              ))
            )}
          </div>
        </div>
          </div>
        )}
      </div>
      </>
      )}
      </div>
    </section>
  );
}
