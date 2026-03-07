"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { getCard, getCardImageUrl } from "@/lib/cards";
import { addToCollection, removeFromCollection, updateQuantity } from "@/lib/collections";
import { CardImg } from "@/components/cards/CardImg";
import { useAuth } from "@/lib/auth-context";
import type { Card } from "@/types/card";

const SET_DISPLAY: Record<string, string> = {
  OGN: "Origins Main Set",
  SFD: "Spiritforged",
};

function fmt(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function getCardDomains(card: Card): string[] {
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if ((card as unknown as { domains?: string[] }).domains)
    result.push(...((card as unknown as { domains: string[] }).domains).map((d) => d.toLowerCase()));
  if ((card as unknown as { cardDomains?: { domain: { name: string } }[] }).cardDomains)
    result.push(...((card as unknown as { cardDomains: { domain: { name: string } }[] }).cardDomains).map((cd) => cd.domain.name.toLowerCase()));
  return [...new Set(result)];
}

interface CardDetailModalProps {
  uuid: string | null;
  onClose: () => void;
  /** Called after any collection mutation so the parent can refresh its data */
  onCollectionChange?: () => void;
}

export function CardDetailModal({ uuid, onClose, onCollectionChange }: CardDetailModalProps) {
  const { user } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalRoot(document.body); }, []);

  const fetchCard = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    setCard(null);
    try {
      setCard(await getCard(uuid));
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  // Close on Escape
  useEffect(() => {
    if (!uuid) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [uuid, onClose]);

  if (!uuid || !portalRoot) return null;

  const qty = Number(card?.collectionQuantity ?? 0);
  const inCollection = card?.inCollection ?? false;
  const canDecrease = inCollection && qty >= 1;
  const imageUrl = card ? getCardImageUrl(card) : null;
  const collectorNumber = card?.collector_number ?? card?.collectorNumber ?? "—";
  const setDisplay = card?.set && SET_DISPLAY[card.set.toUpperCase()]
    ? SET_DISPLAY[card.set.toUpperCase()]
    : card?.set;

  async function handleAdd() {
    if (!user || !card) return;
    setActionLoading(true);
    try {
      if (card.inCollection) await addToCollection(card.uuid, 1);
      else await addToCollection(card.uuid);
      await fetchCard();
      onCollectionChange?.();
    } finally { setActionLoading(false); }
  }

  async function handleDecrease() {
    if (!user || !card) return;
    setActionLoading(true);
    try {
      if (qty <= 1) await removeFromCollection(card.uuid);
      else await updateQuantity(card.uuid, qty - 1);
      await fetchCard();
      onCollectionChange?.();
    } finally { setActionLoading(false); }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
          </div>
        )}

        {/* Content */}
        {!loading && card && (
          <div className="overflow-y-auto p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Image */}
              <div className="mx-auto w-full max-w-[220px] shrink-0 sm:max-w-[280px]">
                <div className="aspect-[2.5/3.5] overflow-hidden rounded-xl border border-gray-600 bg-gray-800 shadow-xl">
                  {imageUrl ? (
                    <CardImg src={imageUrl} alt={card.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-500">
                      <span className="text-5xl" aria-hidden>🃏</span>
                      <span className="text-sm">No image</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                <p className="mt-1 text-sm text-gray-400 tabular-nums">
                  {setDisplay && `${setDisplay} · `}{collectorNumber}
                </p>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {card.set && (
                    <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                      {fmt(setDisplay ?? card.set)}
                    </span>
                  )}
                  {card.rarity && (
                    <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                      {fmt(card.rarity)}
                    </span>
                  )}
                  {card.type && (
                    <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                      {fmt(card.type)}
                    </span>
                  )}
                  {getCardDomains(card).map((domain) => (
                    <span key={domain} className="flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        <img src={`/images/domains/${domain}.webp`} alt={domain} className="h-full w-full object-contain" />
                      </span>
                      {fmt(domain)}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                {(card.cost != null || card.power != null || card.energy != null || card.might != null) && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {card.cost != null && card.cost !== "" && (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                        <p className="text-xs font-medium uppercase text-gray-500">Cost</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">{card.cost}</p>
                      </div>
                    )}
                    {card.power != null && (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                        <p className="text-xs font-medium uppercase text-gray-500">Power</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">{card.power}</p>
                      </div>
                    )}
                    {card.energy != null && (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                        <p className="text-xs font-medium uppercase text-gray-500">Energy</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">{card.energy}</p>
                      </div>
                    )}
                    {card.might != null && (
                      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
                        <p className="text-xs font-medium uppercase text-gray-500">Might</p>
                        <p className="mt-0.5 text-lg font-semibold text-white">{card.might}</p>
                      </div>
                    )}
                  </div>
                )}

                {card.illustrator && (
                  <p className="mt-4 text-xs text-gray-500">Illustrator: {card.illustrator}</p>
                )}

                {/* Collection */}
                <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Your collection</h3>
                  {!user ? (
                    <p className="mt-2 text-sm text-gray-400">
                      <Link href="/login" className="text-emerald-400 hover:underline" onClick={onClose}>
                        Log in
                      </Link>{" "}to add this card to your collection.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="text-lg font-bold tabular-nums text-white">×{qty}</span>
                      <div className="flex items-center gap-2">
                        {canDecrease && (
                          <button
                            type="button"
                            onClick={handleDecrease}
                            disabled={actionLoading}
                            className="flex size-10 items-center justify-center rounded-md border border-gray-500 bg-gray-700 text-white transition hover:bg-gray-600 disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAdd}
                          disabled={actionLoading}
                          className="flex size-10 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white transition hover:bg-green-600 disabled:opacity-50"
                          aria-label="Add one"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
