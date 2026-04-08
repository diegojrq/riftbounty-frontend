"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";

/** Abas Meus decks / Precon — só em `/decks` e `/decks/precon` (não no editor `/decks/[id]`). */
export function DecksSubNav() {
  const pathname = usePathname();
  const { t } = useLocale();

  const show =
    pathname === "/decks" ||
    pathname === "/decks/precon" ||
    pathname.startsWith("/decks/precon/");

  if (!show) return null;

  const builderActive = pathname === "/decks";
  const preconActive = pathname.startsWith("/decks/precon");

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
      active
        ? "border border-gray-600 bg-gray-800 text-white"
        : "border border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800/80 hover:text-white"
    }`;

  return (
    <nav
      className="border-b border-gray-800 bg-gray-900/90"
      aria-label={t("nav.decks")}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:px-10 xl:px-12">
        <Link href="/decks" className={tabClass(builderActive)}>
          {t("nav.decksBuilder")}
        </Link>
        <Link href="/decks/precon" className={tabClass(preconActive)}>
          {t("nav.preconDecks")}
        </Link>
      </div>
    </nav>
  );
}
