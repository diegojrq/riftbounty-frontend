 "use client";

import { useCallback, useRef, useState } from "react";
import type { Card } from "@/types/card";
import { PreRiftCardThumb } from "@/components/events/pre-rift-card-thumb";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { CardImg } from "@/components/cards/CardImg";
import { getCardImageUrl } from "@/lib/cards";
import { getCardDisplayName } from "@/lib/card-display-name";
import {
  simulatePreRiftOpening,
  type PreRiftSimResult,
  type SimulatedPull,
} from "@/lib/unleashed-pre-rift-sim";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";

function isBattlefieldForHover(card: Card | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? card.recordType ?? "").toLowerCase();
  return t === "battlefield" || (r.length > 0 && r.includes("battleground"));
}

function SimPullTile({ pull, foilLabel }: { pull: SimulatedPull; foilLabel: string }) {
  const { card, isFoil } = pull;
  const url = getCardImageUrl(card);
  const label = getCardDisplayName(card);

  const inner = (
    <div className="relative aspect-[5/7] w-full overflow-hidden rounded-lg border border-gray-700/80 bg-gray-800/50 shadow-inner">
      {url ? (
        <CardImg
          src={url}
          alt={label}
          className={`absolute inset-0 h-full w-full object-cover ${isFoil ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-gray-900" : ""}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gray-800 px-1 text-center text-[10px] text-gray-500">
          {label}
        </div>
      )}
      {isFoil && (
        <span className="absolute left-1 top-1 rounded bg-amber-500/90 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 shadow">
          {foilLabel}
        </span>
      )}
    </div>
  );

  return (
    <CardHoverPreview card={card} battlefieldAsLandscape={isBattlefieldForHover(card)}>
      {inner}
    </CardHoverPreview>
  );
}

export function PreRiftSimulatorSection() {
  const { t } = useLocale();
  const { cards, loading } = useCards();
  const p = (key: string) => t(`events.unleashedPreRift.${key}`);

  const [result, setResult] = useState<PreRiftSimResult | null>(null);
  const [openedMiniDeck, setOpenedMiniDeck] = useState(false);
  const [openedPacks, setOpenedPacks] = useState<boolean[]>([]);
  const sectionRef = useRef<HTMLElement | null>(null);

  const canRun = !loading && cards.length > 0;

  const run = useCallback(() => {
    if (!canRun) return;
    const next = simulatePreRiftOpening(cards);
    setResult(next);
    setOpenedMiniDeck(false);
    setOpenedPacks(Array.from({ length: next.packs.length }, () => false));
    window.requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [canRun, cards]);

  const openPack = useCallback((index: number) => {
    setOpenedPacks((prev) => {
      if (!prev[index]) {
        const copy = [...prev];
        copy[index] = true;
        return copy;
      }
      return prev;
    });
  }, []);

  const deck = result?.miniDeck;

  return (
    <section
      id="pre-rift-simulator"
      ref={sectionRef}
      className="mb-16 scroll-mt-24 rounded-2xl border border-emerald-800/40 bg-gray-800/25 p-6 sm:p-8"
    >
      <h2 className="mb-2 text-xl font-bold text-white">{p("simTitle")}</h2>
      <p className="mb-4 text-sm leading-relaxed text-gray-400">{p("simIntro")}</p>
      <p className="mb-6 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs leading-relaxed text-amber-100/90">
        {p("simDisclaimer")}
      </p>

      <button
        type="button"
        onClick={run}
        disabled={!canRun}
        className="mb-8 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? p("simLoadingCatalog") : result ? p("simReset") : p("simRun")}
      </button>

      {result && result.warnings.length > 0 && (
        <p className="mb-6 text-xs text-amber-300/90">{p("simCatalogIncomplete")}</p>
      )}

      {deck && (
        <div className="mb-10">
          <h3 className="mb-3 text-lg font-semibold text-white">{p("simYourMiniDeck")}</h3>
          {openedMiniDeck && (
            <p className="mb-4 text-sm text-gray-400">
              {p("simMiniDeckName")}: <span className="font-medium text-gray-200">{deck.title}</span>
            </p>
          )}
          {!openedMiniDeck ? (
            <div className="rounded-xl border border-amber-700/30 bg-gradient-to-r from-gray-900 via-gray-800 to-amber-950/25 px-4 py-4">
              <div className="inline-flex w-full items-center justify-between gap-3">
                <span className="font-medium text-gray-200">{p("simSealedMiniPack")}</span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                  {p("simSealedBooster")}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700/70">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400/70" />
                </div>
                <button
                  type="button"
                  onClick={() => setOpenedMiniDeck(true)}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  {p("simOpenMiniDeck")}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-700/70 bg-gray-800/40 p-4 transition-opacity duration-300 sm:p-5">
              <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                    {p("labelLegend")}
                  </h4>
                  <PreRiftCardThumb cards={cards} name={deck.legend} collectorNumber={deck.legendCollector} />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                    {p("labelChampion")}
                  </h4>
                  <PreRiftCardThumb cards={cards} name={deck.champion} />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                    {p("labelBattlefield")}
                  </h4>
                  <PreRiftCardThumb cards={cards} name={deck.battlefield} />
                </div>
              </div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                {p("labelMainDeck")}
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {deck.mainDeck.map((name) => (
                  <PreRiftCardThumb key={name} cards={cards} name={name} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">{p("simYourBoosters")}</h3>
          {result.packs.map((pack, i) => {
            const isRevealed = openedPacks[i] === true;
            if (!isRevealed) {
              return (
                <div
                  key={i}
                  className="rounded-xl border border-amber-700/30 bg-gradient-to-r from-gray-900 via-gray-800 to-amber-950/25 px-4 py-4"
                >
                  <div className="inline-flex w-full items-center justify-between gap-3">
                    <span className="font-medium text-gray-200">{t("events.unleashedPreRift.simPackLabel", { n: i + 1 })}</span>
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
                      {p("simSealedBooster")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700/70">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400/70" />
                    </div>
                    <button
                      type="button"
                      onClick={() => openPack(i)}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                    >
                      {p("simOpenPack")}
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <details
                key={i}
                className="group rounded-xl border border-gray-700/70 bg-gray-800/40 open:border-emerald-800/50"
                open
              >
                <summary className="cursor-pointer list-none px-4 py-3 font-medium text-gray-200 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex w-full items-center justify-between gap-2">
                    <span>{t("events.unleashedPreRift.simPackLabel", { n: i + 1 })}</span>
                    <span className="text-xs font-normal text-gray-500 group-open:text-emerald-400/80">
                      {p("simPackToggle")}
                    </span>
                  </span>
                </summary>
                <div className="border-t border-gray-700/50 px-3 pb-4 pt-3 sm:px-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
                    {pack.map((pull, j) => (
                      <SimPullTile key={`p${i}-s${j}-${pull.card.id}`} pull={pull} foilLabel={p("simFoilBadge")} />
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
