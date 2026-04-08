import ptBR from "@/locales/pt-BR.json";
import { getSiteUrl } from "@/lib/site-url";

const ev = ptBR.events.unleashedPreRift;
const common = ptBR.common;

export function UnleashedPreRiftJsonLd() {
  const base = getSiteUrl();
  const pageUrl = `${base}/events/unleashed-pre-rift`;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: ev.metaTitle,
        description: ev.metaDescription,
        isPartOf: {
          "@type": "WebSite",
          name: "Riftbounty",
          url: base,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: common.home,
            item: `${base}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: ev.heroTitle,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
