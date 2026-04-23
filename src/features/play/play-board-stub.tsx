"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPlaySession } from "@/lib/play-sessions";
import type { PlaySession } from "@/types/play-session";

import styles from "./play-board-mirror.module.css";

const HAND_SLOTS = 5;

/** Intrínseco: `public/images/play/cardback-runes.webp` e `cardback-deck.webp` (96×134). */
const CARDBACK_W = 96;
const CARDBACK_H = 134;

/** Mock até ligar ao estado da sessão / motor. */
const MOCK_ZONE_COUNTS = {
  opponent: { runes: 12, deck: 39, trash: 0 },
  me: { runes: 20, deck: 35, trash: 2 },
} as const;

/**
 * Tabuleiro resetado — secção 1: duas faixas espelhadas (POV local).
 * - Cima: zona do adversário (para ele, esta faixa é a dele em baixo no ecrã dele).
 * - Baixo: a tua zona.
 * Sem cartas reais ainda; só placeholders em px (zoom 50% seguro).
 */

export function PlayBoardStub({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<PlaySession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getPlaySession(sessionId);
        if (cancelled) return;
        setSession(s);
        const ok =
          s.status === "ready" ||
          s.status === "matched" ||
          s.status === "active" ||
          s.status === "finished";
        if (!ok) {
          router.replace(`/play/session/${sessionId}`);
        }
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "Sessão inválida.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  if (!session) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        A carregar tabuleiro…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-3">
        <div className="min-w-0 flex-1 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Mesa</p>
          <p className="truncate font-mono text-base font-medium tracking-wide text-white">
            {session.joinCode ? `Sala ${session.joinCode}` : session.id.slice(0, 8) + "…"}
          </p>
        </div>
        <Link href="/play" className="shrink-0 text-sm text-cyan-400 hover:text-cyan-300">
          Sair
        </Link>
      </header>

      <div className={styles.shell} data-board="mirror-v1">
        <div className={styles.playerBlock} data-player-block="opponent">
          <TopSlotsRow which="opponent" />
          <div className={styles.stripRow} data-section="opponent-hand-strip">
            <RunesDeck which="opponent" />
            <section className={`${styles.strip} ${styles.stripOpp}`} aria-label="Mão do oponente">
              <p className={`${styles.label} ${styles.labelOpp}`}>Opponent&apos;s hand</p>
              <div className={styles.handSlotArea}>
                <HandSlots which="opponent" />
              </div>
            </section>
            <DeckPanel which="opponent" />
            <TrashPanel which="opponent" />
          </div>
        </div>

        <div className={styles.mid} data-section="battlefield-placeholder">
          <p className={styles.midTitle}>Field</p>
          <div className={styles.midPlaceholder}>Campo (seguinte secção)</div>
        </div>

        <div className={styles.playerBlock} data-player-block="me">
          <TopSlotsRow which="me" />
          <div className={styles.stripRow} data-section="my-hand-strip">
            <RunesDeck which="me" />
            <section className={`${styles.strip} ${styles.stripMe}`} aria-label="A tua mão">
              <p className={`${styles.label} ${styles.labelMe}`}>Hand</p>
              <div className={styles.handSlotArea}>
                <HandSlots which="me" />
              </div>
            </section>
            <DeckPanel which="me" />
            <TrashPanel which="me" />
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-600">
        Secção 1: duas faixas espelhadas + slots de mão ({HAND_SLOTS}) em px. Próximo passo: ligar cartas / estado.
      </p>
    </div>
  );
}

function TopSlotsRow({ which }: { which: "opponent" | "me" }) {
  const rowClass =
    which === "opponent" ? `${styles.topSlotsRow} ${styles.topSlotsRowOpp}` : styles.topSlotsRow;
  return (
    <div className={rowClass} data-top-slots={which}>
      <section className={styles.topZoneRunes} aria-label="Zona de runas">
        <p className={styles.dockTitle}>Runes</p>
        <div className={styles.topZonePlaceholder} />
      </section>
      <section className={styles.topZoneBase} aria-label="Base">
        <p className={styles.dockTitle}>Base</p>
        <div className={styles.topZonePlaceholder} />
      </section>
      <section className={styles.topZoneLegend} aria-label="Legend">
        <p className={styles.dockTitle}>Legend</p>
        <div className={styles.topCardSlot}>
          <div className={`${styles.cardZoneFrame} ${styles.cardZoneTrash}`} aria-hidden />
        </div>
      </section>
      <section className={styles.topZoneChampion} aria-label="Champion">
        <p className={styles.dockTitle}>Champion</p>
        <div className={styles.topCardSlot}>
          <div className={`${styles.cardZoneFrame} ${styles.cardZoneTrash}`} aria-hidden />
        </div>
      </section>
    </div>
  );
}

function ZoneCount({ value }: { value: number }) {
  return (
    <span className={styles.zoneCount} aria-hidden>
      {value}
    </span>
  );
}

function RunesDeck({ which }: { which: "opponent" | "me" }) {
  const n = MOCK_ZONE_COUNTS[which].runes;
  return (
    <div
      className={styles.runesPanel}
      data-runes-deck-for={which}
      role="region"
      aria-label={`Rune Deck, ${n} cartas`}
    >
      <p className={styles.dockTitle}>Rune Deck</p>
      <div className={`${styles.cardZoneFrame} ${styles.cardZoneFill}`}>
        <Image
          src="/images/play/cardback-runes.webp"
          alt="Baralho de runas"
          width={CARDBACK_W}
          height={CARDBACK_H}
          className={styles.cardbackImg}
          draggable={false}
          priority={false}
        />
        <ZoneCount value={n} />
      </div>
    </div>
  );
}

function DeckPanel({ which }: { which: "opponent" | "me" }) {
  const n = MOCK_ZONE_COUNTS[which].deck;
  return (
    <div
      className={styles.deckPanel}
      data-deck-for={which}
      role="region"
      aria-label={`Deck, ${n} cartas`}
    >
      <p className={styles.dockTitle}>Deck</p>
      <div className={`${styles.cardZoneFrame} ${styles.cardZoneFill}`}>
        <Image
          src="/images/play/cardback-deck.webp"
          alt="Baralho principal"
          width={CARDBACK_W}
          height={CARDBACK_H}
          className={styles.cardbackImg}
          draggable={false}
        />
        <ZoneCount value={n} />
      </div>
    </div>
  );
}

function TrashPanel({ which }: { which: "opponent" | "me" }) {
  const n = MOCK_ZONE_COUNTS[which].trash;
  return (
    <div
      className={styles.trashPanel}
      data-trash-for={which}
      role="region"
      aria-label={`Trash, ${n} cartas`}
    >
      <p className={styles.dockTitle}>Trash</p>
      <div className={`${styles.cardZoneFrame} ${styles.cardZoneTrash}`}>
        <ZoneCount value={n} />
      </div>
    </div>
  );
}

function HandSlots({ which }: { which: "opponent" | "me" }) {
  return (
    <div className={styles.handRow} data-hand-for={which}>
      {Array.from({ length: HAND_SLOTS }).map((_, i) => (
        <div key={i} className={styles.handCard} aria-hidden>
          <Image
            src="/images/play/cardback-deck.webp"
            alt=""
            width={CARDBACK_W}
            height={CARDBACK_H}
            className={styles.cardbackImg}
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}
