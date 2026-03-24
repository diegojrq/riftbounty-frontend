import type { Card } from "@/types/card";

/**
 * Código curto vindo só de `set` / `cardSet` quando a API já manda tipo OGN, SFD, UNL.
 * Nomes completos tipo "Unleashed" / "Spiritforged" NÃO entram aqui (evita confundir com UNL).
 */
const SET_CODE_FROM_FIELD = /^[A-Z0-9]{2,8}$/;

/** Nomes de set como vêm na API → código do catálogo Riot (`GET /riot-catalog/sets` → `code`). */
const KNOWN_SET_NAME_TO_CODE: Record<string, string> = {
  UNLEASHED: "UNL",
  "ORIGINS MAIN SET": "OGN",
  ORIGINS: "OGN",
  SPIRITFORGED: "SFD",
  SPIRITFORGE: "SFD",
};

function mapKnownSetNameToCode(upper: string): string | undefined {
  const compact = upper.replace(/\s+/g, " ").trim();
  return KNOWN_SET_NAME_TO_CODE[compact] ?? KNOWN_SET_NAME_TO_CODE[upper.replace(/\s/g, "")];
}

/**
 * Valor usado para filtrar por set: mesmo código do select (`GET /riot-catalog/sets` → `code`).
 *
 * Ordem: prefixo de `collector_number` / `image_key` (ex.: UNL-236 → UNL) é o mais confiável;
 * a API costuma mandar `cardSet` como nome ("Unleashed"), que não bate com o código UNL.
 */
export function getCardSetFilterValue(card: Card): string {
  const cn = card.collectorNumber ?? card.collector_number;
  if (cn && typeof cn === "string") {
    const prefix = cn.split(/[-/]/)[0]?.trim();
    if (prefix && /^[A-Za-z0-9]+$/.test(prefix)) return prefix.toUpperCase();
  }
  const ik = card.image_key;
  if (ik && typeof ik === "string") {
    const prefix = ik.split(/[-_]/)[0]?.trim();
    if (prefix && /^[A-Za-z0-9]+$/.test(prefix)) return prefix.toUpperCase();
  }

  const snake = (card as { card_set?: string }).card_set;
  const raw = card.set ?? card.cardSet ?? snake;
  if (raw == null || String(raw).trim() === "") return "";

  const u = String(raw).trim().toUpperCase();
  if (SET_CODE_FROM_FIELD.test(u)) return u;

  const mapped = mapKnownSetNameToCode(u);
  if (mapped) return mapped;

  return "";
}
