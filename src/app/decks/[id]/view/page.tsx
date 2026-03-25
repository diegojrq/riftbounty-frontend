"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getDeck } from "@/lib/decks";
import {
  rawDeckValidationErrors,
  rawDeckValidationWarnings,
  formatDeckValidationItem,
} from "@/lib/deck-validation";
import { useAuth } from "@/lib/auth-context";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { BackLink } from "@/components/layout/BackLink";
import { useLocale } from "@/lib/locale-context";
import type { Card } from "@/types/card";
import type { Deck, DeckMainItem } from "@/types/deck";
import { getCardId } from "@/lib/card-id";
import { buildDeckTtsText, sanitizeDeckExportFilename } from "@/lib/deck-export-tts";
import { getCardDisplayName } from "@/lib/card-display-name";

const VALID_DOMAIN_SLUGS = new Set(["fury", "calm", "mind", "body", "chaos", "order"]);
const UNIT_ICON = "/images/types/unit.webp";
const BATTLEFIELD_ICON = "/images/types/battlefields.webp";

function isBattlefieldCard(card: { type?: string; record_type?: string } | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? "").toLowerCase();
  return t === "battlefield" || r.includes("battleground") || t === "battleground";
}

function domainImageSrc(domain: string | null | undefined, card?: { type?: string; record_type?: string }): string {
  const d = domain?.toLowerCase();
  if (d && VALID_DOMAIN_SLUGS.has(d)) return `/images/domains/${d}.webp`;
  return isBattlefieldCard(card) ? BATTLEFIELD_ICON : UNIT_ICON;
}

/** Ordenação tipo listagem: custo (energy) crescente, depois nome. */
function sortKeyForDeckCard(card: Card | undefined): number {
  if (!card) return 9999;
  const e = card.energy;
  if (typeof e === "number" && Number.isFinite(e)) return e;
  const c = card.cmc;
  if (typeof c === "number" && Number.isFinite(c)) return c;
  const m = card.might;
  if (typeof m === "number" && Number.isFinite(m)) return m + 200;
  return 500;
}

function sortMainDeckItems(items: DeckMainItem[]): DeckMainItem[] {
  return [...items].sort((a, b) => {
    const ka = sortKeyForDeckCard(a.card as Card | undefined);
    const kb = sortKeyForDeckCard(b.card as Card | undefined);
    if (ka !== kb) return ka - kb;
    const na = a.card ? getCardDisplayName(a.card) : a.cardId;
    const nb = b.card ? getCardDisplayName(b.card) : b.cardId;
    return na.localeCompare(nb, "en");
  });
}

function sortRuneItems(items: NonNullable<Deck["runeItems"]>): typeof items {
  return [...items].sort((a, b) => {
    const na = a.card ? getCardDisplayName(a.card) : a.cardId;
    const nb = b.card ? getCardDisplayName(b.card) : b.cardId;
    return na.localeCompare(nb, "en");
  });
}

function sortSideboardItems(items: NonNullable<Deck["sideboardItems"]>): typeof items {
  return [...items].sort((a, b) => {
    const ka = sortKeyForDeckCard(a.card as Card | undefined);
    const kb = sortKeyForDeckCard(b.card as Card | undefined);
    if (ka !== kb) return ka - kb;
    const na = a.card ? getCardDisplayName(a.card) : a.cardId;
    const nb = b.card ? getCardDisplayName(b.card) : b.cardId;
    return na.localeCompare(nb, "en");
  });
}

/**
 * Miniatura: badge no mesmo molde da coleção (CardTile: size-9, canto inferior direito).
 * Com mais de uma cópia, uma segunda face atrás (efeito pilha).
 */
function DeckCardThumb({
  card,
  quantity,
}: {
  card: Card;
  quantity: number;
}) {
  const url = getCardImageUrl(card);
  const label = getCardDisplayName(card);
  const showQtyBadge = quantity > 1;
  const showStack = quantity > 1;

  return (
    <CardHoverPreview card={card} battlefieldAsLandscape>
      <div className="group relative aspect-[2.5/3.5] w-full">
        {/* Carta “de trás” — mesma arte, levemente deslocada (pilha) */}
        {showStack && url && (
          <div
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg border-2 border-gray-500/70 bg-gray-800 shadow-[5px_5px_0_0_rgba(15,23,42,0.85)]"
            style={{ transform: "translate(7px, 7px)" }}
            aria-hidden
          >
            <CardImg src={url} alt="" className="h-full w-full object-cover opacity-[0.72] brightness-95" />
          </div>
        )}
        {showStack && !url && (
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-lg border-2 border-gray-500/60 bg-gray-700 shadow-[5px_5px_0_0_rgba(15,23,42,0.85)]"
            style={{ transform: "translate(7px, 7px)" }}
            aria-hidden
          />
        )}

        <div className="relative z-10 flex h-full w-full overflow-hidden rounded-lg border border-gray-700/80 bg-gray-800 shadow-md transition hover:border-amber-700/40 hover:shadow-lg">
          {url ? (
            <CardImg src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-[10px] leading-tight text-gray-500">{label}</div>
          )}
          {showQtyBadge && (
            <span className="absolute bottom-1.5 right-1.5 z-20 flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-400/70 bg-zinc-950 text-xs font-bold tabular-nums text-white shadow-md">
              ×{quantity}
            </span>
          )}
        </div>
      </div>
    </CardHoverPreview>
  );
}

