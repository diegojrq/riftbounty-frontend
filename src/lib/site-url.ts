/**
 * Origin canónico do site (sem barra final). Usado em metadataBase, sitemap e robots.
 * Definir NEXT_PUBLIC_SITE_URL em produção (ex.: https://www.riftbounty.com).
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.riftbounty.com";
  return raw.replace(/\/$/, "");
}
