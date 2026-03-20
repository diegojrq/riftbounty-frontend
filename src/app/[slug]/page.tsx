"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { BackLink } from "@/components/layout/BackLink";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getPublicProfile, getProfileMatch } from "@/lib/profile";
import { createTrade, listTrades, addTradeItem, updateTradeItem, removeTradeItem, submitTrade, sendTradeMessage, getTrade } from "@/lib/trades";
import { toast } from "sonner";
import type { TradeSummary, Trade, TradeItem } from "@/types/trade";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useCards } from "@/lib/cards-context";
import type { PublicUser, MatchItem, OfferableItem, PublicProfileCard } from "@/types/auth";
import type { Card } from "@/types/card";


const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "profile",
  "decks",
  "collection",
  "cards",
  "trades",
  "api",
  "auth",
]);


interface BasketItem {
  card: PublicProfileCard;
  quantity: number;
  maxQty: number;
  /** ID of the existing TradeItem if this was pre-populated from an active trade */
  tradeItemId?: string;
}

/* ─── SVGs ─────────────────────────────────────────── */
function IconPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? "size-5"} aria-hidden>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}

/* ─── Rarity helper ─────────────────────────────────── */
function getRarityIcon(rarity?: string | null): string | null {
  if (!rarity) return null;
  const key = rarity.toLowerCase().replace(/\s+/g, "");
  // "overnumbered" was renamed to "showcase"
  const normalized = key === "overnumbered" ? "showcase" : key;
  const known = ["common", "uncommon", "rare", "epic", "showcase"];
  return known.includes(normalized) ? `/images/rarities/${normalized}.svg` : null;
}

/* ─── Domain helper ─────────────────────────────────── */
const NO_DOMAIN_ICON = "/images/types/unit.webp";
const BATTLEFIELD_ICON = "/images/types/battlefields.webp";
const VALID_DOMAIN_SLUGS = new Set(["fury", "calm", "mind", "body", "chaos", "order"]);

function getCardDomains(
  card:
    | {
        domain?: string | null;
        domains?: Array<string | null> | null;
        cardDomains?: Array<{ domain?: { name?: string | null } | null } | null> | null;
      }
    | undefined
): string[] {
  if (!card) return [];
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if (card.domains) {
    result.push(...card.domains.filter((d): d is string => typeof d === "string" && d.length > 0).map((d) => d.toLowerCase()));
  }
  if (card.cardDomains) {
    result.push(
      ...card.cardDomains
        .map((cd) => cd?.domain?.name)
        .filter((name): name is string => typeof name === "string" && name.length > 0)
        .map((name) => name.toLowerCase())
    );
  }
  return [...new Set(result)];
}

/** Domains that have an image under /images/domains/. Others (e.g. "minds", "sprite") fall back to type icon. */
function getDisplayDomainIcons(domains: string[]): string[] {
  return domains.filter((d) => VALID_DOMAIN_SLUGS.has(d));
}

function isBattlefieldCard(card: { type?: string | null; record_type?: string | null } | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? "").toLowerCase();
  return t === "battlefield" || r.includes("battleground") || t === "battleground";
}

function getNoDomainIcon(card: { type?: string | null; record_type?: string | null } | undefined): string {
  return isBattlefieldCard(card) ? BATTLEFIELD_ICON : NO_DOMAIN_ICON;
}

/* ─── Rarity filter constants ───────────────────────── */
const RARITIES = ["common", "uncommon", "rare", "epic", "showcase"] as const;

/* ─── Basket grouping constants ─────────────────────── */
const SET_ORDER = ["OGN", "SFD"];
const SET_LABEL: Record<string, string> = { OGN: "Origins", SFD: "Spiritforged" };
const TYPE_ORDER = ["legend", "champion", "unit", "limit", "gear", "spell", "rune", "battlefield"];
const TYPE_LABEL: Record<string, string> = {
  legend: "Legend", champion: "Champion", unit: "Unit", limit: "Limit",
  gear: "Gear", spell: "Spell", rune: "Rune", battlefield: "Battlefield",
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
};

