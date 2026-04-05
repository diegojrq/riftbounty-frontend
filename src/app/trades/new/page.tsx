"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { ApiClientError } from "@/lib/api";
import { createTrade } from "@/lib/trades";
import { TRADE_DECLARED_VALUE_INVALID_I18N_KEY } from "@/lib/trade-declared-value";
import { CardPickerModal } from "@/components/decks/CardPickerModal";
import { TradeDeclaredValueInput } from "@/components/trades/TradeDeclaredValueInput";
import { BackLink } from "@/components/layout/BackLink";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";

interface DraftItem {
  card: Card;
  quantity: number;
  declaredValue?: number | null;
}

function NewTradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();

  const [recipientSlug, setRecipientSlug] = useState(searchParams.get("recipient") ?? "");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [message, setMessage] = useState(searchParams.get("message") ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  function handleCardSelect(card: Card) {
    setShowPicker(false);
    setItems((prev) => {
      const existing = prev.find((i) => getCardId(i.card) === getCardId(card));
      if (existing) return prev; // já existe, não duplica
      return [...prev, { card, quantity: 1, declaredValue: null }];
    });
  }

  function updateQty(cardId: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => (getCardId(i.card) === cardId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    );
  }

  function setQty(cardId: string, qty: number) {
    const val = Math.max(1, qty);
    setItems((prev) => prev.map((i) => (getCardId(i.card) === cardId ? { ...i, quantity: val } : i)));
  }

  function removeItem(cardId: string) {
    setItems((prev) => prev.filter((i) => getCardId(i.card) !== cardId));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientSlug.trim()) { setError(t("trades.enterRecipientSlug")); return; }
    if (recipientSlug.trim() === user?.slug) { setError(t("trades.cantTradeWithYourself")); return; }

    setSubmitting(true);
    setError(null);
    try {
      const trade = await createTrade({
        recipientSlug: recipientSlug.trim(),
        items: items.map((i) => {
          const line: { cardId: string; quantity: number; declaredValue?: number } = {
            cardId: getCardId(i.card),
            quantity: i.quantity,
          };
          if (typeof i.declaredValue === "number" && Number.isFinite(i.declaredValue)) {
            line.declaredValue = Math.round(i.declaredValue * 100) / 100;
          }
          return line;
        }),
        message: message.trim() || undefined,
      });
      toast.success(t("trades.tradeProposalSent"));
      router.push(`/trades/${trade.id}`);
    } catch (err) {
      let msg = err instanceof Error ? err.message : t("trades.errorCreatingTrade");
      if (err instanceof ApiClientError && err.code === TRADE_DECLARED_VALUE_INVALID_I18N_KEY) {
        msg = t(TRADE_DECLARED_VALUE_INVALID_I18N_KEY);
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <BackLink href="/trades" label={t("back.myTrades")} className="mb-5" />
        <h1 className="mb-6 text-2xl font-bold text-white">{t("trades.newTrade")}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipient */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="recipient">
              {t("trades.recipientSlug")}
            </label>
            <input
              id="recipient"
              type="text"
              value={recipientSlug}
              onChange={(e) => setRecipientSlug(e.target.value)}
              placeholder={t("trades.recipientSlugPlaceholder")}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* My offer */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">{t("trades.myOffer")}</span>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:border-emerald-600 hover:text-emerald-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                {t("trades.addCard")}
              </button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/50 px-4 py-6 text-center">
                <p className="text-sm text-gray-500">{t("trades.noCardsAddedYet")}</p>
                <p className="mt-0.5 text-xs text-gray-600">{t("trades.noItemsToo")}</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={getCardId(item.card)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{item.card.name}</p>
                      {item.card.type && (
                        <p className="text-xs text-gray-500">{item.card.type}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-medium text-gray-500">{t("trades.declaredValueLabelNewTrade")}</span>
                        <TradeDeclaredValueInput
                          value={item.declaredValue ?? null}
                          onCommit={(n) =>
                            setItems((prev) =>
                              prev.map((row) =>
                                getCardId(row.card) === getCardId(item.card) ? { ...row, declaredValue: n } : row
                              )
                            )
                          }
                          disabled={submitting}
                          ariaLabel={t("trades.declaredValueAriaOffer")}
                          className="w-[5.5rem] rounded border border-gray-600 bg-gray-900 px-2 py-1 text-center text-xs tabular-nums text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-600 disabled:opacity-50"
                        />
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-900">
                        <button
                          type="button"
                          onClick={() => updateQty(getCardId(item.card), -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-l-lg text-gray-400 hover:bg-gray-700 hover:text-white"
                          aria-label={t("common.decrease")}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => setQty(getCardId(item.card), parseInt(e.target.value) || 1)}
                          className="w-10 bg-transparent text-center text-sm font-bold text-white outline-none tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(getCardId(item.card), 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-r-lg text-gray-400 hover:bg-gray-700 hover:text-white"
                          aria-label={t("common.increase")}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(getCardId(item.card))}
                        className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-red-900/30 hover:text-red-400"
                        aria-label={t("common.remove")}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="message">
              {t("trades.messageOptional")}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={t("trades.saySomethingPlaceholder")}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/50 px-4 py-3 text-sm text-red-200">{error}</div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !recipientSlug.trim()}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? t("trades.sending") : t("trades.sendProposal")}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-gray-700"
            >
              {t("trades.cancel")}
            </button>
          </div>
        </form>
      </div>

      {showPicker && (
        <CardPickerModal
          title={t("trades.addCardToOffer")}
          onSelect={handleCardSelect}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

export default function NewTradePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900">
          <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
            <div className="h-8 w-40 animate-pulse rounded bg-gray-700" />
          </div>
        </div>
      }
    >
      <NewTradeContent />
    </Suspense>
  );
}
