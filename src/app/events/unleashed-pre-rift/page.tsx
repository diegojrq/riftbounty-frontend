import type { Metadata } from "next";
import ptBR from "@/locales/pt-BR.json";
import { UnleashedPreRiftContent } from "./unleashed-pre-rift-content";
import { UnleashedPreRiftJsonLd } from "./unleashed-pre-rift-jsonld";

const ev = ptBR.events.unleashedPreRift;
const OG_IMAGE = "/images/riftbounty-ico.png";

export const metadata: Metadata = {
  title: ev.metaTitle,
  description: ev.metaDescription,
  alternates: {
    canonical: "/events/unleashed-pre-rift",
  },
  openGraph: {
    title: ev.metaTitle,
    description: ev.metaDescription,
    url: "/events/unleashed-pre-rift",
    siteName: "Riftbounty",
    locale: "pt_BR",
    type: "website",
    images: [{ url: OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: ev.metaTitle,
    description: ev.metaDescription,
    images: [OG_IMAGE],
  },
};

export default function UnleashedPreRiftPage() {
  return (
    <>
      <UnleashedPreRiftJsonLd />
      <UnleashedPreRiftContent />
    </>
  );
}
