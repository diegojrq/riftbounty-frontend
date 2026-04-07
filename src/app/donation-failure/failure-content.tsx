"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

/** Conteúdo quando o checkout retorna falha / cancelamento (`DONATE_CANCEL_URL` ou equivalente). */
export function DonateFailureContent() {
  const { t } = useLocale();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">{t("donate.failureTitle")}</h1>
      <p className="mb-8 text-gray-400">
        {t("donate.failureBody", { donateButton: t("nav.donate") })}
      </p>
      <Link
        href="/"
        className="rounded-lg border border-gray-600 bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
      >
        {t("donate.failureBackHome")}
      </Link>
    </div>
  );
}
