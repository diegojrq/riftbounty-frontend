import type { Metadata } from "next";
import PublicProfilePageClient from "./public-profile-page-client";
import { buildPublicProfileMetadata } from "@/lib/public-profile-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const raw = sp.tab;
  const tab = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return buildPublicProfileMetadata(slug, tab);
}

export default function PublicProfilePage() {
  return <PublicProfilePageClient />;
}
