"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { loadAdminCatalogVersion, type AdminCatalogVersionLoadResponse } from "@/lib/admin";

export default function AdminCatalogLoadPage() {
  const { t } = useLocale();
  const [catalogLoadRunning, setCatalogLoadRunning] = useState(false);
  const [catalogLoadResult, setCatalogLoadResult] = useState<AdminCatalogVersionLoadResponse | null>(null);

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

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-amber-500/90 hover:text-amber-400"
        >
          ← {t("admin.backToAdminHome")}
        </Link>
        <h2 className="text-lg font-semibold text-white">{t("admin.loadPageHeading")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("admin.loadPageSubtitle")}</p>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-700/80 bg-gray-800/30 p-5 text-sm leading-relaxed text-gray-300">
        <h3 className="text-base font-semibold text-white">{t("admin.loadDocsWhatTitle")}</h3>
        <p>{t("admin.loadDocsWhatBody")}</p>
        <p className="text-gray-400">{t("admin.loadDocsBackendBody")}</p>
      </section>

      <div>
        <button
          type="button"
          onClick={() => void handleCatalogVersionLoad()}
          disabled={catalogLoadRunning}
          className="inline-flex items-center gap-2 rounded border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition hover:bg-fuchsia-500/20 hover:text-fuchsia-100 disabled:opacity-60"
        >
          {catalogLoadRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-fuchsia-300 border-t-transparent" />
          )}
          {catalogLoadRunning ? t("admin.catalogVersionLoadRunning") : t("admin.catalogVersionLoadButton")}
        </button>
      </div>

      {catalogLoadResult?.metrics && (
        <div className="rounded-lg border border-fuchsia-900/60 bg-fuchsia-950/30 p-4 text-sm">
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
    </div>
  );
}
