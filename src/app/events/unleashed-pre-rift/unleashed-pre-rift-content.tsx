"use client";

import Link from "next/link";
import { PreRiftCardThumb, PreRiftPromoThumb } from "@/components/events/pre-rift-card-thumb";
import { PreRiftSimulatorSection } from "@/components/events/pre-rift-simulator-section";
import {
  UNLEASHED_PRE_RIFT_DECKS,
  UNLEASHED_PRE_RIFT_PROMO,
} from "@/data/unleashed-pre-rift-decks";
import { useCards } from "@/lib/cards-context";
import { useLocale } from "@/lib/locale-context";

export function UnleashedPreRiftContent() {
  const { t } = useLocale();
  const { cards } = useCards();
  const p = (key: string) => t(`events.unleashedPreRift.${key}`);

  return (
    <div className="relative min-h-screen bg-gray-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-amber-900/15 blur-[120px]" />
        <div className="absolute -right-24 top-24 h-[360px] w-[360px] rounded-full bg-emerald-900/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 h-[280px] w-[560px] -translate-x-1/2 rounded-full bg-violet-900/10 blur-[90px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <nav className="mb-8 text-sm text-gray-500">
          <Link href="/" className="text-emerald-400/90 hover:text-emerald-300">
            {p("backHome")}
          </Link>
        </nav>

        {/* Hero */}
        <header className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            Unleashed
          </p>
          <h1 className="mb-4 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            {p("heroTitle")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300">{p("heroSubtitle")}</p>
        </header>

        {/* Formato */}
        <section className="mb-16 rounded-2xl border border-gray-700/60 bg-gray-800/30 p-6 sm:p-8">
          <h2 className="mb-4 text-xl font-bold text-white">{p("formatTitle")}</h2>
          <p className="mb-6 text-gray-400">{p("formatIntro")}</p>
          <ul className="list-inside list-disc space-y-2 text-gray-300 marker:text-emerald-500/80">
            <li>{p("formatBullet1")}</li>
            <li>{p("formatBullet2")}</li>
            <li>{p("formatBullet3")}</li>
          </ul>
        </section>

        {/* CTA para simulador */}
        <section className="mb-16 rounded-2xl border border-emerald-700/35 bg-gradient-to-r from-gray-800/45 via-gray-800/30 to-emerald-900/25 p-6 sm:p-8">
          <h2 className="mb-2 text-xl font-bold text-white">{p("simCtaTitle")}</h2>
          <p className="mb-5 max-w-3xl text-sm leading-relaxed text-gray-300">{p("simCtaIntro")}</p>
          <a
            href="#pre-rift-simulator"
            className="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {p("simJumpToSection")}
          </a>
        </section>

        {/* Promo */}
        <section className="mb-16">
          <h2 className="mb-2 text-center text-xl font-bold text-white">{p("promoTitle")}</h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-gray-400">{p("promoBody")}</p>
          <PreRiftPromoThumb
            cards={cards}
            name={UNLEASHED_PRE_RIFT_PROMO.name}
            collectorNumber={UNLEASHED_PRE_RIFT_PROMO.collectorNumber}
          />
        </section>

        {/* Decks */}
        <section>
          <h2 className="mb-2 text-center text-2xl font-bold text-white">{p("decksTitle")}</h2>
          <p className="mx-auto mb-10 max-w-2xl text-center text-gray-400">{p("decksIntro")}</p>

          <div className="space-y-8">
            {UNLEASHED_PRE_RIFT_DECKS.map((deck) => (
              <article
                key={deck.slug}
                className="rounded-xl border border-gray-700/70 bg-gray-800/40 shadow-sm shadow-black/20"
              >
                <h3 className="border-b border-gray-700/60 px-4 py-4 text-lg font-semibold text-white sm:px-6">
                  {deck.title}
                </h3>
                <div className="px-4 pb-6 pt-5 sm:px-6">
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                        {p("labelLegend")}
                      </h4>
                      <PreRiftCardThumb
                        cards={cards}
                        name={deck.legend}
                        collectorNumber={deck.legendCollector}
                      />
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                        {p("labelChampion")}
                      </h4>
                      <PreRiftCardThumb cards={cards} name={deck.champion} />
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                        {p("labelBattlefield")}
                      </h4>
                      <PreRiftCardThumb cards={cards} name={deck.battlefield} />
                    </div>
                  </div>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-500/90">
                    {p("labelMainDeck")}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {deck.mainDeck.map((cardName) => (
                      <PreRiftCardThumb key={cardName} cards={cards} name={cardName} />
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-16">
          <PreRiftSimulatorSection />
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-4">
          <Link
            href="/cards"
            className="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            {p("browseCards")}
          </Link>
        </div>
      </div>
    </div>
  );
}
