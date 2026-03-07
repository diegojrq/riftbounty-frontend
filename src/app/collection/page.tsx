"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CollectionStats } from "@/components/collection/CollectionStats";
import { CardTile } from "@/components/cards/CardTile";
import { CardDetailModal } from "@/components/cards/CardDetailModal";
import {
  addToCollection,
  getCollection,
  removeFromCollection,
  setCollectionVisibility,
  updateQuantity,
} from "@/lib/collections";
import { useAuth } from "@/lib/auth-context";
import { useCards } from "@/lib/cards-context";
import { RangeSlider } from "@/components/filters/RangeSlider";
import { AttributesFilter } from "@/components/filters/AttributesFilter";
import type { Card } from "@/types/card";

const LIMIT = 24;
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

function getCardAttributes(card: Card): string[] {
  if (card.attributes) {
    if (Array.isArray(card.attributes)) return card.attributes as string[];
    return Object.keys(card.attributes);
  }
  if (Array.isArray(card.cardAttributes)) {
    return (card.cardAttributes as Array<{ attribute?: { name?: string }; name?: string }>)
      .map((ca) => ca.attribute?.name ?? ca.name ?? "")
      .filter(Boolean);
  }
  return [];
}

function getCardDomains(card: Card): string[] {
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if (card.domains) result.push(...card.domains.map((d) => d.toLowerCase()));
  if (card.cardDomains) result.push(...card.cardDomains.map((cd) => cd.domain.name.toLowerCase()));
  return [...new Set(result)];
}

function CollectionSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Stats skeleton */}
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="size-24 shrink-0 animate-pulse rounded-full bg-gray-700/80" />
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-700/80" />
                <div className="h-8 w-28 animate-pulse rounded bg-gray-700/80" />
                <div className="h-3 w-40 animate-pulse rounded bg-gray-700/80" />
              </div>
            </div>
            <div className="hidden size-20 animate-pulse rounded-full bg-gray-700/60 sm:block" />
            <div className="hidden size-20 animate-pulse rounded-full bg-gray-700/60 sm:block" />
          </div>
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="border-b border-gray-700 bg-gray-900 px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
        <div className="flex items-center gap-2">
          <div className="h-9 flex-1 animate-pulse rounded border border-gray-700 bg-gray-800" />
          <div className="h-9 w-24 animate-pulse rounded border border-gray-700 bg-gray-800" />
        </div>
      </div>

      {/* Card grid skeleton */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-10 xl:px-12">
        <div className="mb-4 h-4 w-48 animate-pulse rounded bg-gray-700/60" />
        <ul className="grid grid-cols-1 gap-5 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <li key={i} className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800">
              <div className="h-full w-full animate-pulse rounded-lg bg-gray-700/60" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cards: allCards, loading: cardsLoading } = useCards();

  // Collection data: map uuid → quantity
  const [collectionMap, setCollectionMap] = useState<Map<string, number>>(new Map());
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [collectionPublic, setCollectionPublic] = useState<boolean>(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  // UI state
  const [visibleCount, setVisibleCount] = useState(LIMIT);
  const [error, setError] = useState<string | null>(null);
  const [actionCardId, setActionCardId] = useState<string | null>(null);
  const [addAnimations, setAddAnimations] = useState<Map<string, string[]>>(new Map());
  const [removeAnimations, setRemoveAnimations] = useState<Map<string, string[]>>(new Map());
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailUuid, setDetailUuid] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [nameFilter, setNameFilter] = useState<string | undefined>(undefined);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedRarity, setSelectedRarity] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedSet, setSelectedSet] = useState<string | undefined>(undefined);
  const [energyRange, setEnergyRange] = useState<[number, number]>([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max]);
  const [powerRange, setPowerRange] = useState<[number, number]>([POWER_BOUNDS.min, POWER_BOUNDS.max]);
  const [mightRange, setMightRange] = useState<[number, number]>([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max]);
  const [collectionStatus, setCollectionStatus] = useState<"all" | "owned" | "missing">("all");
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);

  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Load collection data (quantities + visibility)
  const loadCollection = useCallback(async () => {
    if (!user) return;
    setCollectionLoading(true);
    setError(null);
    try {
      const data = await getCollection();
      const map = new Map<string, number>();
      for (const item of data.items ?? []) {
        const id = item.card?.uuid ?? item.cardUuid ?? item.cardId;
        if (id) map.set(id, (map.get(id) ?? 0) + (item.quantity ?? 0));
      }
      setCollectionMap(map);
      setCollectionPublic(data.collection.isPublic ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading collection");
    } finally {
      setCollectionLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection, statsRefreshTrigger]);

  // Search debounce
  useEffect(() => {
    if (!user) return;
    const trimmed = searchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH) return;
    const effectiveName = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : undefined;
    const timer = setTimeout(() => setNameFilter(effectiveName), effectiveName ? 0 : 0);
    return () => clearTimeout(timer);
  }, [user, searchQuery]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(LIMIT);
  }, [nameFilter, selectedDomains, selectedRarity, selectedType, selectedSet, collectionStatus, selectedAttributes, energyRange, powerRange, mightRange]);

  // Enrich cards with collection data
  const enrichedCards = useMemo(() => {
    return allCards.map((card) => ({
      ...card,
      inCollection: collectionMap.has(card.uuid),
      collectionQuantity: collectionMap.get(card.uuid) ?? 0,
    }));
  }, [allCards, collectionMap]);

  // Apply all filters locally
  const filteredCards = useMemo(() => {
    return enrichedCards.filter((card) => {
      if (nameFilter) {
        const q = nameFilter.toLowerCase();
        const nameMatch = card.name.toLowerCase().includes(q);
        const subtypeMatch =
          card.subtypes?.some((s) => s.toLowerCase().includes(q)) ||
          (card.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }> | undefined)?.some(
            (cs) => ((cs?.subtype?.name ?? cs?.name) ?? "").toLowerCase().includes(q)
          );
        const descriptionMatch = card.description?.toLowerCase().includes(q) ?? false;
        if (!nameMatch && !subtypeMatch && !descriptionMatch) return false;
      }
      if (selectedDomains.length > 0) {
        const allDomains = getCardDomains(card);
        const knownDomains = allDomains.filter((d) => (DOMAINS as readonly string[]).includes(d));
        const matchesDomain = selectedDomains.filter((d) => d !== "colorless").some((d) => allDomains.includes(d));
        const matchesColorless = selectedDomains.includes("colorless") && knownDomains.length === 0;
        if (!matchesDomain && !matchesColorless) return false;
      }
      if (selectedRarity && card.rarity?.toLowerCase() !== selectedRarity) return false;
      if (selectedType && card.type?.toLowerCase() !== selectedType) return false;
      if (selectedSet) {
        const cardSetVal = (card.set ?? card.cardSet ?? "").toUpperCase();
        if (cardSetVal !== selectedSet) return false;
      }
      if (collectionStatus === "owned" && !card.inCollection) return false;
      if (collectionStatus === "missing" && card.inCollection) return false;
      if (selectedAttributes.length > 0) {
        const attrs = getCardAttributes(card).map((a) => a.toLowerCase());
        if (!selectedAttributes.some((a) => attrs.includes(a.toLowerCase()))) return false;
      }
      if (card.energy != null) {
        if (card.energy < energyRange[0] || (energyRange[1] < ENERGY_BOUNDS.max && card.energy > energyRange[1])) return false;
      }
      if (card.power != null) {
        if (card.power < powerRange[0] || (powerRange[1] < POWER_BOUNDS.max && card.power > powerRange[1])) return false;
      }
      if (card.might != null) {
        if (card.might < mightRange[0] || (mightRange[1] < MIGHT_BOUNDS.max && card.might > mightRange[1])) return false;
      }
      return true;
    });
  }, [enrichedCards, nameFilter, selectedDomains, selectedRarity, selectedType, selectedSet, collectionStatus, selectedAttributes, energyRange, powerRange, mightRange]);

  const totalCount = filteredCards.length;
  const visibleCards = filteredCards.slice(0, visibleCount);
  const hasMore = visibleCount < totalCount;
  const inCollectionCount = filteredCards.filter((c) => c.inCollection).length;

  const loadMore = useCallback(() => {
    setVisibleCount((v) => v + LIMIT);
  }, []);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!hasMore) return;
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: "200px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  function flashCard(uuid: string) {
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

  function flashRemove(uuid: string) {
    const key = `${uuid}-${Date.now()}-${Math.random()}`;
    setRemoveAnimations((prev) => {
      const next = new Map(prev);
      next.set(uuid, [...(next.get(uuid) ?? []), key]);
      return next;
    });
    setTimeout(() => {
      setRemoveAnimations((prev) => {
        const next = new Map(prev);
        const arr = (next.get(uuid) ?? []).filter((k) => k !== key);
        if (arr.length === 0) next.delete(uuid);
        else next.set(uuid, arr);
        return next;
      });
    }, 700);
  }

  async function handleAdd(card: Card) {
    if (!user) return;
    setActionCardId(card.uuid);
    try {
      await addToCollection(card.uuid, 1);
      setCollectionMap((prev) => {
        const next = new Map(prev);
        next.set(card.uuid, (next.get(card.uuid) ?? 0) + 1);
        return next;
      });
      flashCard(card.uuid);
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
      setCollectionMap((prev) => {
        const next = new Map(prev);
        next.delete(card.uuid);
        return next;
      });
      flashRemove(card.uuid);
      setStatsRefreshTrigger((t) => t + 1);
    } catch {
      // could set error toast
    } finally {
      setActionCardId(null);
    }
  }

  async function handleDecrease(card: Card) {
    if (!user) return;
    const qty = collectionMap.get(card.uuid) ?? 1;
    if (qty <= 1) {
      await handleRemove(card);
      return;
    }
    setActionCardId(card.uuid);
    try {
      const data = await updateQuantity(card.uuid, qty - 1);
      setCollectionMap((prev) => {
        const next = new Map(prev);
        const id = data.cardId ?? data.cardUuid ?? data.card?.uuid ?? card.uuid;
        next.set(id, data.quantity);
        return next;
      });
      flashRemove(card.uuid);
      setStatsRefreshTrigger((t) => t + 1);
    } catch {
      // could set error toast
    } finally {
      setActionCardId(null);
    }
  }

  async function handleVisibilityToggle() {
    if (!user) return;
    setVisibilityLoading(true);
    try {
      const next = !collectionPublic;
      await setCollectionVisibility(next);
      setCollectionPublic(next);
    } catch {
      // toast error
    } finally {
      setVisibilityLoading(false);
    }
  }

  if (authLoading || !user || (cardsLoading && allCards.length === 0)) {
    return <CollectionSkeleton />;
  }

  const hasActiveFilters =
    !!(nameFilter || selectedDomains.length > 0 || selectedRarity || selectedType || selectedSet
    || collectionStatus !== "all"
    || selectedAttributes.length > 0
    || energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max
    || powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max
    || mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDomains([]);
    setSelectedRarity(undefined);
    setSelectedType(undefined);
    setSelectedSet(undefined);
    setCollectionStatus("all");
    setSelectedAttributes([]);
    setEnergyRange([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max]);
    setPowerRange([POWER_BOUNDS.min, POWER_BOUNDS.max]);
    setMightRange([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max]);
  };

  const filterContent = (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-5 sm:gap-y-3">

        {/* Domain */}
        <div className="shrink-0">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Domain</p>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={() => setSelectedDomains([])} aria-pressed={selectedDomains.length === 0}
              className={`h-8 rounded border-2 px-2 text-xs font-medium transition-all ${selectedDomains.length === 0 ? "border-white bg-gray-600 text-white" : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"}`}>
              All
            </button>
            {DOMAINS.map((domain) => (
              <button key={domain} type="button"
                onClick={() => setSelectedDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain])}
                aria-pressed={selectedDomains.includes(domain)} title={domain.charAt(0).toUpperCase() + domain.slice(1)}
                className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded border-2 p-0.5 transition-all ${selectedDomains.includes(domain) ? "border-white bg-white/20 ring-1 ring-white/50" : "border-gray-600 hover:border-gray-400"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/domains/${domain}.webp`} alt={domain} className="h-full w-full object-contain" />
              </button>
            ))}
            <button type="button"
              onClick={() => setSelectedDomains((prev) => prev.includes("colorless") ? prev.filter((d) => d !== "colorless") : [...prev, "colorless"])}
              aria-pressed={selectedDomains.includes("colorless")} title="Colorless"
              className={`flex h-8 w-8 items-center justify-center rounded border-2 transition-all ${selectedDomains.includes("colorless") ? "border-white bg-white/20 ring-1 ring-white/50" : "border-gray-600 bg-gray-800 hover:border-gray-400"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93 19.07 19.07"/></svg>
            </button>
          </div>
        </div>

        <div className="hidden h-10 w-px shrink-0 self-end bg-gray-700 sm:block" />

        {/* Status */}
        <div className="shrink-0">
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Status</p>
          <div className="flex gap-1">
            {(["all", "owned", "missing"] as const).map((opt) => (
              <button key={opt} type="button" onClick={() => setCollectionStatus(opt)} aria-pressed={collectionStatus === opt}
                className={`rounded border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                  collectionStatus === opt
                    ? opt === "missing" ? "border-amber-500 bg-amber-500/20 text-amber-300" : opt === "owned" ? "border-green-500 bg-green-500/20 text-green-300" : "border-white bg-gray-600 text-white"
                    : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                }`}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden h-10 w-px shrink-0 self-end bg-gray-700 sm:block" />

        {/* Rarity */}
        <div className="shrink-0">
          <label htmlFor="collection-filter-rarity" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Rarity</label>
          <select id="collection-filter-rarity" value={selectedRarity ?? ""} onChange={(e) => setSelectedRarity(e.target.value || undefined)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white">
            <option value="">All</option>
            {RARITY_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>

        {/* Type */}
        <div className="shrink-0">
          <label htmlFor="collection-filter-type" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Type</label>
          <select id="collection-filter-type" value={selectedType ?? ""} onChange={(e) => setSelectedType(e.target.value || undefined)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white">
            <option value="">All</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        {/* Set */}
        <div className="shrink-0">
          <label htmlFor="collection-filter-set" className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">Set</label>
          <select id="collection-filter-set" value={selectedSet ?? ""} onChange={(e) => setSelectedSet(e.target.value || undefined)}
            className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white">
            <option value="">All sets</option>
            {SET_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

      </div>

      {/* Range sliders */}
      <div className="border-t border-gray-700 pt-3">
        <div className="grid grid-cols-1 gap-4 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
          <div className="w-full sm:w-44"><RangeSlider label="Energy" minBound={ENERGY_BOUNDS.min} maxBound={ENERGY_BOUNDS.max} valueMin={energyRange[0]} valueMax={energyRange[1]} onChange={(min, max) => setEnergyRange([min, max])} showAnyLabel /></div>
          <div className="w-full sm:w-44"><RangeSlider label="Power" minBound={POWER_BOUNDS.min} maxBound={POWER_BOUNDS.max} valueMin={powerRange[0]} valueMax={powerRange[1]} onChange={(min, max) => setPowerRange([min, max])} showAnyLabel /></div>
          <div className="w-full sm:w-44"><RangeSlider label="Might" minBound={MIGHT_BOUNDS.min} maxBound={MIGHT_BOUNDS.max} valueMin={mightRange[0]} valueMax={mightRange[1]} onChange={(min, max) => setMightRange([min, max])} showAnyLabel /></div>
        </div>
      </div>

      {/* Attributes */}
      <div className="border-t border-gray-700 pt-3">
        <AttributesFilter selected={selectedAttributes} onChange={setSelectedAttributes} />
      </div>

      {hasActiveFilters && (
        <button type="button" onClick={clearFilters} className="w-full rounded border border-gray-600 bg-gray-700/50 py-2 text-sm text-gray-300 hover:bg-gray-700 sm:w-auto sm:px-3 sm:py-1.5">
          Clear all filters
        </button>
      )}
    </div>
  );

  const activeChips = hasActiveFilters && (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Active:</span>
      {collectionStatus === "missing" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/60 px-2.5 py-0.5 text-xs text-amber-300">Missing only<button type="button" onClick={() => setCollectionStatus("all")} className="rounded-full p-0.5 hover:bg-amber-800/60" aria-label="Clear status"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {collectionStatus === "owned" && <span className="inline-flex items-center gap-1 rounded-full bg-green-900/60 px-2.5 py-0.5 text-xs text-green-300">Owned only<button type="button" onClick={() => setCollectionStatus("all")} className="rounded-full p-0.5 hover:bg-green-800/60" aria-label="Clear status"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {nameFilter && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Search: {nameFilter}<button type="button" onClick={() => setSearchQuery("")} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear search"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {selectedDomains.map((d) => <span key={d} className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Domain: {d.charAt(0).toUpperCase() + d.slice(1)}<button type="button" onClick={() => setSelectedDomains((prev) => prev.filter((x) => x !== d))} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear domain"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>)}
      {selectedRarity && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Rarity: {selectedRarity.charAt(0).toUpperCase() + selectedRarity.slice(1)}<button type="button" onClick={() => setSelectedRarity(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear rarity"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {selectedType && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Type: {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}<button type="button" onClick={() => setSelectedType(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear type"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {selectedSet && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Set: {SET_OPTIONS.find((s) => s.value === selectedSet)?.label ?? selectedSet}<button type="button" onClick={() => setSelectedSet(undefined)} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear set"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {selectedAttributes.map((attr) => <span key={attr} className="inline-flex items-center gap-1 rounded-full bg-blue-900/60 px-2.5 py-0.5 text-xs text-blue-300">{attr}<button type="button" onClick={() => setSelectedAttributes(selectedAttributes.filter((a) => a !== attr))} className="rounded-full p-0.5 hover:bg-blue-800/60" aria-label={`Clear ${attr}`}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>)}
      {(energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max) && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Energy: {energyRange[0]}–{energyRange[1] === ENERGY_BOUNDS.max ? "Any" : energyRange[1]}<button type="button" onClick={() => setEnergyRange([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max])} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear energy"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {(powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max) && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Power: {powerRange[0]}–{powerRange[1] === POWER_BOUNDS.max ? "Any" : powerRange[1]}<button type="button" onClick={() => setPowerRange([POWER_BOUNDS.min, POWER_BOUNDS.max])} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear power"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
      {(mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max) && <span className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-white">Might: {mightRange[0]}–{mightRange[1] === MIGHT_BOUNDS.max ? "Any" : mightRange[1]}<button type="button" onClick={() => setMightRange([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max])} className="rounded-full p-0.5 hover:bg-gray-600" aria-label="Clear might"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>}
    </div>
  );

  const isLoading = collectionLoading && allCards.length === 0;

  return (
    <div className="min-h-screen bg-gray-900">

      {/* ── Mobile Filters Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute bottom-[60px] left-0 right-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-gray-700 bg-gray-900 px-4 pb-6 pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-600" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">Filters</h2>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters" className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-800 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            {filterContent}
            {activeChips && (
              <div className="mt-4 border-t border-gray-700 pt-4">
                {activeChips}
              </div>
            )}
            <button type="button" onClick={() => setDrawerOpen(false)} className="mt-5 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Show results
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-3 sm:px-6 lg:px-10 xl:px-12">
        <header className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-gray-700 pb-3">
          <h1 className="text-2xl font-bold text-white">My collection</h1>
          {error && (
            <div className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-200">{error}</div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Public collection</span>
            <button type="button" role="switch" aria-checked={collectionPublic} disabled={visibilityLoading} onClick={handleVisibilityToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${collectionPublic ? "border-emerald-500 bg-emerald-600" : "border-gray-600 bg-gray-700"} ${visibilityLoading ? "opacity-50" : ""}`}>
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${collectionPublic ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-xs text-gray-500">Visible on your profile</span>
          </div>
        </header>
        <CollectionStats breakdown={false} refreshTrigger={statsRefreshTrigger} />
      </div>

      {/* Barra de filtros — sticky abaixo do header (desktop) */}
      <div className="sticky top-0 z-20 border-b border-gray-700 bg-gray-900 sm:top-[61px]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 lg:px-10 xl:px-12">

          {/* Linha busca + toggle — desktop only */}
          <div className="mb-3 hidden items-center gap-2 sm:flex">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </span>
              <input id="collection-search-desktop" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search card name..."
                className="w-full rounded border border-gray-600 bg-gray-800 py-2 pl-9 pr-14 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              {searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_SEARCH_LENGTH && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-amber-400">{searchQuery.trim().length}/{MIN_SEARCH_LENGTH}</span>
              )}
            </div>
            <button type="button" onClick={() => setFiltersExpanded((v) => !v)}
              className="shrink-0 flex items-center gap-1.5 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700" aria-expanded={filtersExpanded}>
              Filters
              {hasActiveFilters && <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={filtersExpanded ? "rotate-180" : ""} aria-hidden><path d="m6 9 6 6 6-6" /></svg>
            </button>
          </div>

          {searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_SEARCH_LENGTH && (
            <p className="mb-3 mt-1 hidden text-xs text-amber-400/80 sm:block">
              {MIN_SEARCH_LENGTH - searchQuery.trim().length} more {MIN_SEARCH_LENGTH - searchQuery.trim().length === 1 ? "character" : "characters"} to search
            </p>
          )}

          {filtersExpanded && (
            <div className="hidden sm:block">
              {filterContent}
            </div>
          )}

          <div className="hidden sm:block">
            {activeChips}
          </div>
        </div>
      </div>

      {/* ── Bottom bar fixa — mobile only ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-700 bg-gray-900/95 px-3 py-2 backdrop-blur-sm sm:hidden">
        {searchQuery.trim().length > 0 && searchQuery.trim().length < MIN_SEARCH_LENGTH && (
          <p className="mb-1.5 text-center text-xs text-amber-400/80">
            {MIN_SEARCH_LENGTH - searchQuery.trim().length} more character{MIN_SEARCH_LENGTH - searchQuery.trim().length !== 1 ? "s" : ""} to search
          </p>
        )}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              id="collection-search-mobile"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search card name..."
              className="w-full rounded border border-gray-600 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700"
            aria-label="Open filters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
            Filters
            {hasActiveFilters && <span className="flex h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Área de cartas */}
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 pb-24 sm:pb-5 sm:px-6 lg:px-10 xl:px-12">
        {isLoading ? (
          <>
            <p className="mb-4 text-sm text-gray-400">Loading cards...</p>
            <ul className="grid grid-cols-1 gap-5 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <li key={i} className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800">
                  <div className="h-full w-full animate-pulse rounded-lg bg-gray-700/60" />
                </li>
              ))}
            </ul>
          </>
        ) : visibleCards.length === 0 ? (
          <p className="text-gray-400">
            No cards found.{" "}
            <Link href="/" className="text-blue-400 hover:underline">Browse cards</Link>.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-400">
              Showing {visibleCards.length} of {totalCount} cards.
              {collectionStatus === "all" && <> {inCollectionCount} in your collection.</>}
              {hasMore && <span className="ml-1 text-gray-500">Scroll down to load more.</span>}
            </p>
            <ul className="grid grid-cols-1 gap-5 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visibleCards.map((card) => {
                const isCardLoading = actionCardId === card.uuid;
                return (
                  <li key={card.uuid} className="relative">
                    {isCardLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/60" aria-hidden>
                        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                    <CardTile
                      wrapperElement="div"
                      card={card}
                      inCollection={card.inCollection}
                      quantity={card.collectionQuantity}
                      showCollectionActions
                      onOpenDetail={() => setDetailUuid(card.uuid)}
                      grayscaleWhenNoImage
                      grayscaleWhenNotInCollection
                      actionDisabled={isCardLoading}
                      addKeys={addAnimations.get(card.uuid) ?? []}
                      removeKeys={removeAnimations.get(card.uuid) ?? []}
                      onAdd={() => handleAdd(card)}
                      onDecrease={() => handleDecrease(card)}
                    />
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div ref={loadMoreSentinelRef} className="flex min-h-24 items-center justify-center py-6" aria-hidden>
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-white" />
              </div>
            )}
          </>
        )}
      </div>

      <CardDetailModal
        uuid={detailUuid}
        onClose={() => setDetailUuid(null)}
        onCollectionChange={loadCollection}
      />
    </div>
  );
}
