"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { CardImg } from "@/components/cards/CardImg";
import { CardDescription } from "@/components/cards/CardDescription";
import { getCardImageUrl } from "@/lib/cards";
import {
  listAdminCards,
  getAdminCard,
  createAdminCard,
  updateAdminCard,
  runAdminTcgSync,
  bumpAdminCatalogVersion,
  loadAdminCatalogVersion,
  postBackfillCardImageUrls,
  postSyncR2CardImages,
  postAuditR2ImageKeys,
  type AdminTcgSyncSummary,
  type AdminCatalogVersionLoadResponse,
  type AdminBackfillImageUrlsResponse,
  type AdminR2CliResponse,
  type SyncR2CardImagesDto,
  type CreateCardDto,
  type UpdateCardDto,
} from "@/lib/admin";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import { useCards } from "@/lib/cards-context";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";

const LIMIT = 20;

export default function AdminCardsPage() {
  const { t } = useLocale();
  const { invalidate: invalidateCardsCache } = useCards();
  const { sets: catalogSets } = useRiotCatalogSets();
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRunning, setSyncRunning] = useState(false);
  const [catalogBumpRunning, setCatalogBumpRunning] = useState(false);
  const [catalogLoadRunning, setCatalogLoadRunning] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillKind, setBackfillKind] = useState<null | "dry" | "apply">(null);
  const [backfillAll, setBackfillAll] = useState(false);
  const [backfillResult, setBackfillResult] = useState<AdminBackfillImageUrlsResponse | null>(null);
  const [r2SyncSetId, setR2SyncSetId] = useState("");
  const [r2SyncPrefix, setR2SyncPrefix] = useState("cards");
  const [r2SyncAuditKeysOnly, setR2SyncAuditKeysOnly] = useState(false);
  const [r2SyncRunning, setR2SyncRunning] = useState(false);
  const [r2SyncResult, setR2SyncResult] = useState<AdminR2CliResponse | null>(null);
  const [r2AuditPrefix, setR2AuditPrefix] = useState("cards");
  const [r2AuditRunning, setR2AuditRunning] = useState(false);
  const [r2AuditResult, setR2AuditResult] = useState<AdminR2CliResponse | null>(null);
  const [lastCatalogVersion, setLastCatalogVersion] = useState<string | number | null>(null);
  const [catalogLoadResult, setCatalogLoadResult] = useState<AdminCatalogVersionLoadResponse | null>(null);
  const [syncSummary, setSyncSummary] = useState<AdminTcgSyncSummary | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [setFilter, setSetFilter] = useState<string>("");
  const [offset, setOffset] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formScraperId, setFormScraperId] = useState("");
  const [formName, setFormName] = useState("");
  const [formSet, setFormSet] = useState("");
  const [formRarity, setFormRarity] = useState("");
  const [formType, setFormType] = useState("");
  const [formCollectorNumber, setFormCollectorNumber] = useState("");
  const [saving, setSaving] = useState(false);


  const [viewId, setViewId] = useState<string | null>(null);
  const [viewCard, setViewCard] = useState<Card | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editPreviewCard, setEditPreviewCard] = useState<Card | null>(null);

  const actionBase =
    "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-0";
  const viewBtn =
    `${actionBase} border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:text-blue-100 focus:ring-blue-500/40`;
  const editBtn =
    `${actionBase} border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100 focus:ring-amber-500/40`;

  const formatGroupErrors = (errors: unknown[]): string => {
    return errors
      .map((entry) => {
        if (typeof entry === "string") return entry;
        try {
          return JSON.stringify(entry);
        } catch {
          return String(entry);
        }
      })
      .join(", ");
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminCards({
        limit: LIMIT,
        offset,
        ...(nameFilter.trim() ? { name: nameFilter.trim() } : {}),
        ...(setFilter ? { set: setFilter } : {}),
      });
      setCards(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setLoading(false);
    }
  }, [offset, nameFilter, setFilter, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);


  const openCreate = () => {
    setEditingId(null);
    setEditPreviewCard(null);
    setFormScraperId("");
    setFormName("");
    setFormSet("");
    setFormRarity("");
    setFormType("");
    setFormCollectorNumber("");
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setModalOpen(true);
    setSaving(true);
    try {
      const card = await getAdminCard(id);
      setEditPreviewCard(card);
      setFormScraperId(card.scraperId ?? card.scraper_id ?? "");
      setFormName(card.name ?? "");
      setFormSet(card.set ?? card.cardSet ?? "");
      setFormRarity(card.rarity ?? "");
      setFormType(card.type ?? "");
      setFormCollectorNumber(card.collectorNumber ?? card.collector_number ?? "");

    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openView = async (id: string) => {
    setViewId(id);
    setViewCard(null);
    setViewLoading(true);
    try {
      const card = await getAdminCard(id);
      setViewCard(card);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setViewId(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formScraperId.trim()) {
      toast.error(t("admin.scraperId") + " is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const body: UpdateCardDto = {
          name: formName.trim() || undefined,
          set: formSet || undefined,
          cardSet: formSet || undefined,
          rarity: formRarity || undefined,
          type: formType || undefined,
          collectorNumber: formCollectorNumber.trim() || undefined,
        };
        const updated = await updateAdminCard(editingId, body);
        setEditPreviewCard(updated);
        toast.success(t("admin.updated"));
      } else {
        const body: CreateCardDto = {
          scraperId: formScraperId.trim(),
          name: formName.trim() || undefined,
          set: formSet || undefined,
          cardSet: formSet || undefined,
          rarity: formRarity || undefined,
          type: formType || undefined,
          collectorNumber: formCollectorNumber.trim() || undefined,
        };
        const created = await createAdminCard(body);
        setEditPreviewCard(created);
        toast.success(t("admin.created"));
      }
      setModalOpen(false);
      fetchList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTcgSync = async () => {
    if (syncRunning) return;
    setSyncRunning(true);
    try {
      const result = await runAdminTcgSync();
      setSyncSummary(result);
      toast.success(t("admin.tcgSyncSuccess"));
      fetchList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already running")) {
        toast.error(t("admin.tcgSyncAlreadyRunning"));
      } else if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      } else {
        toast.error(t("admin.tcgSyncError"));
      }
    } finally {
      setSyncRunning(false);
    }
  };

  const handleCatalogVersionBump = async () => {
    if (catalogBumpRunning) return;
    setCatalogBumpRunning(true);
    try {
      const result = await bumpAdminCatalogVersion();
      setLastCatalogVersion(result.version);
      toast.success(t("admin.catalogVersionBumpSuccess", { version: String(result.version) }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      } else {
        toast.error(t("admin.catalogVersionBumpError"));
      }
    } finally {
      setCatalogBumpRunning(false);
    }
  };

  const handleCatalogVersionLoad = async () => {
    if (catalogLoadRunning) return;
    setCatalogLoadRunning(true);
    try {
      const result = await loadAdminCatalogVersion();
      setCatalogLoadResult(result);

      const added = result.metrics?.added;
      const skippedExisting = result.metrics?.skippedExisting;
      const loaded = result.metrics?.loaded;

      if (added != null || skippedExisting != null) {
        toast.success(
          t("admin.catalogVersionLoadSuccessWithMetrics", {
            added: String(added ?? 0),
            skippedExisting: String(skippedExisting ?? 0),
            loaded: String(loaded ?? 0),
          })
        );
      } else {
        toast.success(t("admin.catalogVersionLoadSuccess"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      } else {
        toast.error(t("admin.catalogVersionLoadError"));
      }
    } finally {
      setCatalogLoadRunning(false);
    }
  };

  const runBackfillImageUrls = async (dryRun: boolean) => {
    if (backfillRunning) return;
    if (!dryRun && !confirm(t("admin.backfillImageUrlsApplyConfirm"))) return;
    setBackfillRunning(true);
    setBackfillKind(dryRun ? "dry" : "apply");
    try {
      const result = await postBackfillCardImageUrls({ dryRun, all: backfillAll });
      setBackfillResult(result);
      if (dryRun) {
        toast.success(t("admin.backfillImageUrlsDryRunSuccess"));
      } else {
        invalidateCardsCache();
        toast.success(t("admin.backfillImageUrlsApplySuccess"));
      }
      void fetchList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("admin.backfillImageUrlsError"));
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setBackfillRunning(false);
      setBackfillKind(null);
    }
  };

  const r2Busy = r2SyncRunning || r2AuditRunning;

  const runR2Sync = async () => {
    if (r2Busy) return;
    setR2SyncRunning(true);
    try {
      const body: SyncR2CardImagesDto = {
        prefix: r2SyncPrefix.trim() || "cards",
        ...(r2SyncSetId.trim() ? { setId: r2SyncSetId.trim() } : {}),
        ...(r2SyncAuditKeysOnly ? { auditKeysOnly: true } : {}),
      };
      const result = await postSyncR2CardImages(body);
      setR2SyncResult(result);
      toast.success(t("admin.r2SyncSuccess"));
      if (!r2SyncAuditKeysOnly) {
        invalidateCardsCache();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("admin.r2SyncError"));
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setR2SyncRunning(false);
    }
  };

  const runR2Audit = async () => {
    if (r2Busy) return;
    setR2AuditRunning(true);
    try {
      const result = await postAuditR2ImageKeys({
        prefix: r2AuditPrefix.trim() || "cards",
      });
      setR2AuditResult(result);
      toast.success(t("admin.r2AuditSuccess"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("admin.r2AuditError"));
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setR2AuditRunning(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder={t("admin.searchPlaceholder")}
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={setFilter}
          onChange={(e) => setSetFilter(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">{t("admin.set")} (all)</option>
          {catalogSets.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleTcgSync}
          disabled={syncRunning}
          className="inline-flex items-center gap-2 rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 hover:text-blue-100 disabled:opacity-60"
        >
          {syncRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
          )}
          {syncRunning ? t("admin.tcgSyncRunning") : t("admin.tcgSyncButton")}
        </button>
        <button
          type="button"
          onClick={handleCatalogVersionBump}
          disabled={catalogBumpRunning}
          className="inline-flex items-center gap-2 rounded border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:text-violet-100 disabled:opacity-60"
        >
          {catalogBumpRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
          )}
          {catalogBumpRunning ? t("admin.catalogVersionBumpRunning") : t("admin.catalogVersionBumpButton")}
        </button>
        <button
          type="button"
          onClick={handleCatalogVersionLoad}
          disabled={catalogLoadRunning}
          className="inline-flex items-center gap-2 rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 hover:text-fuchsia-100 disabled:opacity-60"
        >
          {catalogLoadRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-fuchsia-300 border-t-transparent" />
          )}
          {catalogLoadRunning ? t("admin.catalogVersionLoadRunning") : t("admin.catalogVersionLoadButton")}
        </button>
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          {t("admin.newCard")}
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-teal-800/70 bg-teal-950/25 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-sm font-semibold text-teal-200">{t("admin.backfillImageUrlsTitle")}</span>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-teal-100/95">
          <input
            type="checkbox"
            checked={backfillAll}
            onChange={(e) => setBackfillAll(e.target.checked)}
            className="rounded border-teal-600 bg-gray-900 text-teal-500 focus:ring-teal-500"
          />
          {t("admin.backfillImageUrlsAllLabel")}
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runBackfillImageUrls(true)}
            disabled={backfillRunning}
            className="inline-flex items-center gap-2 rounded border border-teal-500/50 bg-teal-900/40 px-3 py-1.5 text-sm font-semibold text-teal-100 transition hover:bg-teal-800/50 disabled:opacity-60"
          >
            {backfillRunning && backfillKind === "dry" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" />
            )}
            {backfillRunning && backfillKind === "dry"
              ? t("admin.backfillImageUrlsRunning")
              : t("admin.backfillImageUrlsDryRun")}
          </button>
          <button
            type="button"
            onClick={() => void runBackfillImageUrls(false)}
            disabled={backfillRunning}
            className="inline-flex items-center gap-2 rounded border border-orange-500/40 bg-orange-950/40 px-3 py-1.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-900/50 disabled:opacity-60"
          >
            {backfillRunning && backfillKind === "apply" && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
            )}
            {backfillRunning && backfillKind === "apply"
              ? t("admin.backfillImageUrlsRunning")
              : t("admin.backfillImageUrlsApply")}
          </button>
        </div>
      </div>

      {backfillResult && (
        <div className="mb-4 rounded-lg border border-teal-900/60 bg-teal-950/30 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-300">
            {t("admin.backfillImageUrlsResultTitle")}
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-teal-100/90">
            {JSON.stringify(backfillResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-sky-800/70 bg-sky-950/20 px-4 py-3">
        <span className="text-sm font-semibold text-sky-200">{t("admin.r2SyncTitle")}</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[140px] flex-col gap-1 text-xs text-sky-100/90">
            <span>{t("admin.r2SyncSetId")}</span>
            <input
              type="text"
              value={r2SyncSetId}
              onChange={(e) => setR2SyncSetId(e.target.value)}
              placeholder="UNL"
              disabled={r2Busy}
              className="rounded border border-sky-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
            />
          </label>
          <label className="flex min-w-[120px] flex-col gap-1 text-xs text-sky-100/90">
            <span>{t("admin.r2SyncPrefix")}</span>
            <input
              type="text"
              value={r2SyncPrefix}
              onChange={(e) => setR2SyncPrefix(e.target.value)}
              disabled={r2Busy}
              className="rounded border border-sky-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-60"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-sky-100/95">
            <input
              type="checkbox"
              checked={r2SyncAuditKeysOnly}
              onChange={(e) => setR2SyncAuditKeysOnly(e.target.checked)}
              disabled={r2Busy}
              className="rounded border-sky-600 bg-gray-900 text-sky-500 focus:ring-sky-500 disabled:opacity-60"
            />
            {t("admin.r2SyncAuditKeysOnly")}
          </label>
          <button
            type="button"
            onClick={() => void runR2Sync()}
            disabled={r2Busy}
            className="inline-flex items-center gap-2 rounded border border-sky-500/50 bg-sky-900/40 px-3 py-1.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-800/50 disabled:opacity-60"
          >
            {r2SyncRunning && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
            )}
            {r2SyncRunning ? t("admin.r2SyncRunning") : t("admin.r2SyncRun")}
          </button>
        </div>
      </div>

      {r2SyncResult && (
        <div className="mb-4 rounded-lg border border-sky-900/60 bg-sky-950/30 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-300">
            {t("admin.r2SyncResultTitle")}
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-sky-100/90">
            {JSON.stringify(r2SyncResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded-lg border border-indigo-800/70 bg-indigo-950/20 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end">
        <span className="text-sm font-semibold text-indigo-200">{t("admin.r2AuditTitle")}</span>
        <label className="flex min-w-[120px] flex-col gap-1 text-xs text-indigo-100/90">
          <span>{t("admin.r2AuditPrefix")}</span>
          <input
            type="text"
            value={r2AuditPrefix}
            onChange={(e) => setR2AuditPrefix(e.target.value)}
            disabled={r2Busy}
            className="rounded border border-indigo-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          />
        </label>
        <button
          type="button"
          onClick={() => void runR2Audit()}
          disabled={r2Busy}
          className="inline-flex items-center gap-2 rounded border border-indigo-500/50 bg-indigo-900/40 px-3 py-1.5 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-800/50 disabled:opacity-60"
        >
          {r2AuditRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
          )}
          {r2AuditRunning ? t("admin.r2AuditRunning") : t("admin.r2AuditRun")}
        </button>
      </div>

      {r2AuditResult && (
        <div className="mb-4 rounded-lg border border-indigo-900/60 bg-indigo-950/30 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
            {t("admin.r2AuditResultTitle")}
          </p>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-indigo-100/90">
            {JSON.stringify(r2AuditResult, null, 2)}
          </pre>
        </div>
      )}

      {syncSummary && (
        <div className="mb-4 rounded-lg border border-blue-900/60 bg-blue-950/30 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-300">
            {t("admin.tcgSyncSummaryTitle")}
          </p>
          <div className="grid grid-cols-1 gap-2 text-blue-100 md:grid-cols-2">
            <p>{t("admin.tcgSyncStartedAt")}: {new Date(syncSummary.startedAt).toLocaleString()}</p>
            <p>{t("admin.tcgSyncFinishedAt")}: {new Date(syncSummary.finishedAt).toLocaleString()}</p>
            <p>{t("admin.tcgSyncMatched")}: {syncSummary.matched}</p>
            <p>{t("admin.tcgSyncNoMatch")}: {syncSummary.noMatch}</p>
            <p>{t("admin.tcgSyncPricesUpdated")}: {syncSummary.pricesUpdated}</p>
            <p>{t("admin.tcgSyncPricesSkipped")}: {syncSummary.pricesSkipped}</p>
            <p>{t("admin.tcgSyncRemainingWithoutProductId")}: {syncSummary.remainingWithoutProductId}</p>
            <p>
              {t("admin.tcgSyncGroupErrors")}:{" "}
              {syncSummary.groupErrors.length > 0
                ? formatGroupErrors(syncSummary.groupErrors as unknown[])
                : t("admin.tcgSyncNoGroupErrors")}
            </p>
          </div>
        </div>
      )}

      {lastCatalogVersion !== null && (
        <div className="mb-4 rounded-lg border border-violet-900/60 bg-violet-950/30 px-4 py-3 text-sm text-violet-100">
          {t("admin.catalogVersionCurrent", { version: String(lastCatalogVersion) })}
        </div>
      )}

      {catalogLoadResult?.metrics && (
        <div className="mb-4 rounded-lg border border-fuchsia-900/60 bg-fuchsia-950/30 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fuchsia-300">
            {t("admin.catalogVersionLoadSummaryTitle")}
          </p>
          <div className="grid grid-cols-1 gap-2 text-fuchsia-100 md:grid-cols-2">
            <p>{t("admin.catalogVersionLoadMode")}: {catalogLoadResult.metrics.mode}</p>
            <p>{t("admin.catalogVersionLoadVersion")}: {String(catalogLoadResult.version ?? "—")}</p>
            <p>{t("admin.catalogVersionLoadAdded")}: {catalogLoadResult.metrics.added ?? 0}</p>
            <p>{t("admin.catalogVersionLoadSkippedExisting")}: {catalogLoadResult.metrics.skippedExisting ?? 0}</p>
            <p>{t("admin.catalogVersionLoadLoaded")}: {catalogLoadResult.metrics.loaded}</p>
            <p>{t("admin.catalogVersionLoadTotalInJson")}: {catalogLoadResult.metrics.totalInJson}</p>
            <p>{t("admin.catalogVersionLoadExistingBefore")}: {catalogLoadResult.metrics.existingBefore}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">{t("common.loading")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.name")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.set")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.rarity")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.type")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.collectorNumber")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {cards.map((card) => (
                <tr key={getCardId(card)} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-white">
                    <CardHoverPreview card={card}>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openView(getCardId(card))}
                          className="truncate text-left font-medium text-gray-100 hover:text-white hover:underline"
                          title={t("admin.viewCard")}
                        >
                          {card.name}
                        </button>
                      </span>
                    </CardHoverPreview>
                  </td>
                  <td className="px-4 py-2 text-gray-400">{card.set ?? card.cardSet ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{card.rarity ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{card.type ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{card.collectorNumber ?? card.collector_number ?? "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => openView(getCardId(card))}
                      className={`mr-2 ${viewBtn}`}
                    >
                      {t("admin.viewCard")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(getCardId(card))}
                      className={editBtn}
                    >
                      {t("admin.editCard")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalCount > LIMIT && (
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            {offset + 1}–{Math.min(offset + LIMIT, totalCount)} of {totalCount}
          </span>
          <button
            type="button"
            disabled={offset + LIMIT >= totalCount}
            onClick={() => setOffset((o) => o + LIMIT)}
            className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {editingId ? t("admin.editCard") : t("admin.newCard")}
                </p>
                <p className="truncate text-lg font-semibold text-white">
                  {formName?.trim() || editPreviewCard?.name || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {t("admin.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !formScraperId.trim()}
                  className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 hover:text-amber-100 disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("admin.save")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[360px_1fr]">
              <div className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
                {saving && editingId && !editPreviewCard ? (
                  <div className="h-[520px] animate-pulse rounded bg-gray-800/60" />
                ) : (
                  <CardImg
                    src={getCardImageUrl(editPreviewCard ?? ({ name: formName || "—" } as unknown as Card)) ?? "/images/card-back.webp"}
                    alt={formName || editPreviewCard?.name || "Card"}
                    className="w-full rounded object-contain"
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.scraperId")} *</label>
                    <input
                      type="text"
                      value={formScraperId}
                      onChange={(e) => setFormScraperId(e.target.value)}
                      disabled={!!editingId}
                      className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.name")}</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.set")}</label>
                      <select
                        value={formSet}
                        onChange={(e) => setFormSet(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      >
                        <option value="">—</option>
                        {catalogSets.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.rarity")}</label>
                      <input
                        type="text"
                        value={formRarity}
                        onChange={(e) => setFormRarity(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.type")}</label>
                      <input
                        type="text"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.collectorNumber")}</label>
                      <input
                        type="text"
                        value={formCollectorNumber}
                        onChange={(e) => setFormCollectorNumber(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View (read-only) modal */}
      {viewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("admin.viewCard")}</p>
                <p className="truncate text-lg font-semibold text-white">{viewCard?.name ?? "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => { setViewId(null); setViewCard(null); }}
                className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                {t("admin.close")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[360px_1fr]">
              <div className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
                {viewLoading ? (
                  <div className="h-[520px] animate-pulse rounded bg-gray-800/60" />
                ) : viewCard ? (
                  <CardImg
                    src={getCardImageUrl(viewCard) ?? "/images/card-back.webp"}
                    alt={viewCard.name ?? "Card"}
                    className="w-full rounded object-contain"
                  />
                ) : (
                  <div className="h-[520px] rounded bg-gray-800/40" />
                )}
              </div>

              <div className="min-w-0">
                {viewLoading ? (
                  <p className="text-sm text-gray-500">{t("common.loading")}</p>
                ) : !viewCard ? (
                  <p className="text-sm text-gray-500">—</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.set")}</p>
                        <p className="text-gray-200">{viewCard.set ?? viewCard.cardSet ?? "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.rarity")}</p>
                        <p className="text-gray-200">{viewCard.rarity ?? "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.type")}</p>
                        <p className="text-gray-200">{viewCard.type ?? "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.collectorNumber")}</p>
                        <p className="text-gray-200">{viewCard.collectorNumber ?? viewCard.collector_number ?? "—"}</p>
                      </div>
                    </div>

                    {"description" in viewCard && (viewCard as { description?: string }).description && (
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Text</p>
                        <CardDescription
                          text={(viewCard as { description: string }).description}
                          className="text-sm text-gray-200"
                          domain={(viewCard.domain ?? (viewCard.domains?.[0] ?? undefined)) as string | undefined}
                        />
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
