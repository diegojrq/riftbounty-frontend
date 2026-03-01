"use client";

import { useRef, useState } from "react";
import type { Card } from "@/types/card";

interface CardHoverPreviewProps {
  card: Card;
  children: React.ReactNode;
}

/**
 * Wraps any element and shows a floating card image preview on hover.
 * Handles both portrait and landscape orientations.
 * Positions the preview smartly to avoid viewport overflow.
 */
export function CardHoverPreview({ card, children }: CardHoverPreviewProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; side: "left" | "right" }>({
    top: 0,
    left: 0,
    side: "right",
  });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const isLandscape = card.orientation?.toLowerCase() === "landscape";
  // portrait: 280px wide × 392px tall  |  landscape: 392px wide × 280px tall
  const PREVIEW_W = isLandscape ? 392 : 280;
  const PREVIEW_H = isLandscape ? 280 : 392;
  const GAP = 8;

  function handleMouseEnter() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const side: "left" | "right" = spaceRight >= PREVIEW_W + GAP ? "right" : "left";

    let top = rect.top + window.scrollY + rect.height / 2 - PREVIEW_H / 2;
    // Clamp vertically
    top = Math.max(window.scrollY + 8, Math.min(top, window.scrollY + window.innerHeight - PREVIEW_H - 8));

    const left =
      side === "right"
        ? rect.right + window.scrollX + GAP
        : rect.left + window.scrollX - PREVIEW_W - GAP;

    setPos({ top, left, side });
    setVisible(true);
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        className="cursor-default"
      >
        {children}
      </span>

      {visible && card.imageUrl && (
        <div
          style={{
            position: "fixed",
            top: pos.top - window.scrollY,
            left: pos.left - window.scrollX,
            width: PREVIEW_W,
            height: PREVIEW_H,
            zIndex: 9999,
            pointerEvents: "none",
          }}
          className="overflow-hidden rounded-lg border border-gray-600 shadow-2xl"
        >
          {isLandscape ? (
            <div className="relative w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.imageUrl}
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt={card.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
    </>
  );
}
