"use client";

import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { CardBannedBadge } from "@/components/cards/CardBannedUi";
import { CardImg } from "@/components/cards/CardImg";
import { getCardImageUrl } from "@/lib/cards";
import { getCardDisplayName } from "@/lib/card-display-name";
import type { Card } from "@/types/card";

/**
 * Miniatura: badge no mesmo molde da coleção (CardTile: size-9, canto inferior direito).
 * Com mais de uma cópia, uma segunda face atrás (efeito pilha).
 */
export function DeckCardThumb({
  card,
  quantity,
  hoverPreview = true,
}: {
  card: Card;
  quantity: number;
  /** Quando false, não mostra o preview grande ao passar o mouse (ex.: mulligan). */
  hoverPreview?: boolean;
}) {
  const url = getCardImageUrl(card);
  const label = getCardDisplayName(card);
  const showQtyBadge = quantity > 1;
  const showStack = quantity > 1;

  const inner = (
    <div className="group relative aspect-[2.5/3.5] w-full">
        {showStack && url && (
          <div
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg border-2 border-gray-500/70 bg-gray-800 shadow-[5px_5px_0_0_rgba(15,23,42,0.85)]"
            style={{ transform: "translate(7px, 7px)" }}
            aria-hidden
          >
            <CardImg src={url} alt="" className="h-full w-full object-cover opacity-[0.72] brightness-95" />
          </div>
        )}
        {showStack && !url && (
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-lg border-2 border-gray-500/60 bg-gray-700 shadow-[5px_5px_0_0_rgba(15,23,42,0.85)]"
            style={{ transform: "translate(7px, 7px)" }}
            aria-hidden
          />
        )}

        <div
          className={`relative z-10 flex h-full w-full overflow-hidden rounded-lg border border-gray-700/80 bg-gray-800 shadow-md transition${
            hoverPreview ? " hover:border-amber-700/40 hover:shadow-lg" : ""
          }${card.banned ? " ring-1 ring-red-800/45" : ""}`}
        >
          {card.banned && <CardBannedBadge />}
          {url ? (
            <CardImg src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-[10px] leading-tight text-gray-500">{label}</div>
          )}
          {showQtyBadge && (
            <span className="absolute bottom-1.5 right-1.5 z-20 flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-400/70 bg-zinc-950 text-xs font-bold tabular-nums text-white shadow-md">
              ×{quantity}
            </span>
          )}
        </div>
      </div>
  );

  if (!hoverPreview) {
    return inner;
  }

  return (
    <CardHoverPreview card={card} battlefieldAsLandscape>
      {inner}
    </CardHoverPreview>
  );
}
