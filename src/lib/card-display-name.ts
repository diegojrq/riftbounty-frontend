import type { Card } from "@/types/card";

/** Remove sufixo " - Starter" do nome base (cartas Legend starter). */
const STARTER_SUFFIX = /\s*-\s*Starter\s*$/i;

function stripStarterSuffix(name: string): string {
  return name.replace(STARTER_SUFFIX, "").trim();
}

/** Primeiro subtype (tag de campeão/campeã), ex.: Annie, Jinx. */
export function getFirstCardSubtypeName(card: Card): string | null {
  if (Array.isArray(card.cardSubtypes) && card.cardSubtypes.length > 0) {
    const cs = card.cardSubtypes[0] as { subtype?: { name?: string }; name?: string };
    const n = (cs?.subtype?.name ?? cs?.name ?? "").trim();
    if (n) return n;
  }
  if (card.subtypes?.length) {
    const n = card.subtypes[0]?.trim();
    if (n) return n;
  }
  return null;
}

function isLegendCard(card: Card): boolean {
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? card.recordType ?? "").toLowerCase();
  return t === "legend" || (r.length > 0 && r.includes("legend"));
}

/**
 * Nome para exibição na UI e exportações.
 * Cartas **Legend**: `Subtype, Nome` (nome sem sufixo "- Starter").
 * Demais tipos: `name` da API.
 */
export function getCardDisplayName(card: Card): string {
  const raw = (card.name ?? "").trim();
  if (!raw) return "?";

  if (!isLegendCard(card)) return raw;

  const subtype = getFirstCardSubtypeName(card);
  const base = stripStarterSuffix(raw);
  if (!subtype) return base.length > 0 ? base : raw;
  return `${subtype}, ${base}`;
}
