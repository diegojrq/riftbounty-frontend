/**
 * Locale for i18n: sync getter/setter used by apiClient (Accept-Language)
 * and by LocaleProvider. Persisted in localStorage in the browser.
 */

export type Locale = "pt-BR" | "en";

const STORAGE_KEY = "riftbounty-locale";

let currentLocale: Locale = "pt-BR";

function isLocale(value: string): value is Locale {
  return value === "pt-BR" || value === "en";
}

function readStored(): Locale {
  if (typeof window === "undefined") return "pt-BR";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLocale(stored)) return stored;
  } catch {
    // ignore
  }
  return "pt-BR";
}

/** Returns current locale; on server always pt-BR. Used by apiClient for Accept-Language. */
export function getLocale(): Locale {
  if (typeof window !== "undefined") {
    return currentLocale;
  }
  return "pt-BR";
}

/** Sets locale and persists to localStorage. Call from LocaleProvider on init and on user change. */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore
    }
  }
}

/** Call once on app init (client) to hydrate from localStorage. */
export function initLocaleFromStorage(): Locale {
  const stored = readStored();
  currentLocale = stored;
  return stored;
}
