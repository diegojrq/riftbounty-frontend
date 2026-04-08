"use client";

import Link from "next/link";
import { useMemo } from "react";
import { findCardForPreRift } from "@/components/events/pre-rift-card-thumb";
import { DeckGridSkeleton, DeckSummaryCard } from "@/components/decks/deck-summary-card";
import { PRECON_CHAMPION_DECKS } from "@/data/precon-champion-decks";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";

export function PreconDecksContent() {
  const { t } = useLocale();
  const { cards, loading } = useCards();
  const p = (key: string) => t(`preconDecks.${key}`);

  const resolved = useMemo(() => {
    return PRECON_CHAMPION_DECKS.map((def) => {
      const legendCard = findCardForPreRift(cards, def.legend, def.legendCollector);
      let championCard = findCardForPreRift(cards, def.champion, def.championCollector);
      if (!championCard && def.id === "vex-unleashed-champion") {
        championCard =
          findCardForPreRift(cards, "Vex, Cheerless") ?? findCardForPreRift(cards, "Vex, Mocking");
      }
      return { def, legendCard, championCard };
    });
  }, [cards]);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="text-emerald-400/90 hover:text-emerald-300">
            {t("common.home")}
          </Link>
        </nav>

        <header className="mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-white">{p("title")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{p("intro")}</p>
        </header>

        {loading ? (
          <DeckGridSkeleton count={2} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resolved.map(({ def, legendCard, championCard }) => (
              <li key={def.id}>
                <DeckSummaryCard
                  href={`/decks/precon/${def.slug}/view`}
                  legend={legendCard}
                  champion={championCard}
                  name={t(`preconDecks.${def.titleKey}`)}
                  mainCount={39}
                  runeCount={12}
                  bfCount={3}
                  isValid
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
