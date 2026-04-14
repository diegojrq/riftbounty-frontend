import type { Metadata } from "next";
import { getPublicProfile } from "@/lib/profile";
import { getSiteUrl } from "@/lib/site-url";
import type { ProfileCardListItem } from "@/types/auth";

function toAbsoluteAssetUrl(url: string | null | undefined, siteUrl: string): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (u.startsWith("https://") || u.startsWith("http://")) return u;
  if (u.startsWith("/")) return `${siteUrl}${u}`;
  return u;
}

function getCardImageUrl(
  profile: Awaited<ReturnType<typeof getPublicProfile>>,
  siteUrl: string
): string | undefined {
  const firstForSaleImage = profile.forSale?.find((item) => item.card)?.card;
  const firstWishlistImage = profile.wishlist?.find((item) => item.card)?.card;
  const card = firstForSaleImage ?? firstWishlistImage;
  return toAbsoluteAssetUrl(card?.imageUrl ?? card?.image_url ?? null, siteUrl);
}

function formatPriceUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function formatForSaleLine(item: ProfileCardListItem): string {
  const name = item.card?.name?.trim() || item.cardId;
  const mode = item.priceMode ?? "numeric";
  if (mode === "liga_minus_percent") {
    return `${name} (Liga −${item.pricePercent ?? 0}%)`;
  }
  if (mode === "tcgplayer_minus_percent") {
    return `${name} (TCGPlayer −${item.pricePercent ?? 0}%)`;
  }
  return `${name} ${formatPriceUsd(item.pricePerCard)}`;
}

function buildForSaleSnippet(profile: Awaited<ReturnType<typeof getPublicProfile>>): string | null {
  const topItems = (profile.forSale ?? []).slice(0, 2);
  if (topItems.length === 0) return null;
  const cardsText = topItems.map((item) => formatForSaleLine(item)).join(", ");
  return `À venda: ${cardsText}.`;
}

function buildWishlistSnippet(profile: Awaited<ReturnType<typeof getPublicProfile>>): string | null {
  const topItems = (profile.wishlist ?? []).slice(0, 2);
  if (topItems.length === 0) return null;
  const cardsText = topItems
    .map((item) => item.card?.name?.trim() || item.cardId)
    .join(", ");
  return `Wishlist: ${cardsText}.`;
}

function normalizeTab(tab: string | undefined): "selling" | "wishlist" | "collection" | undefined {
  if (!tab) return undefined;
  const t = tab.toLowerCase();
  if (t === "selling" || t === "for-sale") return "selling";
  if (t === "wishlist") return "wishlist";
  if (t === "collection") return "collection";
  return undefined;
}

/**
 * Metadados OG/Twitter para /u/[slug] (WhatsApp, etc.).
 * Depende de API_URL ou NEXT_PUBLIC_API_URL no servidor.
 */
export async function buildPublicProfileMetadata(
  slug: string,
  tabParam?: string
): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const tab = normalizeTab(tabParam);
  const query =
    tab === "selling"
      ? "?tab=selling"
      : tab === "wishlist"
        ? "?tab=wishlist"
        : tab === "collection"
          ? "?tab=collection"
          : "";
  const profileUrl = `${siteUrl}/u/${encodeURIComponent(slug)}${query}`;

  try {
    const profile = await getPublicProfile(slug);
    const displayName = profile.displayName?.trim() || profile.slug;
    const wishlistCount = profile.wishlist?.length ?? 0;
    const forSaleCount = profile.forSale?.length ?? 0;
    const collectionCount = profile.publicCollection?.length ?? 0;

    const forSaleSnippet = buildForSaleSnippet(profile);
    const wishlistSnippet = buildWishlistSnippet(profile);

    let sectionSnippet = "";
    if (tab === "selling") {
      sectionSnippet = [forSaleSnippet].filter(Boolean).join(" ");
    } else if (tab === "wishlist") {
      sectionSnippet = [wishlistSnippet].filter(Boolean).join(" ");
    } else if (tab === "collection") {
      sectionSnippet =
        collectionCount > 0
          ? `Coleção pública: ${collectionCount} cartas.`
          : "Coleção pública no Riftbounty.";
    } else {
      sectionSnippet = [forSaleSnippet, wishlistSnippet].filter(Boolean).join(" ");
    }

    const description = `${displayName} — ${forSaleCount} à venda, ${wishlistCount} na wishlist no Riftbounty.${sectionSnippet ? ` ${sectionSnippet}` : ""}`;

    const imageUrl = getCardImageUrl(profile, siteUrl);
    const ogImage = imageUrl ? [{ url: imageUrl }] : [{ url: `${siteUrl}/images/riftbounty.png` }];

    return {
      title: `${displayName} | Riftbounty`,
      description,
      openGraph: {
        title: `${displayName} | Riftbounty`,
        description,
        url: profileUrl,
        type: "profile",
        images: ogImage,
        siteName: "Riftbounty",
      },
      twitter: {
        card: "summary_large_image",
        title: `${displayName} | Riftbounty`,
        description,
        images: ogImage.map((i) => i.url),
      },
      alternates: {
        canonical: profileUrl,
      },
    };
  } catch {
    const fallbackTitle = `${slug} | Riftbounty`;
    const fallbackDescription = "Perfil público no Riftbounty com wishlist e sell list.";
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: profileUrl,
        siteName: "Riftbounty",
        images: [{ url: `${siteUrl}/images/riftbounty.png` }],
      },
      twitter: {
        card: "summary_large_image",
        title: fallbackTitle,
        description: fallbackDescription,
        images: [`${siteUrl}/images/riftbounty.png`],
      },
      alternates: {
        canonical: profileUrl,
      },
    };
  }
}
