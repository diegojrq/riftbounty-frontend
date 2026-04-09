"use client";

import Link from "next/link";
import { useMemo } from "react";
import { findCardForPreRift, resolvePreconLegendCard } from "@/components/events/pre-rift-card-thumb";
import { DeckGridSkeleton, DeckSummaryCard } from "@/components/decks/deck-summary-card";
import {
  PRECON_CHAMPION_DECKS,
  PRECON_SET_ORDER,
  type PreconDeckSet,
} from "@/data/precon-champion-decks";
import { getPreconDeckViewData, mainDeckTotalCards } from "@/data/precon-champion-deck-lists";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";

const SET_HEADING_KEY: Record<PreconDeckSet, string> = {
  origins: "setHeadingOrigins",
  spiritforged: "setHeadingSpiritforged",
  unleashed: "setHeadingUnleashed",
};

export function PreconDecksContent() {
  const { t } = useLocale();
  const { cards, loading } = useCards();
  const p = (key: string) => t(`preconDecks.${key}`);

  const resolved = useMemo(() => {
    return PRECON_CHAMPION_DECKS.map((def) => {
      const legendCard = resolvePreconLegendCard(cards, def.legend, def.legendCollector);
      let championCard = findCardForPreRift(cards, def.champion, def.championCollector);
      if (!championCard && def.id === "vex-unleashed-champion") {
        championCard =
          findCardForPreRift(cards, "Vex, Cheerless") ?? findCardForPreRift(cards, "Vex, Mocking");
      }
      if (!championCard && def.id === "jinx-ogn-champion") {
        championCard = findCardForPreRift(cards, "Vi, Destructive");
      }
      if (!championCard && def.id === "lee-sin-ogn-champion") {
        championCard = findCardForPreRift(cards, "Udyr, Wildman");
      }
      if (!championCard && def.id === "viktor-ogn-champion") {
        championCard = findCardForPreRift(cards, "Heimerdinger, Inventor");
      }
      if (!championCard && def.id === "rumble-sfd-champion") {
        championCard = findCardForPreRift(cards, "Rumble, Scrapper");
      }
      if (!championCard && def.id === "fiora-sfd-champion") {
        championCard = findCardForPreRift(cards, "Fiora, Peerless");
      }
      return { def, legendCard, championCard };
    });
  }, [cards]);

  const bySet = useMemo(() => {
    const map = new Map<PreconDeckSet, typeof resolved>();
    for (const set of PRECON_SET_ORDER) {
      map.set(set, []);
    }
    for (const item of resolved) {
      map.get(item.def.set)!.push(item);
    }
    return map;
  }, [resolved]);

  const skeletonCountBySet = useMemo(() => {
    const map = new Map<PreconDeckSet, number>();
    for (const set of PRECON_SET_ORDER) {
      map.set(set, 0);
    }
    for (const d of PRECON_CHAMPION_DECKS) {
      map.set(d.set, (map.get(d.set) ?? 0) + 1);
    }
    return map;
  }, []);

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
          <div className="space-y-10">
            {PRECON_SET_ORDER.map((set) => {
              const count = skeletonCountBySet.get(set) ?? 0;
              if (count === 0) return null;
              return (
                <section key={set} className="space-y-4">
                  <h2 className="border-b border-gray-700 pb-2 text-lg font-semibold tracking-tight text-white">
                    {p(SET_HEADING_KEY[set])}
                  </h2>
                  <DeckGridSkeleton count={count} />
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-10">
            {PRECON_SET_ORDER.map((set) => {
              const items = bySet.get(set) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={set} className="space-y-4">
                  <h2 className="border-b border-gray-700 pb-2 text-lg font-semibold tracking-tight text-white">
                    {p(SET_HEADING_KEY[set])}
                  </h2>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map(({ def, legendCard, championCard }) => {
                      const viewData = getPreconDeckViewData(def.slug);
                      const mainCount = viewData ? mainDeckTotalCards(viewData) : 39;
                      return (
                        <li key={def.id}>
                          <DeckSummaryCard
                            href={`/decks/precon/${def.slug}/view`}
                            legend={legendCard}
                            champion={championCard}
                            name={t(`preconDecks.${def.titleKey}`)}
                            mainCount={mainCount}
                            runeCount={12}
                            bfCount={3}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
