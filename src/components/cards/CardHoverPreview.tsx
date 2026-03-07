"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Card } from "@/types/card";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";

interface CardHoverPreviewProps {
  card: Card;
  children: React.ReactNode;
  /** When true, cards with type Battlefield use landscape aspect (only set on deck edit/view) */
  battlefieldAsLandscape?: boolean;
}

/**
 * Wraps any element and shows a floating card image preview.
 * - Desktop (pointer: fine): hover tooltip positioned next to the element.
 * - Touch/mobile (pointer: coarse): tap opens a centered modal overlay.
 */
export function CardHoverPreview({ card, children, battlefieldAsLandscape = false }: CardHoverPreviewProps) {
  const [hoverVisible, setHoverVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; side: "left" | "right" }>({
    top: 0,
    left: 0,
    side: "right",
  });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const isLandscape =
    card.orientation?.toLowerCase() === "landscape" ||
    (card.record_type?.toLowerCase().includes("battleground") ?? false) ||
    (battlefieldAsLandscape && (card.type?.toLowerCase() === "battlefield"));

  const PREVIEW_W = isLandscape ? 560 : 400;
  const PREVIEW_H = isLandscape ? 400 : 560;
  const GAP = 8;

  function isTouchDevice() {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  }

  function handleMouseEnter() {
    if (isTouchDevice()) return;
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const side: "left" | "right" = spaceRight >= PREVIEW_W + GAP ? "right" : "left";

    let top = rect.top + window.scrollY + rect.height / 2 - PREVIEW_H / 2;
    top = Math.max(window.scrollY + 8, Math.min(top, window.scrollY + window.innerHeight - PREVIEW_H - 8));

    const left =
      side === "right"
        ? rect.right + window.scrollX + GAP
        : rect.left + window.scrollX - PREVIEW_W - GAP;

    setPos({ top, left, side });
    setHoverVisible(true);
  }

  const cardImageUrl = getCardImageUrl(card);

  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    if (!isTouchDevice()) return;
    if (!cardImageUrl) return;
    e.preventDefault();
    e.stopPropagation();
    setModalVisible(true);
  }

  if (!cardImageUrl) {
    return <>{children}</>;
  }

  const previewImg = isLandscape ? (
    <div className="relative w-full h-full">
      <CardImg
        src={cardImageUrl}
        alt={card.name}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "calc(100% * 2.5 / 3.5)",
          height: "calc(100% * 3.5 / 2.5)",
          objectFit: "cover",
          transform: "translate(-50%, -50%) rotate(90deg)",
        }}
      />
    </div>
  ) : (
    <CardImg src={cardImageUrl} alt={card.name} className="h-full w-full object-cover" />
  );

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHoverVisible(false)}
        onClick={handleTap}
        onTouchEnd={handleTap}
        className="cursor-default"
      >
        {children}
      </span>

      {/* Desktop hover tooltip — portal direto no body, fora de qualquer stacking context */}
      {hoverVisible && portalRoot && createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top - window.scrollY,
            left: pos.left - window.scrollX,
            width: PREVIEW_W,
            height: PREVIEW_H,
            zIndex: 2147483647,
            pointerEvents: "none",
          }}
          className="overflow-hidden rounded-lg border border-gray-600 shadow-2xl"
        >
          {previewImg}
        </div>,
        portalRoot
      )}

      {/* Mobile tap modal — portal direto no body */}
      {modalVisible && portalRoot && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
          style={{ zIndex: 2147483647 }}
          onClick={() => setModalVisible(false)}
        >
          <div
            className={`relative overflow-hidden rounded-xl border border-gray-500 shadow-2xl ${
              isLandscape ? "w-full max-w-sm aspect-[3.5/2.5]" : "w-full max-w-xs aspect-[2.5/3.5]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {previewImg}
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setModalVisible(false)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>,
        portalRoot
      )}
    </>
  );
}
