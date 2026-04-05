import type { Locale } from "./locale";

/** Chave i18n e código de erro da API (400) quando o valor declarado é inválido. */
export const TRADE_DECLARED_VALUE_INVALID_I18N_KEY = "common.trades.declared_value_invalid";

export const DECLARED_VALUE_MAX = 999_999.99;

export function normalizeDeclaredValueFromApi(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw === "" ? null : raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw.toFixed(2);
  return null;
}

export function declaredValueApiStringToNumber(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Agregar linhas da mesma carta: só mantém declaredValue se for igual entre linhas. */
export function mergeAggregatedDeclaredValue(a: string | null, b: string | null): string | null {
  if (a === b) return a ?? null;
  if (a == null || a === "") return b ?? null;
  if (b == null || b === "") return a ?? null;
  const na = Number.parseFloat(a);
  const nb = Number.parseFloat(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && Math.abs(na - nb) < 1e-9) return a;
  return null;
}

export function declaredValuesDifferFromBasket(api: string | null, basket: number | null): boolean {
  const an = declaredValueApiStringToNumber(api);
  const bn = basket == null ? null : Math.round(basket * 100) / 100;
  if (an === null && bn === null) return false;
  if (an === null || bn === null) return true;
  return Math.abs(an - bn) > 1e-9;
}

export function roundDeclaredForPayload(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatDeclaredValueBrl(amount: string, locale: Locale): string {
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  const intlLocale = locale === "pt-BR" ? "pt-BR" : "en-US";
  return new Intl.NumberFormat(intlLocale, { style: "currency", currency: "BRL" }).format(n);
}
