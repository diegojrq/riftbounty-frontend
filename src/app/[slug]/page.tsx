"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getPublicProfile } from "@/lib/profile";
import type { PublicUser } from "@/types/auth";

const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "profile",
  "decks",
  "collection",
  "cards",
  "api",
  "auth",
]);

export default function PublicProfilePage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    if (RESERVED_SLUGS.has(slug.toLowerCase())) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getPublicProfile(slug)
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-900">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-[50vh] bg-gray-900 px-4 py-12">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">User not found</h1>
          <p className="mb-6 text-gray-400">
            There is no profile for &quot;{slug}&quot; or the address is invalid.
          </p>
          <Link
            href="/"
            className="inline-block rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const publicCollection = user.publicCollection ?? [];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <div className="border-b border-gray-700 px-6 py-5">
            <h1 className="text-xl font-semibold text-white">
              {user.displayName || user.slug}
            </h1>
            <p className="mt-1 text-sm text-gray-500">@{user.slug}</p>
          </div>
          {publicCollection.length > 0 && (
            <div className="border-b border-gray-700 px-6 py-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                Public collection
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {publicCollection.map((item) => (
                  <li
                    key={item.cardUuid}
                    className="flex flex-col items-center rounded-lg border border-gray-600 bg-gray-700/50 p-2"
                  >
                    {item.card.imageUrl ? (
                      <div className="relative h-32 w-full">
                        <Image
                          src={item.card.imageUrl}
                          alt={item.card.name}
                          fill
                          className="object-contain"
                          unoptimized={item.card.imageUrl.startsWith("http")}
                        />
                      </div>
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center rounded bg-gray-700 text-xs text-gray-500">
                        No image
                      </div>
                    )}
                    <p className="mt-2 w-full truncate text-center text-sm font-medium text-white">
                      {item.card.name}
                    </p>
                    <p className="text-xs text-gray-500">× {item.quantity}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {publicCollection.length === 0 && (
            <div className="px-6 py-5">
              <p className="text-sm text-gray-500">
                No public collection to show.
              </p>
            </div>
          )}
        </div>
        <div className="mt-6">
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 hover:text-white"
          >
            ← Home
          </Link>
        </div>
      </div>
    </div>
  );
}
