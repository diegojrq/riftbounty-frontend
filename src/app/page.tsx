"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useCards } from "@/lib/cards-context";

const DOMAINS = [
  { slug: "fury",  label: "Fury",  color: "from-red-900/40 to-transparent",   ring: "ring-red-700/50"   },
  { slug: "calm",  label: "Calm",  color: "from-blue-900/40 to-transparent",  ring: "ring-blue-700/50"  },
  { slug: "mind",  label: "Mind",  color: "from-violet-900/40 to-transparent",ring: "ring-violet-700/50"},
  { slug: "body",  label: "Body",  color: "from-amber-900/40 to-transparent", ring: "ring-amber-700/50" },
  { slug: "chaos", label: "Chaos", color: "from-pink-900/40 to-transparent",  ring: "ring-pink-700/50"  },
  { slug: "order", label: "Order", color: "from-emerald-900/40 to-transparent",ring: "ring-emerald-700/50"},
] as const;

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/><path d="M8 13h8"/>
      </svg>
    ),
    title: "Browse the catalogue",
    desc: "Explore every card across all sets — filter by domain, rarity, type and stats to find exactly what you're looking for.",
    href: "/cards",
    cta: "Browse cards",
    accent: "text-blue-400",
    border: "hover:border-blue-700/60",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
    title: "Manage your collection",
    desc: "Track every copy you own, see your completion percentage by domain and rarity, and spot exactly what's missing.",
    href: "/collection",
    cta: "My collection",
    accent: "text-emerald-400",
    border: "hover:border-emerald-700/60",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
      </svg>
    ),
    title: "Trade with players",
    desc: "Visit another player's profile to see their collection, pick cards you want and send them a trade proposal in seconds.",
    href: "/trades",
    cta: "My trades",
    accent: "text-amber-400",
    border: "hover:border-amber-700/60",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/>
        <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/>
        <path d="M17.5 17.5 16 19l-2-2"/><circle cx="17" cy="17" r="5"/>
      </svg>
    ),
    title: "Build your decks",
    desc: "Craft and refine decks from your collection. Visualize card combos, manage sideboards and share your builds.",
    href: "/decks",
    cta: "My decks",
    accent: "text-purple-400",
    border: "hover:border-purple-700/60",
  },
] as const;

export default function HomePage() {
  const { user } = useAuth();
  const { cards } = useCards();
  const cardCount = cards.length;

  return (
    <div className="min-h-screen bg-gray-900">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-900/20 blur-[120px]" />
          <div className="absolute -right-32 top-0 h-[400px] w-[400px] rounded-full bg-blue-900/20 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-violet-900/15 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28 lg:pt-36">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/images/riftbounty.png"
              alt="Riftbounty"
              width={80}
              height={80}
              className="h-20 w-auto drop-shadow-[0_0_24px_rgba(52,211,153,0.35)]"
            />
          </div>

          <h1 className="mb-4 bg-gradient-to-b from-white to-gray-300 bg-clip-text text-5xl font-extrabold uppercase tracking-tight text-transparent sm:text-7xl">
            Riftbounty
          </h1>

          <p className="mx-auto mb-3 max-w-xl text-lg font-medium text-gray-300 sm:text-xl">
            Collect. Trade. Dominate.
          </p>
          <p className="mx-auto mb-10 max-w-lg text-sm text-gray-500">
            The companion app for the Riftbounty trading card game — manage your collection,
            trade with other players and build powerful decks.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/cards"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 hover:shadow-emerald-800/50 active:scale-95"
            >
              Browse all cards
            </Link>
            {user ? (
              <Link
                href="/collection"
                className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-700 active:scale-95"
              >
                My collection
              </Link>
            ) : (
              <Link
                href="/register"
                className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-700 active:scale-95"
              >
                Create account
              </Link>
            )}
          </div>

          {/* Live stat */}
          {cardCount > 0 && (
            <p className="mt-8 text-xs text-gray-600">
              <span className="font-semibold tabular-nums text-gray-400">{cardCount}</span> cards in the catalogue
            </p>
          )}
        </div>
      </section>

      {/* ── Domains ────────────────────────────────────── */}
      <section className="border-y border-gray-800 bg-gray-900/80">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Six domains
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {DOMAINS.map(({ slug, label, ring }) => (
              <Link
                key={slug}
                href={`/cards?domain=${slug}`}
                className={`group flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/50 px-5 py-4 transition hover:border-gray-700 hover:bg-gray-800 ${ring} hover:ring-1`}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-gray-900 p-1 transition group-hover:border-gray-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/domains/${slug}.webp`}
                    alt={label}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-xs font-semibold capitalize text-gray-400 group-hover:text-gray-200">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
          Everything in one place
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon, title, desc, href, cta, accent, border }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-800/40 p-6 transition hover:bg-gray-800/70 ${border}`}
            >
              <div className={`${accent} transition group-hover:scale-110`}>{icon}</div>
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{desc}</p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${accent} flex items-center gap-1`}>
                {cta}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition group-hover:translate-x-0.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Sets ───────────────────────────────────────── */}
      <section className="border-t border-gray-800">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            Available sets
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { code: "OGN", name: "Origins Main Set", desc: "The original 400+ card core set that started it all.", color: "from-amber-900/20" },
              { code: "SFD", name: "Spiritforged",      desc: "New champions, spells and gear expanding the meta.", color: "from-blue-900/20" },
            ].map((set) => (
              <Link
                key={set.code}
                href={`/cards?set=${set.code}`}
                className={`group flex min-w-[200px] flex-1 flex-col rounded-2xl border border-gray-800 bg-gradient-to-br ${set.color} to-gray-900 p-6 transition hover:border-gray-700 hover:brightness-110`}
              >
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-600 group-hover:text-gray-500">
                  {set.code}
                </span>
                <span className="mb-2 text-lg font-bold text-white">{set.name}</span>
                <span className="text-sm text-gray-500">{set.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA footer strip ───────────────────────────── */}
      {!user && (
        <section className="border-t border-gray-800 bg-gray-800/30">
          <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
            <h2 className="mb-3 text-2xl font-bold text-white">Ready to start collecting?</h2>
            <p className="mb-8 text-gray-500">
              Create a free account to track your collection, build decks and trade with other players.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-700 active:scale-95"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
