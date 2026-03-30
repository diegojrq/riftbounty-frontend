"use client";

import { useMemo } from "react";
import {
  buildDeckDomainCounts,
  buildDeckTypeCounts,
  buildMainDeckCmcBuckets,
  type DeckStatDomainKey,
  type DeckStatTypeKey,
} from "@/lib/deck-stats";
import { useLocale } from "@/lib/locale-context";
import type { Deck } from "@/types/deck";

const TYPE_I18N: Record<DeckStatTypeKey, string> = {
  legend: "decks.typeLegend",
  champion: "decks.typeChampion",
  unit: "decks.typeUnit",
  limit: "decks.typeLimit",
  gear: "decks.typeGear",
  spell: "decks.typeSpell",
  rune: "decks.typeRune",
  battlefield: "decks.typeBattlefield",
  other: "decks.typeOther",
};

const TYPE_ACCENT: Record<DeckStatTypeKey, string> = {
  legend: "border-l-amber-400 bg-amber-500/10",
  champion: "border-l-orange-400 bg-orange-500/10",
  unit: "border-l-rose-400 bg-rose-500/10",
  limit: "border-l-fuchsia-400 bg-fuchsia-500/10",
  gear: "border-l-slate-400 bg-slate-500/10",
  spell: "border-l-violet-400 bg-violet-500/10",
  rune: "border-l-cyan-400 bg-cyan-500/10",
  battlefield: "border-l-emerald-400 bg-emerald-500/10",
  other: "border-l-zinc-500 bg-zinc-600/10",
};

const DOMAIN_I18N: Record<DeckStatDomainKey, string> = {
  fury: "decks.statsDomainFury",
  calm: "decks.statsDomainCalm",
  mind: "decks.statsDomainMind",
  body: "decks.statsDomainBody",
  chaos: "decks.statsDomainChaos",
  order: "decks.statsDomainOrder",
  colorless: "decks.statsDomainColorless",
};

const DOMAIN_SEGMENT: Record<DeckStatDomainKey, string> = {
  fury: "bg-red-600",
  calm: "bg-sky-600",
  mind: "bg-violet-600",
  body: "bg-emerald-600",
  chaos: "bg-amber-700",
  order: "bg-yellow-600",
  colorless: "bg-zinc-500",
};

function formatPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? String(Math.round(rounded)) : rounded.toFixed(1);
}

const CMC_BAR_MAX_PX = 168;

/** Curva vertical (histograma) — barras com altura em px para escala confiável. */
function CmcHistogram({
  rows,
  total,
  t,
}: {
  rows: ReturnType<typeof buildMainDeckCmcBuckets>["rows"];
  total: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  if (total === 0) {
    return <p className="text-sm text-gray-500">—</p>;
  }

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-950/40 p-4 sm:p-5">
      <div className="flex flex-col gap-2">
        <div
          className="flex h-[188px] items-end justify-between gap-0.5 border-b border-gray-600/80 pb-0 sm:gap-2"
          role="img"
          aria-label={t("decks.statsCmcColumn")}
        >
          {rows.map((row) => {
            const showBar = row.count > 0;
            const hPx = showBar
              ? Math.max(10, Math.round((row.count / maxCount) * CMC_BAR_MAX_PX))
              : 3;

            return (
              <div
                key={row.bucket}
                className="flex min-w-0 flex-1 flex-col items-center justify-end"
              >
                <span
                  className={`mb-1.5 text-[11px] font-semibold tabular-nums sm:text-xs ${
                    row.count > 0 ? "text-amber-200/90" : "text-gray-600"
                  }`}
                >
                  {row.count}
                </span>
                <div
                  className={`w-full max-w-[52px] rounded-t-md transition-all duration-300 sm:max-w-none ${
                    showBar
                      ? "bg-gradient-to-t from-amber-950/90 via-amber-600/85 to-amber-300/95 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
                      : "bg-gray-800/50"
                  }`}
                  style={{ height: hPx }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between gap-0.5 sm:gap-2">
          {rows.map((row) => (
            <div key={`lab-${row.bucket}`} className="min-w-0 flex-1 text-center">
              <span className="text-[10px] font-medium leading-tight text-gray-500 sm:text-[11px]">
                {t(row.labelKey)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeckViewStats({ deck }: { deck: Deck }) {
  const { t } = useLocale();

  const typeData = useMemo(() => buildDeckTypeCounts(deck), [deck]);
  const cmcData = useMemo(() => buildMainDeckCmcBuckets(deck), [deck]);
  const domainData = useMemo(() => buildDeckDomainCounts(deck), [deck]);

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-amber-900/25 bg-gradient-to-b from-gray-900/95 via-gray-950 to-black/40 shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
      <header className="border-b border-amber-500/10 bg-gradient-to-r from-amber-950/20 to-transparent px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-lg font-semibold tracking-tight text-amber-400/95">
          {t("decks.statsSectionTitle")}
        </h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
          {t("decks.statsCmcHint")}
        </p>
      </header>

      <div className="space-y-10 p-4 sm:p-6">
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-200">{t("decks.statsCmcColumn")}</h3>
            {cmcData.total > 0 && (
              <span className="text-[11px] tabular-nums text-gray-600">
                {t("decks.statsCurveTotalCards", { n: cmcData.total })}
              </span>
            )}
          </div>
          <CmcHistogram rows={cmcData.rows} total={cmcData.total} t={t} />
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-200">{t("decks.statsTypesColumn")}</h3>
            {typeData.total === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                {typeData.rows.map((row) => (
                  <li
                    key={row.key}
                    className={`rounded-xl border border-gray-700/50 border-l-4 pl-3 pr-3 py-3 ${TYPE_ACCENT[row.key]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight text-gray-100">
                        {t(TYPE_I18N[row.key])}
                      </span>
                      <span className="shrink-0 text-right text-xs tabular-nums text-gray-400">
                        <span className="font-semibold text-gray-200">{row.count}</span>
                        <span className="text-gray-600"> · </span>
                        {formatPct(row.pct)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-200">{t("decks.statsDomainsColumn")}</h3>
            {domainData.total === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <div className="space-y-5">
                <div
                  className="flex h-11 w-full min-h-[2.75rem] overflow-hidden rounded-xl ring-1 ring-gray-600/50"
                  role="img"
                  aria-label={t("decks.statsDomainsColumn")}
                >
                  {domainData.rows.map((row) => (
                    <div
                      key={row.key}
                      className={`${DOMAIN_SEGMENT[row.key]} min-w-[3px] transition-[width] duration-300`}
                      style={{ width: `${Math.max(row.pct, row.count > 0 ? 0.35 : 0)}%` }}
                      title={`${t(DOMAIN_I18N[row.key])} — ${formatPct(row.pct)}% (${row.count})`}
                    />
                  ))}
                </div>
                <ul className="space-y-2.5">
                  {domainData.rows.map((row) => (
                    <li key={row.key} className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-600/60 bg-gray-900/80">
                        {row.key === "colorless" ? (
                          <span className="text-xs font-bold text-gray-500" aria-hidden>
                            —
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/images/domains/${row.key}.webp`}
                            alt=""
                            className="size-7 object-contain"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-gray-200">
                            {t(DOMAIN_I18N[row.key])}
                          </span>
                          <span className="shrink-0 tabular-nums text-gray-400">
                            <span className="text-gray-200">{row.count}</span>
                            <span className="text-gray-600"> · </span>
                            {formatPct(row.pct)}%
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
