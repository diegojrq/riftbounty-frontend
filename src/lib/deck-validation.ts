import type { DeckValidation } from "@/types/deck";

export type DeckValidationTranslate = (
  key: string,
  params?: Record<string, string | number>
) => string;

/** Itens crus: prioriza `errors`/`warnings` já resolvidos pelo backend; senão usa `issues`. */
export function rawDeckValidationErrors(v?: DeckValidation | null): unknown[] {
  if (!v) return [];
  if (Array.isArray(v.errors) && v.errors.length > 0) return v.errors;
  return v.issues?.errors ?? [];
}

export function rawDeckValidationWarnings(v?: DeckValidation | null): unknown[] {
  if (!v) return [];
  if (Array.isArray(v.warnings) && v.warnings.length > 0) return v.warnings;
  return v.issues?.warnings ?? [];
}

/** Legado: objetos com message/detail/msg/error. */
export function validationErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (err != null && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.message === "string") return o.message;
    if (typeof o.detail === "string") return o.detail;
    if (typeof o.msg === "string") return o.msg;
    if (typeof o.error === "string") return o.error;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function normalizeArgs(args: unknown): Record<string, string | number> | undefined {
  if (args == null || typeof args !== "object" || Array.isArray(args)) return undefined;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string") out[k] = v;
    else if (typeof v === "boolean") out[k] = v ? "true" : "false";
    else if (v != null) out[k] = String(v);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * - String: texto já traduzido pelo backend (Accept-Language) — devolve como está.
 * - `{ key, args }`: traduz com i18n do front (chaves alinhadas a `common.decks.*` nos JSON).
 * - Outros objetos: fallback legado.
 */
export function formatDeckValidationItem(
  err: unknown,
  t?: DeckValidationTranslate
): string {
  if (typeof err === "string") return err;
  if (err != null && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o.key === "string" && t) {
      const params = normalizeArgs(o.args);
      const translated = t(o.key, params);
      if (translated !== o.key) return translated;
    }
  }
  return validationErrorMessage(err);
}
