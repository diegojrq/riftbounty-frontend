/**
 * Identificador canônico da carta: vem de GET /v1/cards como `id`.
 * Aceita `uuid` legado (cache local / respostas antigas).
 */
export function getCardId(card: { id?: string; uuid?: string } | null | undefined): string {
  if (!card) return "";
  const v = card.id ?? card.uuid;
  return v != null && v !== "" ? String(v) : "";
}
