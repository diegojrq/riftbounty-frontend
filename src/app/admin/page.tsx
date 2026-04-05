"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";

const cardClass =
  "group flex flex-col rounded-xl border border-gray-700/80 bg-gray-800/40 p-5 transition hover:border-amber-500/40 hover:bg-gray-800/70";

export default function AdminHomePage() {
  const { t } = useLocale();

  const tools: { href: string; titleKey: string; descKey: string }[] = [
    { href: "/admin/communities", titleKey: "admin.homeCommunitiesTitle", descKey: "admin.homeCommunitiesDesc" },
    { href: "/admin/cards", titleKey: "admin.homeCardsTitle", descKey: "admin.homeCardsDesc" },
    { href: "/admin/tcg-sync", titleKey: "admin.homeTcgTitle", descKey: "admin.homeTcgDesc" },
    { href: "/admin/catalog-bump", titleKey: "admin.homeBumpTitle", descKey: "admin.homeBumpDesc" },
    { href: "/admin/catalog-load", titleKey: "admin.homeLoadTitle", descKey: "admin.homeLoadDesc" },
    { href: "/admin/reconcile-images", titleKey: "admin.homeReconcileTitle", descKey: "admin.homeReconcileDesc" },
  ];

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-2">
        <h2 className="text-xl font-semibold text-white">{t("admin.homeTitle")}</h2>
        <p className="text-sm leading-relaxed text-gray-400">{t("admin.homeSubtitle")}</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={cardClass}>
              <span className="text-base font-semibold text-amber-400 group-hover:text-amber-300">
                {t(item.titleKey)}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-gray-400">{t(item.descKey)}</span>
              <span className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-500 group-hover:text-amber-500/80">
                {t("admin.homeOpen")} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
