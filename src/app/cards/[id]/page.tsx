"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirect /cards/[id] to /cards (full card page removed; use modal instead). */
export default function CardIdRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/cards");
  }, [router]);
  return null;
}
