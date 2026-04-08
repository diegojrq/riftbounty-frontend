import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ptBR from "@/locales/pt-BR.json";
import {
  getPreconDeckViewData,
  PRECON_VIEW_SLUGS,
} from "@/data/precon-champion-deck-lists";
import { PreconDeckViewClient } from "./precon-deck-view-client";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return PRECON_VIEW_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = getPreconDeckViewData(slug);
  if (!data) {
    return { title: "Riftbounty" };
  }
  const deckTitle = ptBR.preconDecks[data.titleKey] as string;
  const title = `${deckTitle} | Riftbounty`;
  return {
    title,
    description: ptBR.preconDecks.metaDescription,
    openGraph: { title, description: ptBR.preconDecks.metaDescription },
  };
}

export default async function PreconDeckViewPage({ params }: Props) {
  const { slug } = await params;
  if (!getPreconDeckViewData(slug)) {
    notFound();
  }
  return <PreconDeckViewClient slug={slug} />;
}
