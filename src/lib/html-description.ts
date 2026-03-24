import DOMPurify from "isomorphic-dompurify";

/** Tags comuns em textos de carta (parágrafos, quebras, ênfase). */
const DESCRIPTION_PURIFY: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "span",
    "div",
    "ul",
    "ol",
    "li",
    "small",
    "s",
    "sub",
    "sup",
  ],
  ALLOWED_ATTR: ["class"],
};

export function sanitizeCardDescriptionHtml(html: string): string {
  return DOMPurify.sanitize(html, DESCRIPTION_PURIFY);
}

/** Heurística: API passou HTML (ex.: `<p>...</p>`). */
export function looksLikeHtmlDescription(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  return /<\/?[a-z][a-z0-9]*(\s|>)/i.test(t);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/**
 * HTML sanitizado → texto com quebras (para o parser de cartas: `[Accelerate]`, `_itálico_`, etc.).
 * Preserva `<br>` / parágrafos como newlines.
 */
/**
 * Extrai o HTML interno de cada `<p>...</p>`. Se não houver `<p>`, devolve o texto inteiro como um bloco.
 */
export function splitHtmlIntoParagraphInnerHtmls(html: string): string[] {
  const normalized = html.trim();
  const re = /<p[^>]*>([\s\S]*?)<\/\s*p\s*>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const inner = m[1]?.trim();
    if (inner) out.push(inner);
  }
  if (out.length > 0) return out;
  return [normalized];
}

export function htmlToPlainTextForCardDescription(html: string): string {
  let s = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\s*li[^>]*>/gi, "\n• ")
    .replace(/<\/\s*li\s*>/gi, "")
    .replace(/<\/\s*ul\s*>/gi, "\n")
    .replace(/<\/\s*ol\s*>/gi, "\n")
    .replace(/<\s*ul[^>]*>/gi, "\n")
    .replace(/<\s*ol[^>]*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeHtmlEntities(s);
  s = s.replace(/\n{5,}/g, "\n\n\n\n");
  return s.trim();
}

/** Para busca/filtro: remove tags e normaliza espaços. */
export function cardDescriptionPlainText(htmlOrText: string): string {
  return htmlOrText
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
