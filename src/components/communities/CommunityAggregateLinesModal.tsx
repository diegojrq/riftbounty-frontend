"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getCardImageUrl, mergePublicProfileCardWithCatalog } from "@/lib/cards";
import { useLocale } from "@/lib/locale-context";
import type { CommunityAggregateLineMember } from "@/types/community";
import type { PublicProfileCard } from "@/types/auth";

type Kind = "forSale" | "wishlist";

function formatListPrice(value: number | null, intlLocale: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function sortLinesBySlug(lines: CommunityAggregateLineMember[]): CommunityAggregateLineMember[] {
  return [...lines].sort((a, b) => a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" }));
}

export interface CommunityAggregateLinesModalProps {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  cardId: string;
  card: PublicProfileCard | null;
  /** Membros embutidos no item do agregado (GET …/aggregates/for-sale|wishlist) */
  lines: CommunityAggregateLineMember[];
}

export function CommunityAggregateLinesModal({
  open,
  onClose,
  kind,
  cardId,
  card,
  lines,
}: CommunityAggregateLinesModalProps) {
  const { t, locale } = useLocale();
  const intlLocale = locale === "pt-BR" ? "pt-BR" : "en-US";
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  const items = useMemo(() => sortLinesBySlug(lines), [lines]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !portalRoot) return null;

  const preview = card ? mergePublicProfileCardWithCatalog(card, undefined, cardId) : null;
  const img = preview ? getCardImageUrl(preview) : null;
  const title =
    kind === "forSale"
      ? t("communities.aggregateDetailTitleForSale", { card: card?.name ?? cardId })
      : t("communities.aggregateDetailTitleWishlist", { card: card?.name ?? cardId });

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-aggregate-lines-title"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"
          aria-label={t("contact.close")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="border-b border-gray-800 px-5 pb-4 pt-5 pr-12">
          <div className="flex gap-4">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-gray-600 object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-600 bg-gray-800 text-sm text-gray-600">
                ?
              </div>
            )}
            <div className="min-w-0">
              <h2 id="community-aggregate-lines-title" className="text-lg font-semibold text-white">
                {title}
              </h2>
              <p className="mt-1 truncate text-xs text-gray-500">{cardId}</p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">{t("communities.aggregateDetailEmpty")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-2 py-2 font-medium">{t("communities.aggregateDetailMember")}</th>
                  <th className="px-2 py-2 font-medium text-right">{t("communities.aggregateDetailQuantity")}</th>
                  {kind === "forSale" && (
                    <th className="px-2 py-2 font-medium text-right">{t("communities.aggregateDetailPrice")}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {items.map((line) => (
                  <tr key={line.userId} className="text-gray-200">
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/${encodeURIComponent(line.slug)}`}
                        className="font-medium text-blue-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {line.displayName || line.slug}
                      </Link>
                      <div className="text-xs text-gray-500">@{line.slug}</div>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-emerald-400/90">{line.quantity}</td>
                    {kind === "forSale" && (
                      <td className="px-2 py-2.5 text-right tabular-nums text-gray-300">
                        {line.pricePerCard == null
                          ? "—"
                          : t("profile.pricePerCardLabel", {
                              price: formatListPrice(line.pricePerCard, intlLocale),
                            })}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
