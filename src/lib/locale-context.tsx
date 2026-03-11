"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "./locale";
import { initLocaleFromStorage, setLocale as setLocaleStorage } from "./locale";

import messagesPtBR from "@/locales/pt-BR.json";
import messagesEn from "@/locales/en.json";

const messages: Record<Locale, Record<string, unknown>> = {
  "pt-BR": messagesPtBR as Record<string, unknown>,
  en: messagesEn as Record<string, unknown>,
};

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-BR");

  useEffect(() => {
    const stored = initLocaleFromStorage();
    setLocaleState(stored);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleStorage(next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let text = getNested(messages[locale] as Record<string, unknown>, key);
      if (text === undefined) {
        const fallbackLocale = locale === "pt-BR" ? "en" : "pt-BR";
        text = getNested(messages[fallbackLocale] as Record<string, unknown>, key);
      }
      if (text === undefined) return key;
      return params ? interpolate(text, params) : text;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
