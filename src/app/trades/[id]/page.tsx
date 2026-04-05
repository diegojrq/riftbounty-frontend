"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getTrade,
  addTradeItem,
  sendTradeMessage,
  submitTrade,
  acceptTrade,
  rejectTrade,
  cancelTrade,
} from "@/lib/trades";
import { CardPickerModal } from "@/components/decks/CardPickerModal";
import { BackLink } from "@/components/layout/BackLink";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { TradeOfferDomainIconsAndQty } from "@/components/trades/TradeQuantityBadge";
import { useLocale } from "@/lib/locale-context";
import type { Trade, TradeItem, TradeStatus } from "@/types/trade";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";
import { useCards } from "@/lib/cards-context";
import { mergePublicProfileCardWithCatalog } from "@/lib/cards";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import { getCardDomains, getRarityIcon, groupTradeItemsBySetAndType } from "@/lib/trade-offer-grouping";
import { formatDeclaredValueBrl, mergeAggregatedDeclaredValue } from "@/lib/trade-declared-value";

/* ─── helpers ─────────────────────────────────────── */

const STATUS_COLOR: Record<TradeStatus, string> = {
  PENDING: "border-amber-700 bg-amber-900/30 text-amber-400",
  COUNTERED: "border-blue-700 bg-blue-900/30 text-blue-400",
  ACCEPTED: "border-emerald-700 bg-emerald-900/30 text-emerald-400",
  REJECTED: "border-red-800 bg-red-900/30 text-red-400",
  CANCELLED: "border-gray-700 bg-gray-800 text-gray-500",
};

function isActive(status: TradeStatus) {
  return status === "PENDING" || status === "COUNTERED";
}

function mergedCardForTradeOfferItem(
  item: TradeItem,
  cardCacheMap: Map<string, Card>,
  scraperIdMap: Map<string, Card>
): Card {
  const cached =
    cardCacheMap.get(item.cardId) ??
    scraperIdMap.get(item.cardId) ??
    (item.card ? cardCacheMap.get(getCardId(item.card)) ?? undefined : undefined) ??
    (item.card?.scraperId ? scraperIdMap.get(item.card.scraperId) : undefined);
  return mergePublicProfileCardWithCatalog(item.card, cached, item.cardId);
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
    // Prefer a non-null card payload if one of the entries has it.
    if (!existing.card && item.card) existing.card = item.card;
    existing.declaredValue = mergeAggregatedDeclaredValue(
      existing.declaredValue ?? null,
      item.declaredValue ?? null
    );
  }
  return [...byCardId.values()];
}

function TradeDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-gray-700" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 rounded-xl bg-gray-800" />
        <div className="h-48 rounded-xl bg-gray-800" />
      </div>
      <div className="h-32 rounded-xl bg-gray-800" />
    </div>
  );
}

/* ─── OfferPanel ──────────────────────────────────── */

interface OfferPanelProps {
  title: string;
  items: TradeItem[];
  isMyPanel: boolean;
  canEdit: boolean;
  busy: boolean;
  cardCacheMap: Map<string, Card>;
  scraperIdMap: Map<string, Card>;
  emptyLabelMy?: string;
  emptyLabelTheir?: string;
}

