"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { BackLink } from "@/components/layout/BackLink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDeck,
  updateDeckName,
  setLegend,
  setChampion,
  addMainCard,
  setMainCardQuantity,
  removeMainCard,
  addRuneCard,
  setRuneCardQuantity,
  removeRuneCard,
  addSideboardCard,
  setSideboardCardQuantity,
  removeSideboardCard,
  setBattlefield,
  deleteDeck,
} from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { getCollection } from "@/lib/collections";
import { useCards } from "@/lib/cards-context";
import { getCardImageUrl } from "@/lib/cards";
import { CardTile } from "@/components/cards/CardTile";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { AbilitiesFilter } from "@/components/filters/AbilitiesFilter";
import { cardMatchesAnyAbility } from "@/lib/card-ability-filter";
import { cardDescriptionPlainText } from "@/lib/html-description";
import {
  rawDeckValidationErrors,
  rawDeckValidationWarnings,
  formatDeckValidationItem,
  type DeckValidationTranslate,
} from "@/lib/deck-validation";
import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";
import { getCardId } from "@/lib/card-id";

const DOMAINS = ["fury", "calm", "mind", "body", "chaos", "order"] as const;

function CardWarning({ errors }: { errors: string[] }) {
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  if (!errors.length) return null;
  const tip = errors.map(e => e.replace(/^(Main Deck|Rune Deck|Sideboard):\s*/i, "")).join("\n");

  function handleMouseEnter() {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const spaceAbove = r.top > 120;
    setPos({
      top: spaceAbove ? r.top - 8 : r.bottom + 8,
      left: r.left + r.width / 2,
      above: spaceAbove,
    });
  }

  return (
    <span
      ref={ref}
      className="ml-0.5 shrink-0 cursor-help"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setPos(null)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
      </svg>
      {pos && (
        <div
          className="pointer-events-none fixed z-[9999] w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-amber-600/40 bg-gray-900 px-2.5 py-2 text-xs leading-snug text-amber-300 shadow-xl whitespace-pre-line"
          style={{
            top: pos.above ? pos.top : pos.top,
            left: pos.left,
            transform: `translateX(-50%) translateY(${pos.above ? "-100%" : "0%"})`,
          }}
        >
          {tip}
          <span
            className="absolute left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={pos.above
              ? { top: "100%", borderTopColor: "rgb(17 24 39)" }
              : { bottom: "100%", borderBottomColor: "rgb(17 24 39)" }
            }
          />
        </div>
      )}
    </span>
  );
}

function CardPickerGrid({
  picker, cards, deck, mainCount, runeCount, sideboardCount, collectionQtyByCardId, addAnimations,
  onSetLegend, onSetChampion, onAddMain, onAddRune, onAddSideboard, onSetBattlefield, onPickBattlefield,
}: {
  picker: PickerMode;
  cards: Card[];
  deck: Deck;
  mainCount: number;
  runeCount: number;
  sideboardCount: number;
  collectionQtyByCardId: Map<string, number>;
  addAnimations: Map<string, string[]>;
  onSetLegend: (c: Card) => void;
  onSetChampion: (c: Card) => void;
  onAddMain: (c: Card) => void;
  onAddRune: (c: Card) => void;
  onAddSideboard: (c: Card) => void;
  onSetBattlefield: (pos: 1 | 2 | 3, c: Card) => void;
  onPickBattlefield?: (c: Card) => void;
}) {
  const { t } = useLocale();
  // Combined qty: main + sideboard (counts toward the 3-copy limit)
  const mainQtyMap = new Map<string, number>();
  for (const item of deck.mainItems ?? []) {
    const id = getCardId(item.card as Card) || item.cardId;
    if (id) mainQtyMap.set(id, (mainQtyMap.get(id) ?? 0) + item.quantity);
  }
  const sbQtyMap = new Map<string, number>();
  for (const item of deck.sideboardItems ?? []) {
    const id = getCardId(item.card as Card) || item.cardId;
    if (id) sbQtyMap.set(id, (sbQtyMap.get(id) ?? 0) + item.quantity);
  }

  const isBf = picker === "battlefields";

  return (
    <ul className={`grid list-none gap-2 overflow-y-auto ${
      isBf ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
    }`}>
      {cards.map((card) => {
        const mainQty = mainQtyMap.get(getCardId(card)) ?? 0;
        const sbQty = sbQtyMap.get(getCardId(card)) ?? 0;
        const combinedQty = mainQty + sbQty;
        // Main: max 39 total + max 3 per card (main+sb combined) | Sideboard: max 8 total + max 3 per card | Rune: max 12 total
        const atLimit =
          (picker === "main" && (mainCount >= 39 || combinedQty >= 3)) ||
          (picker === "sideboard" && (sideboardCount >= 8 || combinedQty >= 3)) ||
          (picker === "rune" && runeCount >= 12);

        const inColl = picker === "legend" || picker === "champion" || picker === "battlefields" || picker === "main" || picker === "rune" || picker === "sideboard";
        const owned = collectionQtyByCardId.get(getCardId(card)) ?? card.collectionQuantity ?? 0;

        const cardAddKeys = addAnimations.get(getCardId(card)) ?? [];

        return (
          <li key={getCardId(card)} className="relative">
            <button
              type="button"
              disabled={atLimit}
              className={`w-full text-left ${atLimit ? "cursor-not-allowed" : ""}`}
              onClick={() => {
                if (atLimit) return;
                if (picker === "legend") onSetLegend(card);
                else if (picker === "champion") onSetChampion(card);
                else if (picker === "main") onAddMain(card);
                else if (picker === "rune") onAddRune(card);
                else if (picker === "sideboard") onAddSideboard(card);
                else if (picker === "battlefields" && onPickBattlefield) onPickBattlefield(card);
              }}
            >
              <CardTile
                card={card}
                wrapperElement="div"
                grayscaleWhenNotInCollection={atLimit}
                inCollection={!atLimit}
                battlefieldAsLandscape
                addKeys={cardAddKeys}
              />
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-2 py-3 pt-6">
                <div className="flex items-end justify-between">
                  {/* Preview button — left side */}
                  <CardHoverPreview card={card}>
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/60 text-gray-300 shadow transition-colors hover:border-white/40 hover:bg-black/80 hover:text-white"
                      title={t("decks.previewCard")}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </span>
                  </CardHoverPreview>

                  {/* Collection qty — right side */}
                  {inColl && (
                    <span
                      title={t("decks.youHaveInCollection", { count: owned })}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/30 bg-black/70 text-xs font-bold tabular-nums text-white shadow"
                    >
                      ×{owned}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type PickerMode = "legend" | "champion" | "battlefields" | "main" | "rune" | "sideboard";

function DeckBuilderSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        {/* Back + actions row */}
        <div className="mb-4 h-5 w-20 animate-pulse rounded bg-gray-700" />
        <div className="mb-4 flex justify-end">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-gray-700/60" />
        </div>
        {/* Deck name + steps */}
        <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <div className="mb-2 h-3 w-20 animate-pulse rounded bg-gray-700" />
          <div className="mb-4 h-10 w-full animate-pulse rounded bg-gray-700/60" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-gray-700/60" />
            ))}
          </div>
        </div>
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left: legend + champion + battlefields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/60" />
              ))}
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-700" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="mb-2 h-10 w-full animate-pulse rounded bg-gray-700/40" />
              ))}
            </div>
          </div>
          {/* Right: picker + deck list */}
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-700" />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/40" />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="mb-3 h-4 w-24 animate-pulse rounded bg-gray-700" />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="mb-2 flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded bg-gray-700/60" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-gray-700/40" />
                  <div className="h-6 w-16 animate-pulse rounded bg-gray-700/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Retorna o próximo passo pendente do deck, na ordem de prioridade. */
