"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { joinPlaySessionByCode } from "@/lib/play-sessions";

export default function PlayJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      toast.error("Introduza um código válido.");
      return;
    }
    setLoading(true);
    try {
      const session = await joinPlaySessionByCode(trimmed);
      router.push(`/play/session/${session.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível entrar na sala.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/play" className="mb-6 inline-block text-sm text-emerald-400 hover:text-emerald-300">
          Voltar
        </Link>
        <h1 className="mb-2 text-2xl font-bold text-white">Entrar na sala</h1>
        <p className="mb-6 text-sm text-gray-400">Cole ou digite o código que o anfitrião partilhou.</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex.: XK7M2P"
            autoComplete="off"
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-3 font-mono text-lg tracking-widest text-white placeholder:text-gray-600"
            maxLength={8}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
