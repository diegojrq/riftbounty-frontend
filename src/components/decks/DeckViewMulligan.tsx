"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { expandMainDeckToCards, shuffleInPlace } from "@/lib/deck-stats";
import { useLocale } from "@/lib/locale-context";
import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";
import { DeckCardThumb } from "./DeckCardThumb";

const OPENING_HAND = 4;
const MAX_MULLIGAN = 2;

export function DeckViewMulligan({ deck }: { deck: Deck }) {
  const { t } = useLocale();
  const pool = useMemo(() => expandMainDeckToCards(deck), [deck]);
  const [library, setLibrary] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  /** Índices que acabaram de receber carta nova no mulligan (animação). */
  const [mulliganFlashSlots, setMulliganFlashSlots] = useState<Set<number> | null>(null);

  const empty = pool.length === 0;

  const dealOpening = useCallback(() => {
    if (pool.length === 0) return;
    const cards = [...pool];
    shuffleInPlace(cards);
    const n = Math.min(OPENING_HAND, cards.length);
    const h = cards.splice(0, n);
    setHand(h);
    setLibrary(cards);
    setSelected(new Set());
    setMulliganFlashSlots(null);
  }, [pool]);

  useEffect(() => {
    if (!mulliganFlashSlots || mulliganFlashSlots.size === 0) return;
    const id = window.setTimeout(() => setMulliganFlashSlots(null), 650);
    return () => window.clearTimeout(id);
  }, [mulliganFlashSlots]);

  const toggleSelect = useCallback(
    (index: number) => {
      if (hand.length !== OPENING_HAND) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else if (next.size < MAX_MULLIGAN) {
          next.add(index);
        }
        return next;
      });
    },
    [hand.length]
  );

  const doMulligan = useCallback(() => {
    const n = selected.size;
    if (n < 1 || n > MAX_MULLIGAN || hand.length !== OPENING_HAND) return;

    const flash = new Set(selected);
    let lib = [...library];
    hand.forEach((card, i) => {
      if (selected.has(i)) lib.push(card);
    });
    shuffleInPlace(lib);

    const newHand = hand.map((card, i) => {
      if (!selected.has(i)) return card;
      const drawn = lib.shift();
      return drawn ?? card;
    });

    setMulliganFlashSlots(flash);
    setHand(newHand);
    setLibrary(lib);
    setSelected(new Set());
  }, [hand, library, selected]);

  const drawToFive = useCallback(() => {
    if (hand.length !== OPENING_HAND || library.length === 0) return;
    const [top, ...rest] = library;
    setHand((h) => [...h, top]);
    setLibrary(rest);
    setSelected(new Set());
    setMulliganFlashSlots(null);
  }, [hand.length, library]);

  const started = hand.length > 0;
  const canSelect = hand.length === OPENING_HAND;
  const mulliganEnabled = canSelect && selected.size >= 1 && selected.size <= MAX_MULLIGAN;
  const canDrawToFive = hand.length === OPENING_HAND && library.length > 0;

  const handGridClass =
    hand.length <= 4
      ? "grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3"
      : "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 md:gap-3";

  return (
    <section className="mt-8 rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 sm:p-6">
      <h2 className="mb-1 text-lg font-semibold text-amber-500/95">{t("decks.mulliganTitle")}</h2>
      <p className="mb-4 text-sm text-gray-400">{t("decks.mulliganSubtitle")}</p>

      {empty ? (
        <p className="text-sm text-gray-500">{t("decks.mulliganEmptyMain")}</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={dealOpening}
              className="rounded-lg border border-emerald-700/60 bg-emerald-900/40 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-900/60"
            >
              {t("decks.mulliganShuffleDraw")}
            </button>
            {started && (
              <span className="text-xs tabular-nums text-gray-500">
                {t("decks.mulliganLibraryCount", { count: library.length })}
              </span>
            )}
          </div>

          {started ? (
            <>
              {canSelect && (
                <p className="mb-2 text-xs text-gray-500">
                  {t("decks.mulliganSelectHint")}{" "}
                  <span className="text-gray-400">
                    ({t("decks.mulliganSelectCount", { n: selected.size })})
                  </span>
                </p>
              )}

              <div className={`mb-4 ${handGridClass}`}>
                {hand.map((card, i) => {
                  const isSel = selected.has(i);
                  const flash = mulliganFlashSlots?.has(i) ?? false;
                  return (
                    <div key={`mulligan-slot-${i}`} className="min-w-0 w-full">
                      <button
                        type="button"
                        onClick={() => toggleSelect(i)}
                        disabled={!canSelect}
                        className={`w-full rounded-lg p-0.5 text-left transition-shadow ${
                          canSelect
                            ? `cursor-pointer ${isSel ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900" : "hover:ring-1 hover:ring-gray-600"}`
                            : "cursor-default"
                        }`}
                        aria-pressed={canSelect ? isSel : undefined}
                        aria-label={canSelect ? `${isSel ? "Deselect" : "Select"} card ${i + 1}` : undefined}
                      >
                        <div
                          className={`w-full ${flash ? "animate-mulligan-replace" : ""}`}
                        >
                          <DeckCardThumb key={card.id} card={card} quantity={1} hoverPreview={false} />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={doMulligan}
                  disabled={!mulliganEnabled}
                  className="rounded-lg border border-amber-700/60 bg-amber-950/40 px-4 py-2 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-950/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("decks.mulliganMulligan")}
                </button>
                <button
                  type="button"
                  onClick={drawToFive}
                  disabled={!canDrawToFive}
                  className="rounded-lg border border-sky-700/60 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 transition-colors hover:bg-sky-950/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("decks.mulliganDrawToFive")}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">{t("decks.mulliganNoHandYet")}</p>
          )}
        </>
      )}
    </section>
  );
}
