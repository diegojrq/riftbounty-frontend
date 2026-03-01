"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createDeck, getDecks } from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import type { Deck } from "@/types/deck";

export default function DecksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getDecks();
      setDecks(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading decks");
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchDecks();
  }, [authLoading, user, router, fetchDecks]);

  async function handleCreateDeck() {
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const deck = await createDeck();
      router.push(`/decks/${deck.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating deck");
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <h1 className="mb-6 text-2xl font-bold text-white">My decks</h1>

        {error && (
          <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="mb-6">
          <button
            type="button"
            onClick={handleCreateDeck}
            disabled={creating}
            className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating ? "Creating…" : "New deck"}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading decks...</p>
        ) : decks.length === 0 ? (
          <p className="text-gray-400">
            No decks yet. Create one to start building (Legend, Champion, 40 main, 12 runes, 3 battlefields).
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => {
              const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              return (
                <li key={deck.id}>
                  <Link
                    href={`/decks/${deck.id}`}
                    className="block rounded-lg border border-gray-700 bg-gray-800 p-4 text-white transition hover:border-gray-600 hover:bg-gray-700/80"
                  >
                    <span className="font-medium">{deck.name || "Unnamed deck"}</span>
                    <p className="mt-1 text-sm text-gray-400">
                      Main {mainCount}/40 · Runes {runeCount}/12
                      {deck.legend && ` · ${deck.legend.name}`}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
