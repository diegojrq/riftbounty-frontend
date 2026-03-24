"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchRiotCatalogSets } from "./riot-catalog";
import type { RiotCatalogSet } from "@/types/riot-catalog";

interface RiotCatalogSetsContextValue {
  sets: RiotCatalogSet[];
  loading: boolean;
  error: string | null;
  /** Nome amigável ou o próprio código se não houver no catálogo */
  getSetLabel: (code: string | null | undefined) => string;
  /** "Nome (CODE)" para chips; fallback só código se não houver nome */
  formatSetWithCode: (code: string | null | undefined) => string;
  /** Lista de códigos na ordem retornada pela API */
  setCodesOrdered: string[];
}

const RiotCatalogSetsContext = createContext<RiotCatalogSetsContextValue | null>(null);

export function RiotCatalogSetsProvider({ children }: { children: ReactNode }) {
  const [sets, setSets] = useState<RiotCatalogSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchRiotCatalogSets();
        if (!cancelled) setSets(list);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load sets");
          setSets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const labelByCode = useMemo(() => new Map(sets.map((s) => [s.code, s.name])), [sets]);

  const setCodesOrdered = useMemo(() => sets.map((s) => s.code), [sets]);

  const getSetLabel = useCallback(
    (code: string | null | undefined) => {
      if (code == null || code === "") return "—";
      const u = String(code).trim().toUpperCase();
      return labelByCode.get(u) ?? u;
    },
    [labelByCode]
  );

  const formatSetWithCode = useCallback(
    (code: string | null | undefined) => {
      if (code == null || code === "") return "—";
      const u = String(code).trim().toUpperCase();
      const name = labelByCode.get(u);
      if (name && name !== u) return `${name} (${u})`;
      return u;
    },
    [labelByCode]
  );

  const value = useMemo<RiotCatalogSetsContextValue>(
    () => ({
      sets,
      loading,
      error,
      getSetLabel,
      formatSetWithCode,
      setCodesOrdered,
    }),
    [sets, loading, error, getSetLabel, formatSetWithCode, setCodesOrdered]
  );

  return (
    <RiotCatalogSetsContext.Provider value={value}>{children}</RiotCatalogSetsContext.Provider>
  );
}

export function useRiotCatalogSets(): RiotCatalogSetsContextValue {
  const ctx = useContext(RiotCatalogSetsContext);
  if (!ctx) {
    throw new Error("useRiotCatalogSets must be used within RiotCatalogSetsProvider");
  }
  return ctx;
}

/** Para componentes que podem estar fora do provider (ex.: testes): fallback seguro */
export function useRiotCatalogSetsOptional(): RiotCatalogSetsContextValue | null {
  return useContext(RiotCatalogSetsContext);
}
