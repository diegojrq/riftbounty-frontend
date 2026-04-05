import type { Locale } from "./locale";

const localeTag = (l: Locale) => (l === "pt-BR" ? "pt-BR" : "en-US");

/** Limite ~9.999.999,99 — suficiente para preço por carta. */
export const MAX_MONEY_CENTS = 999_999_999;

export function valueToMoneyCents(value: number | null): number {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return Math.min(MAX_MONEY_CENTS, Math.round(value * 100));
}

/** 0 centavos → sem preço (opcional). */
export function moneyCentsToValue(cents: number): number | null {
  const c = Math.max(0, Math.trunc(cents));
  if (c <= 0) return null;
  return c / 100;
}

/** Máscara fixa com 2 decimais (ex. pt `0,00` / en `0.00`); milhar conforme locale. */
export function formatMoneyCentMask(cents: number, locale: Locale): string {
  const c = Math.max(0, Math.min(MAX_MONEY_CENTS, Math.trunc(cents)));
  const v = c / 100;
  return new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(v);
}

const intlMoney = (locale: Locale, useGrouping: boolean) =>
  new Intl.NumberFormat(localeTag(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping,
  });

/** Valor “cru” para edição: sem milhar; só decimal no padrão do locale (evita confundir . com milhar). */
export function formatMoneyInputValue(value: number | null, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return "";
  return intlMoney(locale, false).format(value);
}

/** Máscara quando o campo não está focado: milhar + decimais (ex.: pt 221.233,5 / en 221,233.5). */
export function formatMoneyDisplayValue(value: number | null, locale: Locale): string {
  if (value == null || !Number.isFinite(value)) return "";
  return intlMoney(locale, true).format(value);
}

export type MoneyParseResult =
  | { ok: true; value: number | null }
  | { ok: false };

function parsePtBR(t: string): number | null {
  if (t.includes(",")) {
    const idx = t.lastIndexOf(",");
    const intRaw = t.slice(0, idx).replace(/\./g, "");
    const frac = t.slice(idx + 1).replace(/\D/g, "").slice(0, 2);
    if (!/^\d+$/.test(intRaw)) return null;
    if (frac.length === 0) return Number(intRaw);
    return Number(`${intRaw}.${frac}`);
  }
  if (/^\d+\.\d+$/.test(t)) {
    return Number(t);
  }
  const collapsed = t.replace(/\./g, "");
  if (/^\d+$/.test(collapsed)) return Number(collapsed);
  return null;
}

function parseEn(t: string): number | null {
  if (t.includes(".")) {
    const idx = t.lastIndexOf(".");
    const intRaw = t.slice(0, idx).replace(/,/g, "");
    const frac = t.slice(idx + 1).replace(/\D/g, "").slice(0, 2);
    if (!/^\d+$/.test(intRaw)) return null;
    if (frac.length === 0) return Number(intRaw);
    return Number(`${intRaw}.${frac}`);
  }
  if (/^\d+,\d+$/.test(t)) {
    return Number(t.replace(",", "."));
  }
  const intOnly = t.replace(/,/g, "");
  if (/^\d+$/.test(intOnly)) return Number(intOnly);
  return null;
}

/**
 * Interpreta texto colado/editado conforme locale (pt-BR: vírgula decimal, ponto milhar;
 * en: ponto decimal, vírgula milhar).
 */
export function parseMoneyInputValue(raw: string, locale: Locale): MoneyParseResult {
  const t = raw.trim().replace(/\$/g, "").replace(/\s/g, "");
  if (t === "") return { ok: true, value: null };
  const n = locale === "pt-BR" ? parsePtBR(t) : parseEn(t);
  if (n == null || !Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

/** Colagem tipo 1.234.567 ou 12.345,67 — antes de tratar decimal. */
function stripLocaleThousandGroups(s: string, locale: Locale): string {
  if (locale === "pt-BR") {
    if (s.includes(",")) return s;
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return s.replace(/\./g, "");
    return s;
  }
  if (!s.includes(".")) {
    if (/^\d{1,3}(,\d{3})+$/.test(s)) return s.replace(/,/g, "");
  }
  return s;
}

/**
 * Durante a digitação: só dígitos e um separador decimal do locale; até 2 casas decimais.
 */
export function sanitizeMoneyTyping(input: string, locale: Locale): string {
  const withoutNoise = input.replace(/[^\d.,]/g, "");
  let s = stripLocaleThousandGroups(withoutNoise, locale);

  if (locale === "pt-BR") {
    if (s.includes(",")) {
      s = s.replace(/\./g, "");
      const parts = s.split(",");
      if (parts.length <= 1) return parts[0] ?? "";
      const intPart = parts[0] ?? "";
      const frac = (parts.slice(1).join("") || "").replace(/\D/g, "").slice(0, 2);
      return frac.length > 0 ? `${intPart},${frac}` : `${intPart},`;
    }
    // Sem vírgula ainda: aceitar "." como decimal (teclado numérico / estilo US)
    s = s.replace(/,/g, "");
    const parts = s.split(".");
    if (parts.length <= 1) return parts[0] ?? "";
    const intPart = parts[0] ?? "";
    const frac = (parts.slice(1).join("") || "").replace(/\D/g, "").slice(0, 2);
    return frac.length > 0 ? `${intPart}.${frac}` : `${intPart}.`;
  }

  s = s.replace(/,/g, "");
  const parts = s.split(".");
  if (parts.length <= 1) return parts[0] ?? "";
  const intPart = parts[0] ?? "";
  const frac = (parts.slice(1).join("") || "").replace(/\D/g, "").slice(0, 2);
  return frac.length > 0 ? `${intPart}.${frac}` : `${intPart}.`;
}
