"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-10 xl:px-12">
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
        <div className="flex items-center gap-1 sm:gap-2">
          {loading ? (
            <span className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-500">...</span>
          ) : user ? (
            <>
              <Link
                href="/collection"
                className="rounded px-3 py-2 text-sm font-medium uppercase text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                My collection
              </Link>
              <Link
                href="/decks"
                className="rounded px-3 py-2 text-sm font-medium uppercase text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                My decks
              </Link>
              <Link
                href="/profile"
                className="hidden rounded bg-gray-800 px-3 py-1.5 text-sm uppercase text-gray-300 transition-colors hover:bg-gray-700 hover:text-white sm:inline-block"
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
                className="rounded px-3 py-2 text-sm font-medium uppercase text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded px-3 py-2 text-sm font-medium uppercase text-emerald-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-300"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
