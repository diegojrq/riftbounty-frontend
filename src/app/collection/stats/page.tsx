"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CollectionStats } from "@/components/collection/CollectionStats";
import { BackLink } from "@/components/layout/BackLink";
import { useAuth } from "@/lib/auth-context";

export default function CollectionStatsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
          <div className="mb-6 rounded-xl border border-gray-700/60 bg-gray-800/40 p-6">
            <div className="flex items-center justify-center py-24">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-500 border-t-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10 xl:px-12">
        <BackLink href="/collection" label="My Collection" />
        <h1 className="mb-6 text-2xl font-bold text-white">Collection stats</h1>
        <CollectionStats />
      </div>
    </div>
  );
}
