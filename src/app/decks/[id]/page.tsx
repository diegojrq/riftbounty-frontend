"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getDeck,
  updateDeckName,
  setLegend,
  setChampion,
  addMainCard,
  setMainCardQuantity,
  removeMainCard,
  addRuneCard,
  setRuneCardQuantity,
  removeRuneCard,
  setBattlefield,
  deleteDeck,
} from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import { CardTile } from "@/components/cards/CardTile";
import type { Card } from "@/types/card";
import type { CardsListResponse, CardsQueryParams } from "@/types/card";
import type { Deck } from "@/types/deck";

function toQueryRecord(p: CardsQueryParams): Record<string, string | number | undefined> {
  return p as Record<string, string | number | undefined>;
}

export default function DeckBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [picker, setPicker] = useState<"legend" | "champion" | "main" | "rune" | "bf1" | "bf2" | "bf3" | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState("");

  const fetchDeck = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await getDeck(deckId, true);
      setDeck(d);
      setNameDraft(d.name || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading deck");
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

  const fetchCards = useCallback(async () => {
    if (!picker) return;
    setCardsLoading(true);
    try {
      const params: CardsQueryParams = {
        limit: picker === "legend" ? 50 : 100,
        offset: 0,
        sortBy: "collector_number",
        order: "asc",
        ...(cardSearchQuery.trim().length >= 2 && { name: cardSearchQuery.trim() }),
      };
      if (picker === "legend") {
        params.type = "legend";
      } else if (picker === "champion") {
        params.supertype_id = 33;
      } else if (picker === "rune") {
        params.type = "Rune";
      } else if (picker === "bf1" || picker === "bf2" || picker === "bf3") {
        params.type = "Battlefield";
      }
      const res = await apiGet<CardsListResponse>("/cards", toQueryRecord(params));
      setCards(res.data.items ?? []);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [picker, cardSearchQuery]);

  useEffect(() => {
    if (!picker) {
      setCards([]);
      return;
    }
    const t = setTimeout(fetchCards, cardSearchQuery.trim().length >= 2 ? 400 : 0);
    return () => clearTimeout(t);
  }, [picker, cardSearchQuery, fetchCards]);

  async function handleSaveName() {
    if (!deck || nameDraft === deck.name) return;
    setSavingName(true);
    try {
      const updated = await updateDeckName(deck.id, nameDraft);
      setDeck(updated);
    } catch {
      // keep draft
    } finally {
      setSavingName(false);
    }
  }

  async function handleSetLegend(card: Card) {
    if (!deck) return;
    try {
      const updated = await setLegend(deck.id, card.uuid);
      setDeck(updated);
      setPicker(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set legend");
    }
  }

  async function handleSetChampion(card: Card) {
    if (!deck) return;
    try {
      const updated = await setChampion(deck.id, card.uuid);
      setDeck(updated);
      setPicker(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set champion");
    }
  }

  async function handleAddMain(card: Card) {
    if (!deck) return;
    try {
      const updated = await addMainCard(deck.id, card.uuid, 1);
      setDeck(updated);
      setPicker(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add card");
    }
  }

  async function handleAddRune(card: Card) {
    if (!deck) return;
    try {
      const updated = await addRuneCard(deck.id, card.uuid, 1);
      setDeck(updated);
      setPicker(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add rune");
    }
  }

  async function handleSetBattlefield(position: 1 | 2 | 3, card: Card) {
    if (!deck) return;
    try {
      const updated = await setBattlefield(deck.id, position, card.uuid);
      setDeck(updated);
      setPicker(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set battlefield");
    }
  }

  async function handleDelete() {
    if (!deck || !confirm("Delete this deck?")) return;
    try {
      await deleteDeck(deck.id);
      router.replace("/decks");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!deckId || (!loading && !deck)) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-8">
        <p className="text-gray-400">Deck not found.</p>
        <Link href="/decks" className="mt-4 inline-block text-emerald-400 hover:underline">Back to decks</Link>
      </div>
    );
  }

  const mainCount = deck?.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const runeCount = deck?.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const validation = deck?.validation;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/decks" className="text-gray-400 hover:text-white">← Decks</Link>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleSaveName}
            disabled={savingName}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-lg font-medium text-white"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/70"
          >
            Delete deck
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading deck...</p>
        ) : !deck ? null : (
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Coluna esquerda: lista de cartas filtrada pela ação da direita */}
            <div className="flex flex-1 flex-col rounded-lg border border-gray-700 bg-gray-800/50 p-4 min-h-[400px]">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                League of Legends — Trading Card Game
              </h2>
              {picker ? (
                <>
                  <p className="mb-2 text-xs text-gray-500">
                    {picker === "legend" && "Select a Legend below."}
                    {picker === "champion" && "Select a Champion below."}
                    {picker === "bf1" && "Select a Battlefield for Slot 1."}
                    {picker === "bf2" && "Select a Battlefield for Slot 2."}
                    {picker === "bf3" && "Select a Battlefield for Slot 3."}
                    {picker === "main" && "Click a card to add to Main Deck."}
                    {picker === "rune" && "Click a rune to add to Rune Deck."}
                  </p>
                  <input
                    type="text"
                    value={cardSearchQuery}
                    onChange={(e) => setCardSearchQuery(e.target.value)}
                    placeholder="Search by name (min. 2 characters)..."
                    className="mb-3 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400"
                  />
                  {cardsLoading ? (
                    <p className="py-8 text-center text-gray-400">Loading cards...</p>
                  ) : cards.length === 0 ? (
                    <p className="py-8 text-center text-gray-400">
                      {cardSearchQuery.trim().length >= 2 ? "No cards found." : "Enter a search or filter."}
                    </p>
                  ) : (
                    <ul className="grid list-none grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {cards.map((card) => (
                        <li key={card.uuid}>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                              if (picker === "legend") handleSetLegend(card);
                              else if (picker === "champion") handleSetChampion(card);
                              else if (picker === "main") handleAddMain(card);
                              else if (picker === "rune") handleAddRune(card);
                              else if (picker === "bf1") handleSetBattlefield(1, card);
                              else if (picker === "bf2") handleSetBattlefield(2, card);
                              else if (picker === "bf3") handleSetBattlefield(3, card);
                            }}
                          >
                            <CardTile card={card} wrapperElement="div" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm">
                  Click &quot;Set legend&quot;, &quot;Set champion&quot;, &quot;Set battlefield&quot;, &quot;+ Add card&quot; or &quot;+ Add rune&quot; on the right to filter cards and choose.
                </p>
              )}
            </div>

            {/* Coluna direita: seções do deck (como na imagem) */}
            <div className="flex w-full flex-col gap-4 lg:w-[380px] lg:shrink-0">
              {/* LEGEND & CHAMPION */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Legend & Champion
                </h2>
                <div className="mb-2 flex gap-2 text-xs text-gray-500">
                  <span>Legend (1)</span>
                  <span>Champion (1)</span>
                </div>
                <div className="flex gap-3">
                  {deck.legend ? (
                    <div className="flex-1 rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-white">
                      {deck.legend.name}
                      <button type="button" onClick={() => setPicker("legend")} className="ml-2 text-gray-400 hover:text-white text-xs">Change</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPicker("legend")}
                      className="flex-1 rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Set legend
                    </button>
                  )}
                  {deck.champion ? (
                    <div className="flex-1 rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm text-white">
                      {deck.champion.name}
                      <button type="button" onClick={() => setPicker("champion")} className="ml-2 text-gray-400 hover:text-white text-xs">Change</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPicker("champion")}
                      className="flex-1 rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
                    >
                      Set champion
                    </button>
                  )}
                </div>
              </section>

              {/* BATTLEFIELDS (3) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Battlefields (3)
                </h2>
                <div className="space-y-2">
                  {([1, 2, 3] as const).map((pos) => {
                    const bf = deck.battlefields?.find((b) => b.position === pos);
                    return (
                      <div key={pos} className="flex items-center justify-between gap-2 rounded border border-gray-600 bg-gray-700/30 px-3 py-2">
                        <span className="text-xs text-gray-500">Slot {pos}</span>
                        {bf?.card ? (
                          <span className="flex-1 truncate text-sm text-white text-right">{bf.card.name}</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setPicker(pos === 1 ? "bf1" : pos === 2 ? "bf2" : "bf3")}
                          className="rounded border border-gray-600 bg-gray-700/50 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 shrink-0"
                        >
                          {bf?.card ? "Change" : "Set battlefield"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* MAIN DECK (0/40) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Main Deck ({mainCount}/40)
                </h2>
                <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm text-white">
                  {(deck.mainItems ?? []).map((item) => (
                    <li key={item.cardId} className="flex items-center justify-between gap-2">
                      <span>×{item.quantity} {item.card?.name ?? item.cardId}</span>
                      <span className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            if (item.quantity < 2) {
                              try { setDeck(await removeMainCard(deck.id, item.cardId)); } catch {}
                            } else {
                              try { setDeck(await setMainCardQuantity(deck.id, item.cardId, item.quantity - 1)); } catch {}
                            }
                          }}
                          className="rounded bg-gray-700 px-1.5 hover:bg-gray-600"
                        >−</button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (item.quantity > 2) return;
                            try { setDeck(await setMainCardQuantity(deck.id, item.cardId, item.quantity + 1)); } catch {}
                          }}
                          disabled={item.quantity > 2}
                          className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50"
                        >+</button>
                        <button
                          type="button"
                          onClick={async () => { try { setDeck(await removeMainCard(deck.id, item.cardId)); } catch {} }}
                          className="rounded bg-red-900/50 px-1.5 text-red-200 hover:bg-red-900/70"
                        >×</button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setPicker("main")}
                  disabled={mainCount > 39}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  + Add card
                </button>
              </section>

              {/* RUNE DECK (0/12) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Rune Deck ({runeCount}/12)
                </h2>
                <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm text-white">
                  {(deck.runeItems ?? []).map((item) => (
                    <li key={item.cardId} className="flex items-center justify-between gap-2">
                      <span>×{item.quantity} {item.card?.name ?? item.cardId}</span>
                      <span className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            if (item.quantity < 2) {
                              try { setDeck(await removeRuneCard(deck.id, item.cardId)); } catch {}
                            } else {
                              try { setDeck(await setRuneCardQuantity(deck.id, item.cardId, item.quantity - 1)); } catch {}
                            }
                          }}
                          className="rounded bg-gray-700 px-1.5 hover:bg-gray-600"
                        >−</button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (runeCount > 11) return;
                            try { setDeck(await setRuneCardQuantity(deck.id, item.cardId, item.quantity + 1)); } catch {}
                          }}
                          disabled={runeCount > 11}
                          className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50"
                        >+</button>
                        <button
                          type="button"
                          onClick={async () => { try { setDeck(await removeRuneCard(deck.id, item.cardId)); } catch {} }}
                          className="rounded bg-red-900/50 px-1.5 text-red-200 hover:bg-red-900/70"
                        >×</button>
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setPicker("rune")}
                  disabled={runeCount > 11}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  + Add rune
                </button>
              </section>

              {/* Validation */}
              {validation && (
                <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Validation</h2>
                  {validation?.valid && (validation?.errors?.length ?? 0) === 0 && (validation?.warnings?.length ?? 0) === 0 ? (
                    <p className="text-emerald-400 text-sm">Deck is valid.</p>
                  ) : (
                    <div className="space-y-2">
                      {(validation?.errors ?? []).map((msg, i) => (
                        <p key={i} className="text-red-400 text-sm">{msg}</p>
                      ))}
                      {(validation?.warnings ?? []).map((msg, i) => (
                        <p key={i} className="text-amber-400 text-sm">{msg}</p>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
