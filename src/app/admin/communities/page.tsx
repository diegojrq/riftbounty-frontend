"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createCommunityAdmin, listCommunities, resolveCommunityErrorMessage } from "@/lib/communities";
import { useLocale } from "@/lib/locale-context";
import type { Community } from "@/types/community";

const PAGE_SIZE = 50;

export default function AdminCommunitiesPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [items, setItems] = useState<Community[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = useCallback(async (o: number) => {
    setLoading(true);
    try {
      const res = await listCommunities({ limit: PAGE_SIZE, offset: o });
      setItems(res.items);
      setTotal(res.total);
      setOffset(res.offset);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("communities.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(0);
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("admin.communitiesValidationName"));
      return;
    }
    setCreating(true);
    try {
      const created = await createCommunityAdmin({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success(t("admin.communitiesCreated", { slug: created.slug }));
      setName("");
      setDescription("");
      router.push(`/admin/communities/${encodeURIComponent(created.slug)}`);
    } catch (err) {
      toast.error(resolveCommunityErrorMessage(t, err));
    } finally {
      setCreating(false);
    }
  }

  const hasPrev = offset > 0;
  const hasNext = offset + items.length < total;

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-2">
        <h2 className="text-xl font-semibold text-white">{t("admin.communitiesTitle")}</h2>
        <p className="text-sm leading-relaxed text-gray-400">{t("admin.communitiesSubtitle")}</p>
      </header>

      <section className="max-w-xl rounded-xl border border-gray-700 bg-gray-800/50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-400/90">{t("admin.communitiesCreateHeading")}</h3>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500">{t("admin.communitiesFieldName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
              required
            />
            <p className="mt-1 text-[11px] text-gray-600">{t("admin.communitiesSlugAutoHint")}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500">{t("admin.communitiesFieldDescription")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-amber-500 disabled:opacity-50"
          >
            {creating ? t("common.loading") : t("admin.communitiesCreateSubmit")}
          </button>
        </form>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">{t("admin.communitiesListHeading")}</h3>
        {loading ? (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">{t("communities.emptyList")}</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-700 bg-gray-800/80">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-400">{t("admin.communitiesFieldName")}</th>
                    <th className="px-4 py-3 font-medium text-gray-400">{t("admin.communitiesFieldSlug")}</th>
                    <th className="px-4 py-3 font-medium text-gray-400">{t("communities.memberCount")}</th>
                    <th className="px-4 py-3 font-medium text-gray-400" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-b border-gray-800/80 hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-white">{c.name}</td>
                      <td className="px-4 py-3 text-gray-400">@{c.slug}</td>
                      <td className="px-4 py-3 text-emerald-400/90">{c.memberCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/communities/${encodeURIComponent(c.slug)}`}
                            className="text-xs font-medium text-blue-400 hover:underline"
                          >
                            {t("admin.communitiesViewPublic")}
                          </Link>
                          <Link
                            href={`/admin/communities/${encodeURIComponent(c.slug)}`}
                            className="text-xs font-medium text-amber-400 hover:underline"
                          >
                            {t("admin.communitiesEdit")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                disabled={!hasPrev || loading}
                onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {t("communities.prevPage")}
              </button>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => load(offset + PAGE_SIZE)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {t("communities.nextPage")}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
