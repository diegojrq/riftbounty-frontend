import type { Card } from "@/types/card";
import type { Locale } from "@/lib/locale";

export function parseTcgPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Prioridade: market → mid → low → high (igual CardTile / BasketPanel). */
export function getCardTcgUnitPriceUsd(card: Card): number | null {
  const market = parseTcgPrice(card.tcgMarketPrice ?? card.tcg_market_price);
  const mid = parseTcgPrice(card.tcgMidPrice ?? card.tcg_mid_price);
  const low = parseTcgPrice(card.tcgLowPrice ?? card.tcg_low_price);
  const high = parseTcgPrice(card.tcgHighPrice ?? card.tcg_high_price);
  return market ?? mid ?? low ?? high;
}

export function formatTcgUsd(value: number, locale: Locale): string {
  const intlLocale = locale === "pt-BR" ? "pt-BR" : "en-US";
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