function groupCardsBySetAndType<T extends { card: PublicProfileCard | null }>(items: T[]) {
  const bySet = new Map<string, Map<string, T[]>>();
  for (const item of items) {
    const set = item.card?.cardSet ?? "—";
    const type = (item.card?.type ?? "other").toLowerCase();
    if (!bySet.has(set)) bySet.set(set, new Map());
    const byType = bySet.get(set)!;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push(item);
  }
  return [...bySet.entries()]
    .sort(([a], [b]) => {
      const ai = SET_ORDER.indexOf(a), bi = SET_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([set, byType]) => ({
      set,
      label: SET_LABEL[set] ?? set,
      types: [...byType.entries()]
        .sort(([a], [b]) => {
          const ai = TYPE_ORDER.indexOf(a), bi = TYPE_ORDER.indexOf(b);
          if (ai === -1 && bi === -1) return a.localeCompare(b);
          if (ai === -1) return 1; if (bi === -1) return -1;
          return ai - bi;
        })
        .map(([type, cards]) => ({
          type,
          label: TYPE_LABEL[type] ?? (type.charAt(0).toUpperCase() + type.slice(1)),
          cards,
        })),
    }));
}

/* ─── BasketPanel ────────────────────────────────────── */
interface BasketPanelProps {
  basket: Map<string, BasketItem>;
  recipientSlug: string;
  recipientDisplayName: string | null;
  onUpdateQty: (uuid: string, qty: number) => void;
  onRemove: (uuid: string) => void;
  onClear: () => void;
  /** O que você pede do outro (só na criação; enviado como requestedItems) */
  requestedBasket?: Map<string, BasketItem>;
  onUpdateRequestedQty?: (uuid: string, qty: number) => void;
  onRemoveRequested?: (uuid: string) => void;
  onClearRequested?: () => void;
  activeTrade?: TradeSummary | null;
  activeTradeDetail?: Trade | null;
  isMyTurn?: boolean;
  originalItemsMap?: Map<string, TradeItem>;
  onCounterSubmitError?: (tradeId: string) => void;
}

function BasketPanel({ basket, recipientSlug, recipientDisplayName, onUpdateQty, onRemove, onClear, requestedBasket, onUpdateRequestedQty, onRemoveRequested, onClearRequested, cardCacheMap, scraperIdMap, activeTrade, activeTradeDetail, isMyTurn, originalItemsMap, onCounterSubmitError }: BasketPanelProps & { cardCacheMap: Map<string, Card>; scraperIdMap: Map<string, Card> }) {
  const router = useRouter();
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(() => [...basket.values()], [basket]);
  const requestedItemsList = useMemo(
    () => (requestedBasket ? [...requestedBasket.values()] : []),
    [requestedBasket]
  );
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const hasActiveTrade = !!activeTrade;
  const isCounterMode = hasActiveTrade && !!isMyTurn;
  const showRequestedSection = !hasActiveTrade && requestedBasket && requestedBasket.size > 0 && onUpdateRequestedQty && onRemoveRequested && onClearRequested;

  // Items the other player placed in the trade (what they're asking from me)
  // recipientSlug here is the profile being viewed (the other player)
  const theirRequestedItems = useMemo<TradeItem[]>(() => {
    if (!activeTradeDetail || !activeTrade) return [];
    if (activeTrade.initiatorSlug === recipientSlug) {
      return activeTradeDetail.initiatorItems ?? [];
    }
    return activeTradeDetail.recipientItems ?? [];
  }, [activeTradeDetail, activeTrade, recipientSlug]);

  // Group "they asked for" by set and type (same structure as basket below)
  const theirRequestedGrouped = useMemo(() => {
    if (theirRequestedItems.length === 0) return [];
    const bySet = new Map<string, Map<string, TradeItem[]>>();
    for (const item of theirRequestedItems) {
      const cached = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
      const card = item.card ?? cached;
      const set = (cached?.cardSet ?? (card as { cardSet?: string })?.cardSet ?? "—").toString();
      const type = ((cached?.type ?? (card as { type?: string })?.type) ?? "other").toString().toLowerCase();
      if (!bySet.has(set)) bySet.set(set, new Map());
      const byType = bySet.get(set)!;
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(item);
    }
    return [...bySet.entries()]
      .sort(([a], [b]) => {
        const ai = SET_ORDER.indexOf(a), bi = SET_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      })
      .map(([set, byType]) => ({
        set,
        label: SET_LABEL[set] ?? set,
        types: [...byType.entries()]
          .sort(([a], [b]) => {
            const ai = TYPE_ORDER.indexOf(a), bi = TYPE_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1; if (bi === -1) return -1;
            return ai - bi;
          })
          .map(([type, list]) => ({
            type,
            label: TYPE_LABEL[type] ?? (type.charAt(0).toUpperCase() + type.slice(1)),
            icon: TYPE_IMAGE[type],
            items: list,
          })),
      }));
  }, [theirRequestedItems, cardCacheMap, scraperIdMap]);

  const grouped = useMemo(() => {
    const bySet = new Map<string, Map<string, BasketItem[]>>();
    for (const item of items) {
      const set = item.card.cardSet ?? "—";
      const type = (item.card.type ?? "other").toLowerCase();
      if (!bySet.has(set)) bySet.set(set, new Map());
      const byType = bySet.get(set)!;
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(item);
    }
    return [...bySet.entries()]
      .sort(([a], [b]) => {
        const ai = SET_ORDER.indexOf(a), bi = SET_ORDER.indexOf(b);
        if (ai === -1 && bi === -1) return a.localeCompare(b);
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      })
      .map(([set, byType]) => ({
        set,
        label: SET_LABEL[set] ?? set,
        types: [...byType.entries()]
          .sort(([a], [b]) => {
            const ai = TYPE_ORDER.indexOf(a), bi = TYPE_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1; if (bi === -1) return -1;
            return ai - bi;
          })
          .map(([type, cards]) => ({
            type,
            label: TYPE_LABEL[type] ?? (type.charAt(0).toUpperCase() + type.slice(1)),
            icon: TYPE_IMAGE[type],
            total: cards.reduce((s, c) => s + c.quantity, 0),
            cards,
          })),
      }));
  }, [items]);

  async function handleSend() {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isCounterMode && activeTrade) {
        try {
          if (originalItemsMap) {
            for (const [uuid, original] of originalItemsMap) {
              if (!basket.has(uuid)) {
                await removeTradeItem(activeTrade.id, original.id);
              }
            }
          }
        } catch (e) {
          throw new Error(`Removing items: ${e instanceof Error ? e.message : "Failed"}`);
        }
        try {
          for (const item of items) {
            const original = originalItemsMap?.get(item.card.uuid);
            if (original) {
              if (original.quantity !== item.quantity) {
                await updateTradeItem(activeTrade.id, original.id, item.quantity);
              }
            } else {
              await addTradeItem(activeTrade.id, item.card.uuid, item.quantity);
            }
          }
        } catch (e) {
          throw new Error(`Updating items: ${e instanceof Error ? e.message : "Failed"}`);
        }
        if (message.trim()) {
          try {
            await sendTradeMessage(activeTrade.id, message.trim());
          } catch (e) {
            throw new Error(`Message: ${e instanceof Error ? e.message : "Failed"}`);
          }
        }
        try {
          await submitTrade(activeTrade.id);
        } catch (e) {
          throw new Error(`Submit: ${e instanceof Error ? e.message : "Failed"}`);
        }
        router.push(`/trades/${activeTrade.id}`);
      } else {
        const requestedItems =
          requestedBasket && requestedBasket.size > 0
            ? [...requestedBasket.values()].map((i) => ({ cardId: i.card.uuid, quantity: i.quantity }))
            : undefined;
        const trade = await createTrade({
          recipientSlug,
          items: items.map((i) => ({ cardId: i.card.uuid, quantity: i.quantity })),
          ...(requestedItems && requestedItems.length > 0 ? { requestedItems } : {}),
          ...(message.trim() ? { message: message.trim() } : {}),
        });
        router.push(`/trades/${trade.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to submit. Please try again.";
      setError(message);
      setSubmitting(false);
      if (isCounterMode && activeTrade && onCounterSubmitError) {
        onCounterSubmitError(activeTrade.id);
      }
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {isCounterMode ? t("trades.counterOffer") : hasActiveTrade ? t("trades.openTrade") : t("trades.requestTrade")}
          </p>
          <p className="text-xs text-gray-400">
            {recipientDisplayName ?? `@${recipientSlug}`}
            {recipientDisplayName && <span className="ml-1 text-gray-600">@{recipientSlug}</span>}
          </p>
          {isCounterMode && (
            <p className="mt-0.5 text-[11px] text-amber-400/80">
              {t("trades.addCardsAndSubmitCounterMove")}
            </p>
          )}
          {hasActiveTrade && !isMyTurn && (
            <p className="mt-0.5 text-[11px] text-gray-500">
              {t("trades.waitingFor", { slug: recipientSlug })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showRequestedSection && (
            <button type="button" onClick={onClearRequested} className="text-xs text-gray-600 hover:text-red-400">
              {t("trades.clearRequested")}
            </button>
          )}
          {items.length > 0 && (
            <button type="button" onClick={onClear} className="text-xs text-gray-600 hover:text-red-400">
              {t("common.clearAll")}
            </button>
          )}
        </div>
      </div>

      {/* O que você pede do outro (só na nova proposta) */}
      {showRequestedSection && (
        <div className="border-b border-gray-700 px-3 py-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {t("trades.whatYouAskFor")}
          </p>
          <ul className="space-y-1">
            {requestedItemsList.map((item) => {
              const domains = getCardDomains(item.card);
              const rarity = (item.card.rarity ?? "").toLowerCase().replace(/\s+/g, "");
              const rarityNorm = rarity === "overnumbered" ? "showcase" : rarity;
              return (
                <li key={item.card.uuid} className="flex items-center gap-2 py-0.5">
                  <div className="flex items-center gap-1 rounded border border-gray-600 bg-gray-700/50 px-1">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      onClick={() => onUpdateRequestedQty!(item.card.uuid, item.quantity - 1)}
                      className="text-gray-400 hover:text-white disabled:opacity-40"
                      aria-label={t("common.decrease")}
                    >
                      −
                    </button>
                    <span className="min-w-[1.25rem] text-center text-xs tabular-nums text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.maxQty}
                      onClick={() => onUpdateRequestedQty!(item.card.uuid, item.quantity + 1)}
                      className="text-gray-400 hover:text-white disabled:opacity-40"
                      aria-label={t("common.increase")}
                    >
                      +
                    </button>
                  </div>
                  <CardHoverPreview card={item.card as unknown as Card}>
                    <span className="flex min-w-0 flex-1 cursor-default items-center gap-1">
                      <span className="flex gap-0.5">
                        {getDisplayDomainIcons(domains).length > 0 ? (
                          getDisplayDomainIcons(domains).map((d) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-3.5 w-3.5 object-contain" />
                          ))
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getNoDomainIcon(item.card)} alt="" className="h-3.5 w-3.5 object-contain opacity-80" />
                        )}
                      </span>
                      <span className="truncate text-xs text-blue-400">{item.card.name}</span>
                      {rarityNorm && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/images/rarities/${rarityNorm}.svg`} alt={rarityNorm} className="h-3 w-3 shrink-0 opacity-60" />
                      )}
                    </span>
                  </CardHoverPreview>
                  <button
                    type="button"
                    onClick={() => onRemoveRequested!(item.card.uuid)}
                    className="shrink-0 text-gray-500 hover:text-red-400"
                    aria-label={t("common.remove")}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* What the other player already requested — grouped by set/type like the bottom section */}
      {hasActiveTrade && theirRequestedGrouped.length > 0 && (
        <div className="border-b border-gray-700 px-3 py-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {t("trades.askedFor", { slug: recipientSlug, count: theirRequestedItems.length })}
          </p>
          <div className="space-y-3">
            {theirRequestedGrouped.map(({ set, label, types }) => (
              <div key={set}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <div className="space-y-2 pl-2">
                  {types.map(({ type, label: typeLabel, icon, items: typeItems }) => {
                    const typeTotal = typeItems.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <div key={type}>
                        <div className="mb-0.5 flex items-center gap-1.5">
                          {icon && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                          )}
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {typeLabel} <span className="text-gray-600">({typeTotal})</span>
                          </span>
                        </div>
                        <ul className="space-y-0.5 pl-4">
                          {typeItems.map((item) => {
                            const cached = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
                            const cardForPreview = (cached ?? item.card) as unknown as Card;
                            const name = cached?.name ?? item.card?.name ?? item.cardId;
                            const domains = getCardDomains((cached ?? item.card) as { domain?: string; domains?: string[]; cardDomains?: { domain: { name: string } }[] } | undefined);
                            const rarity = (cached?.rarity ?? item.card?.rarity ?? "").toLowerCase().replace(/\s+/g, "");
                            const rarityNorm = rarity === "overnumbered" ? "showcase" : rarity;
                            return (
                              <li key={item.id} className="flex items-center gap-1.5 py-0.5">
                                <span className="text-xs text-gray-400 tabular-nums">×{item.quantity}</span>
                                <CardHoverPreview card={cardForPreview}>
                                  <span className="flex min-w-0 cursor-default items-center gap-1">
                                    <span className="flex gap-0.5">
                                      {getDisplayDomainIcons(domains).length > 0 ? (
                                        getDisplayDomainIcons(domains).map((d) => (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-3.5 w-3.5 object-contain" />
                                        ))
                                      ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={getNoDomainIcon(cached ?? item.card)} alt="" className="h-3.5 w-3.5 object-contain opacity-80" />
                                      )}
                                    </span>
                                    <span className="truncate text-xs text-blue-400">{name}</span>
                                    {rarityNorm && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={`/images/rarities/${rarityNorm}.svg`} alt={rarityNorm} className="h-3 w-3 shrink-0 opacity-60" />
                                    )}
                                  </span>
                                </CardHoverPreview>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My basket items — only shown when I can act (or no active trade) */}
      <div className={`flex-1 overflow-y-auto px-3 py-2 ${hasActiveTrade && !isMyTurn ? "hidden" : ""}`}>
        {isCounterMode && (
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {items.length > 0
                ? t("trades.pickFromCollectionCount", { slug: recipientSlug, count: totalQty })
                : t("trades.pickFromCollection", { slug: recipientSlug })}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-400/80">
              {t("trades.addCardsAndSubmitCounterMove")}
            </p>
          </div>
        )}
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-medium text-gray-500">
              {isCounterMode ? t("trades.addCardsYouWantFrom", { slug: recipientSlug }) : t("trades.yourRequestEmpty")}
            </p>
            <p className="mt-1 text-[11px] text-gray-600">
              {t("trades.clickPlusToAdd")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ set, label, types }) => (
              <div key={set}>
                {/* Set header */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-200">{label}</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <div className="space-y-2.5 pl-2">
                  {types.map(({ type, label: typeLabel, icon, total, cards }) => (
                    <div key={type}>
                      {/* Type row */}
                      <div className="mb-0.5 flex items-center gap-1.5">
                        {icon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {typeLabel} <span className="text-gray-600">({total})</span>
                        </span>
                      </div>
                      {/* Cards */}
                      <ul className="space-y-0.5 pl-4">
                        {cards.map(({ card, quantity, maxQty }) => {
                          const atMax = quantity >= maxQty;
                          const cached = cardCacheMap.get(card.uuid) ?? (card.scraperId ? scraperIdMap.get(card.scraperId) : undefined);
                          const domains = getCardDomains(cached);
                          const rarityIcon = getRarityIcon(card.rarity);
                          return (
                            <li key={card.uuid} className="flex items-center justify-between gap-1 rounded px-1 py-0.5 hover:bg-gray-700/40">
                              <CardHoverPreview card={card as unknown as Card}>
                                <span className="flex min-w-0 cursor-default items-center gap-1 text-xs">
                                  {getDisplayDomainIcons(domains).length > 0 ? (
                                    getDisplayDomainIcons(domains).map((d) => (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                    ))
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={getNoDomainIcon(cached)} alt="" className="h-4 w-4 shrink-0 object-contain opacity-80" />
                                  )}
                                  <span className="shrink-0 tabular-nums text-gray-500">×{quantity}</span>
                                  <span className="truncate text-blue-400">{card.name}</span>
                                  {rarityIcon && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={rarityIcon} alt={card.rarity ?? ""} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                  )}
                                </span>
                              </CardHoverPreview>
                              <span className="flex shrink-0 items-center gap-0.5">
                                <button type="button" onClick={() => onUpdateQty(card.uuid, quantity - 1)} className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600" aria-label={t("common.decrease")}>−</button>
                                <span className={`w-8 text-center text-[10px] font-bold tabular-nums ${atMax ? "text-amber-400" : "text-gray-400"}`}>{quantity}/{maxQty}</span>
                                <button type="button" onClick={() => onUpdateQty(card.uuid, quantity + 1)} disabled={atMax} className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label={t("common.increase")}>+</button>
                                <button type="button" onClick={() => onRemove(card.uuid)} className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-gray-600 hover:bg-red-900/40 hover:text-red-400" aria-label={t("common.remove")}>×</button>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: view trade link when waiting, or action buttons when I can act */}
      <div className="border-t border-gray-700 p-3 space-y-2">
        {hasActiveTrade && !isMyTurn ? (
          <a
            href={`/trades/${activeTrade!.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            {t("trades.viewTrade")}
          </a>
        ) : (
          <>
            {items.length > 0 && (
              <p className="text-center text-xs text-gray-500">
                {t("trades.typesTotal", { types: items.length, total: totalQty })}
              </p>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              disabled={submitting}
              placeholder={t("trades.addMessageOptional")}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/40 disabled:opacity-50"
            />
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={items.length === 0 || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {isCounterMode ? t("trades.submittingCounter") : t("trades.creating")}
                </>
              ) : isCounterMode ? t("trades.submitCounterOffer") : t("trades.sendTrade")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function PublicProfilePage() {
  const params = useParams();
  const pathname = usePathname();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { user: me, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { cards: cachedCards } = useCards();

  const cardCacheMap = useMemo(
    () => new Map((cachedCards ?? []).map((c) => [c.uuid, c])),
    [cachedCards]
  );
  /** Fallback: lookup por scraperId caso o UUID da API de perfil difira do catálogo */
  const scraperIdMap = useMemo(
    () => new Map((cachedCards ?? []).filter((c) => c.scraperId).map((c) => [c.scraperId!, c])),
    [cachedCards]
  );

  function lookupCached(uuid: string, scraperId?: string): Card | undefined {
    return cardCacheMap.get(uuid) ?? (scraperId ? scraperIdMap.get(scraperId) : undefined);
  }

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [match, setMatch] = useState<MatchItem[]>([]);
  const [offerable, setOfferable] = useState<OfferableItem[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchLoaded, setMatchLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [onlyMissing, setOnlyMissing] = useState(false);
  /** "collection" = coleção pública deles com + onde podemos oferecer; "trade" = listas match + offerable */
  const [collectionTab, setCollectionTab] = useState<"collection" | "trade">("collection");

  /* ── Active trade (for counter-offer flow) ─── */
  const [activeTrade, setActiveTrade] = useState<TradeSummary | null>(null);
  const [activeTradeDetail, setActiveTradeDetail] = useState<Trade | null>(null);

  // When viewing another user's profile, check for any active trade between us (PENDING + COUNTERED only)
  useEffect(() => {
    if (!me || !user || me.slug === user.slug) return;
    Promise.all([
      listTrades({ status: "PENDING" }),
      listTrades({ status: "COUNTERED" }),
    ])
      .then(([pending, countered]) => {
        const all = [...pending, ...countered];
        const found = all.find(
          (t) =>
            (t.initiatorSlug === me.slug && t.recipientSlug === user.slug) ||
            (t.initiatorSlug === user.slug && t.recipientSlug === me.slug)
        );
        setActiveTrade(found ?? null);
        if (found) {
          getTrade(found.id)
            .then((detail) => setActiveTradeDetail(detail))
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : t("profile.couldNotLoadTradeDetails"));
              setActiveTradeDetail(null);
            });
        } else {
          setActiveTradeDetail(null);
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t("profile.couldNotLoadTradeStatus"));
      });
  }, [me, user]);

  /* ── Trade basket ──────────────────────────── */
  const [basket, setBasket] = useState<Map<string, BasketItem>>(new Map());

  // Pre-populate basket with my existing items when entering counter mode.
  // Basket = my offer; use offerable (canOffer) for maxQty when available.
  useEffect(() => {
    if (!activeTradeDetail || !activeTrade || !me) return;
    if (matchLoading) return;
    const myItems =
      activeTrade.initiatorSlug === me.slug
        ? activeTradeDetail.initiatorItems ?? []
        : activeTradeDetail.recipientItems ?? [];
    if (myItems.length === 0) return;
    const offerableQtyMap = new Map(offerable.map((o) => [o.cardUuid, o.canOffer]));
    setBasket(
      new Map(
        myItems.map((item) => {
          const card = item.card as PublicProfileCard;
          const uuid = card.uuid ?? item.cardId;
          const maxQty = offerableQtyMap.get(uuid) ?? item.quantity;
          return [
            uuid,
            {
              card: { ...card, uuid },
              quantity: item.quantity,
              maxQty,
              tradeItemId: item.id,
            },
          ];
        })
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTradeDetail?.id, me?.slug, matchLoading, offerable]);
  const [addAnimations, setAddAnimations] = useState<Map<string, string[]>>(new Map());
  const [basketDrawerOpen, setBasketDrawerOpen] = useState(false);

  function flashAdd(uuid: string) {
    const key = `${uuid}-${Date.now()}-${Math.random()}`;
    setAddAnimations((prev) => {
      const next = new Map(prev);
      next.set(uuid, [...(next.get(uuid) ?? []), key]);
      return next;
    });
    setTimeout(() => {
      setAddAnimations((prev) => {
        const next = new Map(prev);
        const arr = (next.get(uuid) ?? []).filter((k) => k !== key);
        if (arr.length === 0) next.delete(uuid);
        else next.set(uuid, arr);
        return next;
      });
    }, 700);
  }

  function addToBasket(card: PublicProfileCard, maxQty: number) {
    const current = basket.get(card.uuid)?.quantity ?? 0;
    if (current >= maxQty) return;
    flashAdd(card.uuid);
    setBasket((prev) => {
      const next = new Map(prev);
      const existing = next.get(card.uuid);
      next.set(card.uuid, { card, quantity: Math.min((existing?.quantity ?? 0) + 1, maxQty), maxQty });
      return next;
    });
  }

  function updateBasketQty(uuid: string, qty: number) {
    if (qty <= 0) {
      setBasket((prev) => { const next = new Map(prev); next.delete(uuid); return next; });
    } else {
      setBasket((prev) => {
        const next = new Map(prev);
        const item = next.get(uuid);
        if (item) next.set(uuid, { ...item, quantity: Math.min(qty, item.maxQty) });
        return next;
      });
    }
  }

  function removeFromBasket(uuid: string) {
    setBasket((prev) => { const next = new Map(prev); next.delete(uuid); return next; });
  }

  function clearBasket() {
    setBasket(new Map());
  }

  /* ── Requested basket (o que eu quero dele — só na nova proposta) ──────────────────────────── */
  const [requestedBasket, setRequestedBasket] = useState<Map<string, BasketItem>>(new Map());

  function addToRequestedBasket(card: PublicProfileCard, maxQty: number) {
    const current = requestedBasket.get(card.uuid)?.quantity ?? 0;
    if (current >= maxQty) return;
    setRequestedBasket((prev) => {
      const next = new Map(prev);
      const existing = next.get(card.uuid);
      next.set(card.uuid, { card, quantity: Math.min((existing?.quantity ?? 0) + 1, maxQty), maxQty });
      return next;
    });
  }

  function updateRequestedBasketQty(uuid: string, qty: number) {
    if (qty <= 0) {
      setRequestedBasket((prev) => { const next = new Map(prev); next.delete(uuid); return next; });
    } else {
      setRequestedBasket((prev) => {
        const next = new Map(prev);
        const item = next.get(uuid);
        if (item) next.set(uuid, { ...item, quantity: Math.min(qty, item.maxQty) });
        return next;
      });
    }
  }

  function removeFromRequestedBasket(uuid: string) {
    setRequestedBasket((prev) => { const next = new Map(prev); next.delete(uuid); return next; });
  }

  function clearRequestedBasket() {
    setRequestedBasket(new Map());
  }

  /* ── Data loading ─────────────────────────── */
  useEffect(() => {
    if (!slug) { setLoading(false); setNotFound(true); return; }
    if (RESERVED_SLUGS.has(slug.toLowerCase())) { setLoading(false); setNotFound(true); return; }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPublicProfile(slug)
      .then((data) => { if (!cancelled) setUser(data); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!me || !user || matchLoaded) return;
    if (me.slug === user.slug) return; // own profile, skip
    let cancelled = false;
    setMatchLoading(true);
    getProfileMatch(slug)
      .then((data) => {
        if (!cancelled) {
          setMatch(data.match ?? []);
          setOfferable(data.offerable ?? []);
          setMatchLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setMatchLoaded(true); })
      .finally(() => { if (!cancelled) setMatchLoading(false); });
    return () => { cancelled = true; };
  }, [me, user, slug, matchLoaded]);

  const publicCollection = useMemo(() => user?.publicCollection ?? [], [user]);

  // When viewing another user's profile and logged in, show match data. Otherwise show full public collection.
  const filteredCollection = useMemo(() => {
    const q = search.trim().toLowerCase();
    return publicCollection.filter((item) => {
      if (selectedRarities.length > 0) {
        const raw = item.card.rarity?.toLowerCase().replace(/\s+/g, "") ?? "";
        const r = raw === "overnumbered" ? "showcase" : raw;
        if (!selectedRarities.includes(r)) return false;
      }
      if (!q) return true;
      if ((item.card.name ?? "").toLowerCase().includes(q)) return true;
      const cached = cardCacheMap.get(item.cardUuid);
      if (!cached) return false;
      if (cached.subtypes?.some((s: string) => s.toLowerCase().includes(q))) return true;
      const cardSubtypes = cached.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }> | undefined;
      if (cardSubtypes?.some((cs) => ((cs?.subtype?.name ?? cs?.name) ?? "").toLowerCase().includes(q))) return true;
      return false;
    });
  }, [publicCollection, search, selectedRarities, cardCacheMap]);

  const filteredMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return match.filter((item) => {
      if (!item.card) return false;
      if (onlyMissing && item.myQuantity > 0) return false;
      if (selectedRarities.length > 0) {
        const raw = item.card.rarity?.toLowerCase().replace(/\s+/g, "") ?? "";
        const r = raw === "overnumbered" ? "showcase" : raw;
        if (!selectedRarities.includes(r)) return false;
      }
      if (!q) return true;
      return (item.card.name ?? "").toLowerCase().includes(q);
    });
  }, [match, search, selectedRarities, onlyMissing]);

  const filteredOfferable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offerable.filter((item) => {
      if (!item.card) return false;
      if (selectedRarities.length > 0) {
        const raw = item.card.rarity?.toLowerCase().replace(/\s+/g, "") ?? "";
        const r = raw === "overnumbered" ? "showcase" : raw;
        if (!selectedRarities.includes(r)) return false;
      }
      if (!q) return true;
      return (item.card.name ?? "").toLowerCase().includes(q);
    });
  }, [offerable, search, selectedRarities]);

  const groupedCollection = useMemo(
    () => groupCardsBySetAndType(filteredCollection),
    [filteredCollection]
  );

  const groupedMatch = useMemo(
    () => groupCardsBySetAndType(filteredMatch),
    [filteredMatch]
  );

  const groupedOfferable = useMemo(
    () => groupCardsBySetAndType(filteredOfferable),
    [filteredOfferable]
  );

  /** Para aba Coleção: cardUuid → offerable (para mostrar + e canOffer na coleção pública deles) */
  const offerableByCardUuid = useMemo(
    () => new Map(offerable.map((o) => [o.cardUuid, o])),
    [offerable]
  );

  /** Para aba Coleção: cardUuid → minha quantidade (match + offerable) */
  const myQuantityByCardUuid = useMemo(
    () => new Map<string, number>([
      ...match.map((m) => [m.cardUuid, m.myQuantity] as const),
      ...offerable.map((o) => [o.cardUuid, o.myQuantity] as const),
    ]),
    [match, offerable]
  );

  // Map of cardUuid → existing TradeItem for my side (used for diff on counter submit)
  const originalItemsMap = useMemo<Map<string, TradeItem>>(() => {
    if (!activeTradeDetail || !activeTrade || !me) return new Map();
    const myItems =
      activeTrade.initiatorSlug === me.slug
        ? activeTradeDetail.initiatorItems ?? []
        : activeTradeDetail.recipientItems ?? [];
    return new Map(myItems.map((item) => [item.card?.uuid ?? item.cardId, item]));
  }, [activeTradeDetail, activeTrade, me]);

  const handleCounterSubmitError = useCallback(
    (tradeId: string) => {
      getTrade(tradeId)
        .then((detail) => {
          setActiveTradeDetail(detail);
          if (!me) return;
          const myItems =
            detail.initiatorSlug === me.slug
              ? detail.initiatorItems ?? []
              : detail.recipientItems ?? [];
          const offerableQtyMap = new Map(offerable.map((o) => [o.cardUuid, o.canOffer]));
          setBasket(
            new Map(
              myItems.map((item) => {
                const card = item.card as PublicProfileCard;
                const uuid = card.uuid ?? item.cardId;
                const maxQty = offerableQtyMap.get(uuid) ?? item.quantity;
                return [
                  uuid,
                  {
                    card: { ...card, uuid },
                    quantity: item.quantity,
                    maxQty,
                    tradeItemId: item.id,
                  },
                ];
              })
            )
          );
        })
        .catch(() => {});
    },
    [me, offerable]
  );

  /* ── Loading / not found ─────────────────── */
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
          <div className="mb-6 h-24 animate-pulse rounded-xl bg-gray-800" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {Array.from({ length: 24 }).map((_, i) => (
              <li key={i} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-800" />
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-[50vh] bg-gray-900 px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">{t("profile.userNotFound")}</h1>
          <p className="mb-6 text-gray-400">
            {t("profile.noProfileFor", { slug })}
          </p>
          <Link href="/" className="inline-block rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500">
            {t("profile.goHome")}
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = me?.slug === slug;
  const hasPublicCollection = publicCollection.length > 0;
  const showTradePanel = !!me && !isOwnProfile && hasPublicCollection;
  const showTradeCTA = !me && !isOwnProfile && hasPublicCollection;
  const registerReturnTo = pathname ? `/register?returnTo=${encodeURIComponent(pathname)}` : "/register";
  const tradeIsMyTurn = activeTrade ? activeTrade.currentTurnSlug === me?.slug : false;
  const basketCount = [...basket.values()].reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-900">

      {/* Mobile basket drawer */}
      {basketDrawerOpen && showTradePanel && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setBasketDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-gray-700 bg-gray-900 px-4 pb-6 pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-600" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{activeTrade ? t("trades.counterOfferMobile") : t("trades.requestTradeMobile")}</h2>
              <button type="button" onClick={() => setBasketDrawerOpen(false)} className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <BasketPanel
              basket={basket}
              recipientSlug={user.slug}
              recipientDisplayName={user.displayName}
              onUpdateQty={updateBasketQty}
              onRemove={removeFromBasket}
              onClear={clearBasket}
              requestedBasket={!activeTrade ? requestedBasket : undefined}
              onUpdateRequestedQty={!activeTrade ? updateRequestedBasketQty : undefined}
              onRemoveRequested={!activeTrade ? removeFromRequestedBasket : undefined}
              onClearRequested={!activeTrade ? clearRequestedBasket : undefined}
              cardCacheMap={cardCacheMap}
              scraperIdMap={scraperIdMap}
              activeTrade={activeTrade}
              activeTradeDetail={activeTradeDetail}
              isMyTurn={tradeIsMyTurn}
              originalItemsMap={originalItemsMap}
              onCounterSubmitError={handleCounterSubmitError}
            />
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">

        {/* Profile header */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="flex items-center gap-4 px-6 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-700 text-2xl font-bold text-gray-400 select-none">
              {(user.displayName || user.slug).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-white">
                {user.displayName || user.slug}
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">@{user.slug}</p>
            </div>
          </div>
        </div>

        {/* ── Main split: left content (70%) + right basket (30%) ── */}
        <div className="flex items-start gap-5">

          {/* Left: collection */}
          <div className="min-w-0 flex-1 md:flex-[7]">
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">

              {/* Section header + tabs (Coleção | Trade) when trade panel */}
              <div className="border-b border-gray-700 px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t("profile.collection")}</h2>
                    {showTradePanel && (
                      <div className="flex rounded-lg border border-gray-600 bg-gray-900/50 p-0.5">
                        <button
                          type="button"
                          onClick={() => setCollectionTab("collection")}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            collectionTab === "collection" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {t("profile.tabCollection")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCollectionTab("trade")}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            collectionTab === "trade" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {t("profile.tabTrade")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {collectionTab === "collection" && (
                  publicCollection.length > 0 && (
                    <p className="mt-2 text-xs text-gray-500">
                      {t("profile.ofCards", { filtered: filteredCollection.length, total: publicCollection.length })}
                    </p>
                  )
                )}
                {showTradePanel && collectionTab === "trade" && !matchLoading && (match.length > 0 || offerable.length > 0) && (
                  <>
                    <p className="mt-2 text-xs text-gray-500">
                      {t("profile.wantFromThemCount", { count: match.length })}
                      {" · "}
                      {t("profile.canOfferCount", { count: offerable.length })}
                      <span className="ml-2 text-gray-600">· {t("profile.addFromCanOffer")}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-gray-600">{t("profile.tradePredictiveExplain")}</p>
                  </>
                )}
                {((showTradePanel && collectionTab === "collection" && publicCollection.length > 0) ||
                  (showTradePanel && collectionTab === "trade" && !matchLoading && (match.length > 0 || offerable.length > 0)) ||
                  (!showTradePanel && publicCollection.length > 0)) && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="search"
                      placeholder={t("trades.searchByName")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {RARITIES.map((r) => {
                          const active = selectedRarities.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              title={r.charAt(0).toUpperCase() + r.slice(1)}
                              onClick={() =>
                                setSelectedRarities((prev) =>
                                  active ? prev.filter((x) => x !== r) : [...prev, r]
                                )
                              }
                              className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded border-2 p-0.5 transition-all ${
                                active
                                  ? "border-white bg-white/15 ring-1 ring-white/40"
                                  : "border-gray-600 hover:border-gray-400"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/images/rarities/${r}.svg`} alt={r} className="h-full w-full object-contain" />
                            </button>
                          );
                        })}
                        {selectedRarities.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedRarities([])}
                            className="ml-1 text-[11px] text-gray-600 hover:text-gray-400"
                          >
                            {t("profile.clear")}
                          </button>
                        )}
                      </div>
                      {showTradePanel && collectionTab === "trade" && (
                        <button
                          type="button"
                          onClick={() => setOnlyMissing((v) => !v)}
                          className={`ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            onlyMissing
                              ? "border-amber-500 bg-amber-500/15 text-amber-400"
                              : "border-gray-600 text-gray-500 hover:border-gray-400 hover:text-gray-300"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
                          </svg>
                          {t("profile.missingOnly")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cards */}
              {showTradePanel ? (
                matchLoading ? (
                  <ul className="space-y-1.5 p-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <li key={i} className="h-6 animate-pulse rounded bg-gray-700" />
                    ))}
                  </ul>
                ) : collectionTab === "collection" ? (
                  /* ── Aba Coleção: coleção pública deles — só solicitar (pedir), não oferecer ── */
                  publicCollection.length > 0 ? (
                    <div className="px-4 py-3">
                      {filteredCollection.length === 0 ? (
                        <p className="py-6 text-center text-sm text-gray-500">{t("profile.noCardsMatchSearchGeneric")}</p>
                      ) : (
                        <div className="space-y-4">
                          {groupedCollection.map(({ set, label, types }) => (
                            <div key={set}>
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-sm font-bold uppercase tracking-wide text-gray-200">{label}</span>
                                <div className="h-px flex-1 bg-gray-700" />
                              </div>
                              <div className="space-y-2.5 pl-2">
                                {types.map(({ type, label: typeLabel, cards }) => {
                                  const icon = TYPE_IMAGE[type];
                                  return (
                                    <div key={type}>
                                      <div className="mb-0.5 flex items-center gap-1.5">
                                        {icon && (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                                        )}
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                          {typeLabel} <span className="text-gray-600">({cards.length})</span>
                                        </span>
                                      </div>
                                      <ul className="space-y-0.5 pl-4">
                                        {cards.map((item) => {
                                          const maxRequested = item.quantity;
                                          const requestedItem = requestedBasket.get(item.cardUuid);
                                          const inRequested = !!requestedItem;
                                          const atMaxRequested = inRequested && requestedItem.quantity >= maxRequested;
                                          const myQty = myQuantityByCardUuid.get(item.cardUuid) ?? 0;
                                          const cached = lookupCached(item.cardUuid, item.card?.scraperId);
                                          const domains = getCardDomains(cached ?? item.card);
                                          const rarityIcon = getRarityIcon(item.card?.rarity);
                                          const cardForRequested = { ...(item.card ?? cached), uuid: (item.card as { uuid?: string })?.uuid ?? item.cardUuid } as PublicProfileCard;
                                          return (
                                            <li key={item.cardUuid} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                              <CardHoverPreview card={(item.card ?? cached) as unknown as Card}>
                                                <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                                  {getDisplayDomainIcons(domains).length > 0 ? (
                                                    getDisplayDomainIcons(domains).map((d) => (
                                                      // eslint-disable-next-line @next/next/no-img-element
                                                      <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                                    ))
                                                  ) : (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={getNoDomainIcon(cached ?? item.card)} alt="" className="h-4 w-4 shrink-0 object-contain opacity-80" />
                                                  )}
                                                  <span className="shrink-0 tabular-nums text-gray-500">×{item.quantity}</span>
                                                  <span className="truncate text-blue-400">{item.card?.name ?? item.cardUuid}</span>
                                                  {rarityIcon && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={rarityIcon} alt={item.card?.rarity ?? ""} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                                  )}
                                                </span>
                                              </CardHoverPreview>
                                              <span className="flex shrink-0 items-center gap-2">
                                                <span className="text-[10px] tabular-nums text-gray-500">{t("profile.mine")} ×{myQty}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => addToRequestedBasket(cardForRequested, maxRequested)}
                                                  disabled={atMaxRequested}
                                                  className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMaxRequested ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inRequested ? "border-blue-500 bg-blue-700/60 text-blue-300 hover:bg-blue-700" : "border-gray-700 bg-blue-800/40 text-blue-400 hover:bg-blue-700/60"}`}
                                                  title={atMaxRequested ? t("trades.maxQuantity", { count: maxRequested }) : inRequested ? `${requestedItem.quantity}/${maxRequested}` : t("trades.requestOne")}
                                                  aria-label={t("trades.requestOne")}
                                                >
                                                  {t("trades.requestOne")}
                                                </button>
                                              </span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-gray-500">{t("profile.noPublicCollection")}</p>
                    </div>
                  )
                ) : collectionTab === "trade" ? (
                  match.length === 0 && offerable.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-gray-500">{t("profile.noMatchNoOfferable")}</p>
                    </div>
                  ) : (
                  <div className="px-4 py-3">
                    {search && (match.length > 0 || offerable.length > 0) && (
                      <p className="mb-2 text-xs text-gray-500">{t("profile.matching", { count: filteredMatch.length + filteredOfferable.length, total: match.length + offerable.length, search })}</p>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-w-0">
                      {/* Coluna esquerda: Cartas que @fulano tem que eu não tenho (match) */}
                      {match.length > 0 && (
                      <div className="min-w-0 flex flex-col">
                        <h3 className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/30 px-3 py-2 text-sm font-bold uppercase tracking-wider text-blue-200">
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-400" aria-hidden />
                          {t("profile.cardsTheyHaveINeed", { slug: user.slug })}
                        </h3>
                        <div className="space-y-4 min-h-0">
                      {groupedMatch.map(({ set, label, types }) => (
                        <div key={set}>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-sm font-bold uppercase tracking-wide text-gray-200">{label}</span>
                            <div className="h-px flex-1 bg-gray-700" />
                          </div>
                          <div className="space-y-2.5 pl-2">
                            {types.map(({ type, label: typeLabel, cards }) => {
                              const icon = TYPE_IMAGE[type];
                              return (
                                <div key={type}>
                                  <div className="mb-0.5 flex items-center gap-1.5">
                                    {icon && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                                    )}
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                      {typeLabel} <span className="text-gray-600">({cards.length})</span>
                                    </span>
                                  </div>
                                  <ul className="space-y-0.5 pl-4">
                                    {cards.map((item) => {
                                      const cardData = item.card;
                                      if (!cardData) return null;
                                      const maxRequested = item.need ?? item.theirQuantity;
                                      const requestedItem = requestedBasket.get(item.cardUuid);
                                      const inRequested = !!requestedItem;
                                      const atMaxRequested = inRequested && requestedItem.quantity >= maxRequested;
                                      const cached = lookupCached(item.cardUuid, cardData.scraperId);
                                      const domains = getCardDomains(cached);
                                      const rarityIcon = getRarityIcon(cardData.rarity);
                                      const cardForRequested = { ...cardData, uuid: (cardData as { uuid?: string }).uuid ?? item.cardUuid } as PublicProfileCard;
                                      return (
                                        <li key={item.cardUuid} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                          <CardHoverPreview card={cardData as unknown as Card}>
                                            <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                              {getDisplayDomainIcons(domains).length > 0 ? (
                                                getDisplayDomainIcons(domains).map((d) => (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                                ))
                                              ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={getNoDomainIcon(cached ?? cardData)} alt="" className="h-4 w-4 shrink-0 object-contain opacity-80" />
                                              )}
                                              <span className="shrink-0 tabular-nums text-emerald-500">×{item.theirQuantity}</span>
                                              <span className="truncate text-blue-400">{cardData.name}</span>
                                              {rarityIcon && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={rarityIcon} alt={cardData.rarity ?? ""} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                              )}
                                            </span>
                                          </CardHoverPreview>
                                          <span className="flex shrink-0 items-center gap-2">
                                            <span className="text-[10px] tabular-nums text-gray-500">{t("profile.mine")} ×{item.myQuantity}</span>
                                            <button
                                              type="button"
                                              onClick={() => addToRequestedBasket(cardForRequested, maxRequested)}
                                              disabled={atMaxRequested}
                                              className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMaxRequested ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inRequested ? "border-blue-500 bg-blue-700/60 text-blue-300 hover:bg-blue-700" : "border-gray-700 bg-blue-800/40 text-blue-400 hover:bg-blue-700/60"}`}
                                              title={atMaxRequested ? t("trades.maxQuantity", { count: maxRequested }) : inRequested ? `${requestedItem.quantity}/${maxRequested}` : t("trades.requestOne")}
                                              aria-label={t("trades.requestOne")}
                                            >
                                              {t("trades.requestOne")}
                                            </button>
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                        </div>
                      </div>
                      )}

                      {/* Coluna direita: Cartas que eu tenho e que @fulano não tem (offerable) */}
                      {offerable.length > 0 && (
                      <div className="min-w-0 flex flex-col">
                        <h3 className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm font-bold uppercase tracking-wider text-emerald-200">
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                          {t("profile.cardsIHaveTheyDont", { slug: user.slug })}
                        </h3>
                        <div className="space-y-4 min-h-0">
                          {groupedOfferable.map(({ set, label, types }) => (
                            <div key={set}>
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-sm font-bold uppercase tracking-wide text-gray-200">{label}</span>
                                <div className="h-px flex-1 bg-gray-700" />
                              </div>
                              <div className="space-y-2.5 pl-2">
                                {types.map(({ type, label: typeLabel, cards }) => {
                                  const icon = TYPE_IMAGE[type];
                                  return (
                                    <div key={type}>
                                      <div className="mb-0.5 flex items-center gap-1.5">
                                        {icon && (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                                        )}
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                          {typeLabel} <span className="text-gray-600">({cards.length})</span>
                                        </span>
                                      </div>
                                      <ul className="space-y-0.5 pl-4">
                                        {cards.map((item) => {
                                          const animKeys = addAnimations.get(item.cardUuid) ?? [];
                                          const basketItem = basket.get(item.cardUuid);
                                          const inBasket = !!basketItem;
                                          const atMax = inBasket && basketItem.quantity >= item.canOffer;
                                          const cached = lookupCached(item.cardUuid, item.card?.scraperId);
                                          const card = item.card ?? cached;
                                          if (!card) return null;
                                          const domains = getCardDomains(card);
                                          const rarityIcon = getRarityIcon(card.rarity);
                                          const cardForBasket = { ...card, uuid: (card as { uuid?: string }).uuid ?? item.cardUuid } as PublicProfileCard;
                                          return (
                                            <li key={item.cardUuid} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                              {animKeys.map((key, i) => (
                                                <div key={key} className="pointer-events-none absolute inset-0 z-10">
                                                  <div className="animate-card-added absolute inset-0 rounded bg-green-400/20 ring-1 ring-green-500/40" />
                                                  <div className="animate-plus-one absolute right-10 flex" style={{ top: `calc(50% - ${i * 16}px - 10px)` }}>
                                                    <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-xs font-bold text-white shadow">+1</span>
                                                  </div>
                                                </div>
                                              ))}
                                              <CardHoverPreview card={card as unknown as Card}>
                                                <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                                  {getDisplayDomainIcons(domains).length > 0 ? (
                                                    getDisplayDomainIcons(domains).map((d) => (
                                                      // eslint-disable-next-line @next/next/no-img-element
                                                      <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                                    ))
                                                  ) : (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={getNoDomainIcon(card)} alt="" className="h-4 w-4 shrink-0 object-contain opacity-80" />
                                                  )}
                                                  <span className="shrink-0 tabular-nums text-emerald-500">×{item.myQuantity}</span>
                                                  <span className="truncate text-blue-400">{(card as { name?: string | null }).name ?? item.cardUuid}</span>
                                                  {rarityIcon && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={rarityIcon} alt={(card as { rarity?: string }).rarity ?? ""} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                                  )}
                                                </span>
                                              </CardHoverPreview>
                                              <span className="flex shrink-0 items-center gap-2">
                                                <span className="text-[10px] tabular-nums text-gray-500">{t("profile.mine")} ×{item.myQuantity}</span>
                                                <button
                                                  type="button"
                                                  onClick={() => addToBasket(cardForBasket, item.canOffer)}
                                                  disabled={atMax}
                                                  className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMax ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inBasket ? "border-green-500 bg-green-700/60 text-green-300 hover:bg-green-700" : "border-gray-700 bg-green-800/40 text-green-400 hover:bg-green-700/60"}`}
                                                  title={atMax ? t("trades.maxQuantity", { count: item.canOffer }) : inBasket ? `${basketItem!.quantity}/${item.canOffer}` : t("trades.offerOne")}
                                                  aria-label={t("trades.offerOne")}
                                                >
                                                  {t("trades.offerOne")}
                                                </button>
                                              </span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>

                    {match.length > 0 && offerable.length === 0 && (
                      <p className="mt-3 text-xs text-gray-500">{t("profile.noOfferableHint")}</p>
                    )}
                  </div>
                  )
                ) : null
              ) : (
                /* ── Own profile or unauthenticated: show full public collection ── */
                publicCollection.length > 0 ? (
                  <div className="px-4 py-3">
                    {filteredCollection.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-500">{t("profile.noCardsMatchSearchGeneric")}</p>
                    ) : (
                      <div className="space-y-4">
                        {groupedCollection.map(({ set, label, types }) => (
                          <div key={set}>
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-sm font-bold uppercase tracking-wide text-gray-200">{label}</span>
                              <div className="h-px flex-1 bg-gray-700" />
                            </div>
                            <div className="space-y-2.5 pl-2">
                              {types.map(({ type, label: typeLabel, cards }) => {
                                const icon = TYPE_IMAGE[type];
                                return (
                                  <div key={type}>
                                    <div className="mb-0.5 flex items-center gap-1.5">
                                      {icon && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                                      )}
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                        {typeLabel} <span className="text-gray-600">({cards.length})</span>
                                      </span>
                                    </div>
                                    <ul className="space-y-0.5 pl-4">
                                      {cards.map((item) => {
                                        const cached = lookupCached(item.cardUuid, item.card.scraperId);
                                        const domains = getCardDomains(cached);
                                        const rarityIcon = getRarityIcon(item.card.rarity);
                                        return (
                                          <li key={item.cardUuid} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                            <CardHoverPreview card={item.card as unknown as Card}>
                                              <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                                {getDisplayDomainIcons(domains).length > 0 ? (
                                                  getDisplayDomainIcons(domains).map((d) => (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                                  ))
                                                ) : (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={getNoDomainIcon(cached ?? item.card)} alt="" className="h-4 w-4 shrink-0 object-contain opacity-80" />
                                                )}
                                                <span className="shrink-0 tabular-nums text-gray-500">×{item.quantity}</span>
                                                <span className="truncate text-blue-400">{item.card.name}</span>
                                                {rarityIcon && (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={rarityIcon} alt={item.card.rarity ?? ""} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                                )}
                                              </span>
                                            </CardHoverPreview>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">{t("profile.noPublicCollection")}</p>
                  </div>
                )
              )}

            </div>
          </div>

          {/* Right: sticky trade basket or register CTA (desktop only) */}
          {(showTradePanel || showTradeCTA) && (
            <div className="hidden self-start md:block md:flex-[3]">
              <div className="sticky top-[73px]">
                {showTradePanel ? (
                  <BasketPanel
                    basket={basket}
                    recipientSlug={user.slug}
                    recipientDisplayName={user.displayName}
                    onUpdateQty={updateBasketQty}
                    onRemove={removeFromBasket}
                    onClear={clearBasket}
                    requestedBasket={!activeTrade ? requestedBasket : undefined}
                    onUpdateRequestedQty={!activeTrade ? updateRequestedBasketQty : undefined}
                    onRemoveRequested={!activeTrade ? removeFromRequestedBasket : undefined}
                    onClearRequested={!activeTrade ? clearRequestedBasket : undefined}
                    cardCacheMap={cardCacheMap}
                    scraperIdMap={scraperIdMap}
                    activeTrade={activeTrade}
                    activeTradeDetail={activeTradeDetail}
                    isMyTurn={tradeIsMyTurn}
                    originalItemsMap={originalItemsMap}
                    onCounterSubmitError={handleCounterSubmitError}
                  />
                ) : (
                  <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t("profile.trade")}</h3>
                    <p className="mt-3 text-sm text-gray-300">
                      {t("profile.registerToTradeWith", { slug: user.slug })}
                    </p>
                    <Link
                      href={registerReturnTo}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      {t("profile.registerToTradeCTA", { slug: user.slug })}
                    </Link>
                    <p className="mt-3 text-xs text-gray-500">
                      {t("profile.registerToTradeHint")}{" "}
                      <Link href={pathname ? `/login?returnTo=${encodeURIComponent(pathname)}` : "/login"} className="font-medium text-emerald-400 hover:underline">
                        {t("profile.logIn")}
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6">
          <BackLink href="/" label={t("back.home")} className="" />
        </div>
      </div>

      {/* Mobile: floating basket or register-to-trade button */}
      {showTradePanel && (
        <button
          type="button"
          onClick={() => setBasketDrawerOpen(true)}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl transition hover:bg-emerald-500 md:hidden"
          aria-label={t("trades.openTradeBasket")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
          </svg>
          {t("profile.trade")}
          {basketCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-emerald-700">
              {basketCount}
            </span>
          )}
        </button>
      )}
      {showTradeCTA && (
        <Link
          href={registerReturnTo}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl transition hover:bg-emerald-500 md:hidden"
          aria-label={t("profile.registerToTradeCTA", { slug: user.slug })}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
          </svg>
          {t("profile.registerToTradeCTA", { slug: user.slug })}
        </Link>
      )}
    </div>
  );
}
