import { apiGet } from "./api";
import type { RiotCatalogSet } from "@/types/riot-catalog";

function normalizeRow(row: unknown): RiotCatalogSet | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const code = String(r.code ?? r.setCode ?? r.id ?? r.slug ?? "")
    .trim()
    .toUpperCase();
  const name = String(r.name ?? r.label ?? r.title ?? r.displayName ?? code).trim();
  const description =
    r.description != null
      ? String(r.description)
      : r.desc != null
        ? String(r.desc)
        : null;
  if (!code) return null;
  return {
    code,
    name: name || code,
    description: description || undefined,
  };
}

/** Aceita envelope { data }, array direto, ou { items | sets }. */
export function parseRiotCatalogSetsPayload(data: unknown): RiotCatalogSet[] {
  if (data == null) return [];
  if (Array.isArray(data)) {
    return data.map(normalizeRow).filter((x): x is RiotCatalogSet => x != null);
  }
  const obj = data as Record<string, unknown>;
  const inner = obj.data !== undefined ? obj.data : obj;
  if (Array.isArray(inner)) {
    return inner.map(normalizeRow).filter((x): x is RiotCatalogSet => x != null);
  }
  if (inner && typeof inner === "object") {
    const o = inner as Record<string, unknown>;
    const arr = o.items ?? o.sets ?? o.records;
    if (Array.isArray(arr)) {
      return arr.map(normalizeRow).filter((x): x is RiotCatalogSet => x != null);
    }
  }
  return [];
}

export async function fetchRiotCatalogSets(): Promise<RiotCatalogSet[]> {
  const res = await apiGet<unknown>("/riot-catalog/sets");
  return parseRiotCatalogSetsPayload(res.data);
}

/** Valida código de set vindo da query string (?set=) antes do catálogo carregar */
export function parseSetQueryParam(raw: string | null | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  const u = raw.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,15}$/.test(u)) return undefined;
  return u;
}
