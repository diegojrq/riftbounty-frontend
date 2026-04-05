"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { bumpAdminCatalogVersion } from "@/lib/admin";

export default function AdminCatalogBumpPage() {
  const { t } = useLocale();
  const [catalogBumpRunning, setCatalogBumpRunning] = useState(false);
  const [lastCatalogVersion, setLastCatalogVersion] = useState<string | number | null>(null);

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

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-amber-500/90 hover:text-amber-400"
        >
          ← {t("admin.backToAdminHome")}
        </Link>
        <h2 className="text-lg font-semibold text-white">{t("admin.bumpPageHeading")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("admin.bumpPageSubtitle")}</p>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-700/80 bg-gray-800/30 p-5 text-sm leading-relaxed text-gray-300">
        <h3 className="text-base font-semibold text-white">{t("admin.bumpDocsWhatTitle")}</h3>
        <p>{t("admin.bumpDocsWhatBody")}</p>
        <p className="text-gray-400">{t("admin.bumpDocsEffectBody")}</p>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void handleCatalogVersionBump()}
          disabled={catalogBumpRunning}
          className="inline-flex items-center gap-2 rounded border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:text-violet-100 disabled:opacity-60"
        >
          {catalogBumpRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
          )}
          {catalogBumpRunning ? t("admin.catalogVersionBumpRunning") : t("admin.catalogVersionBumpButton")}
        </button>
        {lastCatalogVersion !== null && (
          <span className="text-sm text-violet-200/90">
            {t("admin.catalogVersionCurrent", { version: String(lastCatalogVersion) })}
          </span>
        )}
      </div>
    </div>
  );
}
