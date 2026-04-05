"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { ReconcileR2Panel } from "@/components/admin/ReconcileR2Panel";

export default function AdminReconcileImagesPage() {
  const { t } = useLocale();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin"
          className="mb-4 inline-block text-sm text-amber-500/90 hover:text-amber-400"
        >
          ← {t("admin.backToAdminHome")}
        </Link>
        <h2 className="text-lg font-semibold text-white">{t("admin.reconcilePageHeading")}</h2>
        <p className="mt-1 text-sm text-gray-400">{t("admin.reconcilePageSubtitle")}</p>
      </div>

      <section className="space-y-4 rounded-lg border border-gray-700/80 bg-gray-800/30 p-5 text-sm leading-relaxed text-gray-300">
        <h3 className="text-base font-semibold text-white">{t("admin.reconcileDocsWhatTitle")}</h3>
        <p>{t("admin.reconcileDocsWhatBody")}</p>
        <h3 className="pt-2 text-base font-semibold text-white">{t("admin.reconcileDocsParamsTitle")}</h3>
        <ul className="list-disc space-y-3 pl-5 marker:text-amber-500/80">
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelPreviewApply")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescPreviewApply")}</span>
          </li>
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelSetId")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescSetId")}</span>
          </li>
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelMaxCards")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescMaxCards")}</span>
          </li>
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelPrefix")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescPrefix")}</span>
          </li>
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelGalleryUrl")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescGalleryUrl")}</span>
          </li>
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelConcurrency")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescConcurrency")}</span>
          </li>
          <li>
            <span className="font-medium text-gray-200">{t("admin.reconcileParamLabelNoSkip")}</span>
            <span className="block text-gray-400">{t("admin.reconcileParamDescNoSkip")}</span>
          </li>
        </ul>
      </section>

      <ReconcileR2Panel />
    </div>
  );
}
