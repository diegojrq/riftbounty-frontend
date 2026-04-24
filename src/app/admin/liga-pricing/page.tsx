"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getAdminSyncJob,
  getAdminTcgPriceDiff,
  runAdminLigaSync,
  tickAdminSyncJob,
  type AdminSyncJob,
  type LigaSyncResponseData,
  type PriceDiffResponseData,
} from "@/lib/admin";
import { ApiClientError } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";

const SET_OPTIONS = ["OGN", "SFD", "UNL"] as const;

const fmtBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmtBrlSigned = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  signDisplay: "exceptZero",
});

function formatBrl(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return fmtBrl.format(n);
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return fmtUsd.format(n);
}

function formatBrlSigned(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return fmtBrlSigned.format(n);
}

function formatRateFetchedAt(iso: string, appLocale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(appLocale === "en" ? "en-US" : "pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default function AdminLigaPricingPage() {
  const { t, locale } = useLocale();

  const [setCode, setSetCode] = useState("OGN");
  const [tipo, setTipo] = useState(1);
  const [syncLimit, setSyncLimit] = useState(1000);
  const [dryRun, setDryRun] = useState(true);

  const [syncRunning, setSyncRunning] = useState(false);
  const [syncSummary, setSyncSummary] = useState<LigaSyncResponseData | null>(null);
  const [job, setJob] = useState<AdminSyncJob | null>(null);
  const lastJobStatusRef = useRef<string | null>(null);
  const tickInFlightRef = useRef(false);

  const [priceType, setPriceType] = useState<"low" | "mid" | "high">("mid");
  const [sortMetric, setSortMetric] = useState<"absolute" | "signed">("absolute");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [diffSetFilter, setDiffSetFilter] = useState("");
  const [diffLimit, setDiffLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  const [diffLoading, setDiffLoading] = useState(false);
  const [diffData, setDiffData] = useState<PriceDiffResponseData | null>(null);
  const [diffErrorMessage, setDiffErrorMessage] = useState<string | null>(null);

  const diffFiltersRef = useRef({
    priceType,
    sortMetric,
    order,
    diffLimit,
    diffSetFilter,
  });
  diffFiltersRef.current = { priceType, sortMetric, order, diffLimit, diffSetFilter };

  const refetchPriceDiff = useCallback(
    async (forcedOffset?: number) => {
      const off = forcedOffset !== undefined ? forcedOffset : offset;
      const f = diffFiltersRef.current;
      setDiffLoading(true);
      setDiffErrorMessage(null);
      try {
        const data = await getAdminTcgPriceDiff({
          priceType: f.priceType,
          sortMetric: f.sortMetric,
          order: f.order,
          limit: f.diffLimit,
          offset: off,
          ...(f.diffSetFilter.trim() ? { set: f.diffSetFilter.trim() } : {}),
        });
        setDiffData(data);
        setDiffErrorMessage(null);
      } catch (err) {
        setDiffData(null);
        if (err instanceof ApiClientError && err.status === 502) {
          const msg = t("admin.ligaPricingDiffError502");
          setDiffErrorMessage(msg);
          toast.error(msg);
        } else {
          setDiffErrorMessage(null);
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
            toast.error(t("admin.forbidden"));
          } else {
            toast.error(t("admin.ligaPricingDiffError"));
          }
        }
      } finally {
        setDiffLoading(false);
      }
    },
    [offset, t]
  );

  useEffect(() => {
    void refetchPriceDiff();
  }, [offset, refetchPriceDiff]);

  const applyDiffFilters = () => {
    if (offset !== 0) {
      setOffset(0);
    } else {
      void refetchPriceDiff(0);
    }
  };

  const runSync = async (opts: { dryRun: boolean }) => {
    if (syncRunning) return;
    setSyncRunning(true);
    try {
      const body = {
        set: setCode.trim() || undefined,
        tipo: Number.isFinite(tipo) ? tipo : 1,
        limit: Number.isFinite(syncLimit) ? syncLimit : 1000,
        dryRun: opts.dryRun,
      };
      const result = await runAdminLigaSync(body);
      lastJobStatusRef.current = null;
      tickInFlightRef.current = false;
      setJob(result);
      toast.success("Job de sync enfileirado.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      } else {
        toast.error(t("admin.ligaPricingSyncError"));
      }
    } finally {
      setSyncRunning(false);
    }
  };

  useEffect(() => {
    if (!job?.id) return;
    if (job.status === "completed" || job.status === "failed") return;
    const timer = window.setInterval(() => {
      void (async () => {
        if (tickInFlightRef.current) return;
        tickInFlightRef.current = true;
        try {
          const afterTick = await tickAdminSyncJob(job.id);
          setJob(afterTick);

          const prev = lastJobStatusRef.current;
          lastJobStatusRef.current = afterTick.status;

          if (prev !== "completed" && afterTick.status === "completed") {
            const result = (afterTick.result ?? null) as LigaSyncResponseData | null;
            if (result) {
              setSyncSummary(result);
              toast.success(
                result.dryRun ? t("admin.ligaPricingSyncSuccessDry") : t("admin.ligaPricingSyncSuccessReal")
              );
            } else {
              toast.success("Sync concluído.");
            }
            void refetchPriceDiff();
          } else if (prev !== "failed" && afterTick.status === "failed") {
            toast.error(afterTick.errorMessage || t("admin.ligaPricingSyncError"));
          }
        } catch {
          try {
            const next = await getAdminSyncJob(job.id);
            setJob(next);
          } catch {
            // ignore
          }
        } finally {
          tickInFlightRef.current = false;
        }
      })();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status, refetchPriceDiff, t]);

  const handleSyncReal = () => {
    if (!window.confirm(t("admin.ligaPricingSyncRealConfirm"))) return;
    void runSync({ dryRun: false });
  };

  const totalCount = diffData?.totalCount ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + diffLimit < totalCount;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-amber-500/90 hover:text-amber-400"
        >
          ← {t("admin.backToAdminHome")}
        </Link>
        <h2 className="text-lg font-semibold text-white">{t("admin.ligaPricingHeading")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("admin.ligaPricingSubtitle")}</p>
      </div>

      <section className="space-y-4 rounded-lg border border-gray-700/80 bg-gray-800/30 p-5 text-sm text-gray-300">
        <h3 className="text-base font-semibold text-white">{t("admin.ligaPricingSyncTitle")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("admin.ligaPricingFieldSet")}
            </span>
            <select
              value={setCode}
              onChange={(e) => setSetCode(e.target.value)}
              className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
            >
              {SET_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("admin.ligaPricingFieldTipo")}
            </span>
            <input
              type="number"
              min={0}
              value={tipo}
              onChange={(e) => setTipo(Number(e.target.value))}
              className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("admin.ligaPricingFieldLimit")}
            </span>
            <input
              type="number"
              min={1}
              value={syncLimit}
              onChange={(e) => setSyncLimit(Number(e.target.value))}
              className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-white"
            />
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-900"
            />
            <span className="text-sm text-gray-200">{t("admin.ligaPricingDryRunLabel")}</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void runSync({ dryRun })}
            disabled={syncRunning}
            className="inline-flex items-center gap-2 rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 hover:text-blue-100 disabled:opacity-60"
          >
            {syncRunning && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
            )}
            {syncRunning ? t("admin.ligaPricingSyncRunning") : t("admin.ligaPricingSyncExecute")}
          </button>
          <button
            type="button"
            onClick={handleSyncReal}
            disabled={syncRunning}
            className="inline-flex items-center gap-2 rounded border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 hover:text-amber-100 disabled:opacity-60"
          >
            {t("admin.ligaPricingSyncReal")}
          </button>
        </div>
        {job && (
          <p className="text-xs text-gray-500">
            Job: <span className="font-mono">{job.id}</span> — status:{" "}
            <span className="uppercase">{job.status}</span> ({job.attempts}/{job.maxAttempts})
          </p>
        )}
        <p className="text-xs text-gray-500">{t("admin.ligaPricingSyncHint")}</p>
      </section>

      {syncSummary && (
        <div className="rounded-lg border border-blue-900/60 bg-blue-950/30 p-4 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
              {t("admin.ligaPricingSyncResultTitle")}
            </p>
            {syncSummary.dryRun && (
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-200">
                {t("admin.ligaPricingBadgeSimulation")}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 text-blue-100 md:grid-cols-2">
            <p>
              {t("admin.ligaPricingSyncStartedAt")}: {new Date(syncSummary.startedAt).toLocaleString()}
            </p>
            <p>
              {t("admin.ligaPricingSyncFinishedAt")}:{" "}
              {new Date(syncSummary.finishedAt).toLocaleString()}
            </p>
            <p>
              {t("admin.ligaPricingSetCode")}: {syncSummary.setCode}
            </p>
            <p>
              {t("admin.ligaPricingTotalSource")}: {syncSummary.totalSourceCards}
            </p>
            <p>
              {t("admin.ligaPricingTotalCatalog")}: {syncSummary.totalCatalogCards}
            </p>
            <p>
              {t("admin.ligaPricingMatched")}: {syncSummary.matched}
            </p>
            <p>
              {t("admin.ligaPricingUpdated")}: {syncSummary.updated}
            </p>
            <p>
              {t("admin.ligaPricingUnchanged")}: {syncSummary.unchanged}
            </p>
            <p>
              {t("admin.ligaPricingSkippedNoMatch")}: {syncSummary.skippedNoMatch}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
        {t("admin.ligaPricingDiffWarning")}
      </div>

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-white">{t("admin.ligaPricingDiffTitle")}</h3>
        <div className="grid gap-3 rounded-lg border border-gray-700/80 bg-gray-800/30 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-gray-500">
              {t("admin.ligaPricingFilterPriceType")}
            </span>
            <select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as "low" | "mid" | "high")}
              className="rounded border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white"
            >
              <option value="low">low</option>
              <option value="mid">mid</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-gray-500">
              {t("admin.ligaPricingFilterSortMetric")}
            </span>
            <select
              value={sortMetric}
              onChange={(e) => setSortMetric(e.target.value as "absolute" | "signed")}
              className="rounded border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white"
            >
              <option value="absolute">absolute</option>
              <option value="signed">signed</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-gray-500">
              {t("admin.ligaPricingFilterOrder")}
            </span>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              className="rounded border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white"
            >
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-gray-500">
              {t("admin.ligaPricingFilterSetOptional")}
            </span>
            <input
              type="text"
              value={diffSetFilter}
              onChange={(e) => setDiffSetFilter(e.target.value)}
              placeholder="OGN"
              className="rounded border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white placeholder:text-gray-600"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase text-gray-500">
              {t("admin.ligaPricingFilterLimit")}
            </span>
            <input
              type="number"
              min={1}
              max={500}
              value={diffLimit}
              onChange={(e) => setDiffLimit(Math.max(1, Number(e.target.value) || 50))}
              className="rounded border border-gray-600 bg-gray-900 px-2 py-2 text-sm text-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={applyDiffFilters}
              className="w-full rounded border border-gray-600 bg-gray-700/50 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              {t("admin.ligaPricingDiffApply")}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
          <span>
            {diffData
              ? t("admin.ligaPricingDiffTotal", { count: totalCount })
              : diffLoading
                ? t("common.loading")
                : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev || diffLoading}
              onClick={() => setOffset((o) => Math.max(0, o - diffLimit))}
              className="rounded border border-gray-600 px-3 py-1.5 text-xs font-medium uppercase text-gray-200 hover:bg-gray-800 disabled:opacity-40"
            >
              {t("admin.ligaPricingDiffPrev")}
            </button>
            <button
              type="button"
              disabled={!canNext || diffLoading}
              onClick={() => setOffset((o) => o + diffLimit)}
              className="rounded border border-gray-600 px-3 py-1.5 text-xs font-medium uppercase text-gray-200 hover:bg-gray-800 disabled:opacity-40"
            >
              {t("admin.ligaPricingDiffNext")}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-700/80">
          {diffLoading && (
            <div className="p-8 text-center text-gray-500">{t("common.loading")}</div>
          )}
          {!diffLoading && diffErrorMessage && (
            <div className="border-b border-red-900/50 bg-red-950/35 p-4 text-sm text-red-200">
              {diffErrorMessage}
            </div>
          )}
          {!diffLoading && diffData && (
            <>
              <div className="sticky top-0 z-10 border-b border-gray-700 bg-gray-950/95 px-4 py-3 text-sm text-gray-200 backdrop-blur-sm">
                {t("admin.ligaPricingRateBanner", {
                  rate: formatBrl(diffData.usdBrlRate),
                  source: diffData.usdBrlRateSource,
                  time: formatRateFetchedAt(diffData.usdBrlRateFetchedAt, locale),
                })}
              </div>
              {totalCount === 0 ? (
                <div className="space-y-2 p-8 text-center text-gray-400">
                  <p>{t("admin.ligaPricingDiffEmpty")}</p>
                  <p className="text-sm text-gray-500">{t("admin.ligaPricingDiffEmptyHint")}</p>
                </div>
              ) : (
                <table className="min-w-[960px] w-full border-collapse text-left text-sm">
                  <thead className="border-b border-gray-700 bg-gray-900/50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t("admin.ligaPricingColPublicCode")}</th>
                      <th className="px-3 py-2 font-medium">{t("admin.name")}</th>
                      <th className="px-3 py-2 font-medium">{t("admin.set")}</th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("admin.ligaPricingColLigaBrl")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("admin.ligaPricingColTcgUsd")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("admin.ligaPricingColTcgBrl")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("admin.ligaPricingColDiffSigned")}
                      </th>
                      <th className="px-3 py-2 font-medium text-right">
                        {t("admin.ligaPricingColDiffAbs")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffData.items.map((row) => (
                      <tr
                        key={row.cardId}
                        className="border-b border-gray-800/80 text-gray-200 last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs">{row.publicCode ?? "—"}</td>
                        <td className="px-3 py-2">{row.name ?? "—"}</td>
                        <td className="px-3 py-2">{row.set ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatBrl(row.ligaPrice)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatUsd(row.tcgPriceUsd)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatBrl(row.tcgPriceBrl)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatBrlSigned(row.diffSigned)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatBrl(row.diffAbsolute)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
