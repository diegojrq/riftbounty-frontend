"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createDeck, getDeck, getDecks } from "@/lib/decks";
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
      // Fetch full validation for each deck in parallel (list endpoint may only do structural validation)
      const validated = await Promise.all(
        list.map((d) => getDeck(d.id, true).catch(() => d))
      );
      setDecks(validated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error loading decks";
      setError(msg);
      toast.error(msg);
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
      toast.success("Deck created successfully.");
      router.push(`/decks/${deck.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error creating deck";
      setError(msg);
      toast.error(msg);
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
            No decks yet. Create one to start building.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {decks.map((deck) => {
              const legend = deck.legendCard ?? deck.legend;
              const champion = deck.championCard ?? deck.champion;
              const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              const bfCount = deck.battlefields?.filter((b) => b.card ?? b.cardId).length ?? 0;
              const domains = legend?.cardDomains ?? [];
              const noErrors = (deck.validation?.errors?.length ?? 0) === 0;
              const structurallyComplete =
                mainCount === 39 &&
                runeCount === 12 &&
                (deck.battlefields?.length ?? 0) === 3 &&
                deck.battlefields?.every((b) => b.card ?? b.cardId) &&
                !!legend &&
                !!champion;
              const isValid =
                noErrors &&
                (deck.validation?.valid === true || structurallyComplete);

              return (
                <li key={deck.id}>
                  <Link
                    href={isValid ? `/decks/${deck.id}/view` : `/decks/${deck.id}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 transition hover:border-gray-600 hover:bg-gray-750 hover:shadow-xl"
                  >
                    {/* Card images strip */}
                    <div className="relative flex h-28 bg-gray-900">
                      {legend?.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={legend.imageUrl}
                          alt={legend.name}
                          className="h-full w-1/2 object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-1/2 items-center justify-center bg-gray-800">
                          <span className="px-2 text-center text-xs text-gray-500">{legend?.name ?? "No Legend"}</span>
                        </div>
                      )}
                      {champion?.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={champion.imageUrl}
                          alt={champion.name}
                          className="h-full w-1/2 object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full w-1/2 items-center justify-center border-l border-gray-700 bg-gray-800">
                          <span className="px-2 text-center text-xs text-gray-500">{champion?.name ?? "No Champion"}</span>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-800 via-gray-800/10 to-transparent" />
                      {/* Validation badge */}
                      <div className="absolute right-2 top-2">
                        {isValid ? (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-700 bg-emerald-900/80 px-2 py-0.5 text-xs font-medium text-emerald-400 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Valid
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full border border-gray-600 bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-gray-400 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                            Building
                          </span>
                        )}
                      </div>
                      {/* Domain icons */}
                      {domains.length > 0 && (
                        <div className="absolute left-2 top-2 flex gap-1">
                          {domains.map((cd) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={cd.domain.name}
                              src={`/images/${cd.domain.name.toLowerCase()}.webp`}
                              alt={cd.domain.name}
                              title={cd.domain.name}
                              className="h-6 w-6 rounded-full border border-gray-600 bg-gray-900 object-contain p-0.5 backdrop-blur-sm"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3">
                      <p className="truncate font-semibold text-white">{deck.name || "Unnamed deck"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className={mainCount === 39 ? "text-emerald-500" : ""}>{mainCount}/39 main</span>
                        <span className={runeCount === 12 ? "text-emerald-500" : ""}>{runeCount}/12 runes</span>
                        <span className={bfCount === 3 ? "text-emerald-500" : ""}>{bfCount}/3 battlefields</span>
                      </div>
                      {(legend || champion) && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          {legend && <span className="truncate">{legend.name}</span>}
                          {legend && champion && <span>·</span>}
                          {champion && <span className="truncate">{champion.name}</span>}
                        </div>
                      )}
                    </div>
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