function getNextPicker(deck: Deck, t: DeckValidationTranslate): PickerMode {
  const legend = deck.legendCard ?? deck.legend;
  const champion = deck.championCard ?? deck.champion;
  if (!legend) return "legend";
  if (!champion) return "champion";

  const bfs = deck.battlefields ?? [];
  const allBfsFilled = [1, 2, 3].every((pos) => bfs.find((b) => b.position === pos)?.card);
  if (!allBfsFilled) return "battlefields";

  // Build per-card error map from validation data
  const cardErrors = new Map<string, true>();
  for (const err of rawDeckValidationErrors(deck.validation)) {
    const s = formatDeckValidationItem(err, t);
    const match = s.match(/"([^"]+)"/);
    if (match) cardErrors.set(match[1].toLowerCase(), true);
  }

  const sectionHasErrors = (items: { card?: { name?: string } | null }[]) =>
    items.some((i) => cardErrors.has(i.card?.name?.toLowerCase() ?? ""));

  const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  if (mainCount < 39 || sectionHasErrors(deck.mainItems ?? [])) return "main";

  const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  if (runeCount < 12 || sectionHasErrors(deck.runeItems ?? [])) return "rune";

  // Sideboard é coadjuvante: nunca direcionamos o usuário para ele; fica no rune (último step obrigatório)
  return "rune";
}

const VALID_DOMAIN_SLUGS = new Set(["fury", "calm", "mind", "body", "chaos", "order"]);
const UNIT_ICON = "/images/types/unit.webp";
const BATTLEFIELD_ICON = "/images/types/battlefields.webp";

function isBattlefieldCard(card: { type?: string; record_type?: string } | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? "").toLowerCase();
  return t === "battlefield" || r.includes("battleground") || t === "battleground";
}

/** Extrai todos os nomes de domínio de uma carta, independente do formato da API */
function getCardDomains(card: Card): string[] {
  const result = new Set<string>();
  if (typeof card.domain === "string" && card.domain) result.add(card.domain.toLowerCase());
  if (Array.isArray(card.domains)) card.domains.forEach((d) => result.add(d.toLowerCase()));
  if (Array.isArray(card.cardDomains)) {
    (card.cardDomains as Array<{ domain: { name: string } }>).forEach((cd) =>
      result.add(cd.domain.name.toLowerCase())
    );
  }
  return [...result];
}

function domainImageSrc(domain: string | null | undefined, card?: { type?: string; record_type?: string }): string {
  const d = domain?.toLowerCase();
  if (d && VALID_DOMAIN_SLUGS.has(d)) return `/images/domains/${d}.webp`;
  return isBattlefieldCard(card) ? BATTLEFIELD_ICON : UNIT_ICON;
}

function cardMatchesDomains(card: Card, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const cardDomains = getCardDomains(card);
  return domains.some((d) => cardDomains.includes(d.toLowerCase()));
}

function getCardTagNames(card: Card): string[] {
  const tags = new Set<string>();
  if (Array.isArray(card.cardSubtypes)) {
    (card.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }>).forEach((cs) => {
      const n = (cs?.subtype?.name ?? cs?.name ?? "").trim().toLowerCase();
      if (n) tags.add(n);
    });
  }
  // Compat legado (caso algum endpoint ainda envie `subtypes`)
  if (Array.isArray(card.subtypes)) {
    card.subtypes.forEach((s) => {
      const n = String(s ?? "").trim().toLowerCase();
      if (n) tags.add(n);
    });
  }
  return [...tags];
}

function cardTypeIncludes(card: Card, expected: string): boolean {
  const e = expected.toLowerCase();
  const t = (card.type ?? "").toLowerCase();
  const rt = (card.record_type ?? card.recordType ?? "").toLowerCase();
  return t === e || t.includes(e) || rt === e || rt.includes(e);
}

