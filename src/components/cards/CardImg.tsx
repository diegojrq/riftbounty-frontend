"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface CardImgProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Mostra skeleton animado até a imagem carregar (default: true). */
  skeleton?: boolean;
}

/** Preenche um pai já posicionado (tile, modal com aspect, etc.). */
function shouldFillParent(className?: string, style?: React.CSSProperties): boolean {
  if (style?.position === "absolute") return true;
  const c = className ?? "";
  if (c.includes("absolute") && c.includes("inset-0")) return true;
  if (c.includes("h-full") && c.includes("w-full")) return true;
  // Tailwind `size-full` = w+h 100% — não contém os literais h-full/w-full
  if (/\bsize-full\b/.test(c)) return true;
  return false;
}

/**
 * Faixa flex com largura fracionária (ex.: lista de decks: duas imagens h-full w-1/2 lado a lado).
 * Sem isso, o wrapper vira `block w-full` e quebra o layout.
 */
function getFlexSlotWidthToken(className?: string, style?: React.CSSProperties): string | null {
  if (style?.position === "absolute") return null;
  const c = className ?? "";
  if (c.includes("absolute") && c.includes("inset-0")) return null;
  if (!c.includes("h-full")) return null;
  const m = c.match(/\b(w-1\/2|w-1\/3|w-2\/3|w-1\/4|w-3\/4)\b/);
  return m ? m[1] : null;
}

function stripFlexSlotSizing(className: string, widthToken: string): string {
  const escaped = widthToken.replace("/", "\\/");
  return className
    .replace(new RegExp(`\\b${escaped}\\b`), "")
    .replace(/\bh-full\b/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Card image with automatic format fallback.
 * Tries the primary src (PNG) first; on 404 swaps to .webp once.
 * Optional skeleton (shimmer) while loading.
 */
// eslint-disable-next-line @next/next/no-img-element
export function CardImg({ src, alt, className, style, skeleton = true }: CardImgProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  useEffect(() => {
    setLoaded(false);
  }, [imgSrc]);

  const markLoadedIfComplete = useCallback(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalHeight > 0) setLoaded(true);
  }, []);

  useLayoutEffect(() => {
    markLoadedIfComplete();
  }, [imgSrc, markLoadedIfComplete]);

  const handleError = () => {
    if (!imgSrc.endsWith(".webp")) {
      setImgSrc(imgSrc.replace(/\.[^.]+$/, ".webp"));
    } else {
      setLoaded(true);
    }
  };

  const flexW = getFlexSlotWidthToken(className, style);
  const fill = shouldFillParent(className, style);

  let wrapperClass: string;
  let imgBaseClass: string;

  if (flexW) {
    wrapperClass = `relative ${flexW} h-full min-h-0 shrink-0 overflow-hidden`;
    imgBaseClass = `${stripFlexSlotSizing(className ?? "", flexW)} absolute inset-0 h-full w-full`;
  } else if (fill) {
    wrapperClass = "absolute inset-0 h-full w-full min-h-0 overflow-hidden";
    imgBaseClass = className ?? "";
  } else {
    wrapperClass = "relative block w-full min-h-[10rem]";
    imgBaseClass = className ?? "";
  }

  const imgClass = [
    imgBaseClass,
    "transition-opacity duration-300 ease-out",
    // Enquanto carrega: imagem abaixo do skeleton (evita “buraco” escuro se o empilhamento falhar).
    loaded ? "z-[2] opacity-100" : "z-[1] opacity-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={wrapperClass}>
      {skeleton && !loaded && (
        <span
          className="animate-card-img-skeleton absolute inset-0 z-[2] overflow-hidden rounded-[inherit]"
          aria-hidden
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imgSrc}
        alt={alt}
        className={imgClass}
        style={style}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        decoding="async"
      />
    </span>
  );
}
