"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { runAdminTcgSync, type AdminTcgSyncSummary } from "@/lib/admin";

export default function AdminTcgSyncPage() {
  const { t } = useLocale();
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncSummary, setSyncSummary] = useState<AdminTcgSyncSummary | null>(null);

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

  const handleTcgSync = async () => {
    if (syncRunning) return;
    setSyncRunning(true);
    try {
      const result = await runAdminTcgSync();
      setSyncSummary(result);
      toast.success(t("admin.tcgSyncSuccess"));
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

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-amber-500/90 hover:text-amber-400"
        >
          ← {t("admin.backToAdminHome")}
        </Link>
        <h2 className="text-lg font-semibold text-white">{t("admin.tcgPageHeading")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("admin.tcgPageSubtitle")}</p>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-700/80 bg-gray-800/30 p-5 text-sm leading-relaxed text-gray-300">
        <h3 className="text-base font-semibold text-white">{t("admin.tcgDocsWhatTitle")}</h3>
        <p>{t("admin.tcgDocsWhatBody")}</p>
        <p className="text-gray-400">{t("admin.tcgDocsParamsBody")}</p>
      </section>

      <div>
        <button
          type="button"
          onClick={() => void handleTcgSync()}
          disabled={syncRunning}
          className="inline-flex items-center gap-2 rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 hover:text-blue-100 disabled:opacity-60"
        >
          {syncRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
          )}
          {syncRunning ? t("admin.tcgSyncRunning") : t("admin.tcgSyncButton")}
        </button>
      </div>

      {syncSummary && (
        <div className="rounded-lg border border-blue-900/60 bg-blue-950/30 p-4 text-sm">
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
    </div>
  );
}
