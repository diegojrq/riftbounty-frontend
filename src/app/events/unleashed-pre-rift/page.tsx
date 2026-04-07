import type { Metadata } from "next";
import ptBR from "@/locales/pt-BR.json";
import { UnleashedPreRiftContent } from "./unleashed-pre-rift-content";

const ev = ptBR.events.unleashedPreRift;

export const metadata: Metadata = {
  title: ev.metaTitle,
  description: ev.metaDescription,
  openGraph: {
    title: ev.metaTitle,
    description: ev.metaDescription,
  },
};

export default function UnleashedPreRiftPage() {
  return <UnleashedPreRiftContent />;
}
