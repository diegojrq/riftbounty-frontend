"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiClientError } from "@/lib/api";
import { createDeck, getDeck, getDecks, importDeck } from "@/lib/decks";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import type { Deck } from "@/types/deck";
import { bannedCardNamesInDeck } from "@/lib/deck-banned";
import { rawDeckValidationErrors, rawDeckValidationWarnings } from "@/lib/deck-validation";
import { DeckGridSkeleton, DeckSummaryCard } from "@/components/decks/deck-summary-card";

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
          <DeckGridSkeleton />
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
          <DeckGridSkeleton />
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
                  <DeckSummaryCard
                    href={isValid ? `/decks/${deck.id}/view` : `/decks/${deck.id}`}
                    legend={legend}
                    champion={champion}
                    name={deck.name || t("decks.unnamedDeck")}
                    mainCount={mainCount}
                    runeCount={runeCount}
                    bfCount={bfCount}
                    isValid={isValid}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
