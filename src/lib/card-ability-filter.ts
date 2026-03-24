import { cardDescriptionPlainText } from "@/lib/html-description";
import type { Card } from "@/types/card";

/** Texto da carta para buscar tokens `[…]` (description, altText, text_html). */
export function getCardAbilitySearchText(card: Card): string {
  const parts: string[] = [];
  if (card.description) parts.push(cardDescriptionPlainText(card.description));
  if (card.altText) parts.push(cardDescriptionPlainText(card.altText));
  const html =
    (card as { text_html?: string; textHtml?: string }).text_html ??
    (card as { textHtml?: string }).textHtml;
  if (html) parts.push(cardDescriptionPlainText(html));
  return parts.join("\n");
}

/**
 * Conteúdo interno de `[…]` — a API pode devolver `"Level 16"` ou `"[Level 16]"` (match completo).
 */
export function normalizeBracketInner(token: string): string {
  let n = token.trim();
  if (n.startsWith("[") && n.endsWith("]") && n.length >= 2) {
    n = n.slice(1, -1).trim();
  }
  return n;
}

/**
 * Verifica se o texto contém o token entre colchetes (conteúdo vindo do GET /abilities).
 * Case-insensitive; permite espaços extras dentro de `[…]`.
 */
export function cardTextContainsBracketToken(haystack: string, inner: string): boolean {
  const n = normalizeBracketInner(inner);
  if (!n) return false;
  const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[\\s*${escaped}\\s*\\]`, "i");
  return re.test(haystack);
}

/**
 * Filtro tipo “qualquer”: a carta precisa exibir pelo menos um dos abilities selecionados
 * no texto (mesma semântica do antigo filtro de attributes).
 */
export function cardMatchesAnyAbility(card: Card, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const haystack = getCardAbilitySearchText(card);
  return selected.some((a) => cardTextContainsBracketToken(haystack, a));
}
