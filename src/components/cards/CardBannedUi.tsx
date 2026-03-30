"use client";

import type { Card } from "@/types/card";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";

function formatBannedAt(iso: string | null | undefined, locale: Locale): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US");
}

/** Selo compacto no canto superior esquerdo (ex.: CardTile). */
export function CardBannedBadge() {
  const { t } = useLocale();
  return (
    <div className="pointer-events-none absolute left-2 top-2 z-[35]">
      <span
        className="inline-flex items-center rounded-md border border-red-500/80 bg-red-950/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-100 shadow-md"
        title={t("cards.banned")}
      >
        {t("cards.banned")}
      </span>
    </div>
  );
}

/** Bloco com data e link ao comunicado (detalhe da carta). */
export function CardBannedBanner({ card }: { card: Card }) {
  const { t, locale } = useLocale();
  if (!card.banned) return null;
  const at = formatBannedAt(card.bannedAt ?? null, locale);
  const url = card.banAnnouncementUrl?.trim() || null;

  return (
    <div className="rounded-lg border border-red-800/60 bg-red-950/35 px-3 py-2.5 text-sm text-red-100">
      <p className="font-semibold text-red-200">{t("cards.banned")}</p>
      {at && (
        <p className="mt-1 text-xs text-red-200/90">
          {t("cards.bannedAtLabel")}: {at}
        </p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex text-sm font-medium text-amber-300 underline decoration-amber-500/50 hover:text-amber-200"
        >
          {t("cards.viewBanAnnouncement")}
        </a>
      )}
    </div>
  );
}
