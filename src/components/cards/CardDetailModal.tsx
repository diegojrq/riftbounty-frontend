"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { cardHasFlag, getCard, getCardImageUrl } from "@/lib/cards";
import { addToCollection, removeFromCollection, updateQuantity } from "@/lib/collections";
import { CardImg } from "@/components/cards/CardImg";
import { CardNewFlagChip } from "@/components/cards/CardNewFlagChip";
import { CardBannedBanner } from "@/components/cards/CardBannedUi";
import { CardDescription } from "@/components/cards/CardDescription";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";
import { getCardDisplayName } from "@/lib/card-display-name";

function fmt(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

const DOMAIN_IMAGE_SLUGS = new Set(["fury", "calm", "mind", "body", "chaos", "order"]);
const NO_DOMAIN_ICON = "/images/types/unit.webp";
const BATTLEFIELD_ICON = "/images/types/battlefields.webp";

function isBattlefieldCard(card: Card | null | undefined): boolean {
  if (!card) return false;
  const t = (card.type ?? "").toLowerCase();
  const r = (card.record_type ?? "").toLowerCase();
  return t === "battlefield" || r.includes("battleground") || t === "battleground";
}

function getNoDomainIcon(card: Card | null | undefined): string {
  return isBattlefieldCard(card) ? BATTLEFIELD_ICON : NO_DOMAIN_ICON;
}

function getCardDomains(card: Card): string[] {
  const result: string[] = [];
  if (card.domain) result.push(card.domain.toLowerCase());
  if ((card as unknown as { domains?: string[] }).domains)
    result.push(...((card as unknown as { domains: string[] }).domains).map((d) => d.toLowerCase()));
  if ((card as unknown as { cardDomains?: { domain: { name: string } }[] }).cardDomains)
    result.push(...((card as unknown as { cardDomains: { domain: { name: string } }[] }).cardDomains).map((cd) => cd.domain.name.toLowerCase()));
  return [...new Set(result)];
}

function getCardAttributes(card: Card): string[] {
  if (card.attributes) {
    if (Array.isArray(card.attributes)) return card.attributes as string[];
    return Object.keys(card.attributes);
  }
  if (Array.isArray(card.cardAttributes)) {
    return (card.cardAttributes as Array<{ attribute?: { name?: string }; name?: string }>)
      .map((ca) => ca.attribute?.name ?? ca.name ?? "")
      .filter(Boolean);
  }
  return [];
}

function getCardSubtypes(card: Card): string[] {
  if (card.subtypes?.length) return card.subtypes;
  if (Array.isArray(card.cardSubtypes)) {
    return (card.cardSubtypes as Array<{ subtype?: { name?: string }; name?: string }>)
      .map((cs) => cs.subtype?.name ?? cs.name ?? "")
      .filter(Boolean);
  }
  return [];
}

function getCardSupertypes(card: Card): string[] {
  if (card.supertypes?.length) return card.supertypes;
  if (Array.isArray(card.cardSupertypes)) {
    return (card.cardSupertypes as Array<{ supertype?: { name?: string }; name?: string }>)
      .map((cs) => cs.supertype?.name ?? cs.name ?? "")
      .filter(Boolean);
  }
  return [];
}

interface CardDetailModalProps {
  /** Identificador da carta (GET /v1/cards → `id`). */
  cardId: string | null;
  onClose: () => void;
  /** Called after any collection mutation so the parent can refresh its data */
  onCollectionChange?: () => void;
  /** Show TCG price fields (used on cards/collection pages). */
  showTcgPrices?: boolean;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function CardDetailModal({ cardId, onClose, onCollectionChange, showTcgPrices = false }: CardDetailModalProps) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { formatSetWithCode } = useRiotCatalogSets();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => { setPortalRoot(document.body); }, []);

  const fetchCard = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    setCard(null);
    setLoadError(null);
    try {
      setCard(await getCard(cardId));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  // Close on Escape
  useEffect(() => {
    if (!cardId) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cardId, onClose]);

  if (!cardId || !portalRoot) return null;

  const qty = Number(card?.collectionQuantity ?? 0);
  const inCollection = card?.inCollection ?? false;
  const canDecrease = inCollection && qty >= 1;
  const imageUrl = card ? getCardImageUrl(card) : null;
  const isLandscape =
    card &&
    (card.orientation?.toLowerCase() === "landscape" ||
      (card.record_type?.toLowerCase().includes("battleground") ?? false) ||
      card.type?.toLowerCase() === "battlefield");
  const collectorNumber = card?.collector_number ?? card?.collectorNumber ?? "—";
  const setDisplay = card?.set ? formatSetWithCode(card.set) : card?.set;
  const tcgLowPrice = getNumeric(card?.tcgLowPrice ?? card?.tcg_low_price);
  const tcgMidPrice = getNumeric(card?.tcgMidPrice ?? card?.tcg_mid_price);
  const tcgHighPrice = getNumeric(card?.tcgHighPrice ?? card?.tcg_high_price);
  const tcgMarketPrice = getNumeric(card?.tcgMarketPrice ?? card?.tcg_market_price);
  const tcgPriceUpdatedAt = card?.tcgPriceUpdatedAt ?? card?.tcg_price_updated_at ?? null;
  const hasAnyTcgPrice = [tcgLowPrice, tcgMidPrice, tcgHighPrice, tcgMarketPrice].some((value) => value != null);
  const cardDisplayName = card ? getCardDisplayName(card) : "";

  async function handleAdd() {
    if (!user || !card) return;
    setActionLoading(true);
    try {
      if (card.inCollection) await addToCollection(getCardId(card), 1);
      else await addToCollection(getCardId(card));
      await fetchCard();
      onCollectionChange?.();
    } finally { setActionLoading(false); }
  }

  async function handleDecrease() {
    if (!user || !card) return;
    setActionLoading(true);
    try {
      if (qty <= 1) await removeFromCollection(getCardId(card));
      else await updateQuantity(getCardId(card), qty - 1);
      await fetchCard();
      onCollectionChange?.();
    } finally { setActionLoading(false); }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl sm:max-w-5xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition"
          aria-label={t("cards.close")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
          </div>
        )}

        {!loading && loadError && (
          <div className="px-5 py-8 sm:px-6">
            <div className="rounded-lg border border-red-800/80 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {loadError}
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !loadError && card && (
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Image */}
              <div
                className={`relative mx-auto w-full shrink-0 overflow-visible ${cardHasFlag(card, "new") ? "pt-3" : ""} ${isLandscape ? "max-w-[360px] sm:max-w-[420px]" : "max-w-[300px] sm:max-w-[360px]"}`}
              >
                {cardHasFlag(card, "new") && <CardNewFlagChip />}
                <div className={`relative overflow-hidden rounded-xl border border-gray-600 bg-gray-800 shadow-xl ${isLandscape ? "aspect-[3.5/2.5]" : "aspect-[2.5/3.5]"}`}>
                  {imageUrl ? (
                    isLandscape ? (
                      <CardImg
                        src={imageUrl}
                        alt={cardDisplayName}
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          width: "calc(100% * 2.5 / 3.5)",
                          height: "calc(100% * 3.5 / 2.5)",
                          objectFit: "cover",
                          transform: "translate(-50%, -50%) rotate(-90deg)",
                        }}
                        className="h-full w-full"
                      />
                    ) : (
                      <CardImg src={imageUrl} alt={cardDisplayName} className="h-full w-full object-cover" />
                    )
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-500">
                      <span className="text-5xl" aria-hidden>🃏</span>
                      <span className="text-sm">{t("cards.noImage")}</span>
                    </div>
                  )}
                </div>
                {card.illustrator && (
                  <p className="mt-2 text-right text-xs text-gray-500">{t("cards.illustrator")}: <span className="text-gray-400">{card.illustrator}</span></p>
                )}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1 space-y-4">
                {/* Header */}
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{cardDisplayName}</h2>
                  <p className="mt-1 text-sm tabular-nums text-gray-400">
                    {setDisplay && `${setDisplay} · `}{collectorNumber}
                  </p>
                </div>

                {card.banned && <CardBannedBanner card={card} />}

                {/* Tags: Set, Rarity, Type, Domains */}
                <div className="flex flex-wrap gap-2">
                  {card.set && (
                    <span className="inline-flex items-center rounded-lg border border-gray-600 bg-gray-800/80 px-2.5 py-1 text-xs font-bold italic text-gray-200">
                      {fmt(setDisplay ?? card.set)}
                    </span>
                  )}
                  {card.rarity && (
                    <span className="inline-flex items-center rounded-lg border border-gray-600 bg-gray-800/80 px-2.5 py-1 text-xs font-bold italic text-gray-200">
                      {fmt(card.rarity)}
                    </span>
                  )}
                  {card.type && (
                    <span className="inline-flex items-center rounded-lg border border-gray-600 bg-gray-800/80 px-2.5 py-1 text-xs font-bold italic text-gray-200">
                      {fmt(card.type)}
                    </span>
                  )}
                  {getCardDomains(card).length > 0 ? (
                    getCardDomains(card).map((domain) => (
                      <span key={domain} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800/80 px-2.5 py-1 text-xs font-bold italic text-gray-200">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {DOMAIN_IMAGE_SLUGS.has(domain) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/images/domains/${domain}.webp`} alt={domain} className="h-full w-full object-contain" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getNoDomainIcon(card)} alt="" className="h-full w-full object-contain opacity-90" />
                          )}
                        </span>
                        {fmt(domain)}
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800/80 px-2.5 py-1 text-xs font-bold italic text-gray-200">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={getNoDomainIcon(card)} alt="" className="h-full w-full object-contain opacity-90" />
                      </span>
                      {isBattlefieldCard(card) ? t("decks.typeBattlefield") : t("decks.typeUnit")}
                    </span>
                  )}
                </div>

                {/* Stats: Cost, Power, Energy, Might, CMC */}
                {(card.cost != null || card.power != null || card.energy != null || card.might != null || card.cmc != null) && (
                  <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t("cards.stats")}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {card.cost != null && card.cost !== "" && (
                        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.cost")}</p>
                          <p className="mt-0.5 text-base font-semibold text-white">{card.cost}</p>
                        </div>
                      )}
                      {card.power != null && (
                        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.power")}</p>
                          <p className="mt-0.5 text-base font-semibold text-white">{card.power}</p>
                        </div>
                      )}
                      {card.energy != null && (
                        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.energy")}</p>
                          <p className="mt-0.5 text-base font-semibold text-white">{card.energy}</p>
                        </div>
                      )}
                      {card.might != null && (
                        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.might")}</p>
                          <p className="mt-0.5 text-base font-semibold text-white">{card.might}</p>
                        </div>
                      )}
                      {card.cmc != null && (
                        <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.cmc")}</p>
                          <p className="mt-0.5 text-base font-semibold text-white">{card.cmc}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {showTcgPrices && (
                  <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">{t("cards.tcgPricesUsd")}</p>
                    {hasAnyTcgPrice ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.tcgMarketPrice")}</p>
                            <p className="mt-0.5 text-base font-semibold text-emerald-100">{tcgMarketPrice != null ? formatUsd(tcgMarketPrice) : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.tcgMidPrice")}</p>
                            <p className="mt-0.5 text-base font-semibold text-gray-100">{tcgMidPrice != null ? formatUsd(tcgMidPrice) : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.tcgLowPrice")}</p>
                            <p className="mt-0.5 text-base font-semibold text-gray-100">{tcgLowPrice != null ? formatUsd(tcgLowPrice) : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-gray-900/60 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{t("cards.tcgHighPrice")}</p>
                            <p className="mt-0.5 text-base font-semibold text-gray-100">{tcgHighPrice != null ? formatUsd(tcgHighPrice) : "—"}</p>
                          </div>
                        </div>
                        {tcgPriceUpdatedAt && (
                          <p className="mt-2 text-xs text-gray-400">
                            {t("cards.tcgPriceUpdatedAt")}: {new Date(tcgPriceUpdatedAt).toLocaleString()}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-400">{t("cards.tcgPriceUnavailable")}</p>
                    )}
                  </div>
                )}

                {/* Description */}
                {(card.description ?? card.altText) && (
                  <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-3">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t("cards.description")}</p>
                    <div className="text-sm leading-relaxed text-gray-300">
                      <CardDescription text={card.description ?? card.altText ?? ""} domain={getCardDomains(card)[0]} />
                    </div>
                  </div>
                )}

                {/* Subtypes, Supertypes, Attributes */}
                {(getCardSubtypes(card).length > 0 || getCardSupertypes(card).length > 0 || getCardAttributes(card).length > 0) && (
                  <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t("cards.traits")}</p>
                    <div className="flex flex-wrap gap-2">
                      {getCardSupertypes(card).map((s) => (
                        <span key={s} className="rounded-md bg-amber-900/30 px-2 py-0.5 text-xs font-bold italic text-amber-200 border border-amber-700/40">
                          {fmt(s)}
                        </span>
                      ))}
                      {getCardSubtypes(card).map((s) => (
                        <span key={s} className="rounded-md bg-blue-900/30 px-2 py-0.5 text-xs font-bold italic text-blue-200 border border-blue-700/40">
                          {fmt(s)}
                        </span>
                      ))}
                      {getCardAttributes(card).map((a) => (
                        <span key={a} className="rounded-md bg-gray-700/60 px-2 py-0.5 text-xs font-bold italic text-gray-300 border border-gray-600">
                          {fmt(a)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collection */}
                <div className="rounded-xl border border-gray-700/80 bg-gray-800/40 p-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{t("cards.yourCollection")}</h3>
                  {!user ? (
                    <p className="mt-2 text-sm text-gray-400">
                      <Link href="/login" className="text-emerald-400 hover:underline" onClick={onClose}>
                        {t("profile.logIn")}
                      </Link>
                      {t("cards.toAddThisCardSuffix")}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <span className="text-xl font-bold tabular-nums text-white">×{qty}</span>
                      <div className="flex items-center gap-2">
                        {canDecrease && (
                          <button
                            type="button"
                            onClick={handleDecrease}
                            disabled={actionLoading}
                            className="flex size-10 items-center justify-center rounded-lg border border-gray-500 bg-gray-700 text-white transition hover:bg-gray-600 disabled:opacity-50"
                            aria-label={t("cards.decreaseQuantity")}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/></svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleAdd}
                          disabled={actionLoading}
                          className="flex size-10 items-center justify-center rounded-lg border-2 border-emerald-600 bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-50"
                          aria-label={t("cards.addOne")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
