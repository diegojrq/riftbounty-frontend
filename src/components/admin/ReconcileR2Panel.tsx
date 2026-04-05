"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { useCards } from "@/lib/cards-context";
import {
  postReconcileR2CardImages,
  type ReconcileR2CardImagesDto,
  type ReconcileR2CardImagesData,
} from "@/lib/admin";

function reconcileMetric(data: ReconcileR2CardImagesData | null, key: string): string {
  if (!data) return "—";
  const v = data[key];
  if (v === undefined || v === null) return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

export function ReconcileR2Panel() {
  const { t } = useLocale();
  const { invalidate: invalidateCardsCache } = useCards();
  const [reconcileOp, setReconcileOp] = useState<null | "preview" | "apply">(null);
  const [reconcileSetId, setReconcileSetId] = useState("");
  const [reconcileMaxCards, setReconcileMaxCards] = useState("");
  const [reconcileNoSkipExisting, setReconcileNoSkipExisting] = useState(false);
  const [reconcilePrefix, setReconcilePrefix] = useState("");
  const [reconcileGalleryUrl, setReconcileGalleryUrl] = useState("");
  const [reconcileConcurrency, setReconcileConcurrency] = useState("");
  const [reconcileData, setReconcileData] = useState<ReconcileR2CardImagesData | null>(null);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);

  const reconcileSummaryLine = (data: ReconcileR2CardImagesData) => {
    const uploaded = Number(data.uploaded ?? 0);
    const failed = Number(data.failed ?? 0);
    const isDry = data.dryRun === true;
    const dbUrls = isDry
      ? Number(data.dbWouldUpdate ?? data.dbUpdated ?? 0)
      : Number(data.dbUpdated ?? 0);
    const params = {
      uploaded: String(uploaded),
      dbUrls: String(dbUrls),
      failed: String(failed),
    };
    return isDry
      ? t("admin.reconcileR2SummaryPreview", params)
      : t("admin.reconcileR2SummaryApply", params);
  };

  const runReconcileR2 = async (dryRun: boolean) => {
    if (reconcileOp !== null) return;
    if (!dryRun && !confirm(t("admin.reconcileR2ApplyConfirm"))) return;
    setReconcileOp(dryRun ? "preview" : "apply");
    setReconcileMessage(null);
    try {
      const body: ReconcileR2CardImagesDto = {
        dryRun: dryRun ? true : false,
      };
      if (reconcileSetId.trim()) body.setId = reconcileSetId.trim();
      const maxN = parseInt(reconcileMaxCards.trim(), 10);
      if (!Number.isNaN(maxN) && maxN >= 1) body.maxCards = maxN;
      if (reconcileNoSkipExisting) body.noSkipExisting = true;
      if (reconcilePrefix.trim()) body.prefix = reconcilePrefix.trim();
      if (reconcileGalleryUrl.trim()) body.galleryUrl = reconcileGalleryUrl.trim();
      const conc = parseInt(reconcileConcurrency.trim(), 10);
      if (!Number.isNaN(conc) && conc >= 1 && conc <= 32) body.concurrency = conc;

      const { data, message } = await postReconcileR2CardImages(body);
      setReconcileData(data);
      setReconcileMessage(message ?? null);

      const failed = Number(data.failed ?? 0);
      if (failed > 0) {
        toast.warning(t("admin.reconcileR2PartialFailure"));
      } else {
        toast.success(t("admin.reconcileR2Success"));
      }

      if (!dryRun) {
        const dbUpdated = Number(data.dbUpdated ?? 0);
        if (dbUpdated > 0) {
          invalidateCardsCache();
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("admin.reconcileR2Error"));
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setReconcileOp(null);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-teal-800/70 bg-teal-950/25 px-4 py-3">
        <p className="mb-1 text-sm font-semibold text-teal-100">{t("admin.reconcileR2Title")}</p>
        <p className="mb-2 text-xs leading-relaxed text-teal-300/80">{t("admin.reconcileR2Lead")}</p>
        <p className="mb-3 text-xs text-teal-100/70">{t("admin.reconcileR2TimeoutHint")}</p>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[120px] flex-col gap-1 text-xs text-teal-100/90">
              <span>{t("admin.reconcileR2SetId")}</span>
              <input
                type="text"
                value={reconcileSetId}
                onChange={(e) => setReconcileSetId(e.target.value)}
                placeholder="UNL"
                disabled={reconcileOp !== null}
                className="rounded border border-teal-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
              />
            </label>
            <label className="flex min-w-[140px] flex-col gap-1 text-xs text-teal-100/90">
              <span>{t("admin.reconcileR2MaxCards")}</span>
              <input
                type="text"
                inputMode="numeric"
                value={reconcileMaxCards}
                onChange={(e) => setReconcileMaxCards(e.target.value)}
                placeholder="200"
                disabled={reconcileOp !== null}
                className="rounded border border-teal-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
              />
              <span className="text-[11px] font-normal text-teal-500/90">{t("admin.reconcileR2MaxCardsHelp")}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void runReconcileR2(true)}
                disabled={reconcileOp !== null}
                className="inline-flex items-center gap-2 rounded border border-teal-500/50 bg-teal-900/40 px-3 py-1.5 text-sm font-semibold text-teal-100 transition hover:bg-teal-800/50 disabled:opacity-60"
              >
                {reconcileOp === "preview" && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-300 border-t-transparent" />
                )}
                {reconcileOp === "preview"
                  ? t("admin.reconcileR2RunningPreview")
                  : t("admin.reconcileR2Preview")}
              </button>
              <button
                type="button"
                onClick={() => void runReconcileR2(false)}
                disabled={reconcileOp !== null}
                className="inline-flex items-center gap-2 rounded border border-orange-500/45 bg-orange-950/35 px-3 py-1.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-900/45 disabled:opacity-60"
              >
                {reconcileOp === "apply" && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
                )}
                {reconcileOp === "apply"
                  ? t("admin.reconcileR2RunningApply")
                  : t("admin.reconcileR2Apply")}
              </button>
            </div>
          </div>
          <details className="rounded-md border border-teal-900/50 bg-black/15">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-teal-300/80 marker:text-teal-500">
              {t("admin.reconcileR2AdvancedTitle")}
            </summary>
            <div className="flex flex-col gap-3 border-t border-teal-900/40 px-3 pb-3 pt-2 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex min-w-[120px] flex-col gap-1 text-xs text-teal-100/80">
                <span>{t("admin.reconcileR2Prefix")}</span>
                <input
                  type="text"
                  value={reconcilePrefix}
                  onChange={(e) => setReconcilePrefix(e.target.value)}
                  placeholder="cards"
                  disabled={reconcileOp !== null}
                  className="rounded border border-teal-800 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                />
              </label>
              <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-teal-100/80">
                <span>{t("admin.reconcileR2GalleryUrl")}</span>
                <input
                  type="url"
                  value={reconcileGalleryUrl}
                  onChange={(e) => setReconcileGalleryUrl(e.target.value)}
                  disabled={reconcileOp !== null}
                  className="w-full min-w-0 rounded border border-teal-800 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                />
              </label>
              <label className="flex w-[100px] flex-col gap-1 text-xs text-teal-100/80">
                <span>{t("admin.reconcileR2Concurrency")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={reconcileConcurrency}
                  onChange={(e) => setReconcileConcurrency(e.target.value)}
                  placeholder="8"
                  disabled={reconcileOp !== null}
                  className="rounded border border-teal-800 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
                />
              </label>
              <label className="flex w-full cursor-pointer items-center gap-2 text-sm text-teal-100/90 sm:w-auto">
                <input
                  type="checkbox"
                  checked={reconcileNoSkipExisting}
                  onChange={(e) => setReconcileNoSkipExisting(e.target.checked)}
                  disabled={reconcileOp !== null}
                  className="rounded border-teal-600 bg-gray-900 text-teal-500 focus:ring-teal-500 disabled:opacity-60"
                />
                {t("admin.reconcileR2NoSkipExisting")}
              </label>
            </div>
          </details>
        </div>
      </div>

      {reconcileData && (
        <div
          className={`mt-4 rounded-lg border p-4 text-sm ${
            Number(reconcileData.failed ?? 0) > 0
              ? "border-amber-700/70 bg-amber-950/25"
              : "border-teal-900/60 bg-teal-950/30"
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-300">
            {t("admin.reconcileR2ResultTitle")}
          </p>
          <p className="mb-3 text-sm font-medium leading-snug text-teal-50">
            {reconcileSummaryLine(reconcileData)}
          </p>
          {reconcileMessage && (
            <p className="mb-3 text-sm text-teal-100/95">
              <span className="font-medium text-teal-200">{t("admin.reconcileR2Message")}: </span>
              {reconcileMessage}
            </p>
          )}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-400/90">
            {t("admin.reconcileR2MetricsTitle")}
          </p>
          <div className="mb-3 grid grid-cols-1 gap-x-4 gap-y-1 font-mono text-xs text-teal-100/90 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "dryRun",
              "total",
              "uploaded",
              "skippedR2",
              "overwritten",
              "rotated",
              "r2Missing",
              "dbUpdated",
              "dbWouldUpdate",
              "dbAlreadyOk",
              "dbNoRow",
              "failed",
              "managedBase",
              "bucket",
            ].map((key) => (
              <p key={key}>
                <span className="text-teal-500/90">{key}</span>: {reconcileMetric(reconcileData, key)}
              </p>
            ))}
          </div>
          {Number(reconcileData.failed ?? 0) > 0 && reconcileData.errorSamples != null && (
            <div className="mb-3 rounded border border-amber-600/40 bg-amber-950/40 p-2 text-xs text-amber-100">
              <span className="font-semibold text-amber-300">errorSamples: </span>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words">
                {reconcileMetric(reconcileData, "errorSamples")}
              </pre>
            </div>
          )}
          {typeof reconcileData.scriptStderr === "string" && reconcileData.scriptStderr.trim() !== "" && (
            <details className="mb-3 text-xs text-teal-200/90">
              <summary className="cursor-pointer font-medium">{t("admin.reconcileR2Stderr")}</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-teal-900/50 bg-black/20 p-2 font-mono text-teal-100/80">
                {reconcileData.scriptStderr}
              </pre>
            </details>
          )}
          <details className="text-xs text-teal-300/80">
            <summary className="cursor-pointer font-medium">{t("admin.reconcileR2FullJson")}</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-teal-100/85">
              {JSON.stringify(reconcileData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </>
  );
}
