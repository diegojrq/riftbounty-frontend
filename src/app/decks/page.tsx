"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { createDeck, getDeck, getDecks, importDeck } from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { getCardImageUrl } from "@/lib/cards";
import { CardImg } from "@/components/cards/CardImg";
import type { Deck } from "@/types/deck";
import { bannedCardNamesInDeck } from "@/lib/deck-banned";
import { rawDeckValidationErrors, rawDeckValidationWarnings } from "@/lib/deck-validation";
import { getCardDisplayName } from "@/lib/card-display-name";

function DecksSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          {/* Image strip */}
          <div className="flex h-28 bg-gray-900">
            <div className="h-full w-1/2 animate-pulse bg-gray-700/60" />
            <div className="h-full w-1/2 animate-pulse bg-gray-700/40" />
          </div>
          {/* Info */}
          <div className="px-4 py-3 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-700" />
            <div className="flex gap-3">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-700/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-700/60" />
              <div className="h-3 w-16 animate-pulse rounded bg-gray-700/60" />
            </div>
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-700/40" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DecksPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importList, setImportList] = useState("");
  const [importName, setImportName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  /** Detalhes do último erro de import (cartas em falta, etc.) */
  const [importErrorDetail, setImportErrorDetail] = useState<string | null>(null);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    setImportErrorDetail(null);
    try {
      const list = await getDecks();
      // Um único setState após validação — evita piscar a tag válido/construindo entre lista e GET com validate
      const validated = await Promise.all(
        list.map((d) => getDeck(d.id, true).catch(() => d))
      );
      setDecks(validated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("decks.errorLoadingDeck");
      setError(msg);
      toast.error(msg);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    fetchDecks();
  }, [authLoading, user, router, fetchDecks]);

  useEffect(() => {
    if (!importModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !importing) setImportModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [importModalOpen, importing]);

  async function handleCreateDeck() {
    if (!user) return;
    setCreating(true);
    setError(null);
    setImportErrorDetail(null);
    try {
      const deck = await createDeck();
      toast.success(t("decks.deckCreated"));
      router.push(`/decks/${deck.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("decks.errorCreatingDeck");
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleImportDeck() {
    if (!user) return;
    const list = importList;
    if (!list.trim()) {
      toast.error(t("decks.importListEmpty"));
      return;
    }
    setImporting(true);
    setError(null);
    setImportErrorDetail(null);
    try {
      const trimmedName = importName.trim();
      const deck = await importDeck({
        list,
        ...(trimmedName ? { name: trimmedName.slice(0, 120) } : {}),
      });
      toast.success(t("decks.importSuccess"));
      setImportList("");
      setImportName("");
      router.push(`/decks/${deck.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("decks.errorImportingDeck");
      setError(msg);
      toast.error(msg);
      if (err instanceof ApiClientError) {
        const detailParts: string[] = [];
        if (err.code) {
          detailParts.push(`${t("decks.importErrorCodeLabel")} ${err.code}`);
        }
        const missing = err.errorData?.missingCardNames;
        if (Array.isArray(missing) && missing.length > 0) {
          const names = missing.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
          if (names.length > 0) {
            detailParts.push(`${t("decks.missingCardNamesLabel")} ${names.join(", ")}`);
          }
        }
        if (err.fieldErrors?.length) {
          detailParts.push(...err.fieldErrors.map((fe) => fe.message).filter(Boolean));
        }
        if (detailParts.length > 0) setImportErrorDetail(detailParts.join("\n"));
      }
    } finally {
      setImporting(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
          <div className="mb-6 h-8 w-32 animate-pulse rounded bg-gray-700" />
          <div className="mb-6 h-9 w-28 animate-pulse rounded bg-gray-700" />
          <DecksSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <header className="mb-6 border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-white">{t("decks.myDecks")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{t("decks.subtitle")}</p>
        </header>

        {error && (
          <div className="mb-4 rounded bg-red-900/50 p-3 text-sm text-red-200">
            <p>{error}</p>
            {importErrorDetail && (
              <p className="mt-2 whitespace-pre-wrap border-t border-red-800/60 pt-2 text-red-100/90">{importErrorDetail}</p>
            )}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCreateDeck}
            disabled={creating}
            className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {creating ? t("decks.creating") : t("decks.newDeck")}
          </button>
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            disabled={importing}
            className="rounded bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {t("decks.importFromList")}
          </button>
        </div>

        {importModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deck-import-modal-title"
          >
            <button
              type="button"
              aria-label={t("decks.importClose")}
              disabled={importing}
              onClick={() => setImportModalOpen(false)}
              className="absolute inset-0 bg-black/70 disabled:cursor-not-allowed"
            />
            <div className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-600 bg-gray-800 shadow-xl">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-700 px-4 py-3">
                <h2 id="deck-import-modal-title" className="text-lg font-semibold text-white">
                  {t("decks.importFromList")}
                </h2>
                <button
                  type="button"
                  onClick={() => !importing && setImportModalOpen(false)}
                  disabled={importing}
                  className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t("decks.importClose")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
                <label htmlFor="deck-import-list-modal" className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("decks.importListLabel")}
                </label>
                <textarea
                  id="deck-import-list-modal"
                  rows={12}
                  value={importList}
                  onChange={(e) => setImportList(e.target.value)}
                  placeholder={t("decks.importListPlaceholder")}
                  disabled={importing}
                  className="min-h-[200px] w-full flex-1 resize-y rounded border border-gray-600 bg-gray-900 px-3 py-2 font-mono text-sm text-white placeholder:text-gray-600 disabled:opacity-50"
                />
                <label htmlFor="deck-import-name-modal" className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("decks.importNameOptional")}
                </label>
                <input
                  id="deck-import-name-modal"
                  type="text"
                  maxLength={120}
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  disabled={importing}
                  className="w-full max-w-md rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                />
                <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-gray-700 pt-4">
                  <button
                    type="button"
                    onClick={() => !importing && setImportModalOpen(false)}
                    disabled={importing}
                    className="rounded border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                  >
                    {t("decks.importCancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleImportDeck}
                    disabled={importing}
                    className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {importing ? t("decks.importing") : t("decks.importSubmit")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <DecksSkeleton />
        ) : decks.length === 0 ? (
          <p className="text-gray-400">
            {t("decks.noDecksYet")}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {decks.map((deck) => {
              const legend = deck.legendCard ?? deck.legend;
              const champion = deck.championCard ?? deck.champion;
              const mainCount = deck.mainItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              const runeCount = deck.runeItems?.reduce((s, i) => s + i.quantity, 0) ?? 0;
              const bfCount = deck.battlefields?.filter((b) => b.card ?? b.cardId).length ?? 0;
              const domains = legend?.cardDomains ?? [];
              const noValidationIssues =
                rawDeckValidationErrors(deck.validation).length === 0 &&
                rawDeckValidationWarnings(deck.validation).length === 0;
              const structurallyComplete =
                mainCount === 39 &&
                runeCount === 12 &&
                (deck.battlefields?.length ?? 0) === 3 &&
                deck.battlefields?.every((b) => b.card ?? b.cardId) &&
                !!legend &&
                !!champion;
              const isValid =
                bannedCardNamesInDeck(deck).length === 0 &&
                noValidationIssues &&
                (deck.validation?.valid === true || structurallyComplete);

              return (
                <li key={deck.id}>
                  <Link
                    href={isValid ? `/decks/${deck.id}/view` : `/decks/${deck.id}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 transition hover:border-gray-600 hover:bg-gray-750 hover:shadow-xl"
                  >
                    {/* Card images strip — isolate + z-index para a tag ficar acima do gradiente e das imagens */}
                    <div className="relative isolate z-0 flex h-28 bg-gray-900">
                      {legend && getCardImageUrl(legend) ? (
                        <CardImg
                          src={getCardImageUrl(legend)!}
                          alt={getCardDisplayName(legend)}
                          className="relative z-0 h-full w-1/2 object-cover object-top"
                        />
                      ) : (
                        <div className="relative z-0 flex h-full w-1/2 items-center justify-center bg-gray-800">
                          <span className="px-2 text-center text-xs text-gray-500">{legend ? getCardDisplayName(legend) : t("decks.noLegend")}</span>
                        </div>
                      )}
                      {champion && getCardImageUrl(champion) ? (
                        <CardImg
                          src={getCardImageUrl(champion)!}
                          alt={champion.name}
                          className="relative z-0 h-full w-1/2 object-cover object-top"
                        />
                      ) : (
                        <div className="relative z-0 flex h-full w-1/2 items-center justify-center border-l border-gray-700 bg-gray-800">
                          <span className="px-2 text-center text-xs text-gray-500">{champion?.name ?? t("decks.noChampion")}</span>
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-gray-800 via-gray-800/10 to-transparent" />
                      {/* Validation badge */}
                      <div className="absolute right-2 top-2 z-20">
                        {isValid ? (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-700 bg-emerald-900/80 px-2 py-0.5 text-xs font-medium text-emerald-400 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            {t("decks.valid")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full border border-gray-600 bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-gray-400 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                            {t("decks.building")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3">
                      <p className="truncate font-semibold text-white">{deck.name || t("decks.unnamedDeck")}</p>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className={mainCount === 39 ? "text-emerald-500" : ""}>{mainCount}/39 {t("decks.mainLabel")}</span>
                        <span className={runeCount === 12 ? "text-emerald-500" : ""}>{runeCount}/12 {t("decks.runesLabel")}</span>
                        <span className={bfCount === 3 ? "text-emerald-500" : ""}>{bfCount}/3 {t("decks.battlefieldsLabel")}</span>
                      </div>
                      {(legend || champion) && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          {legend && <span className="truncate">{getCardDisplayName(legend)}</span>}
                          {legend && champion && <span>·</span>}
                          {champion && <span className="truncate">{champion.name}</span>}
                        </div>
                      )}
                      {domains.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {domains.map((cd) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={cd.domain.name}
                              src={`/images/domains/${cd.domain.name.toLowerCase()}.webp`}
                              alt={cd.domain.name}
                              title={cd.domain.name}
                              className="h-5 w-5 rounded-full border border-gray-600 bg-gray-900 object-contain p-0.5"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
