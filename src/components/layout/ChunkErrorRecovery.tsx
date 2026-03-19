"use client";

import { useEffect } from "react";

const RELOAD_GUARD_KEY = "rb_chunk_reload_once";

function shouldRecoverFromChunkError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "";
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("chunkloaderror") ||
    lower.includes("loading chunk") ||
    lower.includes("failed to fetch dynamically imported module")
  );
}

function recoverOnceFromChunkError() {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(RELOAD_GUARD_KEY) === "1") return;
  window.sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  window.location.reload();
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (shouldRecoverFromChunkError(event.error ?? event.message)) {
        recoverOnceFromChunkError();
      }
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (shouldRecoverFromChunkError(event.reason)) {
        recoverOnceFromChunkError();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
