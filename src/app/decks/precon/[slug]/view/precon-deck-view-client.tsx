"use client";

import { useMemo } from "react";
import { buildPreconSyntheticDeck } from "@/lib/build-precon-synthetic-deck";
import { getPreconDeckViewData } from "@/data/precon-champion-deck-lists";
import { DeckViewPageContent, DeckViewSkeleton } from "@/components/decks/DeckViewPageContent";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";

export function PreconDeckViewClient({ slug }: { slug: string }) {
  const { cards, loading } = useCards();
  const { t } = useLocale();

  /** Primeiro paint: `loading` ainda é false e `cards` está vazio — não montar deck antes do catálogo. */
  const catalogReady = cards.length > 0;

  const deck = useMemo(() => {
    if (!catalogReady) return null;
    const viewData = getPreconDeckViewData(slug);
    if (!viewData) return null;
    const title = t(`preconDecks.${viewData.titleKey}`);
    return buildPreconSyntheticDeck(slug, cards, title);
  }, [catalogReady, cards, slug, t]);

  if (loading || !catalogReady) {
    return <DeckViewSkeleton />;
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-8">
        <p className="text-gray-400">{t("decks.deckNotFound")}</p>
      </div>
    );
  }

  return (
    <DeckViewPageContent
      deck={deck}
      backHref="/decks/precon"
      backLabel={t("preconDecks.viewBackToPrecon")}
      readOnly
    />
  );
}
