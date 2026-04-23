"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiGet } from "./api";
import {
  clearCache,
  isCacheStale,
  readCache,
  writeCache,
} from "./card-cache";
import type { Card, CardsListResponse } from "@/types/card";
import { getCardId } from "./card-id";

/**
 * Mesma ordem lógica do backend (collector_number asc) e um registro por `id` (catálogo /cards).
 * Evita desalinhamento carta/preço quando várias páginas são mescladas em paralelo
 * ou há duplicatas no array.
 */
export function normalizeCatalogCards(cards: Card[]): Card[] {
  const byId = new Map<string, Card>();
  for (const c of cards) {
    const id = getCardId(c);
    if (!id) continue;
    byId.set(id, { ...c, id });
  }
  return Array.from(byId.values()).sort((a, b) => {
    const sa = String(a.collectorNumber ?? a.collector_number ?? "");
    const sb = String(b.collectorNumber ?? b.collector_number ?? "");
    const cmp = sa.localeCompare(sb, undefined, { numeric: true });
    if (cmp !== 0) return cmp;
    return String(getCardId(a)).localeCompare(String(getCardId(b)));
  });
}

interface CardsContextValue {
  /** Todas as cartas do catálogo (campos estáticos, sem inCollection/collectionQuantity). */
  cards: Card[];
  /** Lookup O(1) por `id` (GET /v1/cards). */
  cardMap: Map<string, Card>;
  /** True enquanto o fetch inicial ainda está acontecendo. */
  loading: boolean;
  /** Limpa o cache e força um novo fetch do backend. */
  invalidate: () => void;
}

const CardsContext = createContext<CardsContextValue | null>(null);

/**
 * Busca a versão atual do catálogo de cartas no backend.
 * Endpoint leve — retorna apenas { version: string }.
 * Retorna null em caso de falha (rede offline, endpoint inexistente, etc.).
 */
async function fetchCatalogVersion(): Promise<string | null> {
  try {
    const res = await apiGet<{ version: string }>("/cards/catalog-version");
    return res.data.version ?? null;
  } catch {
    return null;
  }
}

async function fetchAllCards(): Promise<Card[]> {
  const PAGE_SIZE = 100;
  const base = { sortBy: "collector_number", order: "asc" as const, limit: PAGE_SIZE };

  // Primeira página — descobre o total
  const first = await apiGet<CardsListResponse>("/cards", { ...base, offset: 0 });
  const total = first.data.totalCount ?? 0;
  const items: Card[] = [...(first.data.items ?? [])];

  // Busca páginas restantes em paralelo
  if (items.length < total) {
    const offsets: number[] = [];
    for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);
    const pages = await Promise.all(
      offsets.map((offset) =>
        apiGet<CardsListResponse>("/cards", { ...base, offset }).then((r) => r.data.items ?? [])
      )
    );
    items.push(...pages.flat());
  }

  return normalizeCatalogCards(items);
}

function cacheHasLigaFields(cards: Card[]): boolean {
  if (!cards.length) return true;
  return cards.some((card) => {
    const withCamel = card as Card & { ligaMinPrice?: unknown; ligaMidPrice?: unknown; ligaMaxPrice?: unknown };
    const withSnake = card as Card & { liga_min_price?: unknown; liga_mid_price?: unknown; liga_max_price?: unknown };
    return (
      withCamel.ligaMinPrice !== undefined ||
      withCamel.ligaMidPrice !== undefined ||
      withCamel.ligaMaxPrice !== undefined ||
      withSnake.liga_min_price !== undefined ||
      withSnake.liga_mid_price !== undefined ||
      withSnake.liga_max_price !== undefined
    );
  });
}

export function CardsProvider({ children }: { children: React.ReactNode }) {
  // Sempre inicia vazio para garantir que SSR e cliente renderizem o mesmo HTML inicial
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (fetchedRef.current && !force) return;
    fetchedRef.current = true;

    const cached = readCache();

    // Mostra o cache imediatamente para melhor UX (stale-while-revalidate)
    if (!force && cached) {
      setCards(normalizeCatalogCards(cached.cards));
    }

    // Sem cache nenhum: ativa loading imediatamente para o usuário não ver "no cards"
    if (!cached) {
      setLoading(true);
    }

    // Verifica versão no backend (chamada leve)
    const backendVersion = await fetchCatalogVersion();
    const cacheNeedsLigaMigration = !!cached && !cacheHasLigaFields(cached.cards);
    const versionMismatch =
      backendVersion !== null && cached?.version !== backendVersion;

    // Cache ainda válido: TTL ok e versão bate
    if (!force && cached && !isCacheStale() && !versionMismatch && !cacheNeedsLigaMigration) {
      setLoading(false);
      return;
    }

    // Precisa re-buscar (versão mudou, cache vencido ou force)
    setLoading(true);
    try {
      const fetched = await fetchAllCards();
      if (fetched.length === 0) {
        // Fetch retornou vazio: permite tentar novamente na próxima navegação
        fetchedRef.current = false;
      }
      writeCache(fetched, backendVersion ?? undefined);
      const fresh = readCache();
      setCards(normalizeCatalogCards(fresh?.cards ?? fetched));
    } catch {
      // Mantém o que estiver no estado; permite retry na próxima navegação
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invalidate = useCallback(() => {
    clearCache();
    fetchedRef.current = false;
    load(true);
  }, [load]);

  const cardMap = useMemo(() => {
    const entries = cards
      .map((c) => [getCardId(c), c] as [string, Card])
      .filter((e): e is [string, Card] => e[0] !== "");
    return new Map<string, Card>(entries);
  }, [cards]);

  const value = useMemo<CardsContextValue>(
    () => ({ cards, cardMap, loading, invalidate }),
    [cards, cardMap, loading, invalidate]
  );

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards(): CardsContextValue {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCards must be used within CardsProvider");
  return ctx;
}
