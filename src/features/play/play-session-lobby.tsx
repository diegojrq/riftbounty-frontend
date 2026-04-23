"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getDecks } from "@/lib/decks";
import { getPlaySession, selectDeckForPlaySession } from "@/lib/play-sessions";
import { useAuth } from "@/lib/auth-context";
import type { Deck } from "@/types/deck";
import type { PlaySession } from "@/types/play-session";

export function PlaySessionLobby({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<PlaySession | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const s = await getPlaySession(sessionId);
    setSession(s);
    return s;
  }, [sessionId]);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, list] = await Promise.all([load(), getDecks()]);
        if (!cancelled) {
          setDecks(list);
          if (s.status === "ready") {
            router.replace(`/play/board/${sessionId}`);
          }
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Erro ao carregar sessão.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, load, router, sessionId, user]);

  useEffect(() => {
    if (!session || session.status === "ready" || authLoading || !user) return;
    const t = window.setInterval(() => {
      void load().then((s) => {
        if (s.status === "ready") {
          router.replace(`/play/board/${sessionId}`);
        }
      });
    }, 2000);
    return () => window.clearInterval(t);
  }, [authLoading, load, router, session, sessionId, user]);

  const role = useMemo(() => {
    if (!session || !user) return null;
    if (session.ownerUserId === user.id) return "host" as const;
    if (session.playerBUserId === user.id) return "guest" as const;
    return null;
  }, [session, user]);

  const myDeckId = useMemo(() => {
    if (!session || !user) return null;
    if (session.ownerUserId === user.id) return session.playerADeckId;
    if (session.playerBUserId === user.id) return session.playerBDeckId;
    return null;
  }, [session, user]);

  async function onSelectDeck(deckId: string) {
    try {
      const next = await selectDeckForPlaySession(sessionId, deckId);
      setSession(next);
      if (next.status === "ready") {
        router.replace(`/play/board/${sessionId}`);
      } else {
        toast.success("Deck associado.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível escolher o deck.");
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        {authLoading ? "A carregar..." : "Inicie sessão para jogar online."}
      </div>
    );
  }

  if (loading || !session) {
    return <div className="py-12 text-center text-gray-400">A carregar sessão...</div>;
  }

  if (!role) {
    return (
      <div className="rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-100">
        Não tens acesso a esta sessão.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</p>
        <p className="text-lg font-medium text-white capitalize">{session.status.replace(/_/g, " ")}</p>
        <p className="mt-1 font-mono text-xs text-gray-500">Sessão: {session.id}</p>
      </div>

      {session.joinCode && (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500/90">Código da sala</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em] text-white">{session.joinCode}</p>
          {role === "host" && session.status === "waiting_for_guest" && (
            <p className="mt-2 text-sm text-gray-400">Partilha este código com o adversário para entrar na sala.</p>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-white">Escolhe o teu deck</h2>
        <p className="mb-4 text-xs text-gray-500">
          {role === "host" ? "És o anfitrião (lado A)." : "És o convidado (lado B)."}
          {myDeckId ? ` Deck atual: ${decks.find((d) => d.id === myDeckId)?.name ?? myDeckId}` : " Ainda não escolheste deck."}
        </p>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => void onSelectDeck(d.id)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-left text-sm text-gray-200 hover:border-emerald-700 hover:bg-gray-800"
              >
                <span>{d.name || "Sem nome"}</span>
                {myDeckId === d.id && <span className="text-xs text-emerald-400">Selecionado</span>}
              </button>
            </li>
          ))}
        </ul>
        {decks.length === 0 && <p className="text-sm text-gray-500">Cria um deck em /decks primeiro.</p>}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-800 pt-6">
        <Link href="/play" className="text-sm text-gray-400 hover:text-white">
          Sair do lobby
        </Link>
      </div>
    </div>
  );
}
