"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";

const navLink = (active: boolean) =>
  `rounded px-2.5 py-1.5 text-xs font-medium uppercase transition-colors sm:text-sm ${
    active ? "bg-amber-500/20 text-amber-400" : "text-gray-400 hover:bg-gray-800 hover:text-white"
  }`;

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") {
      router.replace("/");
      return;
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">{t("common.loading")}</p>
      </div>
    );
  }

  const links: { href: string; labelKey: string; match: (p: string) => boolean }[] = [
    { href: "/admin", labelKey: "admin.navHome", match: (p) => p === "/admin" },
    { href: "/admin/cards", labelKey: "admin.navCards", match: (p) => p.startsWith("/admin/cards") },
    { href: "/admin/tcg-sync", labelKey: "admin.navTcg", match: (p) => p.startsWith("/admin/tcg-sync") },
    { href: "/admin/catalog-bump", labelKey: "admin.navBump", match: (p) => p.startsWith("/admin/catalog-bump") },
    { href: "/admin/catalog-load", labelKey: "admin.navLoad", match: (p) => p.startsWith("/admin/catalog-load") },
    { href: "/admin/reconcile-images", labelKey: "admin.navReconcile", match: (p) => p.startsWith("/admin/reconcile-images") },
    { href: "/admin/communities", labelKey: "admin.navCommunities", match: (p) => p.startsWith("/admin/communities") },
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-col gap-4 border-b border-gray-800 pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="text-sm font-medium uppercase text-gray-400 transition-colors hover:text-white"
          >
            ← {t("back.home")}
          </Link>
          <h1 className="text-xl font-bold uppercase tracking-tight text-amber-400">
            {t("nav.admin")}
          </h1>
        </div>
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={navLink(l.match(pathname))}>
              {t(l.labelKey)}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