export default function DeckBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const { cards: allCards, loading: cardsLoading } = useCards();

  const pickerTitles: Record<PickerMode, string> = useMemo(() => ({
    legend: t("decks.chooseYourLegend"),
    champion: t("decks.chooseChampion"),
    battlefields: t("decks.chooseBattlefields"),
    main: t("decks.addToMainDeck"),
    rune: t("decks.addRunesToRuneDeck"),
    sideboard: t("decks.addToSideboard"),
  }), [t]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [pickerDomain, setPickerDomain] = useState<string | undefined>(undefined); // legend: single
  const [pickerDomains, setPickerDomains] = useState<string[]>([]); // main: multi
  const [pickerType, setPickerType] = useState<string | undefined>(undefined);
  const [pickerAbilities, setPickerAbilities] = useState<string[]>([]);
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [showValidModal, setShowValidModal] = useState(false);
  const [onlyInCollection, setOnlyInCollection] = useState(false);
  const [collectionQtyByCardId, setCollectionQtyByCardId] = useState<Map<string, number>>(new Map());
  const [battlefieldSlotBeingEdited, setBattlefieldSlotBeingEdited] = useState<1 | 2 | 3 | null>(null);
  const [mobilePickerOpen, setMobilePickerOpen] = useState(false);
  const [addAnimations, setAddAnimations] = useState<Map<string, string[]>>(new Map());
  const [deckMutationLoading, setDeckMutationLoading] = useState(false);
  const prevValidRef = useRef<boolean | null>(null);

  async function runWithDeckMutation<T>(fn: () => Promise<T>): Promise<T> {
    setDeckMutationLoading(true);
    try {
      return await fn();
    } finally {
      setDeckMutationLoading(false);
    }
  }
  const pickerContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollRef = useRef<number>(0);

  function flashCard(cardUuid: string) {
    const key = `${cardUuid}-${Date.now()}-${Math.random()}`;
    setAddAnimations((prev) => {
      const next = new Map(prev);
      next.set(cardUuid, [...(next.get(cardUuid) ?? []), key]);
      return next;
    });
    setTimeout(() => {
      setAddAnimations((prev) => {
        const next = new Map(prev);
        const arr = (next.get(cardUuid) ?? []).filter((k) => k !== key);
        if (arr.length === 0) next.delete(cardUuid);
        else next.set(cardUuid, arr);
        return next;
      });
    }, 700);
  }

  function savePickerScroll() {
    savedScrollRef.current = pickerContainerRef.current?.scrollTop ?? window.scrollY;
  }
  function restorePickerScroll() {
    requestAnimationFrame(() => {
      if (pickerContainerRef.current) {
        pickerContainerRef.current.scrollTop = savedScrollRef.current;
      } else {
        window.scrollTo({ top: savedScrollRef.current });
      }
    });
  }

  const firstEmptyBattlefieldSlot = useMemo((): 1 | 2 | 3 | null => {
    const bfs = deck?.battlefields ?? [];
    for (const pos of [1, 2, 3] as const) {
      if (!bfs.find((b) => b.position === pos)?.card) return pos;
    }
    return null;
  }, [deck?.battlefields]);

  const fetchDeck = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await getDeck(deckId, true);
      setDeck(d);
      setNameDraft(d.name || "");
      // Auto-abre o próximo passo pendente na primeira carga
      setPicker((prev) => prev ?? getNextPicker(d, t));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("decks.errorLoadingDeck"));
      setDeck(null);
    } finally {
      setLoading(false);
    }
  }, [deckId, t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchDeck();
  }, [authLoading, user, router, fetchDeck]);

  useEffect(() => {
    if (!user) return;
    getCollection()
      .then((data) => {
        const map = new Map<string, number>();
        for (const it of data.items ?? []) {
          const id = getCardId(it.card as Card) || it.cardId;
          if (id) map.set(id, (map.get(id) ?? 0) + (it.quantity ?? 0));
        }
        setCollectionQtyByCardId(map);
      })
      .catch(() => setCollectionQtyByCardId(new Map()));
  }, [user]);

  const filteredCards = useMemo(() => {
    if (!picker || allCards.length === 0) return [];

    const nameQuery = cardSearchQuery.trim().length >= 3 ? cardSearchQuery.trim().toLowerCase() : null;

    const results = allCards.filter((card) => {
      if (picker === "legend") {
        if (!cardTypeIncludes(card, "legend")) return false;
        if (pickerDomain && !cardMatchesDomains(card, [pickerDomain])) return false;
      } else if (picker === "champion") {
        // Catálogo novo: "champion" pode vir como Unit + tags (ex.: Teemo),
        // não necessariamente com type = "Champion".
        if (!(cardTypeIncludes(card, "champion") || cardTypeIncludes(card, "unit"))) return false;
        if (cardTypeIncludes(card, "legend")) return false;
        const legendCard = deck?.legendCard ?? deck?.legend;
        const legendTags = legendCard ? getCardTagNames(legendCard as Card) : [];
        if (legendTags.length > 0) {
          const championTags = getCardTagNames(card);
          if (!legendTags.some((tag) => championTags.includes(tag))) return false;
        } else {
          // fallback defensivo se alguma legend vier sem tags
          const legendDomains = legendCard ? getCardDomains(legendCard as Card) : [];
          if (legendDomains.length > 0 && !cardMatchesDomains(card, legendDomains)) return false;
        }
      } else if (picker === "main" || picker === "sideboard") {
        if (cardTypeIncludes(card, "rune") || cardTypeIncludes(card, "legend")) return false;
        if (!cardMatchesDomains(card, pickerDomains)) return false;
        if (pickerType && !cardTypeIncludes(card, pickerType)) return false;
        if (!cardMatchesAnyAbility(card, pickerAbilities)) return false;
      } else if (picker === "rune") {
        if (!cardTypeIncludes(card, "rune")) return false;
        if (!cardMatchesDomains(card, pickerDomains)) return false;
      } else if (picker === "battlefields") {
        if (!cardTypeIncludes(card, "battlefield") && !cardTypeIncludes(card, "battleground")) return false;
      }

      if (nameQuery) {
        const nameMatch = card.name.toLowerCase().includes(nameQuery);
        const subtypeMatch =
          card.subtypes?.some((s) => s.toLowerCase().includes(nameQuery)) ||
          (card.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }> | undefined)?.some(
            (cs) => ((cs?.subtype?.name ?? cs?.name) ?? "").toLowerCase().includes(nameQuery)
          );
        const descriptionMatch =
          card.description != null &&
          cardDescriptionPlainText(card.description).toLowerCase().includes(nameQuery);
        if (!nameMatch && !subtypeMatch && !descriptionMatch) return false;
      }

      if (onlyInCollection) {
        const collQty = collectionQtyByCardId.get(getCardId(card)) ?? 0;
        if (collQty === 0) return false;
        // subtract copies already committed to main + sideboard + rune + legend + champion
        const legendCard = deck?.legendCard ?? deck?.legend;
        const championCard = deck?.championCard ?? deck?.champion;
        const usedByLegend = legendCard && getCardId(legendCard as Card) === getCardId(card) ? 1 : 0;
        const usedByChampion = championCard && getCardId(championCard as Card) === getCardId(card) ? 1 : 0;
        const deckQty =
          usedByLegend +
          usedByChampion +
          (deck?.mainItems ?? []).reduce((sum, item) => {
            const id = getCardId(item.card as Card) || item.cardId;
            return sum + (id === getCardId(card) ? item.quantity : 0);
          }, 0) +
          (deck?.sideboardItems ?? []).reduce((sum, item) => {
            const id = getCardId(item.card as Card) || item.cardId;
            return sum + (id === getCardId(card) ? item.quantity : 0);
          }, 0) +
          (deck?.runeItems ?? []).reduce((sum, item) => {
            const id = getCardId(item.card as Card) || item.cardId;
            return sum + (id === getCardId(card) ? item.quantity : 0);
          }, 0);
        if (collQty - deckQty <= 0) return false;
      }

      return true;
    });
    return results;
  }, [picker, allCards, deck, pickerDomain, pickerDomains, pickerType, pickerAbilities, cardSearchQuery, onlyInCollection, collectionQtyByCardId]);

  // Reseta filtros ao trocar o picker; para "main" pré-seleciona todos os domains da legend
  useEffect(() => {
    const isMultiDomain = picker === "main" || picker === "rune" || picker === "sideboard";
    if (isMultiDomain) {
      const deckLegendCard = deck?.legendCard ?? deck?.legend;
      const legendId = deckLegendCard ? getCardId(deckLegendCard as Card) : "";

      // 1ª prioridade: card do deck API (tem cardDomains relacionais, mais confiável)
      const domainsFromDeckApi = getCardDomains(deckLegendCard ?? {} as Card);

      // 2ª prioridade: card do cache (pode ter dados legados/desatualizados)
      const legendFromCache = legendId ? allCards.find((c) => getCardId(c) === legendId) : null;
      const domainsFromCache = getCardDomains(legendFromCache ?? {} as Card);

      // Usa deck API se tiver dados; caso contrário usa cache
      const legendDomains = domainsFromDeckApi.length > 0 ? domainsFromDeckApi : domainsFromCache;
      setPickerDomains(legendDomains);
    } else {
      setPickerDomains([]);
    }
    setPickerDomain(undefined);
    setPickerType(undefined);
    setPickerAbilities([]);
    setCardSearchQuery("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker]);


  // Opens the modal only when deck transitions from invalid → valid during editing
  useEffect(() => {
    if (!deck) return;
    const mainC = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
    const runeC = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
    const bfsLen = deck.battlefields?.length ?? 0;
    const bfsOk = bfsLen === 3 && deck.battlefields?.every((b) => b.card ?? b.cardId);
    const hasLegend = !!(deck.legendCard ?? deck.legend);
    const hasChampion = !!(deck.championCard ?? deck.champion);
    const structurallyComplete = mainC === 39 && runeC === 12 && bfsOk && hasLegend && hasChampion;
    const noErrors = rawDeckValidationErrors(deck.validation).length === 0;
    const noWarnings = rawDeckValidationWarnings(deck.validation).length === 0;
    const validationValid = deck.validation?.valid === true;
    const isValid = noErrors && noWarnings && (validationValid || structurallyComplete);
    if (isValid && prevValidRef.current !== true) {
      setShowValidModal(true);
    }
    prevValidRef.current = isValid ?? null;
  }, [deck, nameDraft]);

  async function handleSaveName() {
    if (!deck || nameDraft === deck.name) return;
    setSavingName(true);
    try {
      const updated = await updateDeckName(deck.id, nameDraft);
      setDeck(updated);
      setEditingName(false);
    } catch {
      // keep draft
    } finally {
      setSavingName(false);
    }
  }

  async function handleSetLegend(card: Card) {
    if (!deck) return;
    await runWithDeckMutation(async () => {
      try {
        const currentChampion = deck.championCard ?? deck.champion;
        if (currentChampion) {
          await setChampion(deck.id, null);
        }
        const updated = await setLegend(deck.id, getCardId(card));
        setDeck(updated);
        setPicker(getNextPicker(updated, t));
        setMobilePickerOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("decks.failedToSetLegend"));
      }
    });
  }

  async function handleSetChampion(card: Card) {
    if (!deck) return;
    await runWithDeckMutation(async () => {
      try {
        const updated = await setChampion(deck.id, getCardId(card));
        setDeck(updated);
        const next = getNextPicker(updated, t);
        setPicker(next);
        if (next === "battlefields") setBattlefieldSlotBeingEdited(null);
        setMobilePickerOpen(false);

        // Auto-name deck as "Legend / Champion" when deck has no name yet
        if (!(deck.name?.trim())) {
          const legendObj = updated.legendCard ?? updated.legend;
          const legendName = legendObj?.name ?? (legendObj as { card?: { name?: string } })?.card?.name;
          const championName = card.name;
          if (legendName && championName) {
            const autoName = `${legendName} / ${championName}`;
            try {
              const named = await updateDeckName(updated.id, autoName);
              setDeck(named);
              setNameDraft(autoName);
            } catch {
              // silent — user can name manually
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("decks.failedToSetChampion"));
      }
    });
  }

  async function handleAddMain(card: Card) {
    if (!deck) return;
    savePickerScroll();
    flashCard(getCardId(card));
    await runWithDeckMutation(async () => {
      try {
        const updated = await addMainCard(deck.id, getCardId(card), 1);
        setDeck(updated);
        setPicker(getNextPicker(updated, t));
        restorePickerScroll();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("decks.failedToAddCard"));
      }
    });
  }

  async function handleAddRune(card: Card) {
    if (!deck) return;
    savePickerScroll();
    flashCard(getCardId(card));
    await runWithDeckMutation(async () => {
      try {
        const updated = await addRuneCard(deck.id, getCardId(card), 1);
        setDeck(updated);
        setPicker(getNextPicker(updated, t));
        restorePickerScroll();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("decks.failedToAddRune"));
      }
    });
  }

  async function handleAddSideboard(card: Card) {
    if (!deck) return;
    savePickerScroll();
    flashCard(getCardId(card));
    await runWithDeckMutation(async () => {
      try {
        const updated = await addSideboardCard(deck.id, getCardId(card), 1);
        setDeck(updated);
        // Mantém no sideboard; nunca redirecionamos para sideboard, mas quem já está lá fica
        setPicker("sideboard");
        restorePickerScroll();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("decks.failedToAddSideboard"));
      }
    });
  }

  async function handleSetBattlefield(position: 1 | 2 | 3, card: Card) {
    if (!deck) return;
    await runWithDeckMutation(async () => {
      try {
        const updated = await setBattlefield(deck.id, position, getCardId(card));
        setDeck(updated);
        const next = getNextPicker(updated, t);
        setPicker(next);
        // Auto-close mobile picker when all 3 BFs filled → moving to next step
        if (next !== "battlefields") setMobilePickerOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("decks.failedToSetBattlefield"));
      }
    });
  }

  function handlePickBattlefield(card: Card) {
    const pos = battlefieldSlotBeingEdited ?? firstEmptyBattlefieldSlot;
    if (pos != null) {
      handleSetBattlefield(pos, card);
      setBattlefieldSlotBeingEdited(null);
    }
  }

  async function handleDelete() {
    if (!deck || !confirm(t("decks.deleteDeckConfirm"))) return;
    try {
      await deleteDeck(deck.id);
      router.replace("/decks");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("decks.failedToDelete"));
    }
  }

  if (authLoading || !user) {
    return <DeckBuilderSkeleton />;
  }

  if (!deckId || (!loading && !deck)) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-8">
        <BackLink href="/decks" label={t("back.myDecks")} />
        <p className="text-gray-400">{t("decks.deckNotFound")}</p>
      </div>
    );
  }

  const mainCount = deck?.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const runeCount = deck?.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const sideboardCount = deck?.sideboardItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const validation = deck?.validation;
  const deckLegend = deck?.legendCard ?? deck?.legend;
  const deckChampion = deck?.championCard ?? deck?.champion;

  const deckDomains = deckLegend?.cardDomains ?? [];
  const hasName = ((editingName ? nameDraft : (deck?.name ?? nameDraft))?.trim() ?? "").length > 0;
  const structurallyComplete =
    mainCount === 39 &&
    runeCount === 12 &&
    (deck?.battlefields?.length ?? 0) === 3 &&
    deck?.battlefields?.every((b) => b.card ?? b.cardId) &&
    !!deckLegend &&
    !!deckChampion;
  const isDeckValid = !!(
    rawDeckValidationErrors(validation).length === 0 &&
    rawDeckValidationWarnings(validation).length === 0 &&
    (validation?.valid === true || structurallyComplete)
  );

  const validationErrorStrings = rawDeckValidationErrors(validation).map((e) =>
    formatDeckValidationItem(e, t)
  );
  const validationWarningStrings = rawDeckValidationWarnings(validation).map((e) =>
    formatDeckValidationItem(e, t)
  );

  // Map cardName (lowercase) → error messages, for inline warning icons
  const cardErrorMap = new Map<string, string[]>();
  for (const err of validationErrorStrings) {
    const match = err.match(/"([^"]+)"/);
    if (match) {
      const key = match[1].toLowerCase();
      cardErrorMap.set(key, [...(cardErrorMap.get(key) ?? []), err]);
    }
  }
  // Structural errors = those that don't reference a specific card name
  const structuralErrors = validationErrorStrings.filter((e) => !/"[^"]+"/.test(e));
  const structuralWarnings = validationWarningStrings;

  // Whether each section has at least one card with a validation error
  const mainHasErrors = (deck?.mainItems ?? []).some(
    item => cardErrorMap.has(item.card?.name?.toLowerCase() ?? "")
  );
  const runeHasErrors = (deck?.runeItems ?? []).some(
    item => cardErrorMap.has(item.card?.name?.toLowerCase() ?? "")
  );
  const sideboardHasErrors = (deck?.sideboardItems ?? []).some(
    item => cardErrorMap.has(item.card?.name?.toLowerCase() ?? "")
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Overlay de loading ao adicionar/remover cartas */}
      {deckMutationLoading && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-600 bg-gray-800/95 px-6 py-5 shadow-xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" role="status" aria-hidden />
            <span className="text-sm font-medium text-gray-200">{t("decks.updatingDeck")}</span>
          </div>
        </div>
      )}
      {/* Modal deck válido */}
      {showValidModal && deck && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowValidModal(false)}
        >
          <div
            className="relative mx-4 w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-8 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ícone de check */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>

            <h2 className="mb-1 text-2xl font-bold text-white">{t("decks.deckComplete")}</h2>
            <p className="mb-6 text-sm text-gray-400">{t("decks.deckReadyToPlay")}</p>

            {/* Domains */}
            {deckDomains.length > 0 && (
              <div className="mb-8 flex items-center justify-center gap-4">
                {deckDomains.map((cd) => (
                  <div key={cd.domain.name} className="flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={domainImageSrc(cd.domain.name)}
                      alt={cd.domain.name}
                      className="h-16 w-16 object-contain drop-shadow-lg"
                    />
                    <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                      {cd.domain.name.charAt(0).toUpperCase() + cd.domain.name.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setShowValidModal(false)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-6 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                {t("decks.continueEditing")}
              </button>
              <Link
                href={`/decks/${deck.id}/view`}
                className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
              >
                {t("decks.viewDeck")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <BackLink href="/decks" label={t("back.myDecks")} />
        <div className="mb-4 flex items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            {isDeckValid && deck && (
              <Link
                href={`/decks/${deck.id}/view`}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-900/60 hover:text-emerald-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                {t("decks.viewDeck")}
              </Link>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/70"
            >
              {t("decks.deleteDeck")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            {/* Deck name + steps */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="mb-2 h-3 w-20 animate-pulse rounded bg-gray-700" />
              <div className="mb-4 h-10 w-full animate-pulse rounded bg-gray-700/60" />
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-6 w-20 animate-pulse rounded-full bg-gray-700/60" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/60" />
                  ))}
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gray-700" />
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="mb-2 h-10 w-full animate-pulse rounded bg-gray-700/40" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-700" />
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-lg bg-gray-700/40" />
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="mb-2 flex items-center gap-3">
                      <div className="h-8 w-8 animate-pulse rounded bg-gray-700/60" />
                      <div className="h-4 flex-1 animate-pulse rounded bg-gray-700/40" />
                      <div className="h-6 w-16 animate-pulse rounded bg-gray-700/40" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : !deck ? null : (
          <>
          {/* ── Deck name + Steps — sempre visíveis, fora do picker ── */}
          <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="mb-3 flex flex-col gap-1">
              <label htmlFor="deck-name" className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {t("decks.deckName")}
              </label>
              <div className="flex items-center gap-2">
                {editingName ? (
                  <>
                    <input
                      id="deck-name"
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      disabled={savingName}
                      placeholder={t("decks.giveDeckAName")}
                      className={`min-w-0 flex-1 rounded border px-3 py-2 text-base font-medium text-white placeholder:text-gray-500 ${
                        !(nameDraft?.trim()) && (deck?.mainItems?.length ?? 0) > 0
                          ? "border-amber-500 bg-amber-950/20 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                          : "border-gray-600 bg-gray-800 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                      }`}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName || nameDraft === deck?.name}
                      className="shrink-0 rounded border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingName ? "…" : t("decks.save")}
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      id="deck-name"
                      className={`min-w-0 flex-1 rounded border border-transparent px-3 py-2 text-base font-medium ${
                        (deck?.name?.trim() ?? "") ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {(deck?.name?.trim() ?? "") || t("decks.noName")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(true);
                        setNameDraft(deck?.name ?? "");
                      }}
                      className="shrink-0 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {t("decks.editName")}
                    </button>
                  </>
                )}
              </div>
              {!(nameDraft?.trim()) && editingName && (deck?.mainItems?.length ?? 0) > 0 && (
                <p className="text-xs text-amber-400">{t("decks.deckNameRequired")}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500 shrink-0">{t("decks.steps")}</span>
              <div className="flex flex-wrap gap-1">
                {(["legend", "champion", "battlefields", "main", "rune", "sideboard"] as PickerMode[]).map((mode) => {
                  const labelMap: Record<PickerMode, string> = {
                    legend: t("decks.stepsLegend"), champion: t("decks.stepsChampion"),
                    battlefields: t("decks.stepsBattlefields"),
                    main: t("decks.stepsMain"), rune: t("decks.stepsRune"), sideboard: t("decks.stepsSB"),
                  };
                  const bfCount = deck?.battlefields?.filter((b) => b.card).length ?? 0;
                  const errs = validationErrorStrings;
                  const doneMap: Record<PickerMode, boolean> = {
                    legend: !!deckLegend,
                    champion: !!deckChampion,
                    battlefields: bfCount === 3,
                    main: mainCount === 39,
                    rune: runeCount === 12,
                    sideboard: sideboardCount > 0,
                  };
                  const bfHasWarn = errs.some((e) => /^battlefield/i.test(e));
                  const warnMap: Record<PickerMode, boolean> = {
                    legend: doneMap.legend && errs.some(e => /^legend/i.test(e)),
                    champion: doneMap.champion && errs.some(e => /^champion/i.test(e)),
                    battlefields: doneMap.battlefields && bfHasWarn,
                    main: doneMap.main && (errs.some(e => /^main/i.test(e)) || mainHasErrors),
                    rune: doneMap.rune && (errs.some(e => /^rune/i.test(e)) || runeHasErrors),
                    sideboard: doneMap.sideboard && (errs.some(e => /^sideboard/i.test(e)) || sideboardHasErrors),
                  };
                  const active = picker === mode;
                  const done = doneMap[mode];
                  const warn = warnMap[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setPicker(mode); setCardSearchQuery(""); if (mode === "battlefields") setBattlefieldSlotBeingEdited(null); setMobilePickerOpen(true); }}
                      className={`rounded border px-2 py-0.5 text-xs font-medium transition-all ${
                        active
                          ? warn
                            ? "border-amber-500 bg-amber-900/30 text-amber-300"
                            : "border-blue-500 bg-blue-500/20 text-blue-300"
                          : warn
                          ? "border-amber-600 bg-amber-900/20 text-amber-400 hover:border-amber-500"
                          : done
                          ? "border-emerald-700 bg-emerald-900/20 text-emerald-400 hover:border-emerald-500"
                          : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {warn && "⚠ "}{!warn && done && !active && "✓ "}{labelMap[mode]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Left column: card picker — full screen overlay on mobile, side column on lg+ */}
            <div ref={pickerContainerRef} className={`flex flex-col rounded-lg border border-gray-700 p-4 min-h-[400px] lg:w-[70%] lg:shrink-0 lg:bg-gray-800/50 ${
              mobilePickerOpen
                ? "fixed inset-0 z-50 overflow-y-auto bg-gray-900 lg:static lg:inset-auto lg:z-auto lg:overflow-visible"
                : "hidden lg:flex"
            }`}>
              {/* Mobile-only close bar */}
              <div className="mb-3 flex items-center justify-between border-b border-gray-700 pb-3 lg:hidden">
                <span className="text-sm font-semibold text-white">{t("decks.browseCards")}</span>
                <button
                  type="button"
                  onClick={() => setMobilePickerOpen(false)}
                  aria-label={t("decks.closePicker")}
                  className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>

              {picker ? (
                <>
                  {/* Current step header */}
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* Type icon */}
                      {(() => {
                        const imgMap: Record<PickerMode, string> = {
                          legend: "/images/types/legend.webp",
                          champion: "/images/types/champion.webp",
                          battlefields: "/images/types/battlefields.webp",
                          main: "/images/types/unit.webp",
                          rune: "/images/types/runes.webp",
                          sideboard: "/images/types/unit.webp",
                        };
                        return (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={imgMap[picker]} alt="" className="h-7 w-7 object-contain opacity-90" />
                        );
                      })()}
                      <div>
                        <h3 className="text-base font-semibold text-white leading-tight">
                          {pickerTitles[picker]}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {picker === "main" && `${mainCount}/39 ${t("decks.cards")}`}
                          {picker === "rune" && `${runeCount}/12 ${t("decks.runes")}`}
                          {picker === "sideboard" && `${sideboardCount}/8 ${t("decks.cards")} · ${t("decks.optional")}`}
                          {picker === "legend" && t("decks.required")}
                          {picker === "champion" && t("decks.required")}
                          {picker === "battlefields" && t("decks.requiredSlots")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Domain · Collection · Type — one row when applicable */}
                  {(picker === "legend" || picker === "champion" || picker === "battlefields" || picker === "main" || picker === "rune" || picker === "sideboard") && (
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      {/* Domain — not used for battlefields */}
                      {picker !== "battlefields" && (() => {
                        const isMultiDomain = picker === "main" || picker === "rune" || picker === "sideboard";
                        const legendIdForUI = deckLegend ? getCardId(deckLegend) : "";
                        const legendCacheForUI = legendIdForUI ? allCards.find((c) => getCardId(c) === legendIdForUI) : null;
                        const domainsFromDeckApiUI = getCardDomains(deckLegend ?? {} as Card);
                        const domainsFromCacheUI = getCardDomains(legendCacheForUI ?? {} as Card);
                        const domainsToShow = isMultiDomain
                          ? (domainsFromDeckApiUI.length > 0 ? domainsFromDeckApiUI : domainsFromCacheUI)
                          : [...DOMAINS] as string[];
                        if (domainsToShow.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-500">{t("decks.domainLabel")}</span>
                            {!isMultiDomain && (
                              <button
                                type="button"
                                onClick={() => setPickerDomain(undefined)}
                                aria-pressed={pickerDomain === undefined}
                                className={`h-7 rounded border-2 px-2 text-xs font-medium transition-all ${
                                  pickerDomain === undefined ? "border-white bg-gray-600 text-white" : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                                }`}
                              >
                                {t("decks.all")}
                              </button>
                            )}
                            {domainsToShow.map((domain) => {
                              const active = isMultiDomain ? pickerDomains.includes(domain) : pickerDomain === domain;
                              return (
                                <button
                                  key={domain}
                                  type="button"
                                  onClick={() => {
                                    if (isMultiDomain) {
                                      setPickerDomains((prev) =>
                                        prev.includes(domain) ? (prev.length === 1 ? prev : prev.filter((d) => d !== domain)) : [...prev, domain]
                                      );
                                    } else {
                                      setPickerDomain((prev) => (prev === domain ? undefined : domain));
                                    }
                                  }}
                                  aria-pressed={active}
                                  title={domain.charAt(0).toUpperCase() + domain.slice(1)}
                                  className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded border-2 p-0.5 transition-all ${
                                    active
                                      ? isMultiDomain && pickerDomains.length === 1
                                        ? "border-white bg-white/20 ring-1 ring-white/50 cursor-not-allowed opacity-70"
                                        : "border-white bg-white/20 ring-1 ring-white/50"
                                      : "border-gray-600 hover:border-gray-400"
                                  }`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={domainImageSrc(domain)} alt={domain} className="h-full w-full object-contain" />
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Type — main, sideboard */}
                      {(picker === "main" || picker === "sideboard") && (
                        <>
                          <span className="h-4 w-px shrink-0 bg-gray-600" aria-hidden />
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-gray-500">{t("decks.typeLabel")}</span>
                          {(["unit", "champion", "gear", "spell"] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setPickerType((prev) => (prev === t ? undefined : t))}
                              aria-pressed={pickerType === t}
                              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-all ${
                                pickerType === t ? "border-blue-500 bg-blue-500/20 text-blue-300" : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/images/types/${t}.webp`} alt="" className="h-3.5 w-3.5 object-contain" />
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                          ))}
                          </div>
                        </>
                      )}

                      {/* Collection toggle — legend, champion, battlefields, main, rune, sideboard */}
                      {(picker === "legend" || picker === "champion" || picker === "battlefields" || picker === "main" || picker === "rune" || picker === "sideboard") && (
                        <>
                          <span className="h-4 w-px shrink-0 bg-gray-600" aria-hidden />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{t("decks.collectionLabel")}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={onlyInCollection}
                            onClick={() => setOnlyInCollection((v) => !v)}
                            title={onlyInCollection ? t("decks.showingOnlyInCollection") : t("decks.showingAllCards")}
                            className={`relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                              onlyInCollection ? "bg-emerald-600" : "bg-gray-600"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 shrink-0 rounded-full bg-white shadow transition-transform ${
                                onlyInCollection ? "translate-x-[18px]" : "translate-x-0.5"
                              }`}
                              style={{ marginTop: 2 }}
                            />
                          </button>
                          <span className="text-xs text-gray-400">
                            {onlyInCollection ? t("decks.myCollection") : t("decks.allCards")}
                          </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Abilities — main and sideboard (GET /v1/abilities) */}
                  {(picker === "main" || picker === "sideboard") && (
                    <div className="mb-3">
                      <AbilitiesFilter selected={pickerAbilities} onChange={setPickerAbilities} />
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={cardSearchQuery}
                        onChange={(e) => setCardSearchQuery(e.target.value)}
                        placeholder={t("decks.searchByName")}
                        className="w-full rounded border border-gray-600 bg-gray-700 py-2 pl-3 pr-14 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {cardSearchQuery.trim().length > 0 && cardSearchQuery.trim().length < 3 && (
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums text-amber-400">
                          {cardSearchQuery.trim().length}/3
                        </span>
                      )}
                    </div>
                    {cardSearchQuery.trim().length > 0 && cardSearchQuery.trim().length < 3 && (
                      <p className="mt-1 text-xs text-amber-400/80">
                        {t("decks.moreCharsToSearch", { count: 3 - cardSearchQuery.trim().length })}
                      </p>
                    )}
                  </div>
                  {cardsLoading ? (
                    <p className="py-8 text-center text-gray-400">{t("decks.loadingCards")}</p>
                  ) : filteredCards.length === 0 ? (
                    <p className="py-8 text-center text-gray-400">
                      {cardSearchQuery.trim().length >= 3 ? t("decks.noCardsFound") : t("decks.noCardsAvailable")}
                    </p>
                  ) : (
                    <CardPickerGrid
                      picker={picker}
                      cards={filteredCards}
                      deck={deck}
                      mainCount={mainCount}
                      runeCount={runeCount}
                      sideboardCount={sideboardCount}
                      onSetLegend={handleSetLegend}
                      onSetChampion={handleSetChampion}
                      onAddMain={handleAddMain}
                      onAddRune={handleAddRune}
                      onAddSideboard={handleAddSideboard}
                      onSetBattlefield={handleSetBattlefield}
                      onPickBattlefield={picker === "battlefields" ? handlePickBattlefield : undefined}
                      collectionQtyByCardId={collectionQtyByCardId}
                      addAnimations={addAnimations}
                    />
                  )}
                </>
              ) : null}
            </div>

            {/* Mobile FAB — open card picker */}
            {!mobilePickerOpen && (
              <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobilePickerOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-gray-600 bg-gray-800 px-5 py-3 text-sm font-semibold text-white shadow-2xl hover:bg-gray-700 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  {t("decks.browseCards")}
                  {picker && (
                    <span className="ml-1 rounded border border-blue-500/50 bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">
                      {picker === "legend" ? t("decks.stepsLegend") : picker === "champion" ? t("decks.stepsChampion") : picker === "battlefields" ? t("decks.stepsBattlefields") : picker === "main" ? t("decks.stepsMain") : picker === "rune" ? t("decks.stepsRune") : t("decks.stepsSB")}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Right column: deck sections (60%) */}
            <div className="flex min-w-0 flex-1 flex-col gap-4 pb-20 lg:pb-0">
              {/* LEGEND & CHAMPION */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t("decks.legendAndChampion")}
                </h2>
                <div className="flex gap-4">
                  {/* Legend slot */}
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      {t("decks.legend")}
                      {deckLegend ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      )}
                      {deckLegend && collectionQtyByCardId.size > 0 && (
                        <span
                          title={`${t("decks.inCollection")}: ${collectionQtyByCardId.get(getCardId(deckLegend)) ?? 0} · ${t("decks.inDeck")}: 1`}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                            (collectionQtyByCardId.get(getCardId(deckLegend)) ?? 0) >= 1 ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                          }`}
                        >
                          {(collectionQtyByCardId.get(getCardId(deckLegend)) ?? 0)}/1
                        </span>
                      )}
                    </span>
                    {deckLegend ? (
                      <div className="group relative w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-800 shadow-lg aspect-[2.5/3.5]">
                        {getCardImageUrl(deckLegend) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getCardImageUrl(deckLegend)!} alt={deckLegend.name} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 p-2 text-center">
                            <span className="text-xs text-gray-400">{deckLegend.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="w-full truncate text-center text-xs font-medium text-white">{deckLegend.name}</span>
                          <button
                            type="button"
                            onClick={() => { setPicker("legend"); setMobilePickerOpen(true); }}
                            className="w-full rounded bg-gray-700/80 py-1 text-xs text-gray-200 hover:bg-gray-600"
                          >
                            {t("decks.change")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setPicker("legend"); setMobilePickerOpen(true); }}
                        className="flex w-full aspect-[2.5/3.5] items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/50 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300"
                      >
                        {t("decks.setLegend")}
                      </button>
                    )}
                  </div>

                  {/* Champion slot */}
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                      {t("decks.champion")}
                      {deckChampion ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      )}
                      {deckChampion && collectionQtyByCardId.size > 0 && (
                        <span
                          title={`${t("decks.inCollection")}: ${collectionQtyByCardId.get(getCardId(deckChampion)) ?? 0} · ${t("decks.inDeck")}: 1`}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                            (collectionQtyByCardId.get(getCardId(deckChampion)) ?? 0) >= 1 ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                          }`}
                        >
                          {(collectionQtyByCardId.get(getCardId(deckChampion)) ?? 0)}/1
                        </span>
                      )}
                    </span>
                    {deckChampion ? (
                      <div className="group relative w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-800 shadow-lg aspect-[2.5/3.5]">
                        {getCardImageUrl(deckChampion) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getCardImageUrl(deckChampion)!} alt={deckChampion.name} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 p-2 text-center">
                            <span className="text-xs text-gray-400">{deckChampion.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="w-full truncate text-center text-xs font-medium text-white">{deckChampion.name}</span>
                          <button
                            type="button"
                            onClick={() => { setPicker("champion"); setMobilePickerOpen(true); }}
                            className="w-full rounded bg-gray-700/80 py-1 text-xs text-gray-200 hover:bg-gray-600"
                          >
                            {t("decks.change")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { if (deckLegend) { setPicker("champion"); setMobilePickerOpen(true); } }}
                        disabled={!deckLegend}
                        title={!deckLegend ? t("decks.selectLegendFirst") : t("decks.setChampion")}
                        className={`flex w-full aspect-[2.5/3.5] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm transition-all ${
                          deckLegend
                            ? "border-gray-600 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                            : "cursor-not-allowed border-gray-700 bg-gray-800/30 text-gray-600"
                        }`}
                      >
                        <span>{t("decks.setChampion")}</span>
                        {!deckLegend && (
                          <span className="text-xs text-gray-600">{t("decks.requiresLegend")}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* BATTLEFIELDS (3) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                {(() => {
                  const bfCount = deck.battlefields?.filter((b) => b.card).length ?? 0;
                  return (
                    <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {t("decks.stepsBattlefields")} ({bfCount}/3)
                      {bfCount === 3 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      )}
                    </h2>
                  );
                })()}
                <div className="space-y-2">
                  {([1, 2, 3] as const).map((pos) => {
                    const bf = deck.battlefields?.find((b) => b.position === pos);
                    const bfCardId = (bf?.card ? getCardId(bf.card as Card) : "") || bf?.cardId;
                    const owned = bfCardId ? (collectionQtyByCardId.get(bfCardId) ?? 0) : 0;
                    const hasCollectionData = collectionQtyByCardId.size > 0;
                    return (
                      <div key={pos} className="flex items-center justify-between gap-2 rounded border border-gray-600 bg-gray-700/30 px-3 py-2">
                        {bf?.card ? (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <CardHoverPreview card={bf.card} battlefieldAsLandscape>
                              <span className="truncate text-sm text-blue-400 cursor-pointer">{bf.card.name}</span>
                            </CardHoverPreview>
                            {hasCollectionData && (
                              <span
                                title={`${t("decks.inCollection")}: ${owned} · ${t("decks.inDeck")}: 1`}
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                                  owned >= 1 ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                                }`}
                              >
                                {owned}/1
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="flex-1 text-sm text-gray-600 italic">{t("decks.empty")}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => { setPicker("battlefields"); setBattlefieldSlotBeingEdited(pos); setMobilePickerOpen(true); }}
                          className="rounded border border-gray-600 bg-gray-700/50 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 shrink-0"
                        >
                          {bf?.card ? t("decks.change") : t("decks.setBattlefield")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* MAIN DECK (0/39) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {(deckLegend?.cardDomains ?? []).map((cd) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={cd.domain.name}
                      src={domainImageSrc(cd.domain.name)}
                      alt={cd.domain.name}
                      title={cd.domain.name.charAt(0).toUpperCase() + cd.domain.name.slice(1)}
                      className="h-4 w-4 object-contain"
                    />
                  ))}
                  {t("decks.mainDeckLabel")} ({mainCount}/39)
                  {mainCount === 39 && mainHasErrors ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                  ) : mainCount === 39 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  )}
                </h2>
                {(() => {
                  const TYPE_ORDER = ["legend", "champion", "unit", "limit", "gear", "spell", "rune", "battlefield", "other"];
                  const TYPE_LABEL: Record<string, string> = {
                    legend: t("decks.typeLegend"), champion: t("decks.typeChampion"), unit: t("decks.typeUnit"), limit: t("decks.typeLimit"),
                    gear: t("decks.typeGear"), spell: t("decks.typeSpell"), rune: t("decks.typeRune"), battlefield: t("decks.typeBattlefield"), other: t("decks.typeOther"),
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
                    other: "/images/types/unit.webp",
                  };
                  const grouped = (deck.mainItems ?? []).reduce<Record<string, typeof deck.mainItems>>((acc, item) => {
                    const t = (item.card?.type?.toLowerCase() ?? "other");
                    const key = TYPE_ORDER.includes(t) ? t : "other";
                    (acc[key] ??= []).push(item);
                    return acc;
                  }, {});
                  const orderedKeys = TYPE_ORDER.filter((t) => grouped[t]?.length);

                  return (
                    <div className="mb-3 space-y-3">
                      {orderedKeys.map((typeKey) => {
                        const items = grouped[typeKey]!;
                        const groupTotal = items.reduce((s, it) => s + it.quantity, 0);
                        return (
                          <div key={typeKey}>
                            <div className="mb-1 flex items-center gap-1.5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={TYPE_IMAGE[typeKey]} alt={TYPE_LABEL[typeKey]} className="h-4 w-4 object-contain" />
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                {TYPE_LABEL[typeKey]} ({groupTotal})
                              </span>
                            </div>
                            <ul className="space-y-0.5">
                              {items.map((item, i) => (
                                <li key={(getCardId(item.card as Card) || item.cardId) ?? i} className="flex items-center justify-between gap-2 rounded px-1.5 py-0.5 hover:bg-gray-700/40">
                                  {(() => {
                                    const cid = getCardId(item.card as Card) || item.cardId;
                                    const domain = (item.card?.cardDomains?.[0]?.domain?.name ?? item.card?.domain)?.toLowerCase();
                                    const domainImgSrc = domainImageSrc(domain, item.card);
                                    const cardErrs = cardErrorMap.get(item.card?.name?.toLowerCase() ?? "") ?? [];
                                    const owned = cid ? (collectionQtyByCardId.get(cid) ?? 0) : 0;
                                    const usedByLegend = getCardId(deckLegend) === cid ? 1 : 0;
                                    const usedByChampion = getCardId(deckChampion) === cid ? 1 : 0;
                                    const mainQty = (deck.mainItems ?? []).reduce((s, it) => s + ((getCardId(it.card as Card) || it.cardId) === cid ? it.quantity : 0), 0);
                                    const sbQty = (deck.sideboardItems ?? []).reduce((s, it) => s + ((getCardId(it.card as Card) || it.cardId) === cid ? it.quantity : 0), 0);
                                    const effectiveMax = Math.min(3, Math.max(0, owned - usedByLegend - usedByChampion));
                                    const canIncreaseMain = (mainQty + sbQty) < effectiveMax && (mainQty + sbQty) < 3;
                                    const need = item.quantity;
                                    const hasCollectionData = collectionQtyByCardId.size > 0;
                                    return (
                                      <>
                                        {item.card ? (
                                          <span className="flex min-w-0 items-center gap-1.5">
                                            <CardHoverPreview card={item.card} battlefieldAsLandscape>
                                              <span className="flex items-center gap-1.5 text-sm text-blue-400 cursor-pointer">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={domainImgSrc} alt={domain ?? "unit"} className="h-4 w-4 shrink-0 object-contain opacity-90" />
                                                <span className="text-gray-500">×{item.quantity}</span>
                                                {item.card.name}
                                              </span>
                                            </CardHoverPreview>
                                            {hasCollectionData && (
                                              <span
                                                title={`${t("decks.inCollection")}: ${owned} · ${t("decks.inDeck")}: ${need}${usedByChampion || usedByLegend ? ` (${usedByLegend + usedByChampion} ${t("decks.inLegendChampion")})` : ""}`}
                                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                                                  owned >= need ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                                                }`}
                                              >
                                                {owned}/{need}
                                              </span>
                                            )}
                                            <CardWarning errors={cardErrs} />
                                          </span>
                                        ) : (
                                          <span className="text-sm text-gray-400">×{item.quantity} {item.cardId}</span>
                                        )}
                                        <span className="flex gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await runWithDeckMutation(async () => {
                                                if (item.quantity < 2) {
                                                  try { setDeck(await removeMainCard(deck.id, cid)); } catch {}
                                                } else {
                                                  try { setDeck(await setMainCardQuantity(deck.id, cid, item.quantity - 1)); } catch {}
                                                }
                                              });
                                            }}
                                            disabled={deckMutationLoading}
                                            className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50 text-xs"
                                          >−</button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (!canIncreaseMain) return;
                                              await runWithDeckMutation(async () => {
                                                try { setDeck(await setMainCardQuantity(deck.id, cid, item.quantity + 1)); } catch {}
                                              });
                                            }}
                                            disabled={!canIncreaseMain || deckMutationLoading}
                                            className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50 text-xs"
                                          >+</button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              await runWithDeckMutation(async () => { try { setDeck(await removeMainCard(deck.id, cid)); } catch {} });
                                            }}
                                            disabled={deckMutationLoading}
                                            className="rounded bg-red-900/50 px-1.5 text-red-200 hover:bg-red-900/70 text-xs"
                                          >×</button>
                                        </span>
                                      </>
                                    );
                                  })()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => { setPicker("main"); setMobilePickerOpen(true); }}
                  disabled={mainCount > 38}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  {t("decks.addCardBtn")}
                </button>
              </section>

              {/* RUNE DECK (0/12) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t("decks.runeDeckLabel")} ({runeCount}/12)
                  {runeCount === 12 && runeHasErrors ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                  ) : runeCount === 12 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  )}
                </h2>
                <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm text-white">
                  {(deck.runeItems ?? []).map((item, i) => (
                    <li key={(getCardId(item.card as Card) || item.cardId) ?? i} className="flex items-center justify-between gap-2">
                      {(() => {
                        const cid = getCardId(item.card as Card) || item.cardId;
                        const runeErrs = cardErrorMap.get(item.card?.name?.toLowerCase() ?? "") ?? [];
                        const owned = cid ? (collectionQtyByCardId.get(cid) ?? 0) : 0;
                        const need = item.quantity;
                        const hasCollectionData = collectionQtyByCardId.size > 0;
                        return (
                          <>
                            {item.card ? (
                              <span className="flex min-w-0 items-center gap-1">
                                <CardHoverPreview card={item.card} battlefieldAsLandscape>
                                  <span className="text-blue-400 cursor-pointer">×{item.quantity} {item.card.name}</span>
                                </CardHoverPreview>
                                {hasCollectionData && (
                                  <span
                                    title={`${t("decks.inCollection")}: ${owned} · ${t("decks.inDeck")}: ${need}`}
                                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                                      owned >= need ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                                    }`}
                                  >
                                    {owned}/{need}
                                  </span>
                                )}
                                <CardWarning errors={runeErrs} />
                              </span>
                            ) : (
                              <span>×{item.quantity} {item.cardId}</span>
                            )}
                            <span className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  await runWithDeckMutation(async () => {
                                    if (item.quantity < 2) {
                                      try { setDeck(await removeRuneCard(deck.id, cid)); } catch {}
                                    } else {
                                      try { setDeck(await setRuneCardQuantity(deck.id, cid, item.quantity - 1)); } catch {}
                                    }
                                  });
                                }}
                                disabled={deckMutationLoading}
                                className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50"
                              >−</button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (runeCount > 11) return;
                                  await runWithDeckMutation(async () => {
                                    try { setDeck(await setRuneCardQuantity(deck.id, cid, item.quantity + 1)); } catch {}
                                  });
                                }}
                                disabled={runeCount > 11 || deckMutationLoading}
                                className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50"
                              >+</button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await runWithDeckMutation(async () => { try { setDeck(await removeRuneCard(deck.id, cid)); } catch {} });
                                }}
                                disabled={deckMutationLoading}
                                className="rounded bg-red-900/50 px-1.5 text-red-200 hover:bg-red-900/70"
                              >×</button>
                            </span>
                          </>
                        );
                      })()}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => { setPicker("rune"); setMobilePickerOpen(true); }}
                  disabled={runeCount > 11}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  {t("decks.addRuneBtn")}
                </button>
              </section>

              {/* SIDEBOARD (0/8) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {t("decks.sideboardLabel")} ({sideboardCount}/8)
                  <span className="ml-1 rounded border border-gray-600 bg-gray-700/50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 uppercase tracking-wide">{t("decks.optional")}</span>
                  {sideboardCount > 0 && sideboardHasErrors ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
                  ) : sideboardCount > 0 && sideboardCount <= 8 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : null}
                </h2>
                <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm text-white">
                  {(deck.sideboardItems ?? []).map((item, i) => {
                    const cid = getCardId(item.card as Card) || item.cardId;
                    const domain = (item.card?.cardDomains?.[0]?.domain?.name ?? item.card?.domain)?.toLowerCase();
                    const domainImgSrcSb = domainImageSrc(domain, item.card);
                    const sbErrs = cardErrorMap.get(item.card?.name?.toLowerCase() ?? "") ?? [];
                    const owned = cid ? (collectionQtyByCardId.get(cid) ?? 0) : 0;
                    const usedByLegend = getCardId(deckLegend) === cid ? 1 : 0;
                    const usedByChampion = getCardId(deckChampion) === cid ? 1 : 0;
                    const mainQty = (deck.mainItems ?? []).reduce((s, it) => s + ((getCardId(it.card as Card) || it.cardId) === cid ? it.quantity : 0), 0);
                    const sbQty = (deck.sideboardItems ?? []).reduce((s, it) => s + ((getCardId(it.card as Card) || it.cardId) === cid ? it.quantity : 0), 0);
                    const effectiveMax = Math.min(3, Math.max(0, owned - usedByLegend - usedByChampion));
                    const canIncreaseSb = sideboardCount <= 7 && (mainQty + sbQty) < effectiveMax && (mainQty + sbQty) < 3;
                    const need = item.quantity;
                    const hasCollectionData = collectionQtyByCardId.size > 0;
                    return (
                      <li key={(getCardId(item.card as Card) || item.cardId) ?? i} className="flex items-center justify-between gap-2">
                        {item.card ? (
                          <span className="flex min-w-0 items-center gap-1">
                            <CardHoverPreview card={item.card} battlefieldAsLandscape>
                              <span className="flex items-center gap-1.5 text-blue-400 cursor-pointer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={domainImgSrcSb} alt={domain ?? "unit"} className="h-3.5 w-3.5 shrink-0 object-contain opacity-90" />
                                <span className="text-gray-500">×{item.quantity}</span>
                                {item.card.name}
                              </span>
                            </CardHoverPreview>
                            {hasCollectionData && (
                              <span
                                title={`${t("decks.inCollection")}: ${owned} · ${t("decks.inDeck")}: ${need}${usedByChampion || usedByLegend ? ` (${usedByLegend + usedByChampion} ${t("decks.inLegendChampion")})` : ""}`}
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                                  owned >= need ? "bg-emerald-900/40 text-emerald-300" : "bg-amber-900/40 text-amber-300"
                                }`}
                              >
                                {owned}/{need}
                              </span>
                            )}
                            <CardWarning errors={sbErrs} />
                          </span>
                        ) : (
                          <span>×{item.quantity} {item.cardId}</span>
                        )}
                        <span className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              await runWithDeckMutation(async () => {
                                if (item.quantity < 2) {
                                  try { setDeck(await removeSideboardCard(deck.id, cid)); } catch {}
                                } else {
                                  try { setDeck(await setSideboardCardQuantity(deck.id, cid, item.quantity - 1)); } catch {}
                                }
                              });
                            }}
                            disabled={deckMutationLoading}
                            className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50 text-xs"
                          >−</button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!canIncreaseSb) return;
                              await runWithDeckMutation(async () => {
                                try { setDeck(await setSideboardCardQuantity(deck.id, cid, item.quantity + 1)); } catch {}
                              });
                            }}
                            disabled={!canIncreaseSb || deckMutationLoading}
                            className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50 text-xs"
                          >+</button>
                          <button
                            type="button"
                            onClick={async () => {
                              await runWithDeckMutation(async () => { try { setDeck(await removeSideboardCard(deck.id, cid)); } catch {} });
                            }}
                            disabled={deckMutationLoading}
                            className="rounded bg-red-900/50 px-1.5 text-red-200 hover:bg-red-900/70 text-xs"
                          >×</button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => { setPicker("sideboard"); setMobilePickerOpen(true); }}
                  disabled={sideboardCount > 7}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  {t("decks.addToSideboardBtn")}
                </button>
              </section>

              {/* Validation — only structural errors (per-card errors shown inline) */}
              {validation && (isDeckValid || structuralErrors.length > 0 || structuralWarnings.length > 0) && (
                <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{t("decks.validation")}</h2>
                  {isDeckValid ? (
                    <p className="text-sm text-emerald-400">{t("decks.deckIsValid")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {structuralErrors.map((msg, i) => (
                        <p key={i} className="text-sm text-red-400">{msg}</p>
                      ))}
                      {structuralWarnings.map((msg, i) => (
                        <p key={i} className="text-sm text-amber-400">{msg}</p>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
          </>
        )}

      </div>
    </div>
  );
}
