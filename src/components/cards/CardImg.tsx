"use client";

import { useState } from "react";

interface CardImgProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Card image with automatic format fallback.
 * Tries the primary src (PNG) first; on 404 swaps to .webp once.
 */
// eslint-disable-next-line @next/next/no-img-element
export function CardImg({ src, alt, className, style }: CardImgProps) {
  const [imgSrc, setImgSrc] = useState(src);

  function handleError() {
    if (!imgSrc.endsWith(".webp")) {
      setImgSrc(imgSrc.replace(/\.[^.]+$/, ".webp"));
    }
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
    />
  );
}
