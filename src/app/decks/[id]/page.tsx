"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
  setBattlefield,
  deleteDeck,
} from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import { CardTile } from "@/components/cards/CardTile";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { AttributesFilter } from "@/components/filters/AttributesFilter";
import type { Card } from "@/types/card";
import type { CardsListResponse, CardsQueryParams } from "@/types/card";
import type { Deck } from "@/types/deck";

function toQueryRecord(p: CardsQueryParams): Record<string, string | number | boolean | undefined> {
  return p as Record<string, string | number | boolean | undefined>;
}

const DOMAINS = ["fury", "calm", "mind", "body", "chaos", "order"] as const;

function CardPickerGrid({
  picker, cards, deck,
  onSetLegend, onSetChampion, onAddMain, onAddRune, onSetBattlefield,
}: {
  picker: PickerMode;
  cards: Card[];
  deck: Deck;
  onSetLegend: (c: Card) => void;
  onSetChampion: (c: Card) => void;
  onAddMain: (c: Card) => void;
  onAddRune: (c: Card) => void;
  onSetBattlefield: (pos: 1 | 2 | 3, c: Card) => void;
}) {
  const mainQtyMap = new Map<string, number>();
  for (const item of deck.mainItems ?? []) {
    const id = item.card?.uuid ?? item.cardId;
    if (id) mainQtyMap.set(id, item.quantity);
  }
  const runeQtyMap = new Map<string, number>();
  for (const item of deck.runeItems ?? []) {
    const id = item.card?.uuid ?? item.cardId;
    if (id) runeQtyMap.set(id, item.quantity);
  }

  const isBf = picker === "bf1" || picker === "bf2" || picker === "bf3";

  return (
    <ul className={`grid list-none gap-2 overflow-y-auto ${
      isBf ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    }`}>
      {cards.map((card) => {
        const currentQty = picker === "rune"
          ? (runeQtyMap.get(card.uuid) ?? 0)
          : (mainQtyMap.get(card.uuid) ?? 0);
        const maxQty = picker === "rune" ? 1 : 3;
        const atLimit = (picker === "main" || picker === "rune") && currentQty >= maxQty;

        return (
          <li key={card.uuid}>
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
                else if (picker === "bf1") onSetBattlefield(1, card);
                else if (picker === "bf2") onSetBattlefield(2, card);
                else if (picker === "bf3") onSetBattlefield(3, card);
              }}
            >
              <CardTile
                card={card}
                wrapperElement="div"
                grayscaleWhenNotInCollection={atLimit}
                inCollection={!atLimit}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

type PickerMode = "legend" | "champion" | "main" | "rune" | "bf1" | "bf2" | "bf3";

/** Retorna o próximo passo pendente do deck, na ordem de prioridade. */
function getNextPicker(deck: Deck): PickerMode {
  const legend = deck.legendCard ?? deck.legend;
  const champion = deck.championCard ?? deck.champion;
  if (!legend) return "legend";
  if (!champion) return "champion";
  const bfs = deck.battlefields ?? [];
  for (const pos of [1, 2, 3] as const) {
    const bf = bfs.find((b) => b.position === pos);
    if (!bf?.card) return `bf${pos}` as PickerMode;
  }
  const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  if (mainCount < 40) return "main";
  const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  if (runeCount < 12) return "rune";
  return "main"; // deck completo — mantém main como default
}

const PICKER_TITLES: Record<PickerMode, string> = {
  legend: "Escolha sua Legend",
  champion: "Escolha seu Champion",
  bf1: "Escolha o Battlefield 1",
  bf2: "Escolha o Battlefield 2",
  bf3: "Escolha o Battlefield 3",
  main: "Adicione cartas ao Main Deck",
  rune: "Adicione Runas ao Rune Deck",
};

export default function DeckBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [pickerDomain, setPickerDomain] = useState<string | undefined>(undefined); // legend: single
  const [pickerDomains, setPickerDomains] = useState<string[]>([]); // main: multi
  const [pickerType, setPickerType] = useState<string | undefined>(undefined);
  const [pickerAttributes, setPickerAttributes] = useState<string[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState("");

  const fetchDeck = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await getDeck(deckId, true);
      setDeck(d);
      setNameDraft(d.name || "");
      // Auto-abre o próximo passo pendente na primeira carga
      setPicker((prev) => prev ?? getNextPicker(d));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading deck");
      setDeck(null);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchDeck();
  }, [authLoading, user, router, fetchDeck]);

  const fetchCards = useCallback(async () => {
    if (!picker) return;
    setCardsLoading(true);
    try {
      const params: CardsQueryParams = {
        limit: picker === "legend" ? 50 : 100,
        offset: 0,
        sortBy: "collector_number",
        order: "asc",
        ...(cardSearchQuery.trim().length >= 3 && { name: cardSearchQuery.trim() }),
      };
      if (picker === "legend") {
        params.type = "legend";
        if (pickerDomain) params.domain = pickerDomain;
      } else if (picker === "champion") {
        params.type = "champion";
        const legendCard = deck?.legendCard ?? deck?.legend;
        const legendSubtype = legendCard?.subtypes?.[0];
        if (legendSubtype) params.subtype = legendSubtype;
      } else if (picker === "main") {
        if (pickerDomains.length > 0) params.domain = pickerDomains.join(",");
        if (pickerType) params.type = pickerType;
        if (pickerAttributes.length > 0) params.attribute = pickerAttributes.join(",");
      } else if (picker === "rune") {
        params.type = "Rune";
      } else if (picker === "bf1" || picker === "bf2" || picker === "bf3") {
        params.type = "Battlefield";
      }
      const res = await apiGet<CardsListResponse>("/cards", toQueryRecord(params));
      setCards(res.data.items ?? []);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [picker, pickerDomain, pickerDomains, pickerType, pickerAttributes, cardSearchQuery, deck]);

  // Reseta filtros ao trocar o picker; para "main" pré-seleciona todos os domains da legend
  useEffect(() => {
    const legend = deck?.legendCard ?? deck?.legend;
    const legendDomains = legend?.cardDomains?.map((cd) => cd.domain.name.toLowerCase()) ?? [];
    setPickerDomain(undefined);
    setPickerDomains(picker === "main" ? legendDomains : []);
    setPickerType(undefined);
    setPickerAttributes([]);
    setCardSearchQuery("");
    if (!picker) setCards([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker]);

  // Dispara busca ao alterar qualquer filtro
  useEffect(() => {
    if (!picker) return;
    const trimmed = cardSearchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < 3) return;
    const t = setTimeout(fetchCards, trimmed.length >= 3 ? 400 : 0);
    return () => clearTimeout(t);
  }, [picker, pickerDomain, pickerDomains, pickerType, pickerAttributes, cardSearchQuery, fetchCards]);

  async function handleSaveName() {
    if (!deck || nameDraft === deck.name) return;
    setSavingName(true);
    try {
      const updated = await updateDeckName(deck.id, nameDraft);
      setDeck(updated);
    } catch {
      // keep draft
    } finally {
      setSavingName(false);
    }
  }

  async function handleSetLegend(card: Card) {
    if (!deck) return;
    try {
      const currentChampion = deck.championCard ?? deck.champion;
      if (currentChampion) {
        await setChampion(deck.id, null);
      }
      const updated = await setLegend(deck.id, card.uuid);
      setDeck(updated);
      setPicker(getNextPicker(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set legend");
    }
  }

  async function handleSetChampion(card: Card) {
    if (!deck) return;
    try {
      const updated = await setChampion(deck.id, card.uuid);
      setDeck(updated);
      setPicker(getNextPicker(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set champion");
    }
  }

  async function handleAddMain(card: Card) {
    if (!deck) return;
    try {
      const updated = await addMainCard(deck.id, card.uuid, 1);
      setDeck(updated);
      // Mantém no main; avança só quando o deck estiver cheio
      setPicker(getNextPicker(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add card");
    }
  }

  async function handleAddRune(card: Card) {
    if (!deck) return;
    try {
      const updated = await addRuneCard(deck.id, card.uuid, 1);
      setDeck(updated);
      setPicker(getNextPicker(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add rune");
    }
  }

  async function handleSetBattlefield(position: 1 | 2 | 3, card: Card) {
    if (!deck) return;
    try {
      const updated = await setBattlefield(deck.id, position, card.uuid);
      setDeck(updated);
      setPicker(getNextPicker(updated));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set battlefield");
    }
  }

  async function handleDelete() {
    if (!deck || !confirm("Delete this deck?")) return;
    try {
      await deleteDeck(deck.id);
      router.replace("/decks");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!deckId || (!loading && !deck)) {
    return (
      <div className="min-h-screen bg-gray-900 px-4 py-8">
        <p className="text-gray-400">Deck not found.</p>
        <Link href="/decks" className="mt-4 inline-block text-emerald-400 hover:underline">Back to decks</Link>
      </div>
    );
  }

  const mainCount = deck?.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const runeCount = deck?.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const validation = deck?.validation;
  const deckLegend = deck?.legendCard ?? deck?.legend;
  const deckChampion = deck?.championCard ?? deck?.champion;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/decks" className="text-gray-400 hover:text-white">← Decks</Link>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={handleSaveName}
            disabled={savingName}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-lg font-medium text-white"
          />
          <button
            type="button"
            onClick={handleDelete}
            className="rounded bg-red-900/50 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/70"
          >
            Delete deck
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-400">Loading deck...</p>
        ) : !deck ? null : (
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Coluna esquerda: lista de cartas (70%) */}
            <div className="flex flex-col rounded-lg border border-gray-700 bg-gray-800/50 p-4 min-h-[400px] lg:w-[70%] lg:shrink-0">
              {picker ? (
                <>
                  {/* Header do passo atual */}
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {/* Ícone do tipo */}
                      {(picker === "legend" || picker === "champion" || picker === "main" || picker === "rune" ||
                        picker === "bf1" || picker === "bf2" || picker === "bf3") && (() => {
                        const imgMap: Record<PickerMode, string> = {
                          legend: "/images/types/legend.webp",
                          champion: "/images/types/champion.webp",
                          bf1: "/images/types/battlefields.webp",
                          bf2: "/images/types/battlefields.webp",
                          bf3: "/images/types/battlefields.webp",
                          main: "/images/types/unit.webp",
                          rune: "/images/types/runes.webp",
                        };
                        return (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={imgMap[picker]} alt="" className="h-7 w-7 object-contain opacity-90" />
                        );
                      })()}
                      <div>
                        <h3 className="text-base font-semibold text-white leading-tight">
                          {PICKER_TITLES[picker]}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {picker === "main" && `${mainCount}/40 cartas`}
                          {picker === "rune" && `${runeCount}/12 runas`}
                          {picker === "legend" && "Obrigatório"}
                          {picker === "champion" && "Obrigatório"}
                          {(picker === "bf1" || picker === "bf2" || picker === "bf3") && "Obrigatório"}
                        </p>
                      </div>
                    </div>
                    {/* Chips de navegação rápida */}
                    <div className="flex flex-wrap justify-end gap-1">
                      {(["legend", "champion", "bf1", "bf2", "bf3", "main", "rune"] as PickerMode[]).map((mode) => {
                        const labelMap: Record<PickerMode, string> = {
                          legend: "Legend", champion: "Champion",
                          bf1: "BF 1", bf2: "BF 2", bf3: "BF 3",
                          main: "Main", rune: "Rune",
                        };
                        const doneMap: Record<PickerMode, boolean> = {
                          legend: !!deckLegend,
                          champion: !!deckChampion,
                          bf1: !!(deck.battlefields?.find((b) => b.position === 1)?.card),
                          bf2: !!(deck.battlefields?.find((b) => b.position === 2)?.card),
                          bf3: !!(deck.battlefields?.find((b) => b.position === 3)?.card),
                          main: mainCount === 40,
                          rune: runeCount === 12,
                        };
                        const active = picker === mode;
                        const done = doneMap[mode];
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => { setPicker(mode); setCardSearchQuery(""); }}
                            className={`rounded border px-2 py-0.5 text-xs font-medium transition-all ${
                              active
                                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                : done
                                ? "border-emerald-700 bg-emerald-900/20 text-emerald-400 hover:border-emerald-500"
                                : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                            }`}
                          >
                            {done && !active ? "✓ " : ""}{labelMap[mode]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filtros de Domain */}
                  {(picker === "legend" || picker === "main") && (() => {
                    const domainsToShow = picker === "main"
                      ? (deckLegend?.cardDomains?.map((cd) => cd.domain.name.toLowerCase()) ?? [])
                      : [...DOMAINS] as string[];
                    if (domainsToShow.length === 0) return null;
                    return (
                      <div className="mb-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-gray-500">Domain:</span>
                        {/* "All" só aparece no legend picker */}
                        {picker === "legend" && (
                          <button
                            type="button"
                            onClick={() => setPickerDomain(undefined)}
                            aria-pressed={pickerDomain === undefined}
                            className={`h-7 rounded border-2 px-2 text-xs font-medium transition-all ${
                              pickerDomain === undefined
                                ? "border-white bg-gray-600 text-white"
                                : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                            }`}
                          >
                            All
                          </button>
                        )}
                        {domainsToShow.map((domain) => {
                          const active = picker === "main"
                            ? pickerDomains.includes(domain)
                            : pickerDomain === domain;
                          return (
                            <button
                              key={domain}
                              type="button"
                              onClick={() => {
                                if (picker === "main") {
                                  setPickerDomains((prev) => {
                                    if (prev.includes(domain)) {
                                      // Não permite deselecionar se for o único selecionado
                                      if (prev.length === 1) return prev;
                                      return prev.filter((d) => d !== domain);
                                    }
                                    return [...prev, domain];
                                  });
                                } else {
                                  setPickerDomain((prev) => prev === domain ? undefined : domain);
                                }
                              }}
                              aria-pressed={active}
                              title={domain.charAt(0).toUpperCase() + domain.slice(1)}
                              className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded border-2 p-0.5 transition-all ${
                                active
                                  ? picker === "main" && pickerDomains.length === 1
                                    ? "border-white bg-white/20 ring-1 ring-white/50 cursor-not-allowed opacity-70"
                                    : "border-white bg-white/20 ring-1 ring-white/50"
                                  : "border-gray-600 hover:border-gray-400"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/images/${domain}.webp`} alt={domain} className="h-full w-full object-contain" />
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Filtros de Type e Attributes — só para main */}
                  {picker === "main" && (
                    <div className="mb-3 space-y-2">
                      {/* Type */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-gray-500">Type:</span>
                        {(["unit", "champion", "gear", "spell"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setPickerType((prev) => prev === t ? undefined : t)}
                            aria-pressed={pickerType === t}
                            className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition-all ${
                              pickerType === t
                                ? "border-blue-500 bg-blue-500/20 text-blue-300"
                                : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/images/types/${t}.webp`} alt="" className="h-3.5 w-3.5 object-contain" />
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                      {/* Attributes */}
                      <AttributesFilter selected={pickerAttributes} onChange={setPickerAttributes} />
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={cardSearchQuery}
                        onChange={(e) => setCardSearchQuery(e.target.value)}
                        placeholder="Search by name..."
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
                        {3 - cardSearchQuery.trim().length} more {3 - cardSearchQuery.trim().length === 1 ? "character" : "characters"} to search
                      </p>
                    )}
                  </div>
                  {cardsLoading ? (
                    <p className="py-8 text-center text-gray-400">Loading cards...</p>
                  ) : cards.length === 0 ? (
                    <p className="py-8 text-center text-gray-400">
                      {cardSearchQuery.trim().length >= 3
                        ? "Nenhuma carta encontrada."
                        : picker === "main" || picker === "rune"
                        ? "Digite o nome para buscar."
                        : "Carregando..."}
                    </p>
                  ) : (
                    <CardPickerGrid
                      picker={picker}
                      cards={cards}
                      deck={deck}
                      onSetLegend={handleSetLegend}
                      onSetChampion={handleSetChampion}
                      onAddMain={handleAddMain}
                      onAddRune={handleAddRune}
                      onSetBattlefield={handleSetBattlefield}
                    />
                  )}
                </>
              ) : null}
            </div>

            {/* Coluna direita: seções do deck (60%) */}
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {/* LEGEND & CHAMPION */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Legend &amp; Champion
                </h2>
                <div className="flex gap-4">
                  {/* Legend slot */}
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      Legend
                      {deckLegend ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      )}
                    </span>
                    {deckLegend ? (
                      <div className="group relative w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-800 shadow-lg aspect-[2.5/3.5]">
                        {deckLegend.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={deckLegend.imageUrl} alt={deckLegend.name} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 p-2 text-center">
                            <span className="text-xs text-gray-400">{deckLegend.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="w-full truncate text-center text-xs font-medium text-white">{deckLegend.name}</span>
                          <button
                            type="button"
                            onClick={() => setPicker("legend")}
                            className="w-full rounded bg-gray-700/80 py-1 text-xs text-gray-200 hover:bg-gray-600"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPicker("legend")}
                        className="flex w-full aspect-[2.5/3.5] items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/50 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300"
                      >
                        Set legend
                      </button>
                    )}
                  </div>

                  {/* Champion slot */}
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      Champion
                      {deckChampion ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      )}
                    </span>
                    {deckChampion ? (
                      <div className="group relative w-full overflow-hidden rounded-lg border border-gray-600 bg-gray-800 shadow-lg aspect-[2.5/3.5]">
                        {deckChampion.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={deckChampion.imageUrl} alt={deckChampion.name} className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 p-2 text-center">
                            <span className="text-xs text-gray-400">{deckChampion.name}</span>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                          <span className="w-full truncate text-center text-xs font-medium text-white">{deckChampion.name}</span>
                          <button
                            type="button"
                            onClick={() => setPicker("champion")}
                            className="w-full rounded bg-gray-700/80 py-1 text-xs text-gray-200 hover:bg-gray-600"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deckLegend && setPicker("champion")}
                        disabled={!deckLegend}
                        title={!deckLegend ? "Select a legend first" : "Set champion"}
                        className={`flex w-full aspect-[2.5/3.5] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-sm transition-all ${
                          deckLegend
                            ? "border-gray-600 bg-gray-800/50 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                            : "cursor-not-allowed border-gray-700 bg-gray-800/30 text-gray-600"
                        }`}
                      >
                        <span>Set champion</span>
                        {!deckLegend && (
                          <span className="text-xs text-gray-600">Requires legend</span>
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
                      Battlefields ({bfCount}/3)
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
                    return (
                      <div key={pos} className="flex items-center justify-between gap-2 rounded border border-gray-600 bg-gray-700/30 px-3 py-2">
                        {bf?.card ? (
                          <CardHoverPreview card={bf.card}>
                            <span className="flex-1 truncate text-sm text-blue-400 cursor-pointer">{bf.card.name}</span>
                          </CardHoverPreview>
                        ) : (
                          <span className="flex-1 text-sm text-gray-600 italic">Empty</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPicker(pos === 1 ? "bf1" : pos === 2 ? "bf2" : "bf3")}
                          className="rounded border border-gray-600 bg-gray-700/50 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 shrink-0"
                        >
                          {bf?.card ? "Change" : "Set battlefield"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* MAIN DECK (0/40) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Main Deck ({mainCount}/40)
                  {mainCount === 40 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  )}
                </h2>
                {(() => {
                  const TYPE_ORDER = ["legend", "champion", "unit", "limit", "gear", "spell", "rune", "battlefield", "other"];
                  const TYPE_LABEL: Record<string, string> = {
                    legend: "Legend", champion: "Champion", unit: "Unit", limit: "Limit",
                    gear: "Gear", spell: "Spell", rune: "Rune", battlefield: "Battlefield", other: "Other",
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
                                <li key={item.card?.uuid ?? item.cardId ?? i} className="flex items-center justify-between gap-2 rounded px-1.5 py-0.5 hover:bg-gray-700/40">
                                  {(() => {
                                    const cid = item.card?.uuid ?? item.cardId;
                                    const domain = (item.card?.cardDomains?.[0]?.domain?.name ?? item.card?.domain)?.toLowerCase();
                                    const domainImgSrc = domain ? `/images/${domain}.webp` : null;
                                    return (
                                      <>
                                        {item.card ? (
                                          <CardHoverPreview card={item.card}>
                                            <span className="flex items-center gap-1.5 text-sm text-blue-400 cursor-pointer">
                                              {domainImgSrc && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={domainImgSrc} alt={domain} className="h-4 w-4 shrink-0 object-contain" />
                                              )}
                                              <span className="text-gray-500">×{item.quantity}</span>
                                              {item.card.name}
                                            </span>
                                          </CardHoverPreview>
                                        ) : (
                                          <span className="text-sm text-gray-400">×{item.quantity} {item.cardId}</span>
                                        )}
                                        <span className="flex gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (item.quantity < 2) {
                                                try { setDeck(await removeMainCard(deck.id, cid)); } catch {}
                                              } else {
                                                try { setDeck(await setMainCardQuantity(deck.id, cid, item.quantity - 1)); } catch {}
                                              }
                                            }}
                                            className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 text-xs"
                                          >−</button>
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (item.quantity > 2) return;
                                              try { setDeck(await setMainCardQuantity(deck.id, cid, item.quantity + 1)); } catch {}
                                            }}
                                            disabled={item.quantity > 2}
                                            className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50 text-xs"
                                          >+</button>
                                          <button
                                            type="button"
                                            onClick={async () => { try { setDeck(await removeMainCard(deck.id, cid)); } catch {} }}
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
                  onClick={() => setPicker("main")}
                  disabled={mainCount > 39}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  + Add card
                </button>
              </section>

              {/* RUNE DECK (0/12) */}
              <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Rune Deck ({runeCount}/12)
                  {runeCount === 12 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  )}
                </h2>
                <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-sm text-white">
                  {(deck.runeItems ?? []).map((item, i) => (
                    <li key={item.card?.uuid ?? item.cardId ?? i} className="flex items-center justify-between gap-2">
                      {(() => {
                        const cid = item.card?.uuid ?? item.cardId;
                        return (
                          <>
                            {item.card ? (
                              <CardHoverPreview card={item.card}>
                                <span className="text-blue-400 cursor-pointer">×{item.quantity} {item.card.name}</span>
                              </CardHoverPreview>
                            ) : (
                              <span>×{item.quantity} {item.cardId}</span>
                            )}
                            <span className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (item.quantity < 2) {
                                    try { setDeck(await removeRuneCard(deck.id, cid)); } catch {}
                                  } else {
                                    try { setDeck(await setRuneCardQuantity(deck.id, cid, item.quantity - 1)); } catch {}
                                  }
                                }}
                                className="rounded bg-gray-700 px-1.5 hover:bg-gray-600"
                              >−</button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (runeCount > 11) return;
                                  try { setDeck(await setRuneCardQuantity(deck.id, cid, item.quantity + 1)); } catch {}
                                }}
                                disabled={runeCount > 11}
                                className="rounded bg-gray-700 px-1.5 hover:bg-gray-600 disabled:opacity-50"
                              >+</button>
                              <button
                                type="button"
                                onClick={async () => { try { setDeck(await removeRuneCard(deck.id, cid)); } catch {} }}
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
                  onClick={() => setPicker("rune")}
                  disabled={runeCount > 11}
                  className="w-full rounded border border-gray-600 bg-gray-700/50 py-2.5 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  + Add rune
                </button>
              </section>

              {/* Validation */}
              {validation && (
                <section className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Validation</h2>
                  {validation.valid && (validation.errors?.length ?? 0) === 0 && (validation.warnings?.length ?? 0) === 0 ? (
                    <p className="text-sm text-emerald-400">Deck is valid.</p>
                  ) : (
                    <div className="space-y-2">
                      {(validation.errors ?? []).map((msg, i) => (
                        <p key={i} className="text-sm text-red-400">{msg}</p>
                      ))}
                      {(validation.warnings ?? []).map((msg, i) => (
                        <p key={i} className="text-sm text-amber-400">{msg}</p>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
