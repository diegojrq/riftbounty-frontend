import type { Metadata } from "next";
import ptBR from "@/locales/pt-BR.json";
import { PreconDecksContent } from "./precon-content";

const m = ptBR.preconDecks;

export const metadata: Metadata = {
  title: m.metaTitle,
  description: m.metaDescription,
  openGraph: {
    title: m.metaTitle,
    description: m.metaDescription,
  },
};

export default function PreconDecksPage() {
  return <PreconDecksContent />;
}
