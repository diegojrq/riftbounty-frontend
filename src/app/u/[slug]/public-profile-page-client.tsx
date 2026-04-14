"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { BackLink } from "@/components/layout/BackLink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPublicProfile, getProfileMatch } from "@/lib/profile";
import { createTrade, listTrades, addTradeItem, updateTradeItem, removeTradeItem, submitTrade, sendTradeMessage, getTrade } from "@/lib/trades";
import { getCollection } from "@/lib/collections";
import { toast } from "sonner";
import type { TradeSummary, Trade, TradeItem, UpdateTradeItemPayload } from "@/types/trade";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { TradeOfferDomainIconsAndQty, TradeQuantityBadge } from "@/components/trades/TradeQuantityBadge";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useCards } from "@/lib/cards-context";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import type { PublicUser, MatchItem, OfferableItem, PublicProfileCard } from "@/types/auth";
import type { Card } from "@/types/card";
import { mergePublicProfileCardWithCatalog } from "@/lib/cards";
import { getCardId } from "@/lib/card-id";
import { ApiClientError } from "@/lib/api";
import { TradeDeclaredValueInput } from "@/components/trades/TradeDeclaredValueInput";
import {
  declaredValueApiStringToNumber,
  declaredValuesDifferFromBasket,
  formatDeclaredValueBrl,
  mergeAggregatedDeclaredValue,
  TRADE_DECLARED_VALUE_INVALID_I18N_KEY,
} from "@/lib/trade-declared-value";

const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "profile",
  "decks",
  "collection",
  "wishlist",
  "for-sale",
  "communities",
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
  /** Valor declarado informativo (referência, ex. BRL na UI); null = sem valor. */
  declaredValue?: number | null;
  /** Preço por carta na vitrine «à venda» do perfil (não é TCG). */
  listingPricePerCard?: number | null;
}

/** Trade detail pode trazer `card: null`; resolve com o catálogo em memória. */
function publicProfileCardFromCatalog(c: Card): PublicProfileCard {
  return {
    id: getCardId(c),
    uuid: c.uuid,
    scraperId: c.scraperId ?? c.scraper_id,
    name: c.name ?? null,
    slug: c.slug,
    cardSet: c.cardSet ?? c.set ?? c.card_set ?? null,
    rarity: c.rarity ?? null,
    type: c.type ?? null,
    domain: c.domain ?? null,
    domains: c.domains ?? null,
    cardDomains: c.cardDomains as PublicProfileCard["cardDomains"],
    image_key: c.image_key ?? null,
    imageUrl: c.imageUrl ?? c.image_url ?? null,
  };
}

