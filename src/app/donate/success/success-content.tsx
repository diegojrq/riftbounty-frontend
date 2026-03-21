"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

/** Conteúdo para quando o backend redireciona após pagamento (DONATE_SUCCESS_URL). */
export function DonateSuccessContent() {
  const { t } = useLocale();
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-white">{t("donate.successTitle")}</h1>
      <p className="mb-8 text-gray-400">{t("donate.successBody")}</p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        {t("donate.successBackHome")}
      </Link>
    </div>
  );
}
