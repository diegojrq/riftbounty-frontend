"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CardDetailModal } from "@/components/cards/CardDetailModal";
import { CardTile } from "@/components/cards/CardTile";
import { AbilitiesFilter } from "@/components/filters/AbilitiesFilter";
import { RangeSlider } from "@/components/filters/RangeSlider";
import { useAuth } from "@/lib/auth-context";
import { useCards } from "@/lib/cards-context";
import { getCardSetFilterValue } from "@/lib/card-set";
import { cardMatchesAnyAbility } from "@/lib/card-ability-filter";
import { cardDescriptionPlainText } from "@/lib/html-description";
import {
  formatMoneyCentMask,
  MAX_MONEY_CENTS,
  moneyCentsToValue,
  parseMoneyInputValue,
  valueToMoneyCents,
} from "@/lib/money-input";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale";
import { getCollection } from "@/lib/collections";
import { clearForSale, getProfile, updateProfile, type UpdateProfilePayload } from "@/lib/profile";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import type { ForSalePriceMode } from "@/types/auth";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";
import { getCardDisplayName } from "@/lib/card-display-name";

const LIMIT = 24;
const MIN_SEARCH_LENGTH = 3;
const DOMAINS = ["fury", "calm", "mind", "body", "chaos", "order"] as const;
const RARITY_OPTIONS = ["common", "uncommon", "rare", "epic", "showcase"] as const;
const TYPE_OPTIONS = ["gear", "spell", "rune", "legend", "unit", "battlefield", "champion"] as const;
const ENERGY_BOUNDS = { min: 0, max: 12 };
const POWER_BOUNDS = { min: 0, max: 10 };
const MIGHT_BOUNDS = { min: 0, max: 10 };
const OWNED_QTY_BOUNDS = { min: 0, max: 20 };

type ForSaleItem = {
  cardId: string;
  quantity: number;
  pricePerCard: number | null;
  priceMode: ForSalePriceMode;
  pricePercent: number | null;
};

const FIXED_PERCENT = 10;

function ForSaleCardPriceInput({
  cardId,
  value,
  disabled,
  locale,
  label,
  placeholder,
  onCommit,
}: {
  cardId: string;
  value: number | null;
  disabled: boolean;
  locale: Locale;
  label: string;
  placeholder: string;
  onCommit: (id: string, price: number | null) => void | Promise<void>;
}) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBeforeInputRef = useRef(false);
  const [cents, setCents] = useState(() => valueToMoneyCents(value));
  const focusedRef = useRef(false);
  const centsRef = useRef(cents);
  centsRef.current = cents;

  const display = formatMoneyCentMask(cents, locale);

  useEffect(() => {
    if (!focusedRef.current) {
      const v = valueToMoneyCents(value);
      centsRef.current = v;
      setCents(v);
    }
  }, [value]);

  useLayoutEffect(() => {
    if (!focusedRef.current || !inputRef.current) return;
    const el = inputRef.current;
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [cents, locale]);

  function pushDigit(d: number) {
    setCents((c) => {
      const next = Math.min(MAX_MONEY_CENTS, c * 10 + d);
      centsRef.current = next;
      return next;
    });
  }

  function popDigit() {
    setCents((c) => {
      const next = Math.trunc(c / 10);
      centsRef.current = next;
      return next;
    });
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={() => {
        /* controlado por onKeyDown / onBeforeInput; onChange exigido pelo React para inputs com value */
      }}
      title={placeholder}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          skipBeforeInputRef.current = true;
          pushDigit(e.key.charCodeAt(0) - 48);
          queueMicrotask(() => {
            skipBeforeInputRef.current = false;
          });
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          skipBeforeInputRef.current = true;
          popDigit();
          queueMicrotask(() => {
            skipBeforeInputRef.current = false;
          });
        }
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      onBeforeInput={(e) => {
        if (disabled || skipBeforeInputRef.current) return;
        const ie = e.nativeEvent as InputEvent;
        if (ie.inputType === "insertText" && ie.data) {
          if (ie.data.length === 1 && /^[0-9]$/.test(ie.data)) {
            e.preventDefault();
            pushDigit(Number(ie.data));
            return;
          }
          e.preventDefault();
          return;
        }
        if (ie.inputType === "deleteContentBackward" || ie.inputType === "deleteBackward") {
          e.preventDefault();
          popDigit();
        }
      }}
      onPaste={(e) => {
        if (disabled) return;
        e.preventDefault();
        const txt = e.clipboardData.getData("text");
        const result = parseMoneyInputValue(txt, locale);
        if (!result.ok) {
          toast.error(t("forSale.invalidPrice"));
          return;
        }
        const next = valueToMoneyCents(result.value);
        centsRef.current = next;
        setCents(next);
      }}
      onBlur={() => {
        focusedRef.current = false;
        void onCommit(cardId, moneyCentsToValue(centsRef.current));
      }}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
      aria-label={label}
    />
  );
}

