"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BackLink } from "@/components/layout/BackLink";
import { useEffect, useMemo, useState } from "react";
import { getPublicProfile, getProfileMatch } from "@/lib/profile";
import { createTrade, listTrades, addTradeItem, updateTradeItem, removeTradeItem, submitTrade, getTrade } from "@/lib/trades";
import type { TradeSummary, Trade, TradeItem } from "@/types/trade";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { useAuth } from "@/lib/auth-context";
import { useCards } from "@/lib/cards-context";
import type { PublicUser, MatchItem, PublicProfileCard } from "@/types/auth";
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
function getRarityIcon(rarity?: string): string | null {
  if (!rarity) return null;
  const key = rarity.toLowerCase().replace(/\s+/g, "");
  // "overnumbered" was renamed to "showcase"
  const normalized = key === "overnumbered" ? "showcase" : key;
  const known = ["common", "uncommon", "rare", "epic", "showcase"];
  return known.includes(normalized) ? `/images/rarities/${normalized}.svg` : null;
}

/* ─── Domain helper ─────────────────────────────────── */
function getCardDomains(card: { domain?: string; domains?: string[]; cardDomains?: { domain: { name: string } }[] } | undefined): string[] {
  if (!card) return [];
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if (card.domains) result.push(...card.domains.map((d) => d.toLowerCase()));
  if (card.cardDomains) result.push(...card.cardDomains.map((cd) => cd.domain.name.toLowerCase()));
  return [...new Set(result)];
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

function groupCardsBySetAndType<T extends { card: PublicProfileCard }>(items: T[]) {
  const bySet = new Map<string, Map<string, T[]>>();
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
  /** If set, submitting adds items to this trade and submits counter instead of creating a new trade */
  activeTrade?: TradeSummary | null;
  /** Full trade detail used to show what the other player already requested */
  activeTradeDetail?: Trade | null;
  /** Whether it's the current user's turn to act on activeTrade */
  isMyTurn?: boolean;
  /** Map of cardUuid → existing TradeItem for my side of the active trade (for diff on submit) */
  originalItemsMap?: Map<string, TradeItem>;
}

function BasketPanel({ basket, recipientSlug, recipientDisplayName, onUpdateQty, onRemove, onClear, cardCacheMap, scraperIdMap, activeTrade, activeTradeDetail, isMyTurn, originalItemsMap }: BasketPanelProps & { cardCacheMap: Map<string, Card>; scraperIdMap: Map<string, Card> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = useMemo(() => [...basket.values()], [basket]);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);
  const hasActiveTrade = !!activeTrade;
  const isCounterMode = hasActiveTrade && !!isMyTurn;

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
        // Diff basket against original items:
        // 1. Remove items that existed before but are no longer in basket
        if (originalItemsMap) {
          for (const [uuid, original] of originalItemsMap) {
            if (!basket.has(uuid)) {
              await removeTradeItem(activeTrade.id, original.id);
            }
          }
        }
        // 2. Update changed quantities or add new items
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
        await submitTrade(activeTrade.id);
        router.push(`/trades/${activeTrade.id}`);
      } else {
        const trade = await createTrade({
          recipientSlug,
          items: items.map((i) => ({ cardId: i.card.uuid, quantity: i.quantity })),
          ...(message.trim() ? { message: message.trim() } : {}),
        });
        router.push(`/trades/${trade.id}`);
      }
    } catch {
      setError(isCounterMode ? "Failed to submit counter offer. Please try again." : "Failed to create trade. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {isCounterMode ? "Counter offer" : hasActiveTrade ? "Open trade" : "Request trade"}
          </p>
          <p className="text-xs text-gray-400">
            {recipientDisplayName ?? `@${recipientSlug}`}
            {recipientDisplayName && <span className="ml-1 text-gray-600">@{recipientSlug}</span>}
          </p>
          {isCounterMode && (
            <p className="mt-0.5 text-[11px] text-amber-400/80">
              Add cards and submit your counter
            </p>
          )}
          {hasActiveTrade && !isMyTurn && (
            <p className="mt-0.5 text-[11px] text-gray-500">
              Waiting for @{recipientSlug} to respond
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-gray-600 hover:text-red-400">
            Clear all
          </button>
        )}
      </div>

      {/* What the other player already requested — shown whenever there's an active trade */}
      {hasActiveTrade && theirRequestedItems.length > 0 && (
        <div className="border-b border-gray-700 px-3 py-2">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            @{recipientSlug} asked for ({theirRequestedItems.length})
          </p>
          <ul className="space-y-1">
            {theirRequestedItems.map((item) => {
              const cached = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
              const cardForPreview = (cached ?? item.card) as unknown as Card;
              const name = cached?.name ?? item.card?.name ?? item.cardId;
              const domains = getCardDomains(cached ?? item.card);
              const rarity = (cached?.rarity ?? item.card?.rarity ?? "").toLowerCase().replace(/\s+/g, "");
              const rarityNorm = rarity === "overnumbered" ? "showcase" : rarity;
              return (
                <li key={item.id} className="flex items-center gap-1.5 py-0.5">
                  <span className="text-xs text-gray-400 tabular-nums">×{item.quantity}</span>
                  <CardHoverPreview card={cardForPreview}>
                    <span className="flex min-w-0 cursor-default items-center gap-1">
                      <span className="flex gap-0.5">
                        {domains.map((d) => (
                          <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-3.5 w-3.5 object-contain" />
                        ))}
                      </span>
                      <span className="truncate text-xs text-blue-400">{name}</span>
                      {rarityNorm && (
                        <img src={`/images/rarities/${rarityNorm}.svg`} alt={rarityNorm} className="h-3 w-3 shrink-0 opacity-60" />
                      )}
                    </span>
                  </CardHoverPreview>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* My basket items — only shown when I can act (or no active trade) */}
      <div className={`flex-1 overflow-y-auto px-3 py-2 ${hasActiveTrade && !isMyTurn ? "hidden" : ""}`}>
        {items.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-medium text-gray-500">
              {isCounterMode ? `Add cards you want from @${recipientSlug}` : "Your request is empty"}
            </p>
            <p className="mt-1 text-[11px] text-gray-600">
              Click <strong className="text-gray-500">+</strong> on any card to add it here
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
                                  {domains.map((d) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                  ))}
                                  <span className="shrink-0 tabular-nums text-gray-500">×{quantity}</span>
                                  <span className="truncate text-blue-400">{card.name}</span>
                                  {rarityIcon && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={rarityIcon} alt={card.rarity} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                  )}
                                </span>
                              </CardHoverPreview>
                              <span className="flex shrink-0 items-center gap-0.5">
                                <button type="button" onClick={() => onUpdateQty(card.uuid, quantity - 1)} className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600" aria-label="Decrease">−</button>
                                <span className={`w-8 text-center text-[10px] font-bold tabular-nums ${atMax ? "text-amber-400" : "text-gray-400"}`}>{quantity}/{maxQty}</span>
                                <button type="button" onClick={() => onUpdateQty(card.uuid, quantity + 1)} disabled={atMax} className="flex h-5 w-5 items-center justify-center rounded bg-gray-700 text-xs text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Increase">+</button>
                                <button type="button" onClick={() => onRemove(card.uuid)} className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-gray-600 hover:bg-red-900/40 hover:text-red-400" aria-label="Remove">×</button>
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
            View trade
          </a>
        ) : (
          <>
            {items.length > 0 && (
              <p className="text-center text-xs text-gray-500">
                {items.length} type{items.length !== 1 ? "s" : ""} · {totalQty} card{totalQty !== 1 ? "s" : ""} total
              </p>
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              disabled={submitting}
              placeholder="Add a message… (optional)"
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
                  {isCounterMode ? "Submitting counter…" : "Creating…"}
                </>
              ) : isCounterMode ? "Submit counter offer →" : "Send Trade →"}
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
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { user: me, loading: authLoading } = useAuth();
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
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchLoaded, setMatchLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [onlyMissing, setOnlyMissing] = useState(false);

  /* ── Active trade (for counter-offer flow) ─── */
  const [activeTrade, setActiveTrade] = useState<TradeSummary | null>(null);
  const [activeTradeDetail, setActiveTradeDetail] = useState<Trade | null>(null);

  // When viewing another user's profile, check for any active trade between us
  useEffect(() => {
    if (!me || !user || me.slug === user.slug) return;
    // Fetch all trades without status filter — match on frontend to avoid case issues
    listTrades()
      .then((all) => {
        const found = all.find(
          (t) =>
            (t.status === "PENDING" || t.status === "COUNTERED") &&
            (
              (t.initiatorSlug === me.slug && t.recipientSlug === user.slug) ||
              (t.initiatorSlug === user.slug && t.recipientSlug === me.slug)
            )
        );
        setActiveTrade(found ?? null);
        if (found) {
          getTrade(found.id)
            .then((detail) => setActiveTradeDetail(detail))
            .catch(() => {});
        } else {
          setActiveTradeDetail(null);
        }
      })
      .catch(() => {});
  }, [me, user]);

  /* ── Trade basket ──────────────────────────── */
  const [basket, setBasket] = useState<Map<string, BasketItem>>(new Map());

  // Pre-populate basket with my existing items when entering counter mode.
  // Wait for match data so we can resolve the correct maxQty (theirQuantity).
  useEffect(() => {
    if (!activeTradeDetail || !activeTrade || !me) return;
    // If match is expected (not own profile) but not yet loaded, wait
    if (matchLoading) return;
    const myItems =
      activeTrade.initiatorSlug === me.slug
        ? activeTradeDetail.initiatorItems ?? []
        : activeTradeDetail.recipientItems ?? [];
    if (myItems.length === 0) return;
    // Build a quick lookup: cardUuid → theirQuantity
    const matchQtyMap = new Map(match.map((m) => [m.cardUuid, m.theirQuantity]));
    setBasket(
      new Map(
        myItems.map((item) => {
          const card = item.card as PublicProfileCard;
          const uuid = card.uuid ?? item.cardId;
          // Use theirQuantity from match, fallback to item.quantity so it's never less than current
          const maxQty = matchQtyMap.get(uuid) ?? item.quantity;
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
  // Re-run when detail or match finishes loading
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTradeDetail?.id, me?.slug, matchLoading]);
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
      .then((data) => { if (!cancelled) { setMatch(data); setMatchLoaded(true); } })
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
      if (item.card.name.toLowerCase().includes(q)) return true;
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
      if (onlyMissing && item.myQuantity > 0) return false;
      if (selectedRarities.length > 0) {
        const raw = item.card.rarity?.toLowerCase().replace(/\s+/g, "") ?? "";
        const r = raw === "overnumbered" ? "showcase" : raw;
        if (!selectedRarities.includes(r)) return false;
      }
      if (!q) return true;
      return item.card.name.toLowerCase().includes(q);
    });
  }, [match, search, selectedRarities, onlyMissing]);

  const groupedCollection = useMemo(
    () => groupCardsBySetAndType(filteredCollection),
    [filteredCollection]
  );

  const groupedMatch = useMemo(
    () => groupCardsBySetAndType(filteredMatch),
    [filteredMatch]
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
          <h1 className="mb-2 text-2xl font-bold text-white">User not found</h1>
          <p className="mb-6 text-gray-400">
            There is no profile for &quot;{slug}&quot; or the address is invalid.
          </p>
          <Link href="/" className="inline-block rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = me?.slug === slug;
  const showTradePanel = !!me && !isOwnProfile;
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
              <h2 className="text-base font-semibold text-white">{activeTrade ? "Counter offer" : "Request trade"}</h2>
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
              cardCacheMap={cardCacheMap}
              scraperIdMap={scraperIdMap}
              activeTrade={activeTrade}
              activeTradeDetail={activeTradeDetail}
              isMyTurn={tradeIsMyTurn}
              originalItemsMap={originalItemsMap}
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

              {/* Section header */}
              <div className="border-b border-gray-700 px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Collection</h2>
                    {showTradePanel ? (
                      !matchLoading && match.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {filteredMatch.length} of {match.length} card{match.length !== 1 ? "s" : ""}
                          <span className="ml-2 text-gray-600">· Click <span className="font-bold text-gray-500">+</span> to add to trade</span>
                        </p>
                      )
                    ) : (
                      publicCollection.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {filteredCollection.length} of {publicCollection.length} card{publicCollection.length !== 1 ? "s" : ""}
                        </p>
                      )
                    )}
                  </div>
                </div>
                {(showTradePanel ? (!matchLoading && match.length > 0) : publicCollection.length > 0) && (
                  <div className="mt-3 space-y-2">
                    <input
                      type="search"
                      placeholder="Search by name…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      {/* Rarity toggles */}
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
                            clear
                          </button>
                        )}
                      </div>

                      {/* Only missing toggle — only for trade match view */}
                      {showTradePanel && (
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
                          Missing only
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cards */}
              {showTradePanel ? (
                /* ── Match view (logged in, other's profile) ── */
                matchLoading ? (
                  <ul className="space-y-1.5 p-4">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <li key={i} className="h-6 animate-pulse rounded bg-gray-700" />
                    ))}
                  </ul>
                ) : filteredMatch.length > 0 ? (
                  <div className="px-4 py-3">
                    {search && match.length > 0 && (
                      <p className="mb-2 text-xs text-gray-500">{filteredMatch.length} of {match.length} matching &quot;{search}&quot;</p>
                    )}
                    <div className="space-y-4">
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
                                      const animKeys = addAnimations.get(item.cardUuid) ?? [];
                                      const basketItem = basket.get(item.cardUuid);
                                      const inBasket = !!basketItem;
                                      const atMax = inBasket && basketItem.quantity >= item.theirQuantity;
                                      const cached = lookupCached(item.cardUuid, item.card.scraperId);
                                      const domains = getCardDomains(cached);
                                      const rarityIcon = getRarityIcon(item.card.rarity);
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
                                          <CardHoverPreview card={item.card as unknown as Card}>
                                            <span className="flex min-w-0 cursor-default items-center gap-1.5 text-sm">
                                              {domains.map((d) => (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                              ))}
                                              <span className="shrink-0 tabular-nums text-emerald-500">×{item.theirQuantity}</span>
                                              <span className="truncate text-blue-400">{item.card.name}</span>
                                              {rarityIcon && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={rarityIcon} alt={item.card.rarity} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
                                              )}
                                            </span>
                                          </CardHoverPreview>
                                          <span className="flex shrink-0 items-center gap-2">
                                            <span className="text-[10px] tabular-nums text-gray-600">mine ×{item.myQuantity}</span>
                                            <button
                                              type="button"
                                              onClick={() => addToBasket(item.card, item.theirQuantity)}
                                              disabled={atMax}
                                              className={`flex size-6 shrink-0 items-center justify-center rounded border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                                                atMax ? "border-amber-600/60 bg-amber-900/30 text-amber-400"
                                                : inBasket ? "border-green-500 bg-green-700/60 text-green-300 hover:bg-green-700"
                                                : "border-green-700 bg-green-800/40 text-green-400 hover:bg-green-700/60"
                                              }`}
                                              title={atMax ? `Max (${item.theirQuantity})` : inBasket ? `${basketItem!.quantity}/${item.theirQuantity}` : "Add to trade"}
                                              aria-label="Add to trade"
                                            >
                                              <IconPlus className="size-3" />
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
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-sm text-gray-500">
                      {search
                        ? `No cards match "${search}".`
                        : <>No cards found — <span className="font-medium text-gray-300">@{user.slug}</span> has no cards you could trade for.</>
                      }
                    </p>
                  </div>
                )
              ) : (
                /* ── Own profile or unauthenticated: show full public collection ── */
                publicCollection.length > 0 ? (
                  <div className="px-4 py-3">
                    {filteredCollection.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-500">No cards match your search.</p>
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
                                                {domains.map((d) => (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img key={d} src={`/images/domains/${d}.webp`} alt={d} className="h-4 w-4 shrink-0 object-contain" />
                                                ))}
                                                <span className="shrink-0 tabular-nums text-gray-500">×{item.quantity}</span>
                                                <span className="truncate text-blue-400">{item.card.name}</span>
                                                {rarityIcon && (
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img src={rarityIcon} alt={item.card.rarity} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" />
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
                    <p className="text-sm text-gray-500">No public collection to show.</p>
                  </div>
                )
              )}

            </div>
          </div>

          {/* Right: sticky trade basket (desktop only) */}
          {showTradePanel && (
            <div className="hidden self-start md:block md:flex-[3]">
              <div className="sticky top-[73px]">
                <BasketPanel
                  basket={basket}
                  recipientSlug={user.slug}
                  recipientDisplayName={user.displayName}
                  onUpdateQty={updateBasketQty}
                  onRemove={removeFromBasket}
                  onClear={clearBasket}
                  cardCacheMap={cardCacheMap}
                  scraperIdMap={scraperIdMap}
                  activeTrade={activeTrade}
                  activeTradeDetail={activeTradeDetail}
                  isMyTurn={tradeIsMyTurn}
                  originalItemsMap={originalItemsMap}
                />
              </div>
            </div>
          )}
        </div>

        {!me && !isOwnProfile && (
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/50 px-5 py-4 text-sm text-gray-400">
            <Link href="/login" className="font-medium text-emerald-400 hover:underline">Log in</Link>{" "}
            to see which cards from this collection you could trade for.
          </div>
        )}

        <div className="mt-6">
          <BackLink href="/" label="Home" className="" />
        </div>
      </div>

      {/* Mobile: floating basket button (both tabs) */}
      {showTradePanel && (
        <button
          type="button"
          onClick={() => setBasketDrawerOpen(true)}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl transition hover:bg-emerald-500 md:hidden"
          aria-label="Open trade basket"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
          </svg>
          Trade
          {basketCount > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-emerald-700">
              {basketCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
