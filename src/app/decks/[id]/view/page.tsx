"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getDeck } from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { BackLink } from "@/components/layout/BackLink";
import type { Card } from "@/types/card";
import type { Deck, DeckMainItem } from "@/types/deck";

const TYPE_ORDER = ["legend", "champion", "unit", "limit", "gear", "spell", "rune", "battlefield", "other"];
const TYPE_LABEL: Record<string, string> = {
  legend: "Legend", champion: "Champion", unit: "Unit", limit: "Limit",
  gear: "Gear", spell: "Spell", rune: "Rune", battlefield: "Battlefield", other: "Other",
};
const TYPE_IMAGE: Record<string, string> = {
  legend: "/images/types/legend.webp",
  champion: "/images/types/champion.webp",
  unit: "/images/types/unit.webp",
  limit: "/images/types/unit.webp",
  gear: "/images/types/gear.webp",
  spell: "/images/types/spell.webp",
  rune: "/images/types/runes.webp",
  battlefield: "/images/types/battlefields.webp",
  other: "/images/types/unit.webp",
};

function groupByType(items: DeckMainItem[]) {
  const grouped: Record<string, DeckMainItem[]> = {};
  for (const item of items) {
    const t = item.card?.type?.toLowerCase() ?? "other";
    const key = TYPE_ORDER.includes(t) ? t : "other";
    (grouped[key] ??= []).push(item);
  }
  return grouped;
}

