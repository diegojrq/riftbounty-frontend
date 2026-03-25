"use client";

import type { Card } from "@/types/card";
import { cardHasFlag, getCardImageUrl } from "@/lib/cards";
import { CardNewFlagChip } from "@/components/cards/CardNewFlagChip";
import { CardImg } from "@/components/cards/CardImg";
import { useLocale } from "@/lib/locale-context";
import { getCardDisplayName } from "@/lib/card-display-name";

interface CardTileProps {
  card: Card;
  inCollection?: boolean;
  quantity?: number;
  showCollectionActions?: boolean;
  /** When true, the card image links to /cards/[id] */
  linkToDetail?: boolean;
  /** When linkToDetail is true, add ?from=collection or ?from=cards so the detail page can show the right back link */
  detailFrom?: "collection" | "cards";
  /** When provided, clicking the card opens a modal instead of navigating */
  onOpenDetail?: () => void;
  /** On My collection page: show placeholder (no image) in grayscale */
  grayscaleWhenNoImage?: boolean;
  /** When true, card is shown in grayscale when not in collection */
  grayscaleWhenNotInCollection?: boolean;
  actionDisabled?: boolean;
  /** Use "div" when wrapping in a parent li (e.g. with loading overlay) */
  wrapperElement?: "li" | "div";
  /** When true, cards with type Battlefield use landscape aspect (only set on deck edit/view) */
  battlefieldAsLandscape?: boolean;
  /** Show TCG market chip on top-right (used on cards/collection pages). */
  showTcgPriceChip?: boolean;
  /** Keys of active add animations (one element rendered per key, allows stacking) */
  addKeys?: string[];
  /** Keys of active remove animations (one element rendered per key, allows stacking) */
  removeKeys?: string[];
  onAdd?: () => void;
  onDecrease?: () => void;
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? "size-5"}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function IconMinus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className ?? "size-5"}>
      <path d="M5 12h14" />
    </svg>
  );
}

const portraitClass = "aspect-[2.5/3.5]";
const landscapeClass = "aspect-[3.5/2.5]";
/** `z-0` cria contexto de empilhamento para filhos (ex. chip z-30) não ficarem acima da barra de filtros sticky (z-20). */
const cardBaseClass =
  "group relative z-0 w-full overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800 shadow-lg transition-all duration-200 ease-out hover:-translate-y-2 hover:shadow-xl hover:shadow-black/30";

const SUPPRESS_CARD_IMAGES = false;

function parseTcgPrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Mesma prioridade que CollectionStats.getCardTcgPrice (market → mid → low → high). */
function getChipPrice(card: Card): number | null {
  const market = parseTcgPrice(card.tcgMarketPrice ?? card.tcg_market_price);
  const mid = parseTcgPrice(card.tcgMidPrice ?? card.tcg_mid_price);
  const low = parseTcgPrice(card.tcgLowPrice ?? card.tcg_low_price);
  const high = parseTcgPrice(card.tcgHighPrice ?? card.tcg_high_price);
  return market ?? mid ?? low ?? high;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function CardTile({
  card,
  inCollection = false,
  quantity = 0,
  showCollectionActions = false,
  linkToDetail = false,
  detailFrom,
  onOpenDetail,
  grayscaleWhenNoImage = false,
  grayscaleWhenNotInCollection = false,
  actionDisabled = false,
  wrapperElement = "li",
  battlefieldAsLandscape = false,
  showTcgPriceChip = false,
  addKeys = [],
  removeKeys = [],
  onAdd,
  onDecrease,
}: CardTileProps) {
  const { t } = useLocale();
  const displayName = getCardDisplayName(card);
  const qty = Number(quantity ?? card.collectionQuantity ?? 0);
  const canDecrease = inCollection && qty >= 1;
  const useGrayscale = grayscaleWhenNotInCollection && !inCollection;
  const isLandscape =
    battlefieldAsLandscape && (
      card.orientation?.toLowerCase() === "landscape" ||
      (card.record_type?.toLowerCase().includes("battleground") ?? false) ||
      card.type?.toLowerCase() === "battlefield"
    );
  const cardClassName = `${cardBaseClass} ${isLandscape ? landscapeClass : portraitClass}`;

  const Wrapper = wrapperElement;

  const cardImageUrl = getCardImageUrl(card);
  const showCardImage = !!cardImageUrl && !SUPPRESS_CARD_IMAGES;
  const tcgChipPrice = showTcgPriceChip ? getChipPrice(card) : null;

  const imageNode = showCardImage ? (
    isLandscape ? (
      /*
       * Imagem portrait dentro de container landscape:
       * - largura do img = altura do container  → calc(100% * 2.5/3.5) da largura do container
       * - altura do img  = largura do container → calc(100% * 3.5/2.5) da altura do container
       * - centralizado e rotacionado -90° → mesmo sentido que o modal de detalhes
       */
      <CardImg
        src={cardImageUrl}
        alt={displayName}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "calc(100% * 2.5 / 3.5)",
          height: "calc(100% * 3.5 / 2.5)",
          objectFit: "cover",
          transform: "translate(-50%, -50%) rotate(-90deg)",
        }}
        className={useGrayscale ? "grayscale" : ""}
      />
    ) : (
      <CardImg
        src={cardImageUrl}
        alt={displayName}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-200 ease-out ${useGrayscale ? "grayscale" : ""}`}
      />
    )
  ) : null;

  const collectorNumber = card.collector_number ?? card.collectorNumber;

  const showNewFlag = cardHasFlag(card, "new");

  return (
    <Wrapper
      className={`${cardClassName}${showNewFlag ? " !overflow-visible pt-3" : ""}`}
    >
      {showNewFlag && <CardNewFlagChip />}
      {tcgChipPrice != null && !showCollectionActions && (
        <div className="pointer-events-none absolute bottom-2 left-2 z-30">
          <span className="inline-flex items-center rounded-md border border-emerald-300/70 bg-emerald-600/70 px-2.5 py-1 text-xs font-bold italic text-emerald-50 shadow-md">
            {formatUsd(tcgChipPrice)}
          </span>
        </div>
      )}
      {addKeys.map((key, i) => (
        <div key={key} className="pointer-events-none">
          <div className="animate-card-added absolute inset-0 z-20 rounded-lg bg-green-400/40 ring-2 ring-green-400" />
          <div
            className="animate-plus-one absolute inset-x-0 z-30 flex justify-center"
            style={{ top: `calc(33% - ${i * 24}px)` }}
          >
            <span className="rounded-full bg-green-500 px-2 py-0.5 text-sm font-bold text-white shadow-lg">+1</span>
          </div>
        </div>
      ))}
      {removeKeys.map((key, i) => (
        <div key={key} className="pointer-events-none">
          <div className="animate-card-removed absolute inset-0 z-20 rounded-lg bg-red-400/40 ring-2 ring-red-400" />
          <div
            className="animate-minus-one absolute inset-x-0 z-30 flex justify-center"
            style={{ top: `calc(33% + ${i * 24}px)` }}
          >
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-sm font-bold text-white shadow-lg">−1</span>
          </div>
        </div>
      ))}
      {showCardImage ? (
        <>
          {onOpenDetail ? (
            <button
              type="button"
              onClick={onOpenDetail}
              className="absolute inset-0 z-0 cursor-pointer"
              aria-label={t("cards.viewDetails", { name: displayName })}
            >
              {imageNode}
            </button>
          ) : (
            imageNode
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-1.5 py-1.5 pt-5">
            {showCollectionActions && (
              <div className="mt-1 flex flex-col gap-0.5">
                <div className="flex justify-end">
                  <span
                    key={qty}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-bold tabular-nums text-white shadow transition-colors ${
                      addKeys.length > 0
                        ? "animate-card-added border-green-400 bg-green-700/80"
                        : removeKeys.length > 0
                        ? "animate-card-removed border-red-400 bg-red-700/80"
                        : "border-white/30 bg-black/70"
                    }`}
                  >
                    ×{qty}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <div className="flex items-center gap-0.5">
                    {canDecrease && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onDecrease?.(); }}
                        disabled={actionDisabled}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-500 bg-gray-700/90 text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                        title={t("cards.decreaseQuantity")}
                        aria-label={t("cards.decreaseQuantity")}
                      >
                        <IconMinus />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onAdd?.(); }}
                      disabled={actionDisabled}
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white shadow transition-colors hover:bg-green-600 hover:border-green-500 disabled:opacity-50"
                      title={t("cards.addOne")}
                      aria-label={t("cards.addOne")}
                    >
                      <IconPlus />
                    </button>
                  </div>
                </div>
                {(collectorNumber || tcgChipPrice != null) && (
                  <div className="flex items-center justify-between gap-1">
                    {tcgChipPrice != null ? (
                      <span className="inline-flex h-9 items-center rounded-md border border-emerald-300/70 bg-emerald-600/70 px-2 text-xs font-bold italic text-emerald-50 shadow-md">
                        {formatUsd(tcgChipPrice)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {collectorNumber && (
                      <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/70 px-2 text-xs font-bold italic tabular-nums text-gray-300">
                        {collectorNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {onOpenDetail ? (
            <button
              type="button"
              onClick={onOpenDetail}
              className="absolute inset-0 z-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-gray-800 p-4 text-center"
              aria-label={t("cards.viewDetails", { name: displayName })}
            >
              <span className={`text-3xl text-gray-500 ${grayscaleWhenNoImage || useGrayscale ? "grayscale" : ""}`} aria-hidden>🃏</span>
              <p className="text-xs font-medium text-gray-400">{t("cards.noImage")}</p>
            </button>
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-800 p-4 text-center ${grayscaleWhenNoImage || useGrayscale ? "grayscale" : ""}`}>
              <span className="text-3xl text-gray-500" aria-hidden>🃏</span>
              <p className="text-xs font-medium text-gray-400">{t("cards.noImage")}</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-1.5 py-1.5 pt-5">
            {showCollectionActions && (
              <div className="mt-1 flex flex-col gap-0.5">
                <div className="flex justify-end">
                  <span
                    key={qty}
                    className={`flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-bold tabular-nums text-white shadow transition-colors ${
                      addKeys.length > 0
                        ? "animate-card-added border-green-400 bg-green-700/80"
                        : removeKeys.length > 0
                        ? "animate-card-removed border-red-400 bg-red-700/80"
                        : "border-white/30 bg-black/70"
                    }`}
                  >
                    ×{qty}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <div className="flex items-center gap-0.5">
                    {canDecrease && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onDecrease?.(); }}
                        disabled={actionDisabled}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-500 bg-gray-700/90 text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                        title={t("cards.decreaseQuantity")}
                        aria-label={t("cards.decreaseQuantity")}
                      >
                        <IconMinus />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onAdd?.(); }}
                      disabled={actionDisabled}
                      className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white shadow transition-colors hover:bg-green-600 hover:border-green-500 disabled:opacity-50"
                      title={t("cards.addOne")}
                      aria-label={t("cards.addOne")}
                    >
                      <IconPlus />
                    </button>
                  </div>
                </div>
                {(collectorNumber || tcgChipPrice != null) && (
                  <div className="flex items-center justify-between gap-1">
                    {tcgChipPrice != null ? (
                      <span className="inline-flex h-9 items-center rounded-md border border-emerald-300/70 bg-emerald-600/70 px-2 text-xs font-bold italic text-emerald-50 shadow-md">
                        {formatUsd(tcgChipPrice)}
                      </span>
                    ) : (
                      <span />
                    )}
                    {collectorNumber && (
                      <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/70 px-2 text-xs font-bold italic tabular-nums text-gray-300">
                        {collectorNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Wrapper>
  );
}
