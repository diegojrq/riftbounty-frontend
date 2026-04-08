"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getDeck } from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Deck } from "@/types/deck";
import { BackLink } from "@/components/layout/BackLink";
import { DeckViewPageContent, DeckViewSkeleton } from "@/components/decks/DeckViewPageContent";

export default function DeckViewPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDeck = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const d = await getDeck(deckId, true);
      setDeck(d);
    } catch {
      setDeck(null);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchDeck();
  }, [authLoading, user, router, fetchDeck]);

  if (authLoading || loading) {
    return <DeckViewSkeleton />;
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-8">
        <BackLink href="/decks" label={t("back.myDecks")} />
        <p className="text-gray-400">{t("decks.deckNotFound")}</p>
      </div>
    );
  }

  return (
    <DeckViewPageContent
      deck={deck}
      backHref="/decks"
      backLabel={t("back.myDecks")}
      readOnly={false}
    />
  );
}
