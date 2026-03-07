"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { getUnreadCount } from "@/lib/notifications";

export function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Poll unread notification count when logged in
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetch = () => getUnreadCount().then(setUnreadCount).catch(() => {});
    fetch();
    intervalRef.current = setInterval(fetch, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-10 xl:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label="Riftbounty home"
        >
          <Image
            src="/images/riftbounty.png"
            alt="Riftbounty"
            width={isHome ? 48 : 32}
            height={isHome ? 48 : 32}
            className={`shrink-0 object-contain ${isHome ? "h-12 w-12" : "h-8 w-8"}`}
          />
          <span className={`font-bold uppercase tracking-tight text-white ${isHome ? "text-2xl" : "text-xl"}`}>
            Riftbounty
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 sm:flex sm:gap-2">
          {loading ? (
            <span className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-500">...</span>
          ) : user ? (
            <>
              <Link
                href="/cards"
                className={`rounded px-3 py-2 text-sm font-medium uppercase transition-colors hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/cards")
                    ? "bg-gray-800 text-white"
                    : "text-gray-400"
                }`}
              >
                Cards
              </Link>
              <Link
                href="/collection"
                className={`rounded px-3 py-2 text-sm font-medium uppercase transition-colors hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/collection")
                    ? "bg-gray-800 text-white"
                    : "text-gray-400"
                }`}
              >
                My collection
              </Link>
              <Link
                href="/decks"
                className={`rounded px-3 py-2 text-sm font-medium uppercase transition-colors hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/decks")
                    ? "bg-gray-800 text-white"
                    : "text-gray-400"
                }`}
              >
                My decks
              </Link>
              <Link
                href="/trades"
                className={`relative rounded px-3 py-2 text-sm font-medium uppercase transition-colors hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/trades")
                    ? "bg-gray-800 text-white"
                    : "text-gray-400"
                }`}
              >
                Trades
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[10px] font-bold leading-none text-gray-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link
                href="/profile"
                className={`rounded px-3 py-1.5 text-sm uppercase transition-colors hover:bg-gray-700 hover:text-white ${
                  pathname.startsWith("/profile")
                    ? "bg-gray-700 text-white"
                    : "bg-gray-800 text-gray-300"
                }`}
              >
                {user.displayName || user.email}
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded px-3 py-2 text-sm font-medium uppercase text-gray-400 transition-colors hover:bg-gray-800 hover:text-red-400"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded px-3 py-2 text-sm font-medium uppercase transition-colors hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/login")
                    ? "bg-gray-800 text-white"
                    : "text-gray-400"
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`rounded px-3 py-2 text-sm font-medium uppercase transition-colors hover:bg-emerald-500/20 hover:text-emerald-300 ${
                  pathname.startsWith("/register")
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "text-emerald-400"
                }`}
              >
                Register
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
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
            <div className="px-4 py-3 text-sm text-gray-500">Loading...</div>
          ) : user ? (
            <div className="flex flex-col divide-y divide-gray-800">
              <Link
                href="/profile"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-gray-800 ${
                  pathname.startsWith("/profile") ? "bg-gray-800 text-white" : "text-gray-300"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="5"/><path d="M3 21a9 9 0 0 1 18 0"/></svg>
                {user.displayName || user.email}
              </Link>
              <Link
                href="/cards"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/cards") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/></svg>
                Cards
              </Link>
              <Link
                href="/collection"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/collection") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                My collection
              </Link>
              <Link
                href="/decks"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/decks") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 19l-2-2"/><circle cx="17" cy="17" r="5"/></svg>
                My decks
              </Link>
              <Link
                href="/trades"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/trades") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>
                Trades
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-gray-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => { logout(); setMenuOpen(false); }}
                className="flex items-center gap-3 px-4 py-3.5 text-left text-sm font-medium uppercase text-gray-400 hover:bg-gray-800 hover:text-red-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                Log out
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-800">
              <Link
                href="/login"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-gray-800 hover:text-white ${
                  pathname.startsWith("/login") ? "bg-gray-800 text-white" : "text-gray-400"
                }`}
              >
                Login
              </Link>
              <Link
                href="/register"
                className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium uppercase hover:bg-emerald-500/10 hover:text-emerald-300 ${
                  pathname.startsWith("/register") ? "bg-emerald-500/10 text-emerald-300" : "text-emerald-400"
                }`}
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
