"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createPlayLobby } from "@/lib/play-sessions";

export default function PlayCreatePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await createPlayLobby();
        if (!cancelled) {
          router.replace(`/play/session/${session.id}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Não foi possível criar a sala.";
        if (!cancelled) {
          setError(msg);
          toast.error(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-4">
      <p className="text-sm text-gray-300">{error ?? "A criar sala..."}</p>
    </div>
  );
}