function resolveBasketCardFromTradeItem(
  item: TradeItem,
  cardCacheMap: Map<string, Card>,
  scraperIdMap: Map<string, Card>
): PublicProfileCard | null {
  if (item.card) return item.card;
  const c = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
  if (!c) return null;
  return publicProfileCardFromCatalog(c);
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

/** TCG USD — mesma prioridade que CardTile (market → mid → low → high). */
function parseTcgPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getCardTcgUnitPriceUsd(card: Card): number | null {
  const market = parseTcgPrice(card.tcgMarketPrice ?? card.tcg_market_price);
  const mid = parseTcgPrice(card.tcgMidPrice ?? card.tcg_mid_price);
  const low = parseTcgPrice(card.tcgLowPrice ?? card.tcg_low_price);
  const high = parseTcgPrice(card.tcgHighPrice ?? card.tcg_high_price);
  return market ?? mid ?? low ?? high;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatProfileListPrice(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getCollectorForSort(card: { collectorNumber?: string | null; collector_number?: string | null } | null | undefined): string {
  return (card?.collectorNumber ?? card?.collector_number ?? "").toString().trim();
}

function compareCollectorThenName(
  a: { collectorNumber?: string | null; collector_number?: string | null; name?: string | null } | null | undefined,
  b: { collectorNumber?: string | null; collector_number?: string | null; name?: string | null } | null | undefined
): number {
  const ca = getCollectorForSort(a);
  const cb = getCollectorForSort(b);
  if (ca && cb) {
    const byCollector = ca.localeCompare(cb, undefined, { numeric: true, sensitivity: "base" });
    if (byCollector !== 0) return byCollector;
  } else if (ca) {
    return -1;
  } else if (cb) {
    return 1;
  }
  return (a?.name ?? "").localeCompare(b?.name ?? "", undefined, { sensitivity: "base" });
}

/* ─── Domain helper ─────────────────────────────────── */
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

/* ─── Rarity filter constants ───────────────────────── */
const RARITIES = ["common", "uncommon", "rare", "epic", "showcase"] as const;

/* ─── Basket grouping constants ─────────────────────── */
function compareSetOrder(a: string, b: string, setOrder: string[]): number {
  const ai = setOrder.indexOf(a);
  const bi = setOrder.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
}

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

function groupCardsBySetAndType<T extends { card: PublicProfileCard | null }>(
  items: T[],
  setOrder: string[],
  labelForSet: (set: string) => string
) {
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
    .sort(([a], [b]) => compareSetOrder(a, b, setOrder))
    .map(([set, byType]) => ({
      set,
      label: labelForSet(set),
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

function aggregateTradeItemsByCardId(items: TradeItem[]): TradeItem[] {
  const byCardId = new Map<string, TradeItem>();
  for (const item of items) {
    const existing = byCardId.get(item.cardId);
    if (!existing) {
      byCardId.set(item.cardId, { ...item });
      continue;
    }
    existing.quantity += item.quantity;
    if (!existing.card && item.card) existing.card = item.card;
    existing.declaredValue = mergeAggregatedDeclaredValue(
      existing.declaredValue ?? null,
      item.declaredValue ?? null
    );
  }
  return [...byCardId.values()];
}

/* ─── BasketPanel ────────────────────────────────────── */
interface BasketPanelProps {
  basket: Map<string, BasketItem>;
  recipientSlug: string;
  recipientDisplayName: string | null;
  onUpdateQty: (cardId: string, qty: number) => void;
  onRemove: (cardId: string) => void;
  /** O que você pede do outro (só na criação; enviado como requestedItems) */
  requestedBasket?: Map<string, BasketItem>;
  onUpdateRequestedQty?: (cardId: string, qty: number) => void;
  onRemoveRequested?: (cardId: string) => void;
  onUpdateDeclaredValue?: (cardId: string, value: number | null) => void;
  onUpdateRequestedDeclaredValue?: (cardId: string, value: number | null) => void;
  activeTrade?: TradeSummary | null;
  activeTradeDetail?: Trade | null;
  isMyTurn?: boolean;
  onCounterSubmitError?: (tradeId: string) => void;
  /** Slug do usuário logado (para os dois lados da troca aberta) */
  mySlug: string;
}

/** Lista somente leitura: um lado da troca (lista plana, sem agrupamento). */
function ActiveTradeSideReadOnlyList({
  items,
  cardCacheMap,
  scraperIdMap,
}: {
  items: TradeItem[];
  cardCacheMap: Map<string, Card>;
  scraperIdMap: Map<string, Card>;
}) {
  const { locale } = useLocale();
  return (
    <ul className="space-y-0.5 pl-2">
      {items.map((item) => {
        const cached = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
        const cardForPreview = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
        const name = cached?.name ?? item.card?.name ?? item.cardId;
        const domains = getCardDomains(
          (cached ?? item.card) as {
            domain?: string;
            domains?: string[];
            cardDomains?: { domain: { name: string } }[];
          } | undefined
        );
        const rarity = (cached?.rarity ?? item.card?.rarity ?? "").toLowerCase().replace(/\s+/g, "");
        const rarityNorm = rarity === "overnumbered" ? "showcase" : rarity;
        return (
          <li key={item.id} className="flex items-center gap-1.5 py-0.5">
            <CardHoverPreview card={cardForPreview}>
              <span className="flex min-w-0 cursor-default items-center gap-1">
                <TradeOfferDomainIconsAndQty
                  domains={domains}
                  quantity={item.quantity}
                  fallbackCard={cached ?? item.card ?? undefined}
                  iconClassName="h-3.5 w-3.5 shrink-0 object-contain"
                />
                <span className="truncate text-xs text-blue-400">{name}</span>
                {rarityNorm && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/images/rarities/${rarityNorm}.svg`} alt={rarityNorm} className="h-3 w-3 shrink-0 opacity-60" />
                )}
                {item.declaredValue != null && item.declaredValue !== "" && (
                  <span className="shrink-0 text-[10px] tabular-nums text-amber-200/90">
                    {formatDeclaredValueBrl(item.declaredValue, locale)}
                  </span>
                )}
              </span>
            </CardHoverPreview>
          </li>
        );
      })}
    </ul>
  );
}

function BasketPanel({
  basket,
  recipientSlug,
  recipientDisplayName,
  mySlug,
  onUpdateQty,
  onRemove,
  requestedBasket,
  onUpdateRequestedQty,
  onRemoveRequested,
  onUpdateDeclaredValue,
  onUpdateRequestedDeclaredValue,
  cardCacheMap,
  scraperIdMap,
  activeTrade,
  activeTradeDetail,
  isMyTurn,
  onCounterSubmitError,
}: BasketPanelProps & { cardCacheMap: Map<string, Card>; scraperIdMap: Map<string, Card> }) {
  const router = useRouter();
  const { t } = useLocale();
  const { setCodesOrdered, getSetLabel } = useRiotCatalogSets();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(() => [...basket.values()], [basket]);
  const requestedItemsList = useMemo(
    () => (requestedBasket ? [...requestedBasket.values()] : []),
    [requestedBasket]
  );

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const requestedTotalQty = requestedItemsList.reduce((s, i) => s + i.quantity, 0);

  /** Subtotal da vitrine (só cartas com preço definido). */
  const requestedListingSubtotal = useMemo(() => {
    let sum = 0;
    let anyPriced = false;
    for (const item of requestedItemsList) {
      const p = item.listingPricePerCard;
      if (typeof p === "number" && Number.isFinite(p) && p >= 0) {
        sum += p * item.quantity;
        anyPriced = true;
      }
    }
    return { sum, anyPriced };
  }, [requestedItemsList]);

  const hasActiveTrade = !!activeTrade;
  const isWaitingOnOtherParty = hasActiveTrade && isMyTurn !== true;
  const isCounterMode = hasActiveTrade && isMyTurn === true;
  const canEditRequestedBasket = !!requestedBasket && !!onUpdateRequestedQty && !!onRemoveRequested;
  const showRequestedSection = canEditRequestedBasket && (!hasActiveTrade || isCounterMode);
  const canEditOfferDeclared = !!onUpdateDeclaredValue && !isWaitingOnOtherParty;
  const canEditRequestedDeclared = !!onUpdateRequestedDeclaredValue && !isWaitingOnOtherParty;

  /** Cartas do usuário logado na troca (initiator ou recipient, conforme o caso). */
  const myTradeItems = useMemo<TradeItem[]>(() => {
    if (!activeTradeDetail || !activeTrade) return [];
    return (
      activeTrade.initiatorSlug === mySlug
        ? activeTradeDetail.initiatorItems
        : activeTradeDetail.recipientItems
    ) ?? [];
  }, [activeTradeDetail, activeTrade, mySlug]);

  /** Cartas de quem está no perfil (outro participante). */
  const theirTradeItems = useMemo<TradeItem[]>(() => {
    if (!activeTradeDetail || !activeTrade) return [];
    return (
      activeTrade.initiatorSlug === mySlug
        ? activeTradeDetail.recipientItems
        : activeTradeDetail.initiatorItems
    ) ?? [];
  }, [activeTradeDetail, activeTrade, mySlug]);

  const myTradeItemsAggregated = useMemo(
    () => aggregateTradeItemsByCardId(myTradeItems),
    [myTradeItems]
  );

  const theirTradeItemsAggregated = useMemo(
    () => aggregateTradeItemsByCardId(theirTradeItems),
    [theirTradeItems]
  );

  async function handleSend() {
    if (items.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (isCounterMode && activeTrade) {
        try {
          const syncTradeSide = async (originalSideItems: TradeItem[], currentSideItems: Map<string, BasketItem>) => {
            const originalByCardId = new Map(originalSideItems.map((it) => [it.cardId, it]));
            for (const original of originalSideItems) {
              if (!currentSideItems.has(original.cardId)) {
                await removeTradeItem(activeTrade.id, original.id);
              }
            }
            for (const [cardId, current] of currentSideItems) {
              const original = originalByCardId.get(cardId);
              const curVal = current.declaredValue ?? null;
              if (original) {
                const qtyChanged = original.quantity !== current.quantity;
                const valChanged = declaredValuesDifferFromBasket(original.declaredValue, curVal);
                if (!qtyChanged && !valChanged) continue;
                const payload: UpdateTradeItemPayload = { quantity: current.quantity };
                if (valChanged) payload.declaredValue = curVal;
                await updateTradeItem(activeTrade.id, original.id, payload);
              } else {
                await addTradeItem(activeTrade.id, cardId, current.quantity, curVal);
              }
            }
          };
          await syncTradeSide(myTradeItems, basket);
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
        const linePayload = (i: (typeof items)[number]) => {
          const cardId = getCardId(i.card);
          const line: { cardId: string; quantity: number; declaredValue?: number } = {
            cardId,
            quantity: i.quantity,
          };
          if (typeof i.declaredValue === "number" && Number.isFinite(i.declaredValue)) {
            line.declaredValue = Math.round(i.declaredValue * 100) / 100;
          }
          return line;
        };
        const requestedItems =
          requestedBasket && requestedBasket.size > 0
            ? [...requestedBasket.values()].map(linePayload)
            : undefined;
        const trade = await createTrade({
          recipientSlug,
          items: items.map(linePayload),
          ...(requestedItems && requestedItems.length > 0 ? { requestedItems } : {}),
          ...(message.trim() ? { message: message.trim() } : {}),
        });
        router.push(`/trades/${trade.id}`);
      }
    } catch (err) {
      let message = err instanceof Error ? err.message : "Failed to submit. Please try again.";
      if (err instanceof ApiClientError && err.code === TRADE_DECLARED_VALUE_INVALID_I18N_KEY) {
        message = t(TRADE_DECLARED_VALUE_INVALID_I18N_KEY);
      }
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
          {isWaitingOnOtherParty && (
            <div
              className="mt-2 flex items-start gap-2.5 rounded-lg border border-amber-500/45 bg-gradient-to-r from-amber-950/90 via-amber-950/70 to-amber-900/35 px-3 py-2.5 shadow-[0_0_24px_-10px_rgba(251,191,36,0.45)]"
              role="status"
            >
              <span className="mt-1.5 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug text-amber-100">
                  {t("trades.waitingFor", { slug: recipientSlug })}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                  {t("trades.waitingForBasketHint")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* O que você pede — mesmo padrão visual da oferta (agrupado set/tipo + linha com controles à direita) */}
      {showRequestedSection && (
        <div className="border-b border-gray-700 px-3 py-2">
          {!isCounterMode && (
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {requestedItemsList.length > 0
                  ? t("trades.pickFromCollectionCount", { slug: recipientSlug, count: requestedTotalQty })
                  : t("trades.pickFromCollection", { slug: recipientSlug })}
              </p>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {isCounterMode
                ? t("trades.tradeSideCards", { slug: recipientSlug, count: requestedTotalQty })
                : t("trades.whatYouAskFor")}
            </p>
            {requestedItemsList.length > 0 && (
              <span
                className="max-w-[55%] text-right text-[10px] font-medium tabular-nums text-emerald-400/90"
                title={t("profile.basketSubtotalListingHint")}
              >
                {requestedListingSubtotal.anyPriced
                  ? t("profile.basketSubtotalWithValue", {
                      value: formatProfileListPrice(requestedListingSubtotal.sum),
                    })
                  : "—"}
              </span>
            )}
          </div>
          {requestedItemsList.length === 0 ? (
            <p className="py-1 text-xs text-gray-600">{t("trades.noCardsYet")}</p>
          ) : (
          <ul className="space-y-0.5 pl-2">
            {requestedItemsList.map((item) => {
              const atMax = item.quantity >= item.maxQty;
              const cardId = getCardId(item.card);
              const cachedReq =
                cardCacheMap.get(cardId) ??
                (item.card.scraperId ? scraperIdMap.get(item.card.scraperId) : undefined);
              const previewCard = mergePublicProfileCardWithCatalog(item.card, cachedReq, cardId);
              const domains = getCardDomains(cachedReq ?? item.card);
              const rarityIcon = getRarityIcon(item.card.rarity);
              const listP = item.listingPricePerCard;
              const hasListPrice = typeof listP === "number" && Number.isFinite(listP) && listP >= 0;
              const lineListTotal = hasListPrice ? listP * item.quantity : null;
              return (
                <li
                  key={cardId}
                  className="flex items-center justify-between gap-1 rounded px-1 py-0.5 hover:bg-gray-700/40"
                >
                  <CardHoverPreview card={previewCard}>
                    <span className="flex min-w-0 flex-1 cursor-default flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:gap-1">
                      <span className="flex min-w-0 items-center gap-1">
                        <TradeOfferDomainIconsAndQty
                          domains={domains}
                          quantity={item.quantity}
                          fallbackCard={cachedReq ?? item.card}
                        />
                        <span className="truncate text-blue-400">{item.card.name}</span>
                        {rarityIcon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={rarityIcon} alt={item.card.rarity ?? ""} className="hidden h-3.5 w-3.5 shrink-0 object-contain opacity-70 sm:block" />
                        )}
                      </span>
                      {hasListPrice && lineListTotal != null ? (
                        <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-emerald-400/85">
                          {t("profile.pricePerCardLabel", { price: formatProfileListPrice(listP) })}{" "}
                          <span className="text-gray-500">×{item.quantity}</span>{" "}
                          <span className="text-gray-400">=</span>{" "}
                          {formatProfileListPrice(lineListTotal)}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-gray-500">{t("profile.priceOnRequest")}</span>
                      )}
                    </span>
                  </CardHoverPreview>
                  <span className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                    {canEditRequestedDeclared && (
                      <span className="flex flex-col items-center gap-0">
                        <span className="text-[8px] font-medium uppercase tracking-wide text-gray-500">
                          {t("trades.declaredValueCurrency")}
                        </span>
                        <TradeDeclaredValueInput
                          value={item.declaredValue ?? null}
                          onCommit={(n) => onUpdateRequestedDeclaredValue!(cardId, n)}
                          disabled={submitting}
                          ariaLabel={t("trades.declaredValueAriaRequested")}
                        />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onUpdateRequestedQty!(cardId, item.quantity - 1)}
                      className="flex h-4 w-4 items-center justify-center rounded bg-gray-700 text-[10px] text-gray-300 hover:bg-gray-600 sm:h-5 sm:w-5 sm:text-xs"
                      aria-label={t("common.decrease")}
                    >
                      −
                    </button>
                    <span
                      className={`w-7 text-center text-[10px] font-bold tabular-nums sm:w-8 ${atMax ? "text-amber-400" : "text-gray-400"}`}
                    >
                      {item.quantity}/{item.maxQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateRequestedQty!(cardId, item.quantity + 1)}
                      disabled={atMax}
                      className="flex h-4 w-4 items-center justify-center rounded bg-gray-700 text-[10px] text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30 sm:h-5 sm:w-5 sm:text-xs"
                      aria-label={t("common.increase")}
                    >
                      +
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          )}
        </div>
      )}

      {/* Troca aberta: os dois lados (mesma nomenclatura que /trades/[id]) */}
      {hasActiveTrade && !isCounterMode && (
        <div className="space-y-5 border-b border-gray-700 px-3 py-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {t("trades.tradeSideCards", { slug: mySlug, count: myTradeItemsAggregated.reduce((sum, it) => sum + it.quantity, 0) })}
              </p>
            </div>
            {myTradeItemsAggregated.length === 0 ? (
              <p className="py-1 text-xs text-gray-600">{t("trades.noCardsYet")}</p>
            ) : (
              <ActiveTradeSideReadOnlyList items={myTradeItemsAggregated} cardCacheMap={cardCacheMap} scraperIdMap={scraperIdMap} />
            )}
          </div>
          <div className="border-t border-gray-700/80 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {t("trades.tradeSideCards", { slug: recipientSlug, count: theirTradeItemsAggregated.reduce((sum, it) => sum + it.quantity, 0) })}
              </p>
            </div>
            {theirTradeItemsAggregated.length === 0 ? (
              <p className="py-1 text-xs text-gray-600">{t("trades.noCardsYet")}</p>
            ) : (
              <ActiveTradeSideReadOnlyList items={theirTradeItemsAggregated} cardCacheMap={cardCacheMap} scraperIdMap={scraperIdMap} />
            )}
          </div>
        </div>
      )}

      {/* My basket items — only shown when I can act (or no active trade) */}
      <div className={`flex-1 overflow-y-auto px-3 py-2 ${isWaitingOnOtherParty ? "hidden" : ""}`}>
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {isCounterMode
              ? t("trades.tradeSideCards", { slug: mySlug, count: totalQty })
              : t("trades.whatYouOffer")}
          </p>
        </div>
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
          <ul className="space-y-0.5 pl-2">
            {items.map(({ card, quantity, maxQty, declaredValue }) => {
              const cardId = getCardId(card);
              const atMax = quantity >= maxQty;
              const cached = cardCacheMap.get(cardId) ?? (card.scraperId ? scraperIdMap.get(card.scraperId) : undefined);
              const previewCard = mergePublicProfileCardWithCatalog(card, cached, cardId);
              const domains = getCardDomains(cached ?? card);
              const rarityIcon = getRarityIcon(card.rarity);
              return (
                <li key={cardId} className="flex items-center justify-between gap-1 rounded px-1 py-0.5 hover:bg-gray-700/40">
                  <CardHoverPreview card={previewCard}>
                    <span className="flex min-w-0 flex-1 cursor-default items-center gap-1 text-xs">
                      <TradeOfferDomainIconsAndQty domains={domains} quantity={quantity} fallbackCard={cached ?? card} />
                      <span className="truncate text-blue-400">{card.name}</span>
                      {rarityIcon && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={rarityIcon} alt={card.rarity ?? ""} className="hidden h-3.5 w-3.5 shrink-0 object-contain opacity-70 sm:block" />
                      )}
                    </span>
                  </CardHoverPreview>
                  <span className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                    {canEditOfferDeclared && (
                      <span className="flex flex-col items-center gap-0">
                        <span className="text-[8px] font-medium uppercase tracking-wide text-gray-500">
                          {t("trades.declaredValueCurrency")}
                        </span>
                        <TradeDeclaredValueInput
                          value={declaredValue ?? null}
                          onCommit={(n) => onUpdateDeclaredValue!(cardId, n)}
                          disabled={submitting}
                          ariaLabel={t("trades.declaredValueAriaOffer")}
                        />
                      </span>
                    )}
                    <button type="button" onClick={() => onUpdateQty(cardId, quantity - 1)} className="flex h-4 w-4 items-center justify-center rounded bg-gray-700 text-[10px] text-gray-300 hover:bg-gray-600 sm:h-5 sm:w-5 sm:text-xs" aria-label={t("common.decrease")}>−</button>
                    <span className={`w-7 text-center text-[10px] font-bold tabular-nums sm:w-8 ${atMax ? "text-amber-400" : "text-gray-400"}`}>{quantity}/{maxQty}</span>
                    <button type="button" onClick={() => onUpdateQty(cardId, quantity + 1)} disabled={atMax} className="flex h-4 w-4 items-center justify-center rounded bg-gray-700 text-[10px] text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30 sm:h-5 sm:w-5 sm:text-xs" aria-label={t("common.increase")}>+</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer: view trade link when waiting, or action buttons when I can act */}
      <div className="border-t border-gray-700 p-3 space-y-2">
        {isWaitingOnOtherParty ? (
          <a
            href={`/trades/${activeTrade!.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            {t("trades.viewTrade")}
          </a>
        ) : (
          <>
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
            {hasActiveTrade && (
              <a
                href={`/trades/${activeTrade!.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 py-2 text-xs font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                {t("trades.viewTrade")}
              </a>
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
              ) : isCounterMode ? t("trades.submitCounterOffer") : t("trades.requestTrade")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */
export default function PublicProfilePageClient() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { user: me, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { cards: cachedCards } = useCards();
  const { setCodesOrdered, getSetLabel } = useRiotCatalogSets();

  const cardCacheMap = useMemo(
    () =>
      new Map(
        (cachedCards ?? [])
          .map((c) => [getCardId(c), c] as const)
          .filter(([id]) => id !== "")
      ),
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
  const [publicTab, setPublicTab] = useState<"collection" | "wishlist" | "selling">("selling");
  const setPublicTabWithUrl = useCallback(
    (tab: "collection" | "wishlist" | "selling") => {
      setPublicTab(tab);
      const next = new URLSearchParams(searchParams.toString());
      next.set("tab", tab);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  /** "collection" = coleção pública deles; "tradeDirect" = listas completas; "trade" = preditivo */
  const [collectionTab, setCollectionTab] = useState<"collection" | "tradeDirect" | "trade">("collection");
  const autoOpenedTradeTabRef = useRef<string | null>(null);

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
  const [requestedBasket, setRequestedBasket] = useState<Map<string, BasketItem>>(new Map());
  const [myCollectionQtyMap, setMyCollectionQtyMap] = useState<Map<string, number>>(new Map());

  // Pre-populate counter baskets with existing trade items.
  // basket = minhas cartas; requestedBasket = cartas do outro lado.
  useEffect(() => {
    if (!activeTradeDetail || !activeTrade || !me) return;
    if (matchLoading) return;
    const myItems =
      activeTrade.initiatorSlug === me.slug
        ? activeTradeDetail.initiatorItems ?? []
        : activeTradeDetail.recipientItems ?? [];
    const theirItems =
      activeTrade.initiatorSlug === me.slug
        ? activeTradeDetail.recipientItems ?? []
        : activeTradeDetail.initiatorItems ?? [];
    const offerableQtyMap = new Map(offerable.map((o) => [o.cardId, o.canOffer]));
    const myEntries = myItems
      .map((item) => {
        const card = resolveBasketCardFromTradeItem(item, cardCacheMap, scraperIdMap);
        if (!card) return null;
        const cid = getCardId(card) || item.cardId;
        const maxQty = offerableQtyMap.get(cid) ?? item.quantity;
        return [
          cid,
          {
            card: { ...card, id: cid },
            quantity: item.quantity,
            maxQty,
            tradeItemId: item.id,
            declaredValue: declaredValueApiStringToNumber(item.declaredValue),
          },
        ] as const;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
    setBasket(new Map(myEntries));

    const requestedMaxQtyMap = new Map(
      match.map((m) => [m.cardId, m.need ?? m.theirQuantity])
    );
    const theirEntries = theirItems
      .map((item) => {
        const card = resolveBasketCardFromTradeItem(item, cardCacheMap, scraperIdMap);
        if (!card) return null;
        const cid = getCardId(card) || item.cardId;
        const maxQty = requestedMaxQtyMap.get(cid) ?? item.quantity;
        return [
          cid,
          {
            card: { ...card, id: cid },
            quantity: item.quantity,
            maxQty,
            tradeItemId: item.id,
            declaredValue: declaredValueApiStringToNumber(item.declaredValue),
          },
        ] as const;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
    setRequestedBasket(new Map(theirEntries));
  }, [activeTradeDetail?.id, me?.slug, matchLoading, offerable, match, cardCacheMap, scraperIdMap]);
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

  /** `basketKey` alinhado a `item.cardId` (igual ao `requestedBasket`). */
  function addToBasket(card: PublicProfileCard, maxQty: number, basketKey?: string) {
    const key = basketKey ?? getCardId(card);
    if (!key) return;
    const current = basket.get(key)?.quantity ?? 0;
    if (current >= maxQty) return;
    flashAdd(key);
    setBasket((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      const cardWithKey = { ...card, id: key };
      next.set(key, {
        card: cardWithKey,
        quantity: Math.min((existing?.quantity ?? 0) + 1, maxQty),
        maxQty,
        declaredValue: existing?.declaredValue ?? null,
      });
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

  /* ── Requested basket (o que eu quero dele / lado oposto na contraproposta) ─────────────────── */

  /**
   * `basketKey` deve ser o mesmo identificador usado na lista (`item.cardId`), pois o `id`
   * vindo do perfil pode divergir e quebrar o lookup → botão "Solicitar" nunca desabilitava.
   */
  function addToRequestedBasket(
    card: PublicProfileCard,
    maxQty: number,
    basketKey?: string,
    /** `undefined` = manter preço já no item; número/`null` = vitrine (à venda). */
    listingPricePerCard?: number | null
  ) {
    const key = basketKey ?? getCardId(card);
    if (!key) return;
    const current = requestedBasket.get(key)?.quantity ?? 0;
    if (current >= maxQty) return;
    setRequestedBasket((prev) => {
      const next = new Map(prev);
      const existing = next.get(key);
      const cardWithKey = { ...card, id: key };
      const nextListing =
        listingPricePerCard !== undefined ? listingPricePerCard : existing?.listingPricePerCard;
      next.set(key, {
        card: cardWithKey,
        quantity: Math.min((existing?.quantity ?? 0) + 1, maxQty),
        maxQty,
        declaredValue: existing?.declaredValue ?? null,
        ...(nextListing !== undefined ? { listingPricePerCard: nextListing } : {}),
        ...(existing?.tradeItemId != null && existing.tradeItemId !== ""
          ? { tradeItemId: existing.tradeItemId }
          : {}),
      });
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

  function updateBasketDeclaredValue(cardId: string, value: number | null) {
    setBasket((prev) => {
      const next = new Map(prev);
      const item = next.get(cardId);
      if (!item) return next;
      next.set(cardId, { ...item, declaredValue: value });
      return next;
    });
  }

  function updateRequestedDeclaredValue(cardId: string, value: number | null) {
    setRequestedBasket((prev) => {
      const next = new Map(prev);
      const item = next.get(cardId);
      if (!item) return next;
      next.set(cardId, { ...item, declaredValue: value });
      return next;
    });
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

  // Minha coleção (quantidades) para a aba "Trade" completa.
  useEffect(() => {
    if (!me || !user || me.slug === user.slug) return;
    let cancelled = false;
    getCollection()
      .then((data) => {
        if (cancelled) return;
        const map = new Map<string, number>();
        for (const item of data.items ?? []) {
          const id = getCardId(item.card) || item.cardId || item.cardUuid;
          if (id) map.set(id, (map.get(id) ?? 0) + (item.quantity ?? 0));
        }
        setMyCollectionQtyMap(map);
      })
      .catch(() => {
        if (!cancelled) setMyCollectionQtyMap(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [me?.slug, user?.slug]);

  const publicCollection = useMemo(() => user?.publicCollection ?? [], [user]);
  const publicWishlist = useMemo(() => user?.wishlist ?? [], [user]);
  const publicForSale = useMemo(() => user?.forSale ?? [], [user]);

  useEffect(() => {
    if (!user) return;
    const tabParam = (searchParams.get("tab") ?? "").toLowerCase().trim();
    if (tabParam === "selling" || tabParam === "for-sale") {
      setPublicTab("selling");
      return;
    }
    if (tabParam === "wishlist") {
      setPublicTab("wishlist");
      return;
    }
    if (tabParam === "collection") {
      setPublicTab("collection");
      return;
    }
    if (publicForSale.length > 0) {
      setPublicTab("selling");
      return;
    }
    if (publicWishlist.length > 0) {
      setPublicTab("wishlist");
      return;
    }
    setPublicTab("collection");
  }, [user?.id, publicForSale.length, publicWishlist.length, searchParams]);

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
      const cached = cardCacheMap.get(item.cardId);
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
      // No trade preditivo sempre mostramos somente faltantes.
      if (item.myQuantity > 0) return false;
      if (selectedRarities.length > 0) {
        const raw = item.card.rarity?.toLowerCase().replace(/\s+/g, "") ?? "";
        const r = raw === "overnumbered" ? "showcase" : raw;
        if (!selectedRarities.includes(r)) return false;
      }
      if (!q) return true;
      return (item.card.name ?? "").toLowerCase().includes(q);
    });
  }, [match, search, selectedRarities]);

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

  const filteredMyTradeCollection = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (cachedCards ?? []).filter((card) => {
      const cardId = getCardId(card);
      const qty = myCollectionQtyMap.get(cardId) ?? 0;
      if (qty <= 0) return false;
      if (selectedRarities.length > 0) {
        const raw = card.rarity?.toLowerCase().replace(/\s+/g, "") ?? "";
        const r = raw === "overnumbered" ? "showcase" : raw;
        if (!selectedRarities.includes(r)) return false;
      }
      if (!q) return true;
      if ((card.name ?? "").toLowerCase().includes(q)) return true;
      if (card.subtypes?.some((s) => s.toLowerCase().includes(q))) return true;
      const cardSubtypes = card.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }> | undefined;
      if (cardSubtypes?.some((cs) => ((cs?.subtype?.name ?? cs?.name) ?? "").toLowerCase().includes(q))) return true;
      return false;
    });
  }, [cachedCards, myCollectionQtyMap, search, selectedRarities]);

  const sortedTradeDirectPublic = useMemo(
    () => [...filteredCollection].sort((a, b) => {
      const ac = cardCacheMap.get(a.cardId) ?? a.card;
      const bc = cardCacheMap.get(b.cardId) ?? b.card;
      return compareCollectorThenName(ac, bc);
    }),
    [filteredCollection, cardCacheMap]
  );

  const sortedTradeDirectMine = useMemo(
    () => [...filteredMyTradeCollection].sort((a, b) => compareCollectorThenName(a, b)),
    [filteredMyTradeCollection]
  );

  const sortedPredictiveMatch = useMemo(
    () => [...filteredMatch].sort((a, b) => {
      const ac = lookupCached(a.cardId, a.card?.scraperId) ?? a.card;
      const bc = lookupCached(b.cardId, b.card?.scraperId) ?? b.card;
      return compareCollectorThenName(ac, bc);
    }),
    [filteredMatch, cardCacheMap, scraperIdMap]
  );

  const sortedPredictiveOfferable = useMemo(
    () => [...filteredOfferable].sort((a, b) => {
      const ac = lookupCached(a.cardId, a.card?.scraperId) ?? a.card;
      const bc = lookupCached(b.cardId, b.card?.scraperId) ?? b.card;
      return compareCollectorThenName(ac, bc);
    }),
    [filteredOfferable, cardCacheMap, scraperIdMap]
  );

  const groupedCollection = useMemo(
    () => groupCardsBySetAndType(filteredCollection, setCodesOrdered, getSetLabel),
    [filteredCollection, setCodesOrdered, getSetLabel]
  );

  /** Para aba Coleção: cardId → offerable (para mostrar + e canOffer na coleção pública deles) */
  const offerableByCardId = useMemo(
    () => new Map(offerable.map((o) => [o.cardId, o])),
    [offerable]
  );

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
          const offerableQtyMap = new Map(offerable.map((o) => [o.cardId, o.canOffer]));
          const entries = myItems
            .map((item) => {
              const card = resolveBasketCardFromTradeItem(item, cardCacheMap, scraperIdMap);
              if (!card) return null;
              const cid = getCardId(card) || item.cardId;
              const maxQty = offerableQtyMap.get(cid) ?? item.quantity;
              return [
                cid,
                {
                  card: { ...card, id: cid },
                  quantity: item.quantity,
                  maxQty,
                  tradeItemId: item.id,
                  declaredValue: declaredValueApiStringToNumber(item.declaredValue),
                },
              ] as const;
            })
            .filter((e): e is NonNullable<typeof e> => e !== null);
          setBasket(new Map(entries));
        })
        .catch(() => {});
    },
    [me, offerable, cardCacheMap, scraperIdMap]
  );

  /** Vez de quem age: prioriza detalhe da troca quando já carregou (lista resumida pode atrasar). */
  const tradeIsMyTurn = useMemo(() => {
    if (!activeTrade || !me?.slug) return false;
    const turn = activeTradeDetail?.currentTurnSlug ?? activeTrade.currentTurnSlug;
    return turn === me.slug;
  }, [activeTrade, activeTradeDetail, me?.slug]);

  // Se já existe troca ativa com esse perfil, abrir direto na aba de trade preditivo.
  useEffect(() => {
    const canTradeWithProfile =
      !!me?.slug &&
      !!user?.slug &&
      me.slug !== user.slug &&
      publicCollection.length > 0;
    if (!canTradeWithProfile || !activeTrade || !me?.slug || !user?.slug) return;
    const autoOpenKey = `${me.slug}->${user.slug}:${activeTrade.id}`;
    if (autoOpenedTradeTabRef.current === autoOpenKey) return;
    autoOpenedTradeTabRef.current = autoOpenKey;
    if (collectionTab === "collection") {
      setCollectionTab("trade");
    }
  }, [me?.slug, user?.slug, publicCollection.length, activeTrade?.id]);

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
  /** Wishlist + à venda: mesmo cesto ao lado (wishlist → oferta; à venda → pedido). */
  const showPublicListTradeBasket =
    !!me && !isOwnProfile && (publicTab === "wishlist" || publicTab === "selling");
  const showTradeCTA = !me && !isOwnProfile && hasPublicCollection;
  const registerReturnTo = pathname ? `/register?returnTo=${encodeURIComponent(pathname)}` : "/register";
  /** Troca aberta e aguardando a outra parte — não alterar pedido/oferta pela coleção. */
  const tradeActionsLocked = !!activeTrade && tradeIsMyTurn !== true;
  const basketCount = [...basket.values()].reduce((s, i) => s + i.quantity, 0);
  const requestedBasketCount = [...requestedBasket.values()].reduce((s, i) => s + i.quantity, 0);
  const totalTradeBasketCount = basketCount + requestedBasketCount;

  return (
    <div className="min-h-screen bg-gray-900">

      {/* Mobile basket drawer */}
      {basketDrawerOpen &&
        ((showTradePanel && publicTab === "collection") || showPublicListTradeBasket) && (
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
              mySlug={me.slug}
              onUpdateQty={updateBasketQty}
              onRemove={removeFromBasket}
              requestedBasket={!activeTrade || tradeIsMyTurn ? requestedBasket : undefined}
              onUpdateRequestedQty={!activeTrade || tradeIsMyTurn ? updateRequestedBasketQty : undefined}
              onRemoveRequested={!activeTrade || tradeIsMyTurn ? removeFromRequestedBasket : undefined}
              onUpdateDeclaredValue={updateBasketDeclaredValue}
              onUpdateRequestedDeclaredValue={updateRequestedDeclaredValue}
              cardCacheMap={cardCacheMap}
              scraperIdMap={scraperIdMap}
              activeTrade={activeTrade}
              activeTradeDetail={activeTradeDetail}
              isMyTurn={tradeIsMyTurn}
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
        <div className="mb-4 inline-flex rounded-lg border border-gray-700 bg-gray-900/70 p-1">
          <button
            type="button"
            onClick={() => setPublicTabWithUrl("wishlist")}
            className={`rounded px-3 py-1.5 text-sm ${publicTab === "wishlist" ? "bg-emerald-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
          >
            {t("profile.wishlistTab")}
          </button>
          <button
            type="button"
            onClick={() => setPublicTabWithUrl("selling")}
            className={`rounded px-3 py-1.5 text-sm ${publicTab === "selling" ? "bg-emerald-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
          >
            {t("profile.tabSelling")}
          </button>
          <button
            type="button"
            onClick={() => setPublicTabWithUrl("collection")}
            className={`rounded px-3 py-1.5 text-sm ${publicTab === "collection" ? "bg-emerald-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
          >
            {t("profile.tabCollection")}
          </button>
        </div>

        {publicTab !== "collection" ? (
          <div
            className={
              showPublicListTradeBasket
                ? "flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5"
                : ""
            }
          >
            <div className={showPublicListTradeBasket ? "min-w-0 lg:flex-[7]" : ""}>
              <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
                <div className="border-b border-gray-700 px-5 py-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                    {publicTab === "wishlist" ? t("profile.wishlistTab") : t("profile.tabSelling")}
                  </h2>
                </div>
                <div className="px-4 py-3">
                  {(publicTab === "wishlist" ? publicWishlist : publicForSale).length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500">
                      {publicTab === "wishlist" ? t("profile.noPublicWishlist") : t("profile.noPublicForSale")}
                    </p>
                  ) : publicTab === "selling" ? (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                      {publicForSale.map((item) => {
                        const cached = lookupCached(item.cardId, item.card?.scraperId);
                        const previewCard = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
                        const domains = getCardDomains(cached ?? item.card ?? undefined);
                        const maxRequested = item.quantity;
                        const requestedItem = showPublicListTradeBasket ? requestedBasket.get(item.cardId) : undefined;
                        const inRequested = !!requestedItem;
                        const atMaxRequested =
                          showPublicListTradeBasket &&
                          (maxRequested <= 0 || (requestedItem?.quantity ?? 0) >= maxRequested);
                        const cardForRequested =
                          showPublicListTradeBasket
                            ? ({
                                ...(item.card ?? cached),
                                id: item.cardId,
                              } as PublicProfileCard)
                            : null;
                        const imageUrl =
                          cached?.imageUrl ??
                          cached?.image_url ??
                          item.card?.imageUrl ??
                          item.card?.image_url ??
                          null;
                        const priceModeLabel =
                          item.priceMode && item.priceMode !== "numeric"
                            ? t("forSale.priceModeLabel")
                            : t("forSale.priceModeNumeric");
                        const priceValueLabel =
                          item.priceMode === "liga_minus_percent"
                            ? `Liga - ${item.pricePercent ?? 0}%`
                            : item.priceMode === "tcgplayer_minus_percent"
                              ? `TCGPlayer - ${item.pricePercent ?? 0}%`
                              : item.pricePerCard == null
                                ? t("profile.priceOnRequest")
                                : formatProfileListPrice(item.pricePerCard);
                        return (
                          <li
                            key={`${publicTab}-${item.cardId}`}
                            className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900/40"
                          >
                            <CardHoverPreview card={previewCard}>
                              <div className="relative aspect-[2.5/3.5] w-full overflow-hidden bg-gray-800">
                                {imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imageUrl} alt={item.card?.name ?? item.cardId} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-gray-500">{item.cardId}</div>
                                )}
                              </div>
                            </CardHoverPreview>
                            <div className="space-y-1 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <CardHoverPreview card={previewCard}>
                                  <span className="truncate text-sm font-medium text-blue-400">{item.card?.name ?? item.cardId}</span>
                                </CardHoverPreview>
                                <TradeOfferDomainIconsAndQty
                                  domains={domains}
                                  quantity={item.quantity}
                                  fallbackCard={cached ?? item.card ?? undefined}
                                />
                              </div>
                              <div
                                className={`mt-1 flex items-center gap-2 border-t border-gray-700/50 pt-1.5 ${
                                  item.priceMode && item.priceMode !== "numeric"
                                    ? "justify-end"
                                    : "justify-between"
                                }`}
                              >
                                {!(item.priceMode && item.priceMode !== "numeric") && (
                                  <span className="min-w-0 text-[11px] leading-tight text-gray-500">
                                    {priceModeLabel}
                                  </span>
                                )}
                                <span className="shrink-0 rounded border border-emerald-500/25 bg-emerald-950/45 px-2 py-1 text-right text-xs font-bold tabular-nums tracking-tight text-emerald-300 ring-1 ring-emerald-500/10">
                                  {priceValueLabel}
                                </span>
                              </div>
                              {showPublicListTradeBasket && cardForRequested && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addToRequestedBasket(
                                        cardForRequested,
                                        maxRequested,
                                        item.cardId,
                                        item.pricePerCard ?? null
                                      )
                                    }
                                    disabled={!!atMaxRequested || tradeActionsLocked}
                                    className={`flex w-full items-center justify-center rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                      atMaxRequested || tradeActionsLocked
                                        ? "border-amber-600/60 bg-amber-900/30 text-amber-400"
                                        : inRequested
                                          ? "border-blue-500 bg-blue-700/60 text-blue-300 hover:bg-blue-700"
                                          : "border-gray-700 bg-blue-800/40 text-blue-400 hover:bg-blue-700/60"
                                    }`}
                                    title={
                                      tradeActionsLocked
                                        ? t("trades.waitingBeforeTradeActions", { slug: user.slug })
                                        : atMaxRequested
                                          ? t("trades.maxQuantity", { count: maxRequested })
                                          : inRequested && requestedItem
                                            ? `${requestedItem.quantity}/${maxRequested}`
                                            : t("profile.addFromForSaleToBasket")
                                    }
                                    aria-label={t("profile.addFromForSaleToBasket")}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                      {publicWishlist.map((item) => {
                        const cached = lookupCached(item.cardId, item.card?.scraperId);
                        const previewCard = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
                        const domains = getCardDomains(cached ?? item.card ?? undefined);
                        const isWishlistOfferRow = showPublicListTradeBasket;
                        const myQtyForWishlist = myCollectionQtyMap.get(item.cardId) ?? 0;
                        const basketItemWishlist = isWishlistOfferRow ? basket.get(item.cardId) : undefined;
                        const inOfferBasket = !!basketItemWishlist;
                        const atMaxOfferWishlist =
                          isWishlistOfferRow &&
                          (myQtyForWishlist <= 0 ||
                            (basketItemWishlist?.quantity ?? 0) >= myQtyForWishlist);
                        const cardForOfferFromWishlist =
                          isWishlistOfferRow
                            ? ({
                                ...(item.card ?? cached),
                                id: item.cardId,
                              } as PublicProfileCard)
                            : null;
                        const imageUrl =
                          cached?.imageUrl ??
                          cached?.image_url ??
                          item.card?.imageUrl ??
                          item.card?.image_url ??
                          null;
                        return (
                          <li
                            key={`${publicTab}-${item.cardId}`}
                            className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900/40"
                          >
                            <CardHoverPreview card={previewCard}>
                              <div className="relative aspect-[2.5/3.5] w-full overflow-hidden bg-gray-800">
                                {imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imageUrl} alt={item.card?.name ?? item.cardId} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-gray-500">{item.cardId}</div>
                                )}
                              </div>
                            </CardHoverPreview>
                            <div className="space-y-1 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <CardHoverPreview card={previewCard}>
                                  <span className="truncate text-sm font-medium text-blue-400">{item.card?.name ?? item.cardId}</span>
                                </CardHoverPreview>
                                <TradeOfferDomainIconsAndQty
                                  domains={domains}
                                  quantity={item.quantity}
                                  fallbackCard={cached ?? item.card ?? undefined}
                                />
                              </div>
                              {isWishlistOfferRow && cardForOfferFromWishlist && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      addToBasket(cardForOfferFromWishlist, myQtyForWishlist, item.cardId)
                                    }
                                    disabled={!!atMaxOfferWishlist || tradeActionsLocked}
                                    className={`flex w-full items-center justify-center rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                      atMaxOfferWishlist || tradeActionsLocked
                                        ? "border-amber-600/60 bg-amber-900/30 text-amber-400"
                                        : inOfferBasket
                                          ? "border-green-500 bg-green-700/60 text-green-300 hover:bg-green-700"
                                          : "border-gray-700 bg-green-800/40 text-green-400 hover:bg-green-700/60"
                                    }`}
                                    title={
                                      tradeActionsLocked
                                        ? t("trades.waitingBeforeTradeActions", { slug: user.slug })
                                        : atMaxOfferWishlist
                                          ? myQtyForWishlist <= 0
                                            ? t("profile.offerWishlistNotInCollection")
                                            : t("trades.maxQuantity", { count: myQtyForWishlist })
                                          : inOfferBasket && basketItemWishlist
                                            ? `${basketItemWishlist.quantity}/${myQtyForWishlist}`
                                            : t("profile.addWishlistToOfferBasket")
                                    }
                                    aria-label={t("profile.addWishlistToOfferBasket")}
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            {showPublicListTradeBasket && (
              <div className="hidden self-start lg:block lg:flex-[3]">
                <div className="sticky top-[73px]">
                  <BasketPanel
                    basket={basket}
                    recipientSlug={user.slug}
                    recipientDisplayName={user.displayName}
                    mySlug={me!.slug}
                    onUpdateQty={updateBasketQty}
                    onRemove={removeFromBasket}
                    requestedBasket={!activeTrade || tradeIsMyTurn ? requestedBasket : undefined}
                    onUpdateRequestedQty={!activeTrade || tradeIsMyTurn ? updateRequestedBasketQty : undefined}
                    onRemoveRequested={!activeTrade || tradeIsMyTurn ? removeFromRequestedBasket : undefined}
                    onUpdateDeclaredValue={updateBasketDeclaredValue}
                    onUpdateRequestedDeclaredValue={updateRequestedDeclaredValue}
                    cardCacheMap={cardCacheMap}
                    scraperIdMap={scraperIdMap}
                    activeTrade={activeTrade}
                    activeTradeDetail={activeTradeDetail}
                    isMyTurn={tradeIsMyTurn}
                    onCounterSubmitError={handleCounterSubmitError}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
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
                          onClick={() => setCollectionTab("tradeDirect")}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            collectionTab === "tradeDirect" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          {t("profile.tabTradeDirect")}
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
                  {showTradePanel && (
                    <Link
                      href="/trades"
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      {t("trades.viewTrades")}
                    </Link>
                  )}
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
                {showTradePanel && collectionTab === "tradeDirect" && !matchLoading && (publicCollection.length > 0 || filteredMyTradeCollection.length > 0) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {t("trades.tradeSideCards", { slug: user.slug, count: filteredCollection.length })}
                    {" · "}
                    {t("trades.tradeSideCards", { slug: me?.slug ?? "", count: filteredMyTradeCollection.length })}
                  </p>
                )}
                {((showTradePanel && collectionTab === "collection" && publicCollection.length > 0) ||
                  (showTradePanel && collectionTab === "tradeDirect" && (publicCollection.length > 0 || filteredMyTradeCollection.length > 0)) ||
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
                          {tradeActionsLocked && (
                            <div
                              className="flex items-start gap-2.5 rounded-lg border border-amber-500/45 bg-gradient-to-r from-amber-950/90 via-amber-950/70 to-amber-900/35 px-3 py-2.5 shadow-[0_0_24px_-10px_rgba(251,191,36,0.45)]"
                              role="status"
                            >
                              <span className="mt-1.5 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" aria-hidden />
                              <div className="min-w-0">
                                <p className="text-sm font-bold leading-snug text-amber-100">
                                  {t("trades.waitingFor", { slug: user.slug })}
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                                  {t("trades.waitingForBasketHint")}
                                </p>
                              </div>
                            </div>
                          )}
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
                                          const cached = lookupCached(item.cardId, item.card?.scraperId);
                                          const previewCard = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
                                          const domains = getCardDomains(cached ?? item.card);
                                          const rarityIcon = getRarityIcon(item.card?.rarity);
                                          return (
                                            <li key={item.cardId} className="relative flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                              <CardHoverPreview card={previewCard}>
                                                <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                                  <TradeOfferDomainIconsAndQty
                                                    domains={domains}
                                                    quantity={item.quantity}
                                                    fallbackCard={cached ?? item.card}
                                                  />
                                                  <span className="truncate text-blue-400">{item.card?.name ?? item.cardId}</span>
                                                  {rarityIcon && (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={rarityIcon} alt={item.card?.rarity ?? ""} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
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
                ) : collectionTab === "tradeDirect" ? (
                  filteredCollection.length === 0 && filteredMyTradeCollection.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-sm text-gray-500">{t("profile.noCardsMatchSearchGeneric")}</p>
                    </div>
                  ) : (
                  <div className="px-4 py-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-w-0">
                      {filteredCollection.length > 0 && (
                        <div className="min-w-0 flex flex-col">
                          <h3 className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/30 px-3 py-2 text-sm font-bold uppercase tracking-wider text-blue-200">
                            <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-400" aria-hidden />
                            {t("trades.tradeSideCards", { slug: user.slug, count: filteredCollection.length })}
                          </h3>
                          <ul className="space-y-0.5 pl-2">
                            {sortedTradeDirectPublic.map((item) => {
                              const maxRequested = item.quantity;
                              const requestedItem = requestedBasket.get(item.cardId);
                              const inRequested = !!requestedItem;
                              const atMaxRequested =
                                maxRequested <= 0 ||
                                (requestedItem?.quantity ?? 0) >= maxRequested;
                              const cached = lookupCached(item.cardId, item.card?.scraperId);
                              const previewCard = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
                              const domains = getCardDomains(cached ?? item.card);
                              const unitPriceUsd = getCardTcgUnitPriceUsd(previewCard);
                              const cardForRequested = {
                                ...(item.card ?? cached),
                                id: item.cardId,
                              } as PublicProfileCard;
                              return (
                                <li key={item.cardId} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                  <CardHoverPreview card={previewCard}>
                                    <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                      <TradeOfferDomainIconsAndQty
                                        domains={domains}
                                        quantity={item.quantity}
                                        fallbackCard={cached ?? item.card}
                                      />
                                      <span className="truncate text-blue-400">{item.card?.name ?? item.cardId}</span>
                                      <span className="ml-0.5 shrink-0 text-[10px] font-medium tabular-nums text-emerald-400/90">
                                        {unitPriceUsd != null ? formatUsd(unitPriceUsd) : "—"}
                                      </span>
                                    </span>
                                  </CardHoverPreview>
                                  <button
                                    type="button"
                                    onClick={() => addToRequestedBasket(cardForRequested, maxRequested, item.cardId)}
                                    disabled={atMaxRequested || tradeActionsLocked}
                                    className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMaxRequested || tradeActionsLocked ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inRequested ? "border-blue-500 bg-blue-700/60 text-blue-300 hover:bg-blue-700" : "border-gray-700 bg-blue-800/40 text-blue-400 hover:bg-blue-700/60"}`}
                                    title={
                                      tradeActionsLocked
                                        ? t("trades.waitingBeforeTradeActions", { slug: user.slug })
                                        : atMaxRequested
                                          ? t("trades.maxQuantity", { count: maxRequested })
                                          : inRequested && requestedItem
                                            ? `${requestedItem.quantity}/${maxRequested}`
                                            : t("trades.requestOne")
                                    }
                                    aria-label={t("trades.requestOne")}
                                  >
                                    +
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {filteredMyTradeCollection.length > 0 && (
                        <div className="min-w-0 flex flex-col">
                          <h3 className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm font-bold uppercase tracking-wider text-emerald-200">
                            <span className="flex h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                            {t("trades.tradeSideCards", { slug: me?.slug ?? "", count: filteredMyTradeCollection.length })}
                          </h3>
                          <ul className="space-y-0.5 pl-2">
                            {sortedTradeDirectMine.map((card) => {
                              const cardId = getCardId(card);
                              const myQty = myCollectionQtyMap.get(cardId) ?? 0;
                              const basketItem = basket.get(cardId);
                              const inBasket = !!basketItem;
                              const atMax = myQty <= 0 || (basketItem?.quantity ?? 0) >= myQty;
                              const previewCard = mergePublicProfileCardWithCatalog(card, card, cardId);
                              const domains = getCardDomains(card);
                              const unitPriceUsd = getCardTcgUnitPriceUsd(previewCard);
                              const cardForBasket = { ...card, id: cardId } as PublicProfileCard;
                              return (
                                <li key={cardId} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                  <CardHoverPreview card={previewCard}>
                                    <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                      <TradeOfferDomainIconsAndQty domains={domains} quantity={myQty} fallbackCard={card} />
                                      <span className="truncate text-blue-400">{card.name ?? cardId}</span>
                                      <span className="ml-0.5 shrink-0 text-[10px] font-medium tabular-nums text-emerald-400/90">
                                        {unitPriceUsd != null ? formatUsd(unitPriceUsd) : "—"}
                                      </span>
                                    </span>
                                  </CardHoverPreview>
                                  <button
                                    type="button"
                                    onClick={() => addToBasket(cardForBasket, myQty, cardId)}
                                    disabled={atMax || tradeActionsLocked}
                                    className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMax || tradeActionsLocked ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inBasket ? "border-green-500 bg-green-700/60 text-green-300 hover:bg-green-700" : "border-gray-700 bg-green-800/40 text-green-400 hover:bg-green-700/60"}`}
                                    title={
                                      tradeActionsLocked
                                        ? t("trades.waitingBeforeTradeActions", { slug: user.slug })
                                        : atMax
                                          ? t("trades.maxQuantity", { count: myQty })
                                          : inBasket && basketItem
                                            ? `${basketItem.quantity}/${myQty}`
                                            : t("trades.offerOne")
                                    }
                                    aria-label={t("trades.offerOne")}
                                  >
                                    +
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
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
                    {tradeActionsLocked && (
                      <div
                        className="mb-3 flex items-start gap-2.5 rounded-lg border border-amber-500/45 bg-gradient-to-r from-amber-950/90 via-amber-950/70 to-amber-900/35 px-3 py-2.5 shadow-[0_0_24px_-10px_rgba(251,191,36,0.45)]"
                        role="status"
                      >
                        <span className="mt-1.5 flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-sm font-bold leading-snug text-amber-100">
                            {t("trades.waitingFor", { slug: user.slug })}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                            {t("trades.waitingForBasketHint")}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-w-0">
                      {/* Coluna esquerda: Cartas que @fulano tem que eu não tenho (match) */}
                      {match.length > 0 && (
                      <div className="min-w-0 flex flex-col">
                        <h3 className="mb-3 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-950/30 px-3 py-2 text-sm font-bold uppercase tracking-wider text-blue-200">
                          <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-400" aria-hidden />
                          {t("profile.cardsTheyHaveINeed", { slug: user.slug })}
                        </h3>
                        <div className="min-h-0">
                          <ul className="space-y-0.5 pl-2">
                            {sortedPredictiveMatch.map((item) => {
                              const cardData = item.card;
                              if (!cardData) return null;
                              const maxRequested = item.need ?? item.theirQuantity;
                              const requestedItem = requestedBasket.get(item.cardId);
                              const inRequested = !!requestedItem;
                              const atMaxRequested =
                                maxRequested <= 0 ||
                                (requestedItem?.quantity ?? 0) >= maxRequested;
                              const cached = lookupCached(item.cardId, cardData.scraperId);
                              const previewCard = mergePublicProfileCardWithCatalog(cardData, cached, item.cardId);
                              const domains = getCardDomains(cached);
                              const unitPriceUsd = getCardTcgUnitPriceUsd(previewCard);
                              const cardForRequested = { ...cardData, id: item.cardId } as PublicProfileCard;
                              return (
                                <li key={item.cardId} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                  <CardHoverPreview card={previewCard}>
                                    <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                      <TradeOfferDomainIconsAndQty
                                        domains={domains}
                                        quantity={item.theirQuantity}
                                        fallbackCard={cached ?? cardData}
                                      />
                                      <span className="truncate text-blue-400">{cardData.name}</span>
                                      <span className="ml-0.5 shrink-0 text-[10px] font-medium tabular-nums text-emerald-400/90">
                                        {unitPriceUsd != null ? formatUsd(unitPriceUsd) : "—"}
                                      </span>
                                    </span>
                                  </CardHoverPreview>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => addToRequestedBasket(cardForRequested, maxRequested, item.cardId)}
                                      disabled={atMaxRequested || tradeActionsLocked}
                                      className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMaxRequested || tradeActionsLocked ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inRequested ? "border-blue-500 bg-blue-700/60 text-blue-300 hover:bg-blue-700" : "border-gray-700 bg-blue-800/40 text-blue-400 hover:bg-blue-700/60"}`}
                                      title={
                                        tradeActionsLocked
                                          ? t("trades.waitingBeforeTradeActions", { slug: user.slug })
                                          : atMaxRequested
                                            ? t("trades.maxQuantity", { count: maxRequested })
                                            : inRequested && requestedItem
                                              ? `${requestedItem.quantity}/${maxRequested}`
                                              : t("trades.requestOne")
                                      }
                                      aria-label={t("trades.requestOne")}
                                    >
                                      +
                                    </button>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
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
                        <div className="min-h-0">
                          <ul className="space-y-0.5 pl-2">
                            {sortedPredictiveOfferable.map((item) => {
                              const animKeys = addAnimations.get(item.cardId) ?? [];
                              const basketItem = basket.get(item.cardId);
                              const inBasket = !!basketItem;
                              const atMax =
                                item.canOffer <= 0 ||
                                (basketItem?.quantity ?? 0) >= item.canOffer;
                              const cached = lookupCached(item.cardId, item.card?.scraperId);
                              const card = item.card ?? cached;
                              if (!card) return null;
                              const previewCard = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
                              const domains = getCardDomains(cached ?? item.card ?? undefined);
                              const unitPriceUsd = getCardTcgUnitPriceUsd(previewCard);
                              const cardForBasket = { ...card, id: item.cardId } as PublicProfileCard;
                              return (
                                <li key={item.cardId} className="relative flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                  {animKeys.map((key, i) => (
                                    <div key={key} className="pointer-events-none absolute inset-0 z-10">
                                      <div className="animate-card-added absolute inset-0 rounded bg-green-400/20 ring-1 ring-green-500/40" />
                                      <div className="animate-plus-one absolute right-10 flex" style={{ top: `calc(50% - ${i * 16}px - 10px)` }}>
                                        <span className="rounded-full bg-green-500 px-1.5 py-0.5 text-xs font-bold text-white shadow">+1</span>
                                      </div>
                                    </div>
                                  ))}
                                  <CardHoverPreview card={previewCard}>
                                    <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                      <TradeOfferDomainIconsAndQty domains={domains} quantity={item.myQuantity} fallbackCard={card} />
                                      <span className="truncate text-blue-400">{(card as { name?: string | null }).name ?? item.cardId}</span>
                                      <span className="ml-0.5 shrink-0 text-[10px] font-medium tabular-nums text-emerald-400/90">
                                        {unitPriceUsd != null ? formatUsd(unitPriceUsd) : "—"}
                                      </span>
                                    </span>
                                  </CardHoverPreview>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => addToBasket(cardForBasket, item.canOffer, item.cardId)}
                                      disabled={atMax || tradeActionsLocked}
                                      className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${atMax || tradeActionsLocked ? "border-amber-600/60 bg-amber-900/30 text-amber-400" : inBasket ? "border-green-500 bg-green-700/60 text-green-300 hover:bg-green-700" : "border-gray-700 bg-green-800/40 text-green-400 hover:bg-green-700/60"}`}
                                      title={
                                        tradeActionsLocked
                                          ? t("trades.waitingBeforeTradeActions", { slug: user.slug })
                                          : atMax
                                            ? t("trades.maxQuantity", { count: item.canOffer })
                                            : inBasket && basketItem
                                              ? `${basketItem.quantity}/${item.canOffer}`
                                              : t("trades.offerOne")
                                      }
                                      aria-label={t("trades.offerOne")}
                                    >
                                      +
                                    </button>
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
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
                                        const cached = lookupCached(item.cardId, item.card.scraperId);
                                        const previewCard = mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
                                        const domains = getCardDomains(cached);
                                        const rarityIcon = getRarityIcon(item.card.rarity);
                                        return (
                                          <li key={item.cardId} className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-gray-700/40">
                                            <CardHoverPreview card={previewCard}>
                                              <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                                <TradeOfferDomainIconsAndQty
                                                  domains={domains}
                                                  quantity={item.quantity}
                                                  fallbackCard={cached ?? item.card}
                                                />
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
                    mySlug={me.slug}
                    onUpdateQty={updateBasketQty}
                    onRemove={removeFromBasket}
                    requestedBasket={!activeTrade || tradeIsMyTurn ? requestedBasket : undefined}
                    onUpdateRequestedQty={!activeTrade || tradeIsMyTurn ? updateRequestedBasketQty : undefined}
                    onRemoveRequested={!activeTrade || tradeIsMyTurn ? removeFromRequestedBasket : undefined}
                    onUpdateDeclaredValue={updateBasketDeclaredValue}
                    onUpdateRequestedDeclaredValue={updateRequestedDeclaredValue}
                    cardCacheMap={cardCacheMap}
                    scraperIdMap={scraperIdMap}
                    activeTrade={activeTrade}
                    activeTradeDetail={activeTradeDetail}
                    isMyTurn={tradeIsMyTurn}
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
        )}

        <div className="mt-6">
          <BackLink href="/" label={t("back.home")} className="" />
        </div>
      </div>

      {/* Mobile: floating basket or register-to-trade button */}
      {((showTradePanel && publicTab === "collection") || showPublicListTradeBasket) && (
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
          {totalTradeBasketCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-emerald-700">
              {totalTradeBasketCount}
            </span>
          )}
        </button>
      )}
      {showTradeCTA && publicTab === "collection" && (
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
