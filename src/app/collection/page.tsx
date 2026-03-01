"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CollectionStats } from "@/components/collection/CollectionStats";
import { CardTile } from "@/components/cards/CardTile";
import {
  addToCollection,
  removeFromCollection,
  updateQuantity,
} from "@/lib/collections";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import { RangeSlider } from "@/components/filters/RangeSlider";
import type { Card } from "@/types/card";
import type { CardsListResponse, CardsQueryParams } from "@/types/card";

function toQueryRecord(p: CardsQueryParams): Record<string, string | number | boolean | undefined> {
  return p as Record<string, string | number | boolean | undefined>;
}

const LIMIT = 24;
const SEARCH_DEBOUNCE_MS = 400;
const MIN_SEARCH_LENGTH = 3;

const DOMAINS = ["fury", "calm", "mind", "body", "chaos", "order"] as const;

const RARITY_OPTIONS = ["common", "uncommon", "rare", "epic", "showcase"] as const;
const TYPE_OPTIONS = ["gear", "spell", "rune", "legend", "unit", "battlefield", "champion"] as const;
const SET_OPTIONS = [
  { value: "OGN", label: "Origins Main Set" },
  { value: "SFD", label: "Spiritforged" },
] as const;
const ENERGY_BOUNDS = { min: 0, max: 12 };
const POWER_BOUNDS = { min: 0, max: 10 };
const MIGHT_BOUNDS = { min: 0, max: 10 };

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
  const [selectedRarity, setSelectedRarity] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedSet, setSelectedSet] = useState<string | undefined>(undefined);
  const [energyRange, setEnergyRange] = useState<[number, number]>([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max]);
  const [powerRange, setPowerRange] = useState<[number, number]>([POWER_BOUNDS.min, POWER_BOUNDS.max]);
  const [mightRange, setMightRange] = useState<[number, number]>([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max]);
  const [collectionStatus, setCollectionStatus] = useState<"all" | "owned" | "missing">("all");
  const [actionCardId, setActionCardId] = useState<string | null>(null);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback(
    (overrides: { offset?: number; name?: string } = {}) => {
      const name = overrides.name !== undefined ? overrides.name : nameFilter;
      const base: CardsQueryParams = {
        limit: LIMIT,
        offset: overrides.offset ?? 0,
        sortBy: "collector_number",
        order: "asc",
        ...(name && { name }),
        ...(selectedDomain && { domain: selectedDomain }),
        ...(selectedRarity && { rarity: selectedRarity }),
        ...(selectedType && { type: selectedType }),
        ...(selectedSet && { set: selectedSet }),
        ...(collectionStatus === "owned" && { inCollection: true }),
        ...(collectionStatus === "missing" && { inCollection: false }),
        ...(energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max
          ? { energyMin: energyRange[0], energyMax: energyRange[1] }
          : {}),
        ...(powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max
          ? { powerMin: powerRange[0], powerMax: powerRange[1] }
          : {}),
        ...(mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max
          ? { mightMin: mightRange[0], mightMax: mightRange[1] }
          : {}),
      };
      return base;
    },
    [nameFilter, selectedDomain, selectedRarity, selectedType, selectedSet, collectionStatus, energyRange, powerRange, mightRange]
  );

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

  // Debounce só para o texto da busca; nome efetivo atualizado aqui
  useEffect(() => {
    if (!user) return;
    const trimmed = searchQuery.trim();
    const effectiveName = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : undefined;
    const timer = setTimeout(() => setNameFilter(effectiveName), effectiveName ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [user, searchQuery]);

  // Fetch quando qualquer filtro ou nome efetivo mudar
  useEffect(() => {
    if (!user) return;
    setOffset(0);
    fetchCards(buildParams({ offset: 0 }));
  }, [user, nameFilter, selectedDomain, selectedRarity, selectedType, selectedSet, collectionStatus, buildParams, fetchCards]);

  const loadMore = useCallback(async () => {
    if (!user) return;
    const nextOffset = offset + LIMIT;
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<CardsListResponse>("/cards", toQueryRecord(buildParams({ offset: nextOffset })));
      setItems((prev) => [...prev, ...res.data.items]);
      setOffset(nextOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading more");
    } finally {
      setLoading(false);
    }
  }, [user, offset, buildParams]);

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
    setActionCardId(card.uuid);
    try {
      await addToCollection(card.uuid, 1);
      setItems((prev) =>
        prev.map((c) =>
          c.uuid === card.uuid
            ? { ...c, inCollection: true, collectionQuantity: (c.collectionQuantity ?? 0) + 1 }
            : c
        )
      );
      setStatsRefreshTrigger((t) => t + 1);
    } catch {
      // could set error toast
    } finally {
      setActionCardId(null);
    }
  }

  async function handleRemove(card: Card) {
    if (!user) return;
    setActionCardId(card.uuid);
    try {
      await removeFromCollection(card.uuid);
      setItems((prev) =>
        prev.map((c) =>
          c.uuid === card.uuid ? { ...c, inCollection: false, collectionQuantity: 0 } : c
        )
      );
      setStatsRefreshTrigger((t) => t + 1);
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
    setActionCardId(card.uuid);
    try {
      const data = await updateQuantity(card.uuid, qty - 1);
      setItems((prev) =>
        prev.map((c) =>
          c.uuid === (data.cardId ?? data.card?.uuid)
            ? { ...c, ...data.card, collectionQuantity: data.quantity, inCollection: true }
            : c
        )
      );
      setStatsRefreshTrigger((t) => t + 1);
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
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        {/* Topo: título + filtros ativos + contagem (largura toda) */}
        <header className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-white">My collection</h1>
          {error && (
            <div className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-200">{error}</div>
          )}
        </header>

        <div className="mb-8">
          <CollectionStats
            breakdown={false}
            refreshTrigger={statsRefreshTrigger}
          />
        </div>

        <div className="flex gap-6">
        {/* Menu lateral: busca + filtros (sticky) */}
        <aside className="sticky top-8 flex w-52 h-fit shrink-0 flex-col gap-4 self-start">
          <div>
            <label htmlFor="collection-search" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Search
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                id="collection-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Card name..."
                className="w-full rounded border border-gray-600 bg-gray-800 py-2 pl-8 pr-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Domain</p>
            <button
              type="button"
              onClick={() => setSelectedDomain(undefined)}
              className={`mb-2 flex w-full items-center justify-center rounded-md border-2 py-2.5 text-sm font-medium transition-all ${
                selectedDomain === undefined
                  ? "border-white bg-gray-600 text-white ring-2 ring-white/50"
                  : "border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500"
              }`}
              title="All domains"
              aria-pressed={selectedDomain === undefined}
            >
              All Domains
            </button>
            <div className="grid grid-cols-3 gap-1.5">
              {DOMAINS.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => setSelectedDomain(domain)}
                  className={`flex aspect-square items-center justify-center overflow-hidden rounded-md border-2 p-1 transition-all ${
                    selectedDomain === domain
                      ? "border-white bg-white/20 ring-2 ring-white/50"
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
            </div>
          </div>
          <div>
            <label htmlFor="collection-filter-rarity" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Rarity
            </label>
            <select
              id="collection-filter-rarity"
              value={selectedRarity ?? ""}
              onChange={(e) => setSelectedRarity(e.target.value || undefined)}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white"
            >
              <option value="">All</option>
              {RARITY_OPTIONS.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="collection-filter-type" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </label>
            <select
              id="collection-filter-type"
              value={selectedType ?? ""}
              onChange={(e) => setSelectedType(e.target.value || undefined)}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white"
            >
              <option value="">All</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="collection-filter-set" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Set
            </label>
            <select
              id="collection-filter-set"
              value={selectedSet ?? ""}
              onChange={(e) => setSelectedSet(e.target.value || undefined)}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white"
            >
              <option value="">All</option>
              {SET_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Status</p>
            <div className="grid grid-cols-3 gap-1">
              {(["all", "owned", "missing"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCollectionStatus(opt)}
                  aria-pressed={collectionStatus === opt}
                  className={`rounded-md border-2 py-1.5 text-xs font-medium transition-all ${
                    collectionStatus === opt
                      ? opt === "missing"
                        ? "border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                        : opt === "owned"
                        ? "border-green-500 bg-green-500/20 text-green-300 ring-1 ring-green-500/40"
                        : "border-white bg-gray-600 text-white ring-1 ring-white/30"
                      : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <RangeSlider
            label="Energy"
            minBound={ENERGY_BOUNDS.min}
            maxBound={ENERGY_BOUNDS.max}
            valueMin={energyRange[0]}
            valueMax={energyRange[1]}
            onChange={(min, max) => setEnergyRange([min, max])}
            showAnyLabel
          />
          <RangeSlider
            label="Power"
            minBound={POWER_BOUNDS.min}
            maxBound={POWER_BOUNDS.max}
            valueMin={powerRange[0]}
            valueMax={powerRange[1]}
            onChange={(min, max) => setPowerRange([min, max])}
            showAnyLabel
          />
          <RangeSlider
            label="Might"
            minBound={MIGHT_BOUNDS.min}
            maxBound={MIGHT_BOUNDS.max}
            valueMin={mightRange[0]}
            valueMax={mightRange[1]}
            onChange={(min, max) => setMightRange([min, max])}
            showAnyLabel
          />
          {(nameFilter || selectedDomain || selectedRarity || selectedType || selectedSet
            || collectionStatus !== "all"
            || energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max
            || powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max
            || mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedDomain(undefined);
                setSelectedRarity(undefined);
                setSelectedType(undefined);
                setSelectedSet(undefined);
                setCollectionStatus("all");
                setEnergyRange([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max]);
                setPowerRange([POWER_BOUNDS.min, POWER_BOUNDS.max]);
                setMightRange([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max]);
              }}
              className="w-full rounded border border-gray-600 bg-gray-700/50 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              Clear filters
            </button>
          )}
        </aside>

        <div className="min-w-0 flex-1 border-l border-gray-700 pl-6">
          {(nameFilter || selectedDomain || selectedRarity || selectedType || selectedSet
            || collectionStatus !== "all"
            || energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max
            || powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max
            || mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Filters:</span>
              {collectionStatus === "missing" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/60 px-2.5 py-1 text-sm text-amber-300">
                  Missing only
                  <button type="button" onClick={() => setCollectionStatus("all")} className="rounded-full p-0.5 hover:bg-amber-800/60" aria-label="Clear status filter"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {collectionStatus === "owned" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-900/60 px-2.5 py-1 text-sm text-green-300">
                  Owned only
                  <button type="button" onClick={() => setCollectionStatus("all")} className="rounded-full p-0.5 hover:bg-green-800/60" aria-label="Clear status filter"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {nameFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Search: {nameFilter}
                  <button type="button" onClick={() => setSearchQuery("")} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear search"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {selectedDomain && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Domain: {selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1)}
                  <button type="button" onClick={() => setSelectedDomain(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear domain"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {selectedRarity && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Rarity: {selectedRarity.charAt(0).toUpperCase() + selectedRarity.slice(1)}
                  <button type="button" onClick={() => setSelectedRarity(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear rarity"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {selectedType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Type: {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                  <button type="button" onClick={() => setSelectedType(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear type"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {selectedSet && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Set: {SET_OPTIONS.find((s) => s.value === selectedSet)?.label ?? selectedSet}
                  <button type="button" onClick={() => setSelectedSet(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear set"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {(energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Energy: {energyRange[0]}–{energyRange[1] === ENERGY_BOUNDS.max ? "Any" : energyRange[1]}
                  <button type="button" onClick={() => setEnergyRange([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max])} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear energy"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {(powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Power: {powerRange[0]}–{powerRange[1] === POWER_BOUNDS.max ? "Any" : powerRange[1]}
                  <button type="button" onClick={() => setPowerRange([POWER_BOUNDS.min, POWER_BOUNDS.max])} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear power"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
              {(mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-1 text-sm text-white">
                  Might: {mightRange[0]}–{mightRange[1] === MIGHT_BOUNDS.max ? "Any" : mightRange[1]}
                  <button type="button" onClick={() => setMightRange([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max])} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear might"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
                </span>
              )}
            </div>
          )}
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
              {hasMore && (
                <span className="mt-1 block text-gray-500">Scroll down to load more.</span>
              )}
            </p>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5">
              {items.map((card) => {
                const isCardLoading = actionCardId === card.uuid;
                return (
                  <li key={card.uuid} className="relative">
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
                      linkToDetail
                      detailFrom="collection"
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
    </div>
  );
}

