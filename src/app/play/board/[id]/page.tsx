"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlayBoardStub } from "@/features/play/play-board-stub";
import { useAuth } from "@/lib/auth-context";

export default function PlayBoardPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/play/board/${id}`)}`);
    }
  }, [id, loading, router, user]);

  if (!id) {
    return <p className="p-8 text-gray-400">Tabuleiro inválido.</p>;
  }

  return (
    <div className="min-h-screen bg-[#030712]">
      <div className="mx-auto w-full max-w-[1600px] px-2 pb-8 pt-4 sm:px-4 lg:px-6">
        <nav className="mb-4">
          <Link href="/play" className="text-sm text-cyan-500/90 hover:text-cyan-400">
            ← Play online
          </Link>
        </nav>
        <PlayBoardStub sessionId={id} />
      </div>
    </div>
  );
}
