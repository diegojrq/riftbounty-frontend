"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardTile } from "@/components/cards/CardTile";
import {
  addToCollection,
  removeFromCollection,
  updateQuantity,
} from "@/lib/collections";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import type { Card } from "@/types/card";
import type { CardsListResponse, CardsQueryParams } from "@/types/card";

function toQueryRecord(p: CardsQueryParams): Record<string, string | number | undefined> {
  return p as Record<string, string | number | undefined>;
}

const LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 3;

const DOMAINS = ["body", "calm", "chaos", "fury", "mind", "order"] as const;

export default function CollectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [nameFilter, setNameFilter] = useState<string | undefined>(undefined);
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>(undefined);
  const [actionCardId, setActionCardId] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const fetchCards = useCallback(async (params: CardsQueryParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<CardsListResponse>("/cards", toQueryRecord(params));
      setItems(res.data.items);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading cards");
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const trimmed = searchQuery.trim();
    const effectiveName = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : undefined;
    const delay = effectiveName ? SEARCH_DEBOUNCE_MS : 0;

    const timer = setTimeout(() => {
      setNameFilter(effectiveName);
      setOffset(0);
      fetchCards({
        limit: LIMIT,
        offset: 0,
        sortBy: "collector_number",
        order: "asc",
        ...(effectiveName && { name: effectiveName }),
        ...(selectedDomain && { domain: selectedDomain }),
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [user, searchQuery, selectedDomain, fetchCards]);

  const loadMore = useCallback(async () => {
    if (!user) return;
    const nextOffset = offset + LIMIT;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<CardsListResponse>("/cards", toQueryRecord({
        limit: LIMIT,
        offset: nextOffset,
        sortBy: "collector_number",
        order: "asc",
        ...(nameFilter && { name: nameFilter }),
        ...(selectedDomain && { domain: selectedDomain }),
      }));
      setItems((prev) => [...prev, ...res.data.items]);
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading more");
    } finally {
      setLoading(false);
    }
  }, [user, offset, nameFilter, selectedDomain]);

  const hasMore = items.length < totalCount;
  const inCollectionCount = items.filter((c) => c.inCollection).length;

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    if (!hasMore || loading || !user) return;
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, user, loadMore]);

  async function handleAdd(card: Card) {
    if (!user) return;
    setActionCardId(card.id);
    try {
      await addToCollection(card.id, 1);
      setItems((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, inCollection: true, collectionQuantity: (c.collectionQuantity ?? 0) + 1 }
            : c
        )
      );
    } catch {
      // could set error toast
    } finally {
      setActionCardId(null);
    }
  }

  async function handleRemove(card: Card) {
    if (!user) return;
    setActionCardId(card.id);
    try {
      await removeFromCollection(card.id);
      setItems((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, inCollection: false, collectionQuantity: 0 } : c
        )
      );
    } catch {
      // could set error toast
    } finally {
      setActionCardId(null);
    }
  }

  async function handleDecrease(card: Card) {
    if (!user) return;
    const qty = card.collectionQuantity ?? 1;
    if (qty <= 1) {
      await handleRemove(card);
      return;
    }
    setActionCardId(card.id);
    try {
      const data = await updateQuantity(card.id, qty - 1);
      setItems((prev) =>
        prev.map((c) =>
          c.id === data.cardId
            ? { ...c, ...data.card, collectionQuantity: data.quantity, inCollection: true }
            : c
        )
      );
    } catch {
      // could set error toast
    } finally {
      setActionCardId(null);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        {/* Domain filters – vertical left sidebar */}
        <aside className="flex shrink-0 flex-col gap-2">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Domain</p>
          <button
            type="button"
            onClick={() => setSelectedDomain(undefined)}
            className={`flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all ${
              selectedDomain === undefined
                ? "border-white bg-gray-600 ring-4 ring-white/70 ring-offset-2 ring-offset-gray-900"
                : "border-gray-600 bg-gray-800 hover:border-gray-500"
            }`}
            title="All domains"
            aria-pressed={selectedDomain === undefined}
          >
            <span className={`text-xs font-medium ${selectedDomain === undefined ? "text-white" : "text-gray-300"}`}>All</span>
          </button>
          {DOMAINS.map((domain) => (
            <button
              key={domain}
              type="button"
              onClick={() => setSelectedDomain(domain)}
              className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 p-2 transition-all ${
                selectedDomain === domain
                  ? "border-white bg-white/20 ring-4 ring-white/70 ring-offset-2 ring-offset-gray-900"
                  : "border-gray-600 hover:border-gray-500"
              }`}
              title={domain}
              aria-pressed={selectedDomain === domain}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/images/${domain}.webp`}
                alt={domain}
                className="h-full w-full object-contain"
              />
            </button>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          <h1 className="mb-6 text-2xl font-bold text-white">My collection</h1>

          {error && (
            <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
          )}

          <div className="relative mb-6 max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="collection-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
            className="w-full rounded border border-gray-600 bg-gray-800 py-2 pl-10 pr-3 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {loading && items.length === 0 ? (
          <>
            <p className="mb-4 text-sm text-gray-400">Loading cards...</p>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <li
                  key={i}
                  className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800"
                >
                  <div className="h-full w-full animate-pulse rounded-lg bg-gray-700/60" />
                </li>
              ))}
            </ul>
          </>
        ) : items.length === 0 ? (
          <p className="text-gray-400">
            No cards found.{" "}
            <Link href="/" className="text-blue-400 hover:underline">
              Browse cards
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-400">
              Showing {items.length} of {totalCount} cards. {inCollectionCount} in your collection (others in grayscale).
            </p>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
              {items.map((card) => {
                const isCardLoading = actionCardId === card.id;
                return (
                  <li key={card.id} className="relative">
                    {isCardLoading && (
                      <div
                        className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60"
                        aria-hidden
                      >
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                    <CardTile
                      wrapperElement="div"
                      card={card}
                      inCollection={card.inCollection}
                      quantity={card.collectionQuantity}
                      showCollectionActions
                      grayscaleWhenNoImage
                      grayscaleWhenNotInCollection
                      actionDisabled={isCardLoading}
                      onAdd={() => handleAdd(card)}
                      onDecrease={() => handleDecrease(card)}
                    />
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div
                ref={loadMoreSentinelRef}
                className="flex min-h-24 items-center justify-center py-6"
                aria-hidden
              >
                {loading && (
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
