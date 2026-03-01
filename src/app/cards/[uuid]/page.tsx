"use client";

import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getCard } from "@/lib/cards";
import {
  addToCollection,
  removeFromCollection,
  updateQuantity,
} from "@/lib/collections";
import { useAuth } from "@/lib/auth-context";
import type { Card } from "@/types/card";

const SET_DISPLAY: Record<string, string> = {
  OGN: "Origins Main Set",
  SFD: "Spiritforged",
};

function formatLabel(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function CardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const uuid = params?.uuid as string;
  const from = searchParams?.get("from");
  const isFromCollection = from === "collection";
  const backHref = isFromCollection ? "/collection" : "/";
  const backLabel = isFromCollection ? "Back to collection" : "Back to cards";
  const { user, loading: authLoading } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCard = useCallback(async () => {
    if (!uuid) return;
    setLoading(true);
    setError(null);
    try {
      const c = await getCard(uuid);
      setCard(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading card");
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const inCollection = card?.inCollection ?? false;
  const qty = Number(card?.collectionQuantity ?? 0);
  const canDecrease = inCollection && qty >= 1;

  async function handleAdd() {
    if (!user || !card) {
      router.push("/login");
      return;
    }
    setActionLoading(true);
    try {
      if (card.inCollection) {
        await addToCollection(card.uuid, 1);
      } else {
        await addToCollection(card.uuid);
      }
      await fetchCard();
    } catch {
      // could toast
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecrease() {
    if (!user || !card) return;
    if (qty <= 1) {
      setActionLoading(true);
      try {
        await removeFromCollection(card.uuid);
        await fetchCard();
      } catch {
        // could toast
      } finally {
        setActionLoading(false);
      }
      return;
    }
    setActionLoading(true);
    try {
      await updateQuantity(card.uuid, qty - 1);
      await fetchCard();
    } catch {
      // could toast
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading || (loading && !card)) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
          <div className="mb-6 h-6 w-32 animate-pulse rounded bg-gray-700" />
          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="aspect-[2.5/3.5] w-full max-w-sm animate-pulse rounded-xl bg-gray-700" />
            <div className="flex-1 space-y-4">
              <div className="h-10 w-3/4 animate-pulse rounded bg-gray-700" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-gray-700" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
          <Link href={backHref} className="text-sm text-gray-400 hover:text-white">
            ← {backLabel}
          </Link>
          <div className="mt-8 rounded-lg border border-red-900/50 bg-red-900/20 p-6 text-red-200">
            <p>{error ?? "Card not found."}</p>
            <button
              type="button"
              onClick={() => fetchCard()}
              className="mt-4 rounded bg-red-800 px-3 py-1.5 text-sm hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const collectorNumber =
    card.collector_number ?? card.collectorNumber ?? "—";
  const setDisplay = card.set && SET_DISPLAY[card.set.toUpperCase()] ? SET_DISPLAY[card.set.toUpperCase()] : card.set;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
        <Link
          href={backHref}
          className="inline-block text-sm text-gray-400 hover:text-white"
        >
          ← {backLabel}
        </Link>

        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
          {/* Card image */}
          <div className="w-full shrink-0 sm:w-80">
            <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-xl border border-gray-600 bg-gray-800 shadow-xl">
              {card.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="h-full w-full object-cover"
                />
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
            <h1 className="text-2xl font-bold text-white sm:text-3xl">
              {card.name}
            </h1>
            <p className="mt-1 text-sm text-gray-400 tabular-nums">
              {setDisplay && `${setDisplay} · `}
              {collectorNumber}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {card.set && (
                <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                  Set: {formatLabel(setDisplay ?? card.set)}
                </span>
              )}
              {card.rarity && (
                <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                  {formatLabel(card.rarity)}
                </span>
              )}
              {card.type && (
                <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                  {formatLabel(card.type)}
                </span>
              )}
              {card.domain && (
                <span className="rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-300">
                  {formatLabel(card.domain)}
                </span>
              )}
            </div>

            {/* Stats row */}
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

            {card.illustrator && (
              <p className="mt-4 text-xs text-gray-500">
                Illustrator: {card.illustrator}
              </p>
            )}

            {/* Collection */}
            <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800/50 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Your collection
              </h2>
              {!user ? (
                <p className="mt-2 text-sm text-gray-400">
                  <Link href="/login" className="text-emerald-400 hover:underline">
                    Log in
                  </Link>{" "}
                  to add this card to your collection.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <span className="text-lg font-bold tabular-nums text-white">
                    ×{qty}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAdd}
                      disabled={actionLoading}
                      className="flex size-10 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white transition hover:bg-green-600 disabled:opacity-50"
                      aria-label="Add one"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                    </button>
                    {canDecrease && (
                      <button
                        type="button"
                        onClick={handleDecrease}
                        disabled={actionLoading}
                        className="flex size-10 items-center justify-center rounded-md border border-gray-500 bg-gray-700 text-white transition hover:bg-gray-600 disabled:opacity-50"
                        aria-label="Decrease quantity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
