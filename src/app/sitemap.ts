import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_PATHS = [
  "/",
  "/events/unleashed-pre-rift",
  "/decks",
  "/decks/precon",
  "/decks/precon/vi/view",
  "/decks/precon/vex/view",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return STATIC_PATHS.map((path) => ({
    url: `${base}${path}`,
    lastModified,
  }));
}
