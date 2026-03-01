"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10 xl:px-12">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Riftbounty
        </Link>
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-gray-400">...</span>
          ) : user ? (
            <>
              <Link href="/collection" className="text-sm text-gray-600 hover:text-gray-900">
                My collection
              </Link>
              <Link href="/decks" className="text-sm text-gray-600 hover:text-gray-900">
                My decks
              </Link>
              <span className="text-sm text-gray-600">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </Link>
              <Link href="/register" className="text-gray-600 hover:text-gray-900">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