function CardSlot({ card, label }: { card: Card | null | undefined; label: string }) {
  const { t } = useLocale();
  const displayName = card ? getCardDisplayName(card) : "";
  const isLandscape =
    card?.orientation?.toLowerCase() === "landscape" ||
    (card?.record_type?.toLowerCase().includes("battleground") ?? false) ||
    (card?.type?.toLowerCase() === "battlefield");
  return (
    <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>

      {card ? (
        <CardHoverPreview card={card} battlefieldAsLandscape={isLandscape}>
          <div className={`relative w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl ${isLandscape ? "aspect-[3.5/2.5]" : "aspect-[2.5/3.5]"}`}>
            {getCardImageUrl(card) ? (
              isLandscape ? (
                <CardImg
                  src={getCardImageUrl(card)!}
                  alt={displayName}
                  style={{
                    position: "absolute", top: "50%", left: "50%",
                    width: "calc(100% * 2.5 / 3.5)", height: "calc(100% * 3.5 / 2.5)",
                    objectFit: "cover", transform: "translate(-50%, -50%) rotate(-90deg)",
                  }}
                />
              ) : (
                <CardImg src={getCardImageUrl(card)!} alt={displayName} className="absolute inset-0 h-full w-full object-cover" />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                <span className="text-sm text-gray-400">{displayName}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
              <p className="truncate text-xs font-medium text-white">{displayName}</p>
            </div>
          </div>
        </CardHoverPreview>
      ) : (
        <div className="flex aspect-[2.5/3.5] w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30">
          <span className="text-xs text-gray-600">{t("decks.empty")}</span>
        </div>
      )}
    </div>
  );
}

function DomainBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={domainImageSrc(name)} alt={name} className="h-8 w-8 object-contain" />
      <span className="text-sm font-semibold capitalize text-gray-200">{name}</span>
    </div>
  );
}

function DeckViewSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-700" />
              <div className="h-6 w-48 animate-pulse rounded bg-gray-700" />
            </div>
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-700" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">

          {/* Coluna esquerda */}
          <div className="flex flex-col gap-6">
            {/* Legend + Champion */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-12 animate-pulse rounded bg-gray-700" />
                <div className="aspect-[2.5/3.5] w-full animate-pulse rounded-xl bg-gray-700/60" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-16 animate-pulse rounded bg-gray-700" />
                <div className="aspect-[2.5/3.5] w-full animate-pulse rounded-xl bg-gray-700/60" />
              </div>
            </div>
            {/* Battlefields */}
            <div className="flex flex-col gap-2">
              <div className="h-3 w-24 animate-pulse rounded bg-gray-700" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3.5/2.5] w-full animate-pulse rounded-lg bg-gray-700/60" />
              ))}
            </div>
          </div>

          {/* Coluna direita — galeria (placeholder) */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <div className="mb-3 h-3 w-40 animate-pulse rounded bg-gray-700" />
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
                {Array.from({ length: 10 }).map((_, j) => (
                  <div key={j} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/50" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <div className="mb-3 h-3 w-32 animate-pulse rounded bg-gray-700" />
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/50" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/20 p-4">
              <div className="mb-3 h-3 w-28 animate-pulse rounded bg-gray-700" />
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/50" />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

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
    if (!user) { router.replace("/login"); return; }
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

  const deckLegend = deck.legendCard ?? deck.legend;
  const deckChampion = deck.championCard ?? deck.champion;
  const domains = deckLegend?.cardDomains ?? [];
  const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const sideboardCount = deck.sideboardItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const mainDeckSorted = sortMainDeckItems(deck.mainItems ?? []);
  const runeSorted = sortRuneItems(deck.runeItems ?? []);
  const sideboardSorted = sortSideboardItems(deck.sideboardItems ?? []);
  const isValid =
    deck.validation?.valid &&
    rawDeckValidationErrors(deck.validation).length === 0 &&
    rawDeckValidationWarnings(deck.validation).length === 0;

  function downloadTtsExport() {
    if (!deck) return;
    const text = buildDeckTtsText(deck);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeDeckExportFilename(deck.name)}-tts.txt`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <BackLink href="/decks" label={t("back.myDecks")} className="mb-2" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {domains.length > 0 && domains.map((cd) => (
                <DomainBadge key={cd.domain.name} name={cd.domain.name} />
              ))}
              <h1 className="text-xl font-bold text-white">{deck.name}</h1>
              {isValid && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-700 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  {t("decks.valid")}
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={downloadTtsExport}
                title={t("decks.exportTtsTitle")}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                {t("decks.exportTts")}
              </button>
              <Link
                href={`/decks/${deck.id}`}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                ✎ {t("decks.editDeck")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">

          {/* Coluna esquerda: imagens */}
          <div className="flex flex-col gap-6">
            {/* Legend + Champion */}
            <div className="grid grid-cols-2 gap-3">
              <CardSlot card={deckLegend} label={t("decks.legend")} />
              <CardSlot card={deckChampion} label={t("decks.champion")} />
            </div>

            {/* Battlefields */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t("decks.stepsBattlefields")} ({deck.battlefields?.filter((b) => b.card).length ?? 0}/3)
              </p>
              <div className="flex flex-col gap-2">
                {([1, 2, 3] as const).map((pos) => {
                  const bf = deck.battlefields?.find((b) => b.position === pos);
                  return bf?.card ? (
                    <CardHoverPreview key={pos} card={bf.card} battlefieldAsLandscape>
                      <div className="relative aspect-[3.5/2.5] w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
                        {getCardImageUrl(bf.card) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={getCardImageUrl(bf.card)!}
                            alt={getCardDisplayName(bf.card)}
                            style={{
                              position: "absolute", top: "50%", left: "50%",
                              width: "calc(100% * 2.5 / 3.5)", height: "calc(100% * 3.5 / 2.5)",
                              objectFit: "cover", transform: "translate(-50%, -50%) rotate(-90deg)",
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                          <p className="truncate text-xs font-medium text-white">{getCardDisplayName(bf.card)}</p>
                        </div>
                      </div>
                    </CardHoverPreview>
                  ) : (
                    <div key={pos} className="flex aspect-[3.5/2.5] items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30">
                      <span className="text-xs text-gray-600">{t("decks.slotEmpty", { pos })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna direita: galeria principal → runas → sideboard */}
          <div className="flex min-w-0 flex-col gap-8">

            {/* Deck principal */}
            <section className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {domains.map((cd) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={cd.domain.name} src={domainImageSrc(cd.domain.name)} alt="" className="h-4 w-4 object-contain" />
                ))}
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {t("decks.mainDeckLabel")} <span className="text-gray-500">({mainCount}/39)</span>
                </h2>
                {mainCount === 39 && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </div>
              {mainDeckSorted.length === 0 ? (
                <p className="text-sm text-gray-500">{t("decks.empty")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
                  {mainDeckSorted.map((item, i) => {
                    const id = getCardId(item.card as Card) || item.cardId || `m-${i}`;
                    return item.card ? (
                      <div key={id} className="min-w-0 overflow-visible pr-1.5 pb-1.5">
                        <DeckCardThumb card={item.card} quantity={item.quantity} />
                      </div>
                    ) : (
                      <div key={id} className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-2 text-center text-[10px] text-gray-500">
                        {item.cardId}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Deck de runas */}
            <section className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/types/runes.webp" alt="" className="h-4 w-4 object-contain" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                  {t("decks.runeDeckLabel")} <span className="text-gray-500">({runeCount}/12)</span>
                </h2>
                {runeCount === 12 && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                )}
              </div>
              {runeSorted.length === 0 ? (
                <p className="text-sm text-gray-500">{t("decks.empty")}</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                  {runeSorted.map((item, i) => {
                    const id = getCardId(item.card as Card) || item.cardId || `r-${i}`;
                    return item.card ? (
                      <div key={id} className="min-w-0 overflow-visible pr-1.5 pb-1.5">
                        <DeckCardThumb card={item.card} quantity={item.quantity} />
                      </div>
                    ) : (
                      <div key={id} className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg border border-dashed border-gray-600 text-[10px] text-gray-500">
                        {item.cardId}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Separador + Sideboard */}
            <section>
              <div className="relative mb-6 flex items-center justify-center">
                <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />
                <span className="relative bg-gray-900 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/95">
                  {t("decks.sideboardLabel")}
                </span>
              </div>
              <div className="rounded-xl border border-gray-700/80 bg-gray-800/30 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {sideboardCount}/8
                  </span>
                  {sideboardCount > 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  )}
                </div>
                {sideboardCount === 0 ? (
                  <p className="text-sm text-gray-600 italic">{t("decks.noSideboardCards")}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
                    {sideboardSorted.map((item, i) => {
                      const id = getCardId(item.card as Card) || item.cardId || `s-${i}`;
                      return item.card ? (
                        <div key={id} className="min-w-0 overflow-visible pr-1.5 pb-1.5">
                          <DeckCardThumb card={item.card} quantity={item.quantity} />
                        </div>
                      ) : (
                        <div key={id} className="flex aspect-[2.5/3.5] items-center justify-center rounded-lg border border-dashed border-gray-600 text-[10px] text-gray-500">
                          {item.cardId}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Validation errors/warnings */}
            {deck.validation && !isValid && (
              <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("decks.validation")}</h2>
                <div className="space-y-1.5">
                  {rawDeckValidationErrors(deck.validation).map((msg, i) => (
                    <p key={i} className="text-sm text-red-400">{formatDeckValidationItem(msg, t)}</p>
                  ))}
                  {rawDeckValidationWarnings(deck.validation).map((msg, i) => (
                    <p key={i} className="text-sm text-amber-400">{formatDeckValidationItem(msg, t)}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
