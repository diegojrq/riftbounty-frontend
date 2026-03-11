"use client";

import { useEffect } from "react";
import { useLocale } from "@/lib/locale-context";

/** Sincroniza document.documentElement.lang com o locale do contexto (pt-BR ou en). */
export function LangSync() {
  const { locale } = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale === "pt-BR" ? "pt-BR" : "en";
  }, [locale]);
  return null;
}