function getCardDomains(card: Card): string[] {
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if (card.domains) result.push(...card.domains.map((d) => d.toLowerCase()));
  if (card.cardDomains) result.push(...card.cardDomains.map((cd) => cd.domain.name.toLowerCase()));
  return [...new Set(result)];
}

export default function ForSalePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cards: allCards, loading: cardsLoading } = useCards();
  const { t, locale } = useLocale();
  const { sets, formatSetWithCode } = useRiotCatalogSets();

  const [forSaleMap, setForSaleMap] = useState<Map<string, ForSaleItem>>(new Map());
  const [collectionQtyMap, setCollectionQtyMap] = useState<Map<string, number>>(new Map());
  const [loadingForSale, setLoadingForSale] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingForSale, setClearingForSale] = useState(false);
  const [isClearForSaleModalOpen, setIsClearForSaleModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionCardId, setActionCardId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(LIMIT);
  const [detailUuid, setDetailUuid] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [nameFilter, setNameFilter] = useState<string | undefined>(undefined);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedRarity, setSelectedRarity] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedSet, setSelectedSet] = useState<string | undefined>(undefined);
  const [energyRange, setEnergyRange] = useState<[number, number]>([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max]);
  const [powerRange, setPowerRange] = useState<[number, number]>([POWER_BOUNDS.min, POWER_BOUNDS.max]);
  const [mightRange, setMightRange] = useState<[number, number]>([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max]);
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState<"all" | "owned" | "missing">("all");
  const [ownedQtyThreshold, setOwnedQtyThreshold] = useState(0);

  const fixedDiscountMode: ForSalePriceMode = locale === "pt-BR" ? "liga_minus_percent" : "tcgplayer_minus_percent";

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadForSaleAndCollection = useCallback(async () => {
    if (!user) return;
    setLoadingForSale(true);
    setError(null);
    try {
      const profile = await getProfile();
      const map = new Map<string, ForSaleItem>();
      for (const item of profile.forSale ?? []) {
        map.set(item.cardId, {
          cardId: item.cardId,
          quantity: Math.max(1, Math.trunc(item.quantity || 1)),
          pricePerCard: item.pricePerCard ?? null,
          priceMode: item.priceMode ?? "numeric",
          pricePercent: item.pricePercent ?? null,
        });
      }
      setForSaleMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("forSale.errorLoading"));
      setLoadingForSale(false);
      return;
    }
    try {
      const coll = await getCollection();
      const cMap = new Map<string, number>();
      for (const item of coll.items ?? []) {
        const id = getCardId(item.card) || item.cardId || item.cardUuid;
        if (id) cMap.set(id, (cMap.get(id) ?? 0) + (item.quantity ?? 0));
      }
      setCollectionQtyMap(cMap);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setCollectionQtyMap(new Map());
      if (typeof message === "string" && message.includes("user_settings")) {
        /* coleção ainda não inicializada no backend */
      } else {
        toast.error(message || t("forSale.errorLoadingCollection"));
      }
    } finally {
      setLoadingForSale(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadForSaleAndCollection();
  }, [loadForSaleAndCollection]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH) return;
    const effectiveName = trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : undefined;
    const timer = setTimeout(() => setNameFilter(effectiveName), 0);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(LIMIT);
  }, [nameFilter, selectedDomains, selectedRarity, selectedType, selectedSet, selectedAbilities, energyRange, powerRange, mightRange, collectionStatus, ownedQtyThreshold]);

  useEffect(() => {
    if (collectionStatus !== "owned" && ownedQtyThreshold !== 0) {
      setOwnedQtyThreshold(0);
    }
  }, [collectionStatus, ownedQtyThreshold]);

  const enrichedCards = useMemo(
    () =>
      allCards.map((card) => {
        const cardId = getCardId(card);
        const sale = forSaleMap.get(cardId);
        const ownedQty = collectionQtyMap.get(cardId) ?? 0;
        return {
          ...card,
          inForSale: !!sale,
          forSaleQty: sale?.quantity ?? 0,
          forSalePrice: sale?.pricePerCard ?? null,
          ownedInCollection: ownedQty > 0,
          ownedQty,
        };
      }),
    [allCards, forSaleMap, collectionQtyMap]
  );

  const hasDiscoveryFilters = useMemo(
    () =>
      !!(
        nameFilter ||
        selectedDomains.length > 0 ||
        selectedRarity ||
        selectedType ||
        selectedSet ||
        selectedAbilities.length > 0 ||
        collectionStatus !== "all" ||
        ownedQtyThreshold > 0 ||
        energyRange[0] > ENERGY_BOUNDS.min ||
        energyRange[1] < ENERGY_BOUNDS.max ||
        powerRange[0] > POWER_BOUNDS.min ||
        powerRange[1] < POWER_BOUNDS.max ||
        mightRange[0] > MIGHT_BOUNDS.min ||
        mightRange[1] < MIGHT_BOUNDS.max
      ),
    [nameFilter, selectedDomains, selectedRarity, selectedType, selectedSet, selectedAbilities, collectionStatus, ownedQtyThreshold, energyRange, powerRange, mightRange]
  );

  const filteredCards = useMemo(() => {
    const source = hasDiscoveryFilters ? enrichedCards : enrichedCards.filter((c) => c.inForSale);
    const energyFilterActive = energyRange[0] > ENERGY_BOUNDS.min || energyRange[1] < ENERGY_BOUNDS.max;
    const powerFilterActive = powerRange[0] > POWER_BOUNDS.min || powerRange[1] < POWER_BOUNDS.max;
    const mightFilterActive = mightRange[0] > MIGHT_BOUNDS.min || mightRange[1] < MIGHT_BOUNDS.max;
    return source.filter((card) => {
      if (collectionStatus === "owned" && !card.ownedInCollection) return false;
      if (collectionStatus === "owned" && card.ownedQty <= ownedQtyThreshold) return false;
      if (collectionStatus === "missing" && card.ownedInCollection) return false;
      if (nameFilter) {
        const q = nameFilter.toLowerCase();
        const nameMatch = card.name.toLowerCase().includes(q) || getCardDisplayName(card).toLowerCase().includes(q);
        const subtypeMatch =
          card.subtypes?.some((s) => s.toLowerCase().includes(q)) ||
          (card.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }> | undefined)?.some(
            (cs) => ((cs?.subtype?.name ?? cs?.name) ?? "").toLowerCase().includes(q)
          );
        const descriptionMatch =
          card.description != null && cardDescriptionPlainText(card.description).toLowerCase().includes(q);
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
      if (selectedSet && getCardSetFilterValue(card) !== selectedSet) return false;
      if (!cardMatchesAnyAbility(card, selectedAbilities)) return false;
      if (energyFilterActive) {
        if (card.energy == null) return false;
        if (card.energy < energyRange[0] || (energyRange[1] < ENERGY_BOUNDS.max && card.energy > energyRange[1])) return false;
      }
      if (powerFilterActive) {
        if (card.power == null) return false;
        if (card.power < powerRange[0] || (powerRange[1] < POWER_BOUNDS.max && card.power > powerRange[1])) return false;
      }
      if (mightFilterActive) {
        if (card.might == null) return false;
        if (card.might < mightRange[0] || (mightRange[1] < MIGHT_BOUNDS.max && card.might > mightRange[1])) return false;
      }
      return true;
    });
  }, [enrichedCards, hasDiscoveryFilters, nameFilter, selectedDomains, selectedRarity, selectedType, selectedSet, selectedAbilities, energyRange, powerRange, mightRange, collectionStatus, ownedQtyThreshold]);

  const visibleCards = filteredCards.slice(0, visibleCount);
  const hasMore = visibleCount < filteredCards.length;
  const loadMore = useCallback(() => setVisibleCount((v) => v + LIMIT), []);

  useEffect(() => {
    if (!hasMore) return;
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
  }, [hasMore, loadMore]);

  // Fallback de infinite scroll: em alguns navegadores/layouts o observer pode
  // não re-disparar quando o sentinel permanece visível após renderizações.
  useEffect(() => {
    if (!hasMore) return;
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 280;
      if (nearBottom) loadMore();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hasMore, loadMore]);

  const persistForSale = useCallback(
    async (nextMap: Map<string, ForSaleItem>) => {
      const forSale = [...nextMap.values()].map((item) => ({
        cardId: item.cardId,
        quantity: item.quantity,
        ...(item.priceMode !== "numeric" ? { priceMode: item.priceMode } : {}),
        ...(item.priceMode === "numeric"
          ? { pricePerCard: item.pricePerCard ?? undefined, pricePercent: null }
          : { pricePerCard: null, pricePercent: FIXED_PERCENT }),
      }));
      setSaving(true);
      try {
        await updateProfile({ forSale } as UpdateProfilePayload);
        setForSaleMap(nextMap);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("forSale.errorSaving"));
      } finally {
        setSaving(false);
      }
    },
    [t]
  );

  async function handleSaveCard(cardId: string) {
    setActionCardId(cardId);
    try {
      await persistForSale(new Map(forSaleMap));
      toast.success(t("forSale.saveSuccess"));
    } finally {
      setActionCardId(null);
    }
  }

  async function handleAdd(card: Card) {
    const cardId = getCardId(card);
    setActionCardId(cardId);
    const next = new Map(forSaleMap);
    const current = next.get(cardId);
    next.set(cardId, {
      cardId,
      quantity: (current?.quantity ?? 0) + 1,
      pricePerCard: current?.pricePerCard ?? null,
      priceMode: current?.priceMode ?? "numeric",
      pricePercent: current?.pricePercent ?? null,
    });
    await persistForSale(next);
    setActionCardId(null);
  }

  async function handleDecrease(card: Card) {
    const cardId = getCardId(card);
    setActionCardId(cardId);
    const next = new Map(forSaleMap);
    const current = next.get(cardId);
    if (!current) {
      setActionCardId(null);
      return;
    }
    if (current.quantity <= 1) {
      next.delete(cardId);
    } else {
      next.set(cardId, { ...current, quantity: current.quantity - 1 });
    }
    await persistForSale(next);
    setActionCardId(null);
  }

  async function handlePriceCommit(cardId: string, price: number | null) {
    const current = forSaleMap.get(cardId);
    if (!current) return;
    if (current.pricePerCard === price) return;
    const next = new Map(forSaleMap);
    next.set(cardId, { ...current, pricePerCard: price });
    await persistForSale(next);
  }

  async function handlePriceModeChange(cardId: string, mode: "numeric" | "fixed_discount") {
    const current = forSaleMap.get(cardId);
    const targetMode: ForSalePriceMode = mode === "numeric" ? "numeric" : fixedDiscountMode;
    if (!current || current.priceMode === targetMode) return;
    const next = new Map(forSaleMap);
    next.set(cardId, {
      ...current,
      priceMode: targetMode,
      // Regra: limpar o campo que não se aplica ao trocar modo
      pricePerCard: targetMode === "numeric" ? current.pricePerCard : null,
      pricePercent: targetMode === "numeric" ? null : FIXED_PERCENT,
    });
    await persistForSale(next);
  }

  const hasActiveFilters = hasDiscoveryFilters;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDomains([]);
    setSelectedRarity(undefined);
    setSelectedType(undefined);
    setSelectedSet(undefined);
    setSelectedAbilities([]);
    setCollectionStatus("all");
    setOwnedQtyThreshold(0);
    setEnergyRange([ENERGY_BOUNDS.min, ENERGY_BOUNDS.max]);
    setPowerRange([POWER_BOUNDS.min, POWER_BOUNDS.max]);
    setMightRange([MIGHT_BOUNDS.min, MIGHT_BOUNDS.max]);
  };

  async function handleClearForSale() {
    setClearingForSale(true);
    try {
      const result = await clearForSale();
      await loadForSaleAndCollection();
      toast.success(t("forSale.clearSuccess", { removed: result.removed }));
      setIsClearForSaleModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("forSale.clearError"));
    } finally {
      setClearingForSale(false);
    }
  }

  if (authLoading || !user || (cardsLoading && allCards.length === 0) || loadingForSale) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-3 sm:px-6 lg:px-10 xl:px-12">
        <header className="mb-3 border-b border-gray-700 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white">{t("forSale.title")}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{t("forSale.subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsClearForSaleModalOpen(true)}
                disabled={clearingForSale || saving || forSaleMap.size === 0}
                className="rounded border border-red-700/60 bg-red-900/25 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearingForSale ? t("forSale.clearingButtonLoading") : t("forSale.clearButton")}
              </button>
              {error && (
                <div className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-200">{error}</div>
              )}
            </div>
          </div>
        </header>
      </div>

      {isClearForSaleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setIsClearForSaleModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-white">{t("forSale.clearButton")}</h2>
            <p className="mt-1 text-sm text-gray-400">{t("forSale.clearConfirm")}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsClearForSaleModalOpen(false)}
                disabled={clearingForSale}
                className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleClearForSale}
                disabled={clearingForSale}
                className="rounded border border-red-700/60 bg-red-900/25 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-50"
              >
                {clearingForSale ? t("forSale.clearingButtonLoading") : t("forSale.clearButton")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20 border-b border-gray-700 bg-gray-900 sm:top-[100px]">
        <div className="mx-auto w-full max-w-[1600px] px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
          <div className="mb-1 hidden items-center gap-2 sm:flex">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("collection.searchCardName")}
                className="w-full rounded border border-gray-600 bg-gray-800 py-2 pl-9 pr-14 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="shrink-0 flex items-center gap-1.5 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
              aria-expanded={filtersExpanded}
            >
              {t("cards.filters")}
            </button>
          </div>
          {filtersExpanded && (
            <div className="hidden sm:block space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-5 sm:gap-y-3">
                <div className="shrink-0">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">{t("collection.statusLabel")}</p>
                  <div className="flex gap-1">
                    {(["all", "owned", "missing"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCollectionStatus(opt)}
                        aria-pressed={collectionStatus === opt}
                        className={`rounded border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                          collectionStatus === opt
                            ? opt === "missing"
                              ? "border-amber-500 bg-amber-500/20 text-amber-300"
                              : opt === "owned"
                                ? "border-green-500 bg-green-500/20 text-green-300"
                                : "border-white bg-gray-600 text-white"
                            : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                        }`}
                      >
                        {opt === "all" ? t("cards.any") : opt === "owned" ? t("collection.ownedLabel") : t("collection.missingLabel")}
                      </button>
                    ))}
                  </div>
                  {collectionStatus === "owned" && (
                    <div className="mt-3 min-w-[280px] max-w-md">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                            {t("collection.ownedGreaterThanLabel")}
                          </span>
                          <span className="text-xs tabular-nums text-gray-400">{ownedQtyThreshold}</span>
                        </div>
                        <input
                          type="range"
                          min={OWNED_QTY_BOUNDS.min}
                          max={OWNED_QTY_BOUNDS.max}
                          step={1}
                          value={ownedQtyThreshold}
                          onChange={(e) => setOwnedQtyThreshold(Number(e.target.value))}
                          className="h-2 w-full appearance-none rounded-full bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:bg-gray-800 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:bg-gray-800 [&::-moz-range-thumb]:cursor-pointer"
                          aria-label={t("collection.ownedGreaterThanLabel")}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="hidden h-10 w-px shrink-0 self-end bg-gray-700 sm:block" />
                <div className="shrink-0">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">{t("cards.domain")}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => setSelectedDomains([])} className={`h-8 rounded border-2 px-2 text-xs font-medium transition-all ${selectedDomains.length === 0 ? "border-white bg-gray-600 text-white" : "border-gray-600 bg-gray-800 text-gray-400"}`}>{t("cards.any")}</button>
                    {DOMAINS.map((domain) => (
                      <button key={domain} type="button" onClick={() => setSelectedDomains((prev) => prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain])}
                        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded border-2 p-0.5 transition-all ${selectedDomains.includes(domain) ? "border-white bg-white/20" : "border-gray-600"}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/images/domains/${domain}.webp`} alt={domain} className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="shrink-0">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">{t("cards.rarity")}</label>
                  <select value={selectedRarity ?? ""} onChange={(e) => setSelectedRarity(e.target.value || undefined)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white">
                    <option value="">{t("cards.any")}</option>
                    {RARITY_OPTIONS.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">{t("cards.type")}</label>
                  <select value={selectedType ?? ""} onChange={(e) => setSelectedType(e.target.value || undefined)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white">
                    <option value="">{t("cards.any")}</option>
                    {TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
                  </select>
                </div>
                <div className="shrink-0">
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">{t("cards.set")}</label>
                  <select value={selectedSet ?? ""} onChange={(e) => setSelectedSet(e.target.value || undefined)} className="rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-white">
                    <option value="">{t("cards.allSets")}</option>
                    {sets.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-2 border-t border-gray-700 pt-3">
                <RangeSlider label={t("cards.energy")} minBound={ENERGY_BOUNDS.min} maxBound={ENERGY_BOUNDS.max} valueMin={energyRange[0]} valueMax={energyRange[1]} onChange={(min, max) => setEnergyRange([min, max])} anyLabel={t("cards.any")} minLabel={t("common.min")} maxLabel={t("common.max")} minAriaSuffix={` ${t("common.minimum")}`} maxAriaSuffix={` ${t("common.maximum")}`} />
                <RangeSlider label={t("cards.power")} minBound={POWER_BOUNDS.min} maxBound={POWER_BOUNDS.max} valueMin={powerRange[0]} valueMax={powerRange[1]} onChange={(min, max) => setPowerRange([min, max])} anyLabel={t("cards.any")} minLabel={t("common.min")} maxLabel={t("common.max")} minAriaSuffix={` ${t("common.minimum")}`} maxAriaSuffix={` ${t("common.maximum")}`} />
                <RangeSlider label={t("cards.might")} minBound={MIGHT_BOUNDS.min} maxBound={MIGHT_BOUNDS.max} valueMin={mightRange[0]} valueMax={mightRange[1]} onChange={(min, max) => setMightRange([min, max])} anyLabel={t("cards.any")} minLabel={t("common.min")} maxLabel={t("common.max")} minAriaSuffix={` ${t("common.minimum")}`} maxAriaSuffix={` ${t("common.maximum")}`} />
              </div>
              <div className="border-t border-gray-700 pt-3">
                <AbilitiesFilter selected={selectedAbilities} onChange={setSelectedAbilities} />
              </div>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="rounded border border-gray-600 bg-gray-700/50 py-2 px-3 text-sm text-gray-300 hover:bg-gray-700">
                  {t("cards.clearAllFilters")}
                </button>
              )}
            </div>
          )}
          {selectedSet && (
            <p className="mt-2 text-xs text-gray-500">{t("cards.set")}: {formatSetWithCode(selectedSet)}</p>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 pb-24 sm:pb-5 sm:px-6 lg:px-10 xl:px-12">
        {!hasDiscoveryFilters && forSaleMap.size === 0 ? (
          <p className="text-gray-400">{t("forSale.emptyHint")}</p>
        ) : visibleCards.length === 0 ? (
          <p className="text-gray-400">{t("cards.noCardsFound")}</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-400">
              {t("collection.cardsOfTotal", { count: visibleCards.length, total: filteredCards.length })}
              {!hasDiscoveryFilters && <span className="ml-1">{t("forSale.showingOnlyForSale")}</span>}
            </p>
            <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {visibleCards.map((card) => {
                const cardId = getCardId(card);
                const isCardLoading = actionCardId === cardId || saving;
                const saleItem = forSaleMap.get(cardId);
                return (
                  <li key={cardId} className="relative flex flex-col rounded-xl border border-gray-700/80 bg-gray-800/25 p-2 sm:p-0 sm:rounded-none sm:border-0 sm:bg-transparent">
                    <CardTile
                      wrapperElement="div"
                      card={card}
                      showTcgPriceChip
                      inCollection={card.inForSale}
                      quantity={card.forSaleQty}
                      showCollectionActions
                      onOpenDetail={() => setDetailUuid(cardId)}
                      grayscaleWhenNoImage
                      grayscaleWhenNotInCollection
                      actionDisabled={isCardLoading}
                      onAdd={() => handleAdd(card)}
                      onDecrease={() => handleDecrease(card)}
                    />
                    {card.inForSale && (
                      <div className="mt-2 border-t border-gray-700/80 pt-2 sm:border-t-0 sm:pt-0">
                        <div className="flex items-end gap-2">
                          <div className="grid flex-1 grid-cols-2 gap-2">
                            <label className={`flex flex-col gap-0.5 ${(saleItem?.priceMode ?? "numeric") !== "numeric" ? "col-span-2" : ""}`}>
                              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                {t("forSale.priceModeLabel")}
                              </span>
                              <select
                                value={(saleItem?.priceMode ?? "numeric") === "numeric" ? "numeric" : "fixed_discount"}
                                onChange={(e) => void handlePriceModeChange(cardId, e.target.value as "numeric" | "fixed_discount")}
                                disabled={isCardLoading}
                                className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-xs text-white disabled:opacity-50"
                                aria-label={t("forSale.priceModeLabel")}
                              >
                                <option value="numeric">{t("forSale.priceModeNumeric")}</option>
                                <option value="fixed_discount">{t("forSale.priceModeFixedTen")}</option>
                              </select>
                            </label>

                            {(saleItem?.priceMode ?? "numeric") === "numeric" && (
                              <label className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
                                  {t("forSale.priceInputLabel")}
                                </span>
                                <ForSaleCardPriceInput
                                  cardId={cardId}
                                  value={saleItem?.pricePerCard ?? null}
                                  disabled={isCardLoading}
                                  locale={locale}
                                  label={t("forSale.priceInputLabel")}
                                  placeholder={t("forSale.pricePlaceholder")}
                                  onCommit={handlePriceCommit}
                                />
                              </label>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleSaveCard(cardId)}
                            disabled={isCardLoading}
                            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white shadow transition-colors hover:bg-green-600 hover:border-green-500 disabled:opacity-50"
                            aria-label={t("forSale.saveButton")}
                            title={t("forSale.saveButton")}
                          >
                            {isCardLoading ? "…" : "✓"}
                          </button>
                        </div>
                      </div>
                    )}
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
        cardId={detailUuid}
        onClose={() => setDetailUuid(null)}
        onCollectionChange={loadForSaleAndCollection}
        showTcgPrices
      />
    </div>
  );
}
