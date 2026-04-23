"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlaySessionLobby } from "@/features/play/play-session-lobby";
import { useAuth } from "@/lib/auth-context";

export default function PlaySessionPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/play/session/${id}`)}`);
    }
  }, [id, loading, router, user]);

  if (!id) {
    return <p className="p-8 text-gray-400">Sessão inválida.</p>;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <nav className="mb-6">
          <Link href="/play" className="text-sm text-emerald-400 hover:text-emerald-300">
            Play online
          </Link>
        </nav>
        <PlaySessionLobby sessionId={id} />
      </div>
    </div>
  );
}
