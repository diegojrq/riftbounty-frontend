"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useLocale } from "@/lib/locale-context";
import { DonateButton } from "@/components/donations/DonateButton";

function FlagBr({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <rect width="20" height="14" fill="#009c3b" />
      <path fill="#ffdf00" d="M10 0 L20 7 L10 14 L0 7 Z" />
      <circle cx="10" cy="7" r="3.2" fill="#002776" />
    </svg>
  );
}

function FlagGb({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden>
      <rect width="60" height="30" fill="#012169" />
      <path fill="none" stroke="#fff" strokeWidth="4" d="M0 15 h60 M30 0 v30" />
      <path fill="none" stroke="#C8102E" strokeWidth="2" d="M0 15 h60 M30 0 v30" />
      <path fill="none" stroke="#fff" strokeWidth="5" d="M0 0 L60 30 M60 0 L0 30" />
      <path fill="none" stroke="#C8102E" strokeWidth="3" d="M0 0 L60 30 M60 0 L0 30" />
    </svg>
  );
}

function IconCards() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="m8 21 4-4 4 4" />
    </svg>
  );
}

function IconCommunities() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCollection() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function IconForSale() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconDecks() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h5" />
      <path d="M17.5 17.5 16 19l-2-2" />
      <circle cx="17" cy="17" r="5" />
    </svg>
  );
}

function IconTrades() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v18" />
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconProfile({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="8" r="5" />
      <path d="M3 21a9 9 0 0 1 18 0" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const isAdmin = (user?.role ?? "").toLowerCase() === "admin";
  const [menuOpen, setMenuOpen] = useState(false);

  const guardedNav = useCallback((e: React.MouseEvent, href: string) => {
    if (!user) {
      e.preventDefault();
      toast.error(t("nav.loginRequired"));
      router.push("/login");
    }
  }, [user, t, router]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      {/* Top row: language selector */}
      <div className="hidden border-b border-gray-800/70 sm:block">
        <div className="mx-auto flex max-w-[1600px] items-center justify-end px-4 py-1.5 sm:px-6 lg:px-10 xl:px-12">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setLocale("pt-BR")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium uppercase transition-colors ${
                locale === "pt-BR" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
              aria-label="Português"
            >
              <FlagBr className="h-3.5 w-5 shrink-0 rounded-sm" />
              PT
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium uppercase transition-colors ${
                locale === "en" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
              aria-label="English"
            >
              <FlagGb className="h-3.5 w-5 shrink-0 rounded-sm" />
              EN
            </button>
          </div>
        </div>
      </div>

      <nav className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label={t("nav.ariaHome")}
        >
          <Image
            src="/images/riftbounty.png"
            alt="Riftbounty"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <span className="text-xl font-bold uppercase tracking-tight text-white">
            Riftbounty
          </span>
        </Link>

        {/* Desktop main nav links */}
        <div className="hidden flex-1 items-center justify-center gap-1 sm:flex sm:gap-1.5">
          {loading ? (
            <span className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-500">...</span>
          ) : (
            <>
              <Link
                href="/cards"
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/cards")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconCards />
                {t("nav.cards")}
              </Link>
              <Link
                href="/communities"
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/communities")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconCommunities />
                {t("nav.communities")}
              </Link>
              <Link
                href="/collection"
                onClick={(e) => guardedNav(e, "/collection")}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/collection")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconCollection />
                {t("nav.myCollection")}
              </Link>
              <Link
                href="/wishlist"
                onClick={(e) => guardedNav(e, "/wishlist")}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/wishlist")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconCollection />
                {t("nav.myWishlist")}
              </Link>
              <Link
                href="/for-sale"
                onClick={(e) => guardedNav(e, "/for-sale")}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/for-sale")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconForSale />
                {t("nav.myForSale")}
              </Link>
              <Link
                href="/decks"
                onClick={(e) => guardedNav(e, "/decks")}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/decks")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconDecks />
                {t("nav.myDecks")}
              </Link>
              <Link
                href="/trades"
                onClick={(e) => guardedNav(e, "/trades")}
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/trades")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <IconTrades />
                {t("nav.trades")}
              </Link>
            </>
          )}
        </div>

        {/* Desktop right actions */}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <DonateButton />
          {loading ? (
            <span className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-500">...</span>
          ) : user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    pathname.startsWith("/admin")
                      ? "border-amber-600/60 bg-gray-800 text-amber-300"
                      : "border-transparent text-amber-400 hover:border-amber-600/40 hover:bg-gray-800 hover:text-amber-300"
                  }`}
                >
                  <IconAdmin />
                  {t("nav.admin")}
                </Link>
              )}
              <Link
                href="/profile"
                className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/profile")
                    ? "border-gray-600 bg-gray-700 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <IconProfile />
                {user.displayName || user.email}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded border border-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 transition-colors hover:border-red-500/40 hover:bg-gray-800 hover:text-red-400"
              >
                {t("nav.logOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/login")
                    ? "border-gray-600 bg-gray-800 text-white"
                    : "border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className={`rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  pathname.startsWith("/register")
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-transparent text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
                }`}
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          aria-label={menuOpen ? t("nav.ariaCloseMenu") : t("nav.ariaOpenMenu")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-800 hover:text-white sm:hidden"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="border-t border-gray-800 bg-gray-900 sm:hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">{t("common.loading")}</div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-800">
              <div className="px-4 py-3.5">
                <DonateButton className="w-full justify-center" />
              </div>
              {user && (
                <Link
                  href="/profile"
                  className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-gray-800 ${
                    pathname.startsWith("/profile") ? "bg-gray-800 text-white" : "text-gray-300"
                  }`}
                >
                  <IconProfile className="h-4 w-4 shrink-0" />
                  {user.displayName || user.email}
                </Link>
              )}
              <Link
                href="/cards"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/cards") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/></svg>
                {t("nav.cards")}
              </Link>
              <Link
                href="/communities"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/communities") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {t("nav.communities")}
              </Link>
              <Link
                href="/collection"
                onClick={(e) => guardedNav(e, "/collection")}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/collection") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                {t("nav.myCollection")}
              </Link>
              <Link
                href="/wishlist"
                onClick={(e) => guardedNav(e, "/wishlist")}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/wishlist") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m12 21-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18z"/></svg>
                {t("nav.myWishlist")}
              </Link>
              <Link
                href="/for-sale"
                onClick={(e) => guardedNav(e, "/for-sale")}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/for-sale") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                {t("nav.myForSale")}
              </Link>
              <Link
                href="/decks"
                onClick={(e) => guardedNav(e, "/decks")}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/decks") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 19l-2-2"/><circle cx="17" cy="17" r="5"/></svg>
                {t("nav.myDecks")}
              </Link>
              <Link
                href="/trades"
                onClick={(e) => guardedNav(e, "/trades")}
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/trades") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
                {t("nav.trades")}
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 ${
                    pathname.startsWith("/admin") ? "bg-gray-800 text-white" : "text-amber-400 hover:text-amber-300"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v18"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  {t("nav.admin")}
                </Link>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium uppercase text-gray-400 hover:bg-gray-800 hover:text-red-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                  {t("nav.logOut")}
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                      pathname.startsWith("/login") ? "bg-gray-800 text-white" : "text-gray-400"
                    }`}
                  >
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/register"
                    className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-emerald-500/10 hover:text-emerald-300 ${
                      pathname.startsWith("/register") ? "bg-emerald-500/10 text-emerald-300" : "text-emerald-400"
                    }`}
                  >
                    {t("nav.register")}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
