"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import { SiteFooterBlock } from "@/components/layout/SiteFooterBlock";

const DOMAINS = [
  { slug: "fury",  color: "from-red-900/40 to-transparent",   ring: "ring-red-700/50"   },
  { slug: "calm",  color: "from-blue-900/40 to-transparent",  ring: "ring-blue-700/50"  },
  { slug: "mind",  color: "from-violet-900/40 to-transparent",ring: "ring-violet-700/50"},
  { slug: "body",  color: "from-amber-900/40 to-transparent", ring: "ring-amber-700/50" },
  { slug: "chaos", color: "from-pink-900/40 to-transparent",  ring: "ring-pink-700/50"  },
  { slug: "order", color: "from-emerald-900/40 to-transparent",ring: "ring-emerald-700/50"},
] as const;

const FEATURES_CONFIG = [
  { href: "/cards", titleKey: "home.browseCatalogue", descKey: "home.browseCatalogueDesc", ctaKey: "home.browseCards", accent: "text-blue-400", border: "hover:border-blue-700/60" },
  { href: "/collection", titleKey: "home.manageCollection", descKey: "home.manageCollectionDesc", ctaKey: "home.myCollection", accent: "text-emerald-400", border: "hover:border-emerald-700/60" },
  { href: "/trades", titleKey: "home.tradeWithPlayers", descKey: "home.tradeWithPlayersDesc", ctaKey: "home.myTrades", accent: "text-amber-400", border: "hover:border-amber-700/60" },
  { href: "/decks", titleKey: "home.buildDecks", descKey: "home.buildDecksDesc", ctaKey: "home.myDecks", accent: "text-purple-400", border: "hover:border-purple-700/60" },
] as const;

const FEATURE_ICONS = [
  <svg key="cards" xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="3" width="20" height="14" rx="2"/><path d="m8 21 4-4 4 4"/><path d="M8 13h8"/></svg>,
  <svg key="coll" xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>,
  <svg key="trade" xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></svg>,
  <svg key="decks" xmlns="http://www.w3.org/2000/svg" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 19l-2-2"/><circle cx="17" cy="17" r="5"/></svg>,
];

const SET_CARD_COLORS = [
  "from-amber-900/20",
  "from-blue-900/20",
  "from-violet-900/25",
  "from-emerald-900/20",
  "from-rose-900/20",
  "from-cyan-900/20",
] as const;

export default function HomePage() {
  const { user } = useAuth();
  const { cards } = useCards();
  const { t } = useLocale();
  const { sets } = useRiotCatalogSets();
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
            {t("home.tagline")}
          </p>
          <p className="mx-auto mb-6 max-w-lg text-sm text-gray-500">
            {t("home.heroDesc")}
          </p>

          <p className="mx-auto mb-8">
            <Link
              href="/cards?set=UNL"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-gradient-to-r from-emerald-950/70 via-emerald-900/35 to-emerald-950/70 px-3.5 py-2 text-sm font-medium text-emerald-100 shadow-[0_0_24px_-14px_rgba(16,185,129,0.85)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:from-emerald-900/75 hover:to-emerald-900/60"
            >
              <span className="card-flag-new--foil relative inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 ring-1 ring-amber-900/25">
                <span className="relative z-20">Novo</span>
              </span>
              {t("home.unleashedAvailable")}
            </Link>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/cards"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 hover:shadow-emerald-800/50 active:scale-95"
            >
              {t("home.browseAllCards")}
            </Link>
            {user ? (
              <Link
                href="/collection"
                className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-700 active:scale-95"
              >
                {t("home.myCollection")}
              </Link>
            ) : (
              <Link
                href="/register"
                className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:bg-gray-700 active:scale-95"
              >
                {t("auth.createAccount")}
              </Link>
            )}
          </div>

          {/* Live stat */}
          {cardCount > 0 && (
            <p className="mt-8 text-xs text-gray-600">
              {t("home.cardsInCatalogue", { count: cardCount })}
            </p>
          )}
        </div>
      </section>

      {/* ── Domains ────────────────────────────────────── */}
      <section className="border-y border-gray-800 bg-gray-900/80">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            {t("home.sixDomains")}
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            {DOMAINS.map(({ slug, ring }) => (
              <Link
                key={slug}
                href={`/cards?domain=${slug}`}
                className={`group flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/50 px-5 py-4 transition hover:border-gray-700 hover:bg-gray-800 ${ring} hover:ring-1`}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-gray-900 p-1 transition group-hover:border-gray-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/domains/${slug}.webp`}
                    alt={t(`home.domains.${slug}`)}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-xs font-semibold capitalize text-gray-400 group-hover:text-gray-200">
                  {t(`home.domains.${slug}`)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
          {t("home.everythingInOnePlace")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES_CONFIG.map(({ href, titleKey, descKey, ctaKey, accent, border }, i) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col gap-4 rounded-2xl border border-gray-800 bg-gray-800/40 p-6 transition hover:bg-gray-800/70 ${border}`}
            >
              <div className={`${accent} transition group-hover:scale-110`}>{FEATURE_ICONS[i]}</div>
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-white">{t(titleKey)}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{t(descKey)}</p>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${accent} flex items-center gap-1`}>
                {t(ctaKey)}
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
            {t("home.availableSets")}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {sets.map((set, i) => (
              <Link
                key={set.code}
                href={`/cards?set=${set.code}`}
                className={`group flex min-w-[200px] flex-1 flex-col rounded-2xl border border-gray-800 bg-gradient-to-br ${SET_CARD_COLORS[i % SET_CARD_COLORS.length]} to-gray-900 p-6 transition hover:border-gray-700 hover:brightness-110`}
              >
                <span className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-600 group-hover:text-gray-500">
                  {set.code}
                </span>
                <span className="mb-2 text-lg font-bold text-white">{set.name}</span>
                <span className="text-sm text-gray-500">
                  {set.description?.trim() || t("home.setDescriptionFallback")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA footer strip ───────────────────────────── */}
      {!user && (
        <section className="border-t border-gray-800 bg-gray-800/30">
          <div className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
            <h2 className="mb-3 text-2xl font-bold text-white">{t("home.readyToStart")}</h2>
            <p className="mb-8 text-gray-500">
              {t("home.readyDesc")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/register"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
              >
                {t("auth.createAccount")}
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-gray-600 bg-gray-800 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-700 active:scale-95"
              >
                {t("nav.login")}
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooterBlock as="section" />
    </div>
  );
}
