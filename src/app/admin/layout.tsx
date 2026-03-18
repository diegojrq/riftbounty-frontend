"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";

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

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
        <nav className="flex gap-2">
          <Link
            href="/admin/cards"
            className={`rounded px-3 py-2 text-sm font-medium uppercase transition-colors ${
              pathname.startsWith("/admin/cards")
                ? "bg-amber-500/20 text-amber-400"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {t("admin.cards")}
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
