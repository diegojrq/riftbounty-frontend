import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getPublicProfile } from "@/lib/profile";
import { getSiteUrl } from "@/lib/site-url";

type Props = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

function getCardImageUrl(profile: Awaited<ReturnType<typeof getPublicProfile>>): string | undefined {
  const firstForSaleImage = profile.forSale?.find((item) => item.card)?.card;
  const firstWishlistImage = profile.wishlist?.find((item) => item.card)?.card;
  const card = firstForSaleImage ?? firstWishlistImage;
  return card?.imageUrl ?? card?.image_url ?? undefined;
}

function formatPriceUsd(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function buildForSaleSnippet(profile: Awaited<ReturnType<typeof getPublicProfile>>): string | null {
  const topItems = (profile.forSale ?? []).slice(0, 2);
  if (topItems.length === 0) return null;
  const cardsText = topItems
    .map((item) => {
      const name = item.card?.name?.trim() || item.cardId;
      return `${name} ${formatPriceUsd(item.pricePerCard)}`;
    })
    .join(", ");
  return `Sell list: ${cardsText}.`;
}

function buildWishlistSnippet(profile: Awaited<ReturnType<typeof getPublicProfile>>): string | null {
  const topItems = (profile.wishlist ?? []).slice(0, 2);
  if (topItems.length === 0) return null;
  const cardsText = topItems
    .map((item) => item.card?.name?.trim() || item.cardId)
    .join(", ");
  return `Wishlist: ${cardsText}.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const siteUrl = getSiteUrl();
  const profileUrl = `${siteUrl}/u/${encodeURIComponent(slug)}`;

  try {
    const profile = await getPublicProfile(slug);
    const displayName = profile.displayName?.trim() || profile.slug;
    const wishlistCount = profile.wishlist?.length ?? 0;
    const forSaleCount = profile.forSale?.length ?? 0;
    const forSaleSnippet = buildForSaleSnippet(profile);
    const wishlistSnippet = buildWishlistSnippet(profile);
    const sectionSnippet = [forSaleSnippet, wishlistSnippet].filter(Boolean).join(" ");
    const description = `${displayName} tem ${forSaleCount} cartas na sell list e ${wishlistCount} na wishlist no Riftbounty.${sectionSnippet ? ` ${sectionSnippet}` : ""}`;
    const imageUrl = getCardImageUrl(profile);

    return {
      title: `${displayName} | Riftbounty`,
      description,
      openGraph: {
        title: `${displayName} | Riftbounty`,
        description,
        url: profileUrl,
        type: "profile",
        images: imageUrl ? [{ url: imageUrl }] : undefined,
      },
      twitter: {
        card: imageUrl ? "summary_large_image" : "summary",
        title: `${displayName} | Riftbounty`,
        description,
        images: imageUrl ? [imageUrl] : undefined,
      },
      alternates: {
        canonical: profileUrl,
      },
    };
  } catch {
    const fallbackTitle = `${slug} | Riftbounty`;
    const fallbackDescription = "Perfil publico no Riftbounty com wishlist e sell list.";
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        url: profileUrl,
      },
      twitter: {
        card: "summary",
        title: fallbackTitle,
        description: fallbackDescription,
      },
      alternates: {
        canonical: profileUrl,
      },
    };
  }
}

export default function PublicProfileLayout({ children }: Props) {
  return children;
}
