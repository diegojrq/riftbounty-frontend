"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listCommunities } from "@/lib/communities";
import { useLocale } from "@/lib/locale-context";
import type { Community } from "@/types/community";

const PAGE_SIZE = 50;

export default function CommunitiesListPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<Community[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (o: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCommunities({ limit: PAGE_SIZE, offset: o });
      setItems(res.items);
      setTotal(res.total);
      setOffset(res.offset);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("communities.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(0);
  }, [load]);

  const hasPrev = offset > 0;
  const hasNext = offset + items.length < total;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-10 sm:px-6 lg:px-10 xl:px-12">
        <header className="mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-white">{t("communities.title")}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">{t("communities.subtitle")}</p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">{t("communities.emptyList")}</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-gray-500">
              {t("communities.showing", { from: offset + 1, to: offset + items.length, total })}
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/communities/${encodeURIComponent(c.slug)}`}
                    className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60 transition hover:border-emerald-500/40 hover:bg-gray-800"
                  >
                    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-gray-800">
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-4xl text-gray-600">
                          #
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <span className="font-semibold text-white">{c.name}</span>
                      <span className="mt-0.5 text-xs text-gray-500">@{c.slug}</span>
                      {c.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-gray-400">{c.description}</p>
                      )}
                      <span className="mt-3 text-xs font-medium text-emerald-400/90">
                        {t("communities.memberCount", { count: c.memberCount })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                disabled={!hasPrev || loading}
                onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-40"
              >
                {t("communities.prevPage")}
              </button>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => load(offset + PAGE_SIZE)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-40"
              >
                {t("communities.nextPage")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