function CardSlot({ card, label }: { card: Card | null | undefined; label: string }) {
  const isLandscape =
    card?.orientation?.toLowerCase() === "landscape" ||
    (card?.record_type?.toLowerCase().includes("battleground") ?? false) ||
    (card?.type?.toLowerCase() === "battlefield");
  return (
    <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>

      {card ? (
        <div className={`relative w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl ${isLandscape ? "aspect-[3.5/2.5]" : "aspect-[2.5/3.5]"}`}>
          {getCardImageUrl(card) ? (
            isLandscape ? (
              <CardImg
                src={getCardImageUrl(card)!}
                alt={card.name}
                style={{
                  position: "absolute", top: "50%", left: "50%",
                  width: "calc(100% * 2.5 / 3.5)", height: "calc(100% * 3.5 / 2.5)",
                  objectFit: "cover", transform: "translate(-50%, -50%) rotate(90deg)",
                }}
              />
            ) : (
              <CardImg src={getCardImageUrl(card)!} alt={card.name} className="absolute inset-0 h-full w-full object-cover" />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
              <span className="text-sm text-gray-400">{card.name}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
            <p className="truncate text-xs font-medium text-white">{card.name}</p>
          </div>
        </div>
      ) : (
        <div className="flex aspect-[2.5/3.5] w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/30">
          <span className="text-xs text-gray-600">Empty</span>
        </div>
      )}
    </div>
  );
}

function DomainBadge({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/images/domains/${name.toLowerCase()}.webp`} alt={name} className="h-8 w-8 object-contain" />
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

          {/* Coluna direita */}
          <div className="flex flex-col gap-4">
            {/* Legend & Champion row */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <div className="mb-3 h-3 w-28 animate-pulse rounded bg-gray-700" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-14 animate-pulse rounded-lg bg-gray-700/60" />
                <div className="h-14 animate-pulse rounded-lg bg-gray-700/60" />
              </div>
            </div>
            {/* Main deck groups */}
            {[40, 28, 20, 16].map((w, i) => (
              <div key={i} className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-gray-700" />
                  <div className={`h-3 animate-pulse rounded bg-gray-700`} style={{ width: `${w}%` }} />
                </div>
                <div className="space-y-1.5">
                  {Array.from({ length: i === 0 ? 5 : i === 1 ? 4 : 3 }).map((_, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-6 animate-pulse rounded bg-gray-700/60" />
                        <div className="h-3 w-32 animate-pulse rounded bg-gray-700/60" />
                      </div>
                      <div className="h-3 w-6 animate-pulse rounded bg-gray-700/40" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
        <BackLink href="/decks" label="My Decks" />
        <p className="text-gray-400">Deck not found.</p>
      </div>
    );
  }

  const deckLegend = deck.legendCard ?? deck.legend;
  const deckChampion = deck.championCard ?? deck.champion;
  const domains = deckLegend?.cardDomains ?? [];
  const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const sideboardCount = deck.sideboardItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const grouped = groupByType(deck.mainItems ?? []);
  const orderedKeys = TYPE_ORDER.filter((t) => grouped[t]?.length);
  const isValid = deck.validation?.valid && (deck.validation.errors?.length ?? 0) === 0;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/95 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-[1400px]">
          <BackLink href="/decks" label="My Decks" className="mb-2" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {domains.length > 0 && domains.map((cd) => (
                <DomainBadge key={cd.domain.name} name={cd.domain.name} />
              ))}
              <h1 className="text-xl font-bold text-white">{deck.name}</h1>
              {isValid && (
                <span className="flex items-center gap-1 rounded-full border border-emerald-700 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  Valid
                </span>
              )}
            </div>
            <Link
              href={`/decks/${deck.id}`}
              className="shrink-0 rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              ✎ Edit deck
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">

          {/* Coluna esquerda: imagens */}
          <div className="flex flex-col gap-6">
            {/* Legend + Champion */}
            <div className="grid grid-cols-2 gap-3">
              <CardSlot card={deckLegend} label="Legend" />
              <CardSlot card={deckChampion} label="Champion" />
            </div>

            {/* Battlefields */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Battlefields ({deck.battlefields?.filter((b) => b.card).length ?? 0}/3)
              </p>
              <div className="flex flex-col gap-2">
                {([1, 2, 3] as const).map((pos) => {
                  const bf = deck.battlefields?.find((b) => b.position === pos);
                  return bf?.card ? (
                    <div key={pos} className="relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800 aspect-[3.5/2.5]">
                      {getCardImageUrl(bf.card) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getCardImageUrl(bf.card)!}
                          alt={bf.card.name}
                          style={{
                            position: "absolute", top: "50%", left: "50%",
                            width: "calc(100% * 2.5 / 3.5)", height: "calc(100% * 3.5 / 2.5)",
                            objectFit: "cover", transform: "translate(-50%, -50%) rotate(90deg)",
                          }}
                        />
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                        <p className="truncate text-xs font-medium text-white">{bf.card.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={pos} className="flex aspect-[3.5/2.5] items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30">
                      <span className="text-xs text-gray-600">Slot {pos} empty</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Coluna direita: listas */}
          <div className="flex flex-col gap-4">

            {/* Legend & Champion — linha topo */}
            <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Legend &amp; Champion</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Legend */}
                {deckLegend ? (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5">
                    {getCardImageUrl(deckLegend) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getCardImageUrl(deckLegend)!} alt={deckLegend.name} className="h-10 w-7 shrink-0 rounded object-cover object-top" />
                    )}
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Legend</p>
                      <CardHoverPreview card={deckLegend} battlefieldAsLandscape>
                        <p className="truncate text-sm font-medium text-blue-400 cursor-pointer">{deckLegend.name}</p>
                      </CardHoverPreview>
                      {domains.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {domains.map((cd) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={cd.domain.name} src={`/images/domains/${cd.domain.name.toLowerCase()}.webp`} alt={cd.domain.name} title={cd.domain.name} className="h-3.5 w-3.5 object-contain" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-14 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30">
                    <span className="text-xs text-gray-600">No Legend</span>
                  </div>
                )}
                {/* Champion */}
                {deckChampion ? (
                  <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5">
                    {getCardImageUrl(deckChampion) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getCardImageUrl(deckChampion)!} alt={deckChampion.name} className="h-10 w-7 shrink-0 rounded object-cover object-top" />
                    )}
                    <div className="min-w-0">
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Champion</p>
                      <CardHoverPreview card={deckChampion} battlefieldAsLandscape>
                        <p className="truncate text-sm font-medium text-blue-400 cursor-pointer">{deckChampion.name}</p>
                      </CardHoverPreview>
                      {deckChampion.subtypes && deckChampion.subtypes.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">{deckChampion.subtypes.join(", ")}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-14 items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gray-800/30">
                    <span className="text-xs text-gray-600">No Champion</span>
                  </div>
                )}
              </div>
            </div>

            {/* Main Deck (left) + Battlefields / Rune / Sideboard (right) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">

              {/* Main Deck */}
              <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  {domains.map((cd) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={cd.domain.name} src={`/images/domains/${cd.domain.name.toLowerCase()}.webp`} alt="" className="h-4 w-4 object-contain" />
                  ))}
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Main Deck <span className="text-gray-500">({mainCount}/39)</span>
                  </h2>
                  {mainCount === 39 && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  )}
                </div>
                <div className="space-y-3">
                  {orderedKeys.map((typeKey) => {
                    const items = grouped[typeKey]!;
                    const total = items.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <div key={typeKey}>
                        <div className="mb-1 flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={TYPE_IMAGE[typeKey]} alt="" className="h-3.5 w-3.5 object-contain" />
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            {TYPE_LABEL[typeKey]} ({total})
                          </span>
                        </div>
                        <ul className="space-y-0.5">
                          {items.map((item, i) => {
                            const domain = (item.card?.cardDomains?.[0]?.domain?.name ?? item.card?.domain)?.toLowerCase();
                            return (
                              <li key={item.card?.uuid ?? item.cardId ?? i} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-gray-700/40">
                                {domain && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={`/images/domains/${domain}.webp`} alt="" className="h-3 w-3 shrink-0 object-contain" />
                                )}
                                <span className="text-gray-500 text-xs tabular-nums">×{item.quantity}</span>
                                {item.card ? (
                                  <CardHoverPreview card={item.card} battlefieldAsLandscape>
                                    <span className="text-xs text-blue-400 cursor-pointer">{item.card.name}</span>
                                  </CardHoverPreview>
                                ) : (
                                  <span className="text-xs text-gray-400">{item.cardId}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right column: Battlefields + Rune Deck + Sideboard */}
              <div className="flex flex-col gap-4">

                {/* Battlefields */}
                <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/types/battlefields.webp" alt="" className="h-4 w-4 object-contain" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Battlefields <span className="text-gray-500">({deck.battlefields?.filter((b) => b.card).length ?? 0}/3)</span>
                    </h2>
                    {(deck.battlefields?.filter((b) => b.card).length ?? 0) === 3 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {([1, 2, 3] as const).map((pos) => {
                      const bf = deck.battlefields?.find((b) => b.position === pos);
                      return bf?.card ? (
                        <li key={pos} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-gray-700/40">
                          <CardHoverPreview card={bf.card} battlefieldAsLandscape>
                            <span className="text-xs text-blue-400 cursor-pointer">{bf.card.name}</span>
                          </CardHoverPreview>
                        </li>
                      ) : (
                        <li key={pos} className="px-1.5 py-0.5 text-xs text-gray-600 italic">Slot {pos} empty</li>
                      );
                    })}
                  </ul>
                </div>

                {/* Rune Deck */}
                <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/types/runes.webp" alt="" className="h-4 w-4 object-contain" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Rune Deck <span className="text-gray-500">({runeCount}/12)</span>
                    </h2>
                    {runeCount === 12 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {(deck.runeItems ?? []).map((item, i) => {
                      const domain = (item.card?.cardDomains?.[0]?.domain?.name ?? item.card?.domain)?.toLowerCase();
                      return (
                        <li key={item.card?.uuid ?? item.cardId ?? i} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-gray-700/40">
                          {domain && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/images/domains/${domain}.webp`} alt="" className="h-3 w-3 shrink-0 object-contain" />
                          )}
                          <span className="text-gray-500 text-xs tabular-nums">×{item.quantity}</span>
                          {item.card ? (
                            <CardHoverPreview card={item.card} battlefieldAsLandscape>
                              <span className="text-xs text-blue-400 cursor-pointer">{item.card.name}</span>
                            </CardHoverPreview>
                          ) : (
                            <span className="text-xs text-gray-400">{item.cardId}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Sideboard */}
                <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Sideboard <span className="text-gray-500">({sideboardCount}/8)</span>
                    </h2>
                    {sideboardCount > 0 && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                    )}
                  </div>
                  {sideboardCount === 0 ? (
                    <p className="text-xs text-gray-600 italic">No sideboard cards.</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {(deck.sideboardItems ?? []).map((item, i) => {
                        const domain = (item.card?.cardDomains?.[0]?.domain?.name ?? item.card?.domain)?.toLowerCase();
                        return (
                          <li key={item.card?.uuid ?? item.cardId ?? i} className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-gray-700/40">
                            {domain && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`/images/domains/${domain}.webp`} alt="" className="h-3 w-3 shrink-0 object-contain" />
                            )}
                            <span className="text-gray-500 text-xs tabular-nums">×{item.quantity}</span>
                            {item.card ? (
                              <CardHoverPreview card={item.card} battlefieldAsLandscape>
                                <span className="text-xs text-blue-400 cursor-pointer">{item.card.name}</span>
                              </CardHoverPreview>
                            ) : (
                              <span className="text-xs text-gray-400">{item.cardId}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

              </div>
            </div>

            {/* Validation errors/warnings */}
            {deck.validation && !isValid && (
              <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Validation</h2>
                <div className="space-y-1.5">
                  {(deck.validation.errors ?? []).map((msg, i) => (
                    <p key={i} className="text-sm text-red-400">{msg}</p>
                  ))}
                  {(deck.validation.warnings ?? []).map((msg, i) => (
                    <p key={i} className="text-sm text-amber-400">{msg}</p>
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
