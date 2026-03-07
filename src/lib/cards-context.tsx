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
  CACHE_FRESH_MS,
  clearCache,
  isCacheStale,
  readCache,
  writeCache,
} from "./card-cache";
import type { Card, CardsListResponse } from "@/types/card";

interface CardsContextValue {
  /** Todas as cartas do catálogo (campos estáticos, sem inCollection/collectionQuantity). */
  cards: Card[];
  /** Lookup O(1) por uuid. */
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

  return items;
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
    const cacheAge = cached ? Date.now() - cached.cachedAt : Infinity;

    // Mostra o cache imediatamente para melhor UX (stale-while-revalidate)
    if (!force && cached) {
      setCards(cached.cards);
    }

    // Sem cache nenhum: ativa loading imediatamente para o usuário não ver "no cards"
    if (!cached) {
      setLoading(true);
    }

    // Cache muito fresco: confia sem bater no endpoint de versão
    if (!force && cached && cacheAge < CACHE_FRESH_MS) {
      return;
    }

    // Verifica versão no backend (chamada leve)
    const backendVersion = await fetchCatalogVersion();
    const versionMismatch =
      backendVersion !== null && cached?.version !== backendVersion;

    // Cache ainda válido: TTL ok e versão bate
    if (!force && cached && !isCacheStale() && !versionMismatch) {
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
      setCards(fresh?.cards ?? fetched);
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

  const cardMap = useMemo(
    () => new Map(cards.map((c) => [c.uuid, c])),
    [cards]
  );

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
