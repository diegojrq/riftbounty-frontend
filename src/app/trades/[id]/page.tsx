"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getTrade,
  addTradeItem,
  updateTradeItem,
  removeTradeItem,
  sendTradeMessage,
  submitTrade,
  acceptTrade,
  rejectTrade,
  cancelTrade,
} from "@/lib/trades";
import { CardPickerModal } from "@/components/decks/CardPickerModal";
import { BackLink } from "@/components/layout/BackLink";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import type { Trade, TradeItem, TradeStatus } from "@/types/trade";
import type { Card } from "@/types/card";

/* ─── helpers ─────────────────────────────────────── */

const STATUS_LABEL: Record<TradeStatus, string> = {
  PENDING: "Pending",
  COUNTERED: "Countered",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

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
  onAddCard: () => void;
  onUpdateQty: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
  busy: boolean;
}

function OfferPanel({
  title,
  items,
  isMyPanel,
  canEdit,
  onAddCard,
  onUpdateQty,
  onRemove,
  busy,
}: OfferPanelProps) {
  return (
    <div className={`rounded-xl border bg-gray-800 ${isMyPanel ? "border-emerald-700/50" : "border-gray-700"}`}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${isMyPanel ? "border-emerald-700/40" : "border-gray-700"}`}>
        <span className="text-sm font-semibold text-gray-200">{title}</span>
        {isMyPanel && canEdit && (
          <button
            type="button"
            onClick={onAddCard}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-900 px-2.5 py-1 text-xs font-medium text-gray-300 transition hover:border-emerald-600 hover:text-emerald-400 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            Add card
          </button>
        )}
      </div>

        <div className="p-3">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">
            {isMyPanel ? "No cards yet." : "Waiting for their offer."}
          </p>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-gray-700/60 bg-gray-900 px-3 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <CardHoverPreview card={item.card as unknown as Card}>
                    <p className="truncate text-sm font-medium text-blue-400">
                      {item.card?.name ?? item.cardId}
                    </p>
                  </CardHoverPreview>
                </div>

                {isMyPanel && canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="flex items-center rounded-md border border-gray-700 bg-gray-800">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                        disabled={busy || item.quantity <= 1}
                        className="flex h-6 w-6 items-center justify-center rounded-l-md text-xs text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-xs font-bold tabular-nums text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                        disabled={busy}
                        className="flex h-6 w-6 items-center justify-center rounded-r-md text-xs text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      disabled={busy}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-600 hover:bg-red-900/30 hover:text-red-400 disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                ) : (
                  <span className="shrink-0 rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-bold tabular-nums text-gray-300">
                    ×{item.quantity}
                  </span>
                )}
              </li>
            ))}
          </ul>
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
}

function MessageThread({ trade, mySlug, onSend, sending }: MessageThreadProps) {
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
        <span className="text-sm font-semibold text-gray-200">Messages</span>
      </div>

      <div className="p-3 space-y-2">
        {trade.messages.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-600">No messages yet.</p>
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
                    {msg.senderSlug ? `@${msg.senderSlug}` : isMe ? "you" : "unknown"}
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
            placeholder="Write a message…"
            className="flex-1 resize-none overflow-hidden rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            Send
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
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
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

function ConfirmModal({ title, description, confirmLabel, variant = "primary", onConfirm, onCancel }: ConfirmModalProps) {
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
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-600 bg-gray-800 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-gray-700"
          >
            Go back
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
  const tradeId = typeof params.id === "string" ? params.id : "";

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const fetchTrade = useCallback(async () => {
    if (!tradeId) return;
    try {
      const t = await getTrade(tradeId);
      setTrade(t);
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

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <BackLink href="/trades" label="My Trades" className="mb-5" />
          <TradeDetailSkeleton />
        </div>
      </div>
    );
  }

  if (notFound || !trade) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 text-center">
          <h1 className="mb-2 text-xl font-bold text-white">Trade not found</h1>
          <p className="mb-6 text-gray-400">This trade doesn&apos;t exist or you don&apos;t have access.</p>
          <BackLink href="/trades" label="My Trades" className="inline-flex" />
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
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  async function handleAddCard(card: Card) {
    setShowPicker(false);
    await withBusy(async () => {
      try {
        await addTradeItem(trade!.id, card.uuid, 1);
        await fetchTrade();
        toast.success(`${card.name} added`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error adding card");
      }
    });
  }

  async function handleUpdateQty(itemId: string, qty: number) {
    if (qty < 1) return;
    await withBusy(async () => {
      try {
        await updateTradeItem(trade!.id, itemId, qty);
        await fetchTrade();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error updating quantity");
      }
    });
  }

  async function handleRemoveItem(itemId: string) {
    await withBusy(async () => {
      try {
        await removeTradeItem(trade!.id, itemId);
        await fetchTrade();
        toast.success("Card removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error removing card");
      }
    });
  }

  async function handleSendMessage(msg: string) {
    setMsgSending(true);
    try {
      await sendTradeMessage(trade!.id, msg);
      await fetchTrade();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error sending message");
    } finally {
      setMsgSending(false);
    }
  }

  async function handleSubmit() {
    await withBusy(async () => {
      try {
        const updated = await submitTrade(trade!.id);
        setTrade(updated);
        toast.success("Trade submitted for review.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error submitting trade");
      }
    });
  }

  async function handleAccept() {
    await withBusy(async () => {
      try {
        const updated = await acceptTrade(trade!.id);
        setTrade(updated);
        toast.success("Trade accepted!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error accepting trade");
      }
    });
  }

  async function handleReject() {
    await withBusy(async () => {
      try {
        const updated = await rejectTrade(trade!.id);
        setTrade(updated);
        toast.success("Trade rejected.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error rejecting trade");
      }
    });
  }

  async function handleCancel() {
    await withBusy(async () => {
      try {
        await cancelTrade(trade!.id);
        toast.success("Trade cancelled.");
        router.push("/trades");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error cancelling trade");
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
          It&apos;s your turn to review and respond.
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-gray-400">
        Waiting for{" "}
        <a href={`/${counterpart.slug}`} className="font-medium text-blue-400 hover:underline">
          @{counterpart.slug}
        </a>{" "}
        to respond.
      </div>
    );
  })();

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <BackLink href="/trades" label="My Trades" className="mb-5" />

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">
              Trade with{" "}
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
            {STATUS_LABEL[trade.status]}
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
              Accept
            </button>
            <button
              type="button"
              onClick={() => setPendingAction("submit")}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-blue-600 bg-blue-900/30 px-4 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-800/40 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              {trade.status === "COUNTERED" ? "Submit counter" : "Submit offer"}
            </button>
            <button
              type="button"
              onClick={() => setPendingAction("reject")}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-900/40 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              Reject
            </button>
            {amInitiator && (
              <button
                type="button"
                onClick={() => setPendingAction("cancel")}
                disabled={busy}
                className="ml-auto text-xs text-gray-600 underline-offset-2 hover:text-red-400 hover:underline disabled:opacity-50"
              >
                Cancel this trade
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
              Cancel this trade
            </button>
          </div>
        )}

        {/* Counter-offer hint */}
        {active && isMyTurn && !amInitiator && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-800/50 bg-blue-900/10 px-4 py-2.5 text-sm text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Want to counter? Visit{" "}
            <a href={`/${counterpart.slug}`} className="font-semibold text-blue-200 hover:underline">
              @{counterpart.slug}&apos;s profile
            </a>{" "}
            to pick cards and submit a counter offer.
          </div>
        )}

        {/* Offers */}
        <div className="mb-5 grid gap-4 md:grid-cols-2">
          <OfferPanel
            title={`Cards I asked for (${myItems.length})`}
            items={myItems}
            isMyPanel
            canEdit={active && isMyTurn}
            onAddCard={() => setShowPicker(true)}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemoveItem}
            busy={busy}
          />
          <OfferPanel
            title={`Cards @${counterpart.slug} asked for (${theirItems.length})`}
            items={theirItems}
            isMyPanel={false}
            canEdit={false}
            onAddCard={() => {}}
            onUpdateQty={() => {}}
            onRemove={() => {}}
            busy={busy}
          />
        </div>

        {/* Messages */}
        <MessageThread
          trade={trade}
          mySlug={mySlug}
          onSend={handleSendMessage}
          sending={msgSending}
        />
      </div>

      {showPicker && (
        <CardPickerModal
          title="Add card to your offer"
          onSelect={handleAddCard}
          onClose={() => setShowPicker(false)}
        />
      )}

      {pendingAction === "accept" && (
        <ConfirmModal
          title="Accept this trade?"
          description="You'll receive the cards they requested and give away the ones listed. This can't be undone."
          confirmLabel="Accept trade"
          variant="success"
          onConfirm={() => { setPendingAction(null); handleAccept(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "submit" && (
        <ConfirmModal
          title={trade.status === "COUNTERED" ? "Submit your counter?" : "Submit your offer?"}
          description="The other player will be notified and can accept, reject or counter your offer."
          confirmLabel={trade.status === "COUNTERED" ? "Submit counter" : "Submit offer"}
          variant="primary"
          onConfirm={() => { setPendingAction(null); handleSubmit(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "reject" && (
        <ConfirmModal
          title="Reject this trade?"
          description="The trade will be marked as rejected. The other player will be notified."
          confirmLabel="Reject trade"
          variant="danger"
          onConfirm={() => { setPendingAction(null); handleReject(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === "cancel" && (
        <ConfirmModal
          title="Cancel this trade?"
          description="The trade will be cancelled and removed from both players' active trades."
          confirmLabel="Yes, cancel it"
          variant="danger"
          onConfirm={() => { setPendingAction(null); handleCancel(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