function OfferPanel({
  title,
  items,
  isMyPanel,
  canEdit,
  busy,
  cardCacheMap,
  scraperIdMap,
  emptyLabelMy,
  emptyLabelTheir,
}: OfferPanelProps) {
  const { locale } = useLocale();
  const { setCodesOrdered, getSetLabel } = useRiotCatalogSets();
  const displayItems = useMemo(() => aggregateTradeItemsByCardId(items), [items]);

  const grouped = useMemo(
    () => groupTradeItemsBySetAndType(displayItems, cardCacheMap, scraperIdMap, setCodesOrdered, getSetLabel),
    [displayItems, cardCacheMap, scraperIdMap, setCodesOrdered, getSetLabel]
  );

  return (
    <div className={`rounded-xl border bg-gray-800 ${isMyPanel ? "border-emerald-700/50" : "border-gray-700"}`}>
      <div className={`border-b px-4 py-3 ${isMyPanel ? "border-emerald-700/40" : "border-gray-700"}`}>
        <span className="min-w-0 text-sm font-semibold text-gray-200">{title}</span>
      </div>

      <div className="px-3 py-2">
        {displayItems.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">
            {isMyPanel ? emptyLabelMy : emptyLabelTheir}
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ set, label, types }) => (
              <div key={set}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-200">{label}</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <div className="space-y-2.5 pl-2">
                  {types.map(({ type, label: typeLabel, icon, total, items: typeItems }) => (
                    <div key={type}>
                      <div className="mb-0.5 flex items-center gap-1.5">
                        {icon && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={icon} alt={typeLabel} className="h-3.5 w-3.5 object-contain opacity-70" />
                        )}
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          {typeLabel} <span className="text-gray-600">({total})</span>
                        </span>
                      </div>
                      <ul className="space-y-0.5 pl-4">
                        {typeItems.map((item) => {
                          const cached = cardCacheMap.get(item.cardId) ?? scraperIdMap.get(item.cardId);
                          const merged = mergedCardForTradeOfferItem(item, cardCacheMap, scraperIdMap);
                          const domains = getCardDomains(cached ?? item.card ?? undefined);
                          const rarityIcon = getRarityIcon(item.card?.rarity ?? cached?.rarity);
                          return (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-1 rounded px-1 py-0.5 hover:bg-gray-700/40"
                            >
                              <CardHoverPreview card={merged}>
                                <span className="flex min-w-0 cursor-default items-center gap-1 text-xs">
                                  <TradeOfferDomainIconsAndQty
                                    domains={domains}
                                    quantity={item.quantity}
                                    fallbackCard={cached ?? item.card ?? undefined}
                                  />
                                  <span className="truncate text-blue-400">
                                    {item.card?.name ?? merged.name ?? item.cardId}
                                  </span>
                                  {rarityIcon && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={rarityIcon}
                                      alt={item.card?.rarity ?? cached?.rarity ?? ""}
                                      className="h-3.5 w-3.5 shrink-0 object-contain opacity-70"
                                    />
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── MessageThread ───────────────────────────────── */

interface MessageThreadProps {
  trade: Trade;
  mySlug: string;
  onSend: (msg: string) => Promise<void>;
  sending: boolean;
  messagesTitle?: string;
  noMessagesYet?: string;
  placeholder?: string;
  sendLabel?: string;
  youLabel?: string;
}

function MessageThread({ trade, mySlug, onSend, sending, messagesTitle, noMessagesYet, placeholder, sendLabel, youLabel }: MessageThreadProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [trade.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    await onSend(draft.trim());
    setDraft("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
      <div className="border-b border-gray-700 px-4 py-3">
        <span className="text-sm font-semibold text-gray-200">{messagesTitle}</span>
      </div>

      <div className="p-3 space-y-2">
        {trade.messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">{noMessagesYet}</p>
        ) : (
          trade.messages.map((msg) => {
            const isMe = msg.senderSlug === mySlug;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    isMe
                      ? "rounded-tr-sm bg-emerald-600 text-white"
                      : "rounded-tl-sm bg-gray-700 text-gray-200"
                  }`}
                >
                  <p className={`mb-0.5 text-[11px] font-semibold ${isMe ? "text-emerald-400/70 text-right" : "text-gray-400"}`}>
                    {msg.senderSlug ? `@${msg.senderSlug}` : isMe ? youLabel : "—"}
                  </p>
                  <p className="break-words">{msg.message}</p>
                  <p className="mt-0.5 text-right text-[10px] opacity-60">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isActive(trade.status) && (
        <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-gray-700 p-3">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
            }}
            rows={1}
            placeholder={placeholder}
            className="flex-1 resize-none overflow-hidden rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-500 outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {sendLabel}
          </button>
        </form>
      )}
    </div>
  );
}

/* ─── ConfirmModal ────────────────────────────────── */

type ConfirmVariant = "success" | "danger" | "primary";

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  /** Conteúdo extra abaixo da descrição (ex.: aviso de oferta vazia) */
  children?: React.ReactNode;
}

const VARIANT_BTN: Record<ConfirmVariant, string> = {
  success: "bg-emerald-600 hover:bg-emerald-500 text-white",
  danger:  "bg-red-700 hover:bg-red-600 text-white",
  primary: "bg-blue-700 hover:bg-blue-600 text-white",
};

const VARIANT_ICON: Record<ConfirmVariant, React.ReactNode> = {
  success: (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" aria-hidden><path d="M20 6 9 17l-5-5"/></svg>
    </div>
  ),
  danger: (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-900/50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </div>
  ),
  primary: (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/50">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400" aria-hidden><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
    </div>
  ),
};

function ConfirmModal({ title, description, confirmLabel, cancelLabel, variant = "primary", onConfirm, onCancel, children }: ConfirmModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex flex-col items-center gap-3 text-center">
          {VARIANT_ICON[variant]}
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
          {children}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-600 bg-gray-800 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${VARIANT_BTN[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────── */

type PendingAction = "accept" | "submit" | "reject" | "cancel" | null;

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { cards: cachedCards } = useCards();
  const tradeId = typeof params.id === "string" ? params.id : "";

  const cardCacheMap = useMemo(
    () =>
      new Map(
        (cachedCards ?? [])
          .map((c) => [getCardId(c), c] as const)
          .filter(([id]) => id !== "")
      ),
    [cachedCards]
  );
  const scraperIdMap = useMemo(
    () => new Map((cachedCards ?? []).filter((c) => c.scraperId).map((c) => [c.scraperId!, c])),
    [cachedCards]
  );

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const actionInProgressRef = useRef(false);

  const fetchTrade = useCallback(async () => {
    if (!tradeId) return;
    try {
      const data = await getTrade(tradeId);
      setTrade(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    fetchTrade();
  }, [authLoading, user, router, fetchTrade]);

  const statusLabel: Record<TradeStatus, string> = {
    PENDING: t("trades.pending"),
    COUNTERED: t("trades.countered"),
    ACCEPTED: t("trades.accepted"),
    REJECTED: t("trades.rejected"),
    CANCELLED: t("trades.cancelled"),
  };

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <BackLink href="/trades" label={t("back.myTrades")} className="mb-5" />
          <TradeDetailSkeleton />
        </div>
      </div>
    );
  }

  if (notFound || !trade) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-white">{t("trades.tradeNotFound")}</h1>
          <p className="mb-6 text-gray-400">{t("trades.tradeNotFoundDesc")}</p>
          <BackLink href="/trades" label={t("back.myTrades")} className="inline-flex" />
        </div>
      </div>
    );
  }

  const amInitiator = trade.initiatorSlug === user.slug;
  const mySlug = user.slug;
  const counterpart = amInitiator
    ? { slug: trade.recipientSlug, displayName: trade.recipientDisplayName }
    : { slug: trade.initiatorSlug, displayName: trade.initiatorDisplayName };

  const isMyTurn = trade.currentTurnSlug === mySlug;
  const active = isActive(trade.status);

  const myItems = (amInitiator ? trade.initiatorItems : trade.recipientItems) ?? [];
  const theirItems = (amInitiator ? trade.recipientItems : trade.initiatorItems) ?? [];

  /* ── actions ── */
  async function withBusy(fn: () => Promise<void>) {
    if (actionInProgressRef.current) return;
    actionInProgressRef.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      actionInProgressRef.current = false;
      setBusy(false);
    }
  }

  async function handleAddCard(card: Card) {
    setShowPicker(false);
    await withBusy(async () => {
      try {
        await addTradeItem(trade!.id, getCardId(card), 1);
        await fetchTrade();
        toast.success(t("trades.cardAdded", { name: card.name }));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("trades.addCardToOffer"));
      }
    });
  }

  async function handleSendMessage(msg: string) {
    setMsgSending(true);
    try {
      await sendTradeMessage(trade!.id, msg);
      await fetchTrade();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("trades.errorSendingMessage"));
    } finally {
      setMsgSending(false);
    }
  }

  async function handleSubmit() {
    await withBusy(async () => {
      try {
        const updated = await submitTrade(trade!.id);
        setTrade(updated);
        toast.success(t("trades.tradeSubmitted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("trades.errorSubmittingTrade"));
      }
    });
  }

  async function handleAccept() {
    await withBusy(async () => {
      try {
        const updated = await acceptTrade(trade!.id);
        setTrade(updated);
        toast.success(t("trades.tradeAccepted"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("trades.errorAcceptingTrade"));
      }
    });
  }

  async function handleReject() {
    await withBusy(async () => {
      try {
        const updated = await rejectTrade(trade!.id);
        setTrade(updated);
        toast.success(t("trades.tradeRejected"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("trades.errorRejectingTrade"));
      }
    });
  }

  async function handleCancel() {
    await withBusy(async () => {
      try {
        await cancelTrade(trade!.id);
        toast.success(t("trades.tradeCancelled"));
        router.push("/trades");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("trades.errorCancellingTrade"));
      }
    });
  }

  const turnInfo = (() => {
    if (!active) return null;
    if (isMyTurn) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
          </span>
          {t("trades.itIsYourTurn")}
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-gray-400">
        {t("trades.waitingForLabel")}
        <a href={`/${counterpart.slug}`} className="font-medium text-blue-400 hover:underline">
          @{counterpart.slug}
        </a>
        {t("trades.toRespondLabel")}
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <BackLink href="/trades" label={t("back.myTrades")} className="mb-5" />

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">
              {t("trades.tradeWith")}{" "}
              <a
                href={`/${counterpart.slug}`}
                className="text-blue-400 hover:underline"
              >
                @{counterpart.slug}
              </a>
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              {new Date(trade.createdAt).toLocaleDateString()}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLOR[trade.status]}`}
          >
            {statusLabel[trade.status]}
          </span>
        </div>

        {/* Turn info */}
        {turnInfo && <div className="mb-4">{turnInfo}</div>}

        {/* Action buttons — visible when it's my turn */}
        {active && isMyTurn && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingAction("accept")}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5"/></svg>
              {t("trades.acceptTrade")}
            </button>
            <a
              href={`/${counterpart.slug}`}
              className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-900/30 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-800/40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              {t("trades.modifyOffer")}
            </a>
            <button
              type="button"
              onClick={() => setPendingAction("reject")}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-900/40 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              {t("trades.rejectTrade")}
            </button>
            {amInitiator && (
              <button
                type="button"
                onClick={() => setPendingAction("cancel")}
                disabled={busy}
                className="ml-auto text-xs text-gray-600 underline-offset-2 hover:text-red-400 hover:underline disabled:opacity-50"
              >
                {t("trades.cancelThisTrade")}
              </button>
            )}
          </div>
        )}

        {/* Cancel when it's not my turn but I'm the initiator */}
        {active && !isMyTurn && amInitiator && (
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={() => setPendingAction("cancel")}
              disabled={busy}
              className="text-xs text-gray-600 underline-offset-2 hover:text-red-400 hover:underline disabled:opacity-50"
            >
              {t("trades.cancelThisTrade")}
            </button>
          </div>
        )}

        {/* Counter-offer hint — sempre que for nosso turno de responder (aceitar/rejeitar/contrapropor) */}
        {active && isMyTurn && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-800/50 bg-blue-900/10 px-4 py-2.5 text-sm text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {t("trades.wantToCounterPrefix")}
            <a href={`/${counterpart.slug}`} className="font-semibold text-blue-200 hover:underline">
              @{counterpart.slug}
            </a>
            {t("trades.wantToCounterSuffix")}
          </div>
        )}

        {/* Offers */}
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <OfferPanel
            title={t("trades.tradeSideCards", { slug: mySlug, count: aggregateTradeItemsByCardId(myItems).reduce((sum, it) => sum + it.quantity, 0) })}
            items={myItems}
            isMyPanel
            canEdit={active && isMyTurn}
            busy={busy}
            cardCacheMap={cardCacheMap}
            scraperIdMap={scraperIdMap}
            emptyLabelMy={t("trades.noCardsYet")}
            emptyLabelTheir={t("trades.waitingForTheirOffer")}
          />
          <OfferPanel
            title={t("trades.tradeSideCards", { slug: counterpart.slug, count: aggregateTradeItemsByCardId(theirItems).reduce((sum, it) => sum + it.quantity, 0) })}
            items={theirItems}
            isMyPanel={false}
            canEdit={false}
            busy={busy}
            cardCacheMap={cardCacheMap}
            scraperIdMap={scraperIdMap}
          />
        </div>

        {/* Messages */}
        <MessageThread
          trade={trade}
          mySlug={mySlug}
          onSend={handleSendMessage}
          sending={msgSending}
          messagesTitle={t("trades.messages")}
          noMessagesYet={t("trades.noMessagesYet")}
          placeholder={t("trades.writeMessage")}
          sendLabel={t("trades.send")}
          youLabel={t("trades.you")}
        />
      </div>

      {showPicker && (
        <CardPickerModal
          title={t("trades.addCardToOffer")}
          onSelect={handleAddCard}
          onClose={() => setShowPicker(false)}
        />
      )}

      {pendingAction === "accept" && (
        <ConfirmModal
          title={t("trades.acceptThisTrade")}
          description={t("trades.acceptDescription")}
          confirmLabel={t("trades.acceptTrade")}
          cancelLabel={t("common.goBack")}
          variant="success"
          onConfirm={() => { setPendingAction(null); handleAccept(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "submit" && (
        <ConfirmModal
          title={trade.status === "COUNTERED" ? t("trades.submitYourCounter") : t("trades.submitYourOffer")}
          description={t("trades.submitDescription")}
          confirmLabel={trade.status === "COUNTERED" ? t("trades.submitCounter") : t("trades.submitOffer")}
          cancelLabel={t("common.goBack")}
          variant="primary"
          onConfirm={() => { setPendingAction(null); handleSubmit(); }}
          onCancel={() => setPendingAction(null)}
        >
          {myItems.length === 0 && (
            <div className="mt-3 w-full rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-2.5 text-left text-sm text-amber-200">
              <p className="font-medium">{t("trades.yourOfferEmpty")}</p>
              <p className="mt-1 text-amber-200/90">
                {t("trades.wantToCounterPrefix")}
                <a href={`/${counterpart.slug}`} className="font-semibold text-amber-100 underline hover:no-underline">
                  @{counterpart.slug}
                </a>
                {t("trades.wantToCounterSuffix")}
              </p>
            </div>
          )}
        </ConfirmModal>
      )}
      {pendingAction === "reject" && (
        <ConfirmModal
          title={t("trades.rejectThisTrade")}
          description={t("trades.rejectDescription")}
          confirmLabel={t("trades.rejectTrade")}
          cancelLabel={t("common.goBack")}
          variant="danger"
          onConfirm={() => { setPendingAction(null); handleReject(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "cancel" && (
        <ConfirmModal
          title={t("trades.cancelThisTrade")}
          description={t("trades.cancelDescription")}
          confirmLabel={t("trades.yesCancelIt")}
          cancelLabel={t("common.goBack")}
          variant="danger"
          onConfirm={() => { setPendingAction(null); handleCancel(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
