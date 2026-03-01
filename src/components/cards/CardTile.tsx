"use client";

import Link from "next/link";
import type { Card } from "@/types/card";

interface CardTileProps {
  card: Card;
  inCollection?: boolean;
  quantity?: number;
  showCollectionActions?: boolean;
  /** When true, the card image links to /cards/[uuid] */
  linkToDetail?: boolean;
  /** When linkToDetail is true, add ?from=collection or ?from=cards so the detail page can show the right back link */
  detailFrom?: "collection" | "cards";
  /** On My collection page: show placeholder (no image) in grayscale */
  grayscaleWhenNoImage?: boolean;
  /** When true, card is shown in grayscale when not in collection */
  grayscaleWhenNotInCollection?: boolean;
  actionDisabled?: boolean;
  /** Use "div" when wrapping in a parent li (e.g. with loading overlay) */
  wrapperElement?: "li" | "div";
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

const cardClassName =
  "group relative aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800 shadow-lg transition-all duration-200 ease-out hover:-translate-y-1 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/30";

/** Set to true to hide card images (e.g. while waiting for Riot API key); backend may send imageUrl from other sources */
const SUPPRESS_CARD_IMAGES = false;

export function CardTile({
  card,
  inCollection = false,
  quantity = 0,
  showCollectionActions = false,
  linkToDetail = false,
  detailFrom,
  grayscaleWhenNoImage = false,
  grayscaleWhenNotInCollection = false,
  actionDisabled = false,
  wrapperElement = "li",
  onAdd,
  onDecrease,
}: CardTileProps) {
  /** Use props or card.collectionQuantity (API always sends collectionQuantity, 0 when not in collection) */
  const qty = Number(quantity ?? card.collectionQuantity ?? 0);
  const canDecrease = inCollection && qty >= 1;
  const useGrayscale = grayscaleWhenNotInCollection && !inCollection;

  const Wrapper = wrapperElement;

  const showCardImage = card.imageUrl && !SUPPRESS_CARD_IMAGES;

  const imageNode = showCardImage ? (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic URLs from API */
    <img
      src={card.imageUrl}
      alt={card.name}
      className={`absolute inset-0 h-full w-full object-cover transition-all duration-200 ease-out group-hover:scale-105 ${useGrayscale ? "grayscale" : ""}`}
    />
  ) : null;

  return (
    <Wrapper className={cardClassName}>
      {showCardImage ? (
        <>
          {linkToDetail ? (
            <Link
              href={`/cards/${encodeURIComponent(card.uuid)}${detailFrom ? `?from=${detailFrom}` : ""}`}
              className="absolute inset-0 z-0"
              aria-label={`View ${card.name} details`}
            >
              {imageNode}
            </Link>
          ) : (
            imageNode
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-2 py-3 pt-6">
            {showCollectionActions && (
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex justify-end">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/30 bg-black/70 text-sm font-bold tabular-nums text-white shadow">
                    ×{qty}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/70 px-2 text-xs font-bold tabular-nums text-gray-300">
                    {(card.collector_number ?? card.collectorNumber) ?? "—"}
                  </span>
                  <div className="flex items-center gap-1">
                    {canDecrease && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onDecrease?.(); }}
                        disabled={actionDisabled}
                        className="flex size-10 shrink-0 items-center justify-center rounded-md border border-gray-500 bg-gray-700/90 text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                        title="Decrease quantity"
                        aria-label="Decrease quantity"
                      >
                        <IconMinus />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onAdd?.(); }}
                      disabled={actionDisabled}
                      className="flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white shadow transition-colors hover:bg-green-600 hover:border-green-500 disabled:opacity-50"
                      title="Add one"
                      aria-label="Add one"
                    >
                      <IconPlus />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {linkToDetail ? (
            <Link
              href={`/cards/${encodeURIComponent(card.uuid)}${detailFrom ? `?from=${detailFrom}` : ""}`}
              className="absolute inset-0 z-0 flex flex-col items-center justify-center gap-1 bg-gray-800 p-4 text-center"
              aria-label={`View ${card.name} details`}
            >
              <span className={`text-3xl text-gray-500 ${grayscaleWhenNoImage || useGrayscale ? "grayscale" : ""}`} aria-hidden>🖼️</span>
              <p className="text-xs font-medium text-gray-400">Image unavailable.</p>
              <p className="text-xs text-gray-500">Waiting for my well-deserved API key ;)</p>
            </Link>
          ) : (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gray-800 p-4 text-center ${grayscaleWhenNoImage || useGrayscale ? "grayscale" : ""}`}>
              <span className="text-3xl text-gray-500" aria-hidden>🖼️</span>
              <p className="text-xs font-medium text-gray-400">Image unavailable.</p>
              <p className="text-xs text-gray-500">Waiting for my well-deserved API key ;)</p>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent px-2 py-3 pt-6">
            {showCollectionActions && (
              <div className="mt-2 flex flex-col gap-1">
                <div className="flex justify-end">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-white/30 bg-black/70 text-sm font-bold tabular-nums text-white shadow">
                    ×{qty}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/70 px-2 text-xs font-bold tabular-nums text-gray-300">
                    {(card.collector_number ?? card.collectorNumber) ?? "—"}
                  </span>
                  <div className="flex items-center gap-1">
                    {canDecrease && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); onDecrease?.(); }}
                        disabled={actionDisabled}
                        className="flex size-10 shrink-0 items-center justify-center rounded-md border border-gray-500 bg-gray-700/90 text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
                        title="Decrease quantity"
                        aria-label="Decrease quantity"
                      >
                        <IconMinus />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); onAdd?.(); }}
                      disabled={actionDisabled}
                      className="flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-green-600 bg-green-700 text-white shadow transition-colors hover:bg-green-600 hover:border-green-500 disabled:opacity-50"
                      title="Add one"
                      aria-label="Add one"
                    >
                      <IconPlus />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Wrapper>
  );
}
