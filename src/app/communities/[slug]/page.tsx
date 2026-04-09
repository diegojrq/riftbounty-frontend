"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BackLink } from "@/components/layout/BackLink";
import { CommunityAggregateLinesModal } from "@/components/communities/CommunityAggregateLinesModal";
import { useAuth } from "@/lib/auth-context";
import { ApiClientError } from "@/lib/api";
import {
  getCommunity,
  getCommunityAggregatesForSale,
  getCommunityAggregatesWishlist,
  getStoredCommunityMembership,
  joinCommunity,
  leaveCommunity,
  listCommunityMembers,
  resolveCommunityErrorMessage,
  setStoredCommunityMembership,
} from "@/lib/communities";
import { useLocale } from "@/lib/locale-context";
import { getCardImageUrl, mergePublicProfileCardWithCatalog } from "@/lib/cards";
import type { Community, CommunityAggregateRow, CommunityMember } from "@/types/community";

type AggregateLinesModalState = { kind: "forSale" | "wishlist"; row: CommunityAggregateRow } | null;

const MEMBERS_PAGE = 50;

export default function CommunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const { user, loading: authLoading } = useAuth();
  const { t, locale } = useLocale();

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [memberHint, setMemberHint] = useState<boolean | null>(null);

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [membersTotal, setMembersTotal] = useState(0);
  const [membersNextOffset, setMembersNextOffset] = useState(0);
  const [membersLoading, setMembersLoading] = useState(false);

  const [forSaleRows, setForSaleRows] = useState<CommunityAggregateRow[]>([]);
  const [forSaleLoading, setForSaleLoading] = useState(true);
  const [forSaleError, setForSaleError] = useState<string | null>(null);

  const [wishlistRows, setWishlistRows] = useState<CommunityAggregateRow[]>([]);
  const [wishlistState, setWishlistState] = useState<
    "idle" | "loading" | "ok" | "guest" | "forbidden" | "error"
  >("idle");

  const [aggregateLinesModal, setAggregateLinesModal] = useState<AggregateLinesModalState>(null);

  const formatJoined = useCallback(
    (iso: string) => {
      try {
        return new Date(iso).toLocaleDateString(locale === "pt-BR" ? "pt-BR" : "en-US", {
          dateStyle: "medium",
        });
      } catch {
        return iso;
      }
    },
    [locale]
  );

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    try {
      const c = await getCommunity(slug);
      setCommunity(c);
      if (typeof c.isMember === "boolean") {
        setMemberHint(c.isMember);
        setStoredCommunityMembership(slug, c.isMember);
      } else {
        const stored = getStoredCommunityMembership(slug);
        setMemberHint(stored);
      }
    } catch {
      setNotFound(true);
      setCommunity(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchMembersPage = useCallback(
    async (fromOffset: number, append: boolean) => {
      if (!slug) return;
      setMembersLoading(true);
      try {
        const res = await listCommunityMembers(slug, { limit: MEMBERS_PAGE, offset: fromOffset });
        setMembers((prev) => (append ? [...prev, ...res.items] : res.items));
        setMembersTotal(res.total);
        setMembersNextOffset(res.offset + res.items.length);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("communities.errorGeneric"));
      } finally {
        setMembersLoading(false);
      }
    },
    [slug, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!slug) return;
    fetchMembersPage(0, false);
  }, [slug, fetchMembersPage]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setForSaleLoading(true);
    setForSaleError(null);
    getCommunityAggregatesForSale(slug)
      .then((res) => {
        if (!cancelled) setForSaleRows(res.items);
      })
      .catch((e) => {
        if (!cancelled) setForSaleError(e instanceof Error ? e.message : t("communities.errorGeneric"));
      })
      .finally(() => {
        if (!cancelled) setForSaleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  useEffect(() => {
    if (!slug) {
      setWishlistState("idle");
      setWishlistRows([]);
      return;
    }
    if (!user) {
      setWishlistState("guest");
      setWishlistRows([]);
      return;
    }
    if (memberHint === false) {
      setWishlistState("forbidden");
      setWishlistRows([]);
      return;
    }

    if (loading) {
      setWishlistState("loading");
      return;
    }

    let cancelled = false;
    setWishlistState("loading");
    getCommunityAggregatesWishlist(slug)
      .then((res) => {
        if (!cancelled) {
          setWishlistRows(res.items);
          setWishlistState("ok");
          setMemberHint(true);
          setStoredCommunityMembership(slug, true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 403) {
          setWishlistRows([]);
          setWishlistState("forbidden");
          setMemberHint(false);
          setStoredCommunityMembership(slug, false);
          return;
        }
        setWishlistState("error");
        setWishlistRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, user, memberHint, loading]);

  async function handleJoin() {
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(`/communities/${slug}`)}`);
      return;
    }
    setActionLoading(true);
    try {
      const res = await joinCommunity(slug);
      setStoredCommunityMembership(slug, true);
      setMemberHint(true);
      if (res.wasNew) {
        toast.success(t("communities.joinSuccess"));
      } else {
        toast.message(t("communities.joinAlreadyMember"));
      }
      await load();
      await fetchMembersPage(0, false);
    } catch (err) {
      toast.error(resolveCommunityErrorMessage(t, err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!user) return;
    setActionLoading(true);
    try {
      await leaveCommunity(slug);
      setStoredCommunityMembership(slug, false);
      setMemberHint(false);
      setWishlistState("forbidden");
      setWishlistRows([]);
      toast.success(t("communities.leaveSuccess"));
      await load();
      await fetchMembersPage(0, false);
    } catch (err) {
      toast.error(resolveCommunityErrorMessage(t, err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto flex min-h-[40vh] w-full max-w-[1600px] items-center justify-center px-4 sm:px-6 lg:px-10 xl:px-12">
          <p className="text-center text-gray-500">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (notFound || !community) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto flex min-h-[40vh] w-full max-w-[1600px] flex-col items-center justify-center px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-md text-center">
          <h1 className="mb-2 text-xl font-bold text-white">{t("communities.errorNotFound")}</h1>
          <Link href="/communities" className="text-amber-400 hover:underline">
            {t("communities.backToList")}
          </Link>
        </div>
        </div>
      </div>
    );
  }

  const showLeave = user && memberHint === true;
  const showJoin = user && memberHint !== true;
  const hasMoreMembers = members.length < membersTotal;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 pb-24 sm:pb-10 sm:px-6 lg:px-10 xl:px-12">
        <BackLink href="/communities" label={t("communities.backToList")} className="mb-6" />

        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800 lg:col-span-5">
            <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-gray-800 lg:min-h-[240px] lg:flex-1">
              {community.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={community.avatarUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-6xl text-gray-600">
                  #
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col lg:col-span-7">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
              <div className="border-b border-gray-700 px-5 py-4">
                <h1 className="text-2xl font-bold text-white lg:text-3xl">{community.name}</h1>
                <p className="mt-1 text-sm text-gray-500">@{community.slug}</p>
                <p className="mt-3 text-sm text-emerald-400/90">
                  {t("communities.memberCount", { count: community.memberCount })}
                </p>
              </div>
              {community.description ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{community.description}</p>
                </div>
              ) : (
                <div className="min-h-0 flex-1" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 lg:mt-6">
              {!user && (
                <button
                  type="button"
                  onClick={() => router.push(`/login?returnTo=${encodeURIComponent(`/communities/${slug}`)}`)}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  {t("communities.loginToJoin")}
                </button>
              )}
              {showJoin && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleJoin}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading ? t("common.loading") : t("communities.join")}
                </button>
              )}
              {showLeave && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleLeave}
                  className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-50"
                >
                  {actionLoading ? t("common.loading") : t("communities.leave")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:items-start">
        <section className="min-h-0 overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
          <div className="border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t("communities.sectionMembers")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("communities.sectionMembersHint", { total: membersTotal })}</p>
          </div>
          <div className="px-3 py-2">
            {membersLoading && members.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t("common.loading")}</p>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t("communities.membersEmpty")}</p>
            ) : (
              <ul className="divide-y divide-gray-800/80">
                {members.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 px-2 py-2.5 hover:bg-gray-800/40">
                    <Link href={`/u/${encodeURIComponent(m.slug)}`} className="text-sm font-medium text-blue-400 hover:underline">
                      {m.displayName || m.slug}
                    </Link>
                    <span className="text-xs text-gray-500">
                      @{m.slug} · {formatJoined(m.joinedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {hasMoreMembers && (
              <div className="border-t border-gray-800 p-3 text-center">
                <button
                  type="button"
                  disabled={membersLoading}
                  onClick={() => fetchMembersPage(membersNextOffset, true)}
                  className="text-sm font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
                >
                  {membersLoading ? t("common.loading") : t("communities.membersLoadMore")}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
          <div className="border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t("communities.sectionForSale")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("communities.sectionForSaleHint")}</p>
          </div>
          <div className="px-3 py-2">
            {forSaleLoading ? (
              <p className="py-4 text-center text-sm text-gray-500">{t("common.loading")}</p>
            ) : forSaleError ? (
              <p className="py-4 text-center text-sm text-red-300">{forSaleError}</p>
            ) : forSaleRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t("communities.aggregateEmpty")}</p>
            ) : (
              <AggregateCardList rows={forSaleRows} t={t} onLineClick={(row) => setAggregateLinesModal({ kind: "forSale", row })} />
            )}
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60">
          <div className="border-b border-gray-700 px-5 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{t("communities.sectionWishlist")}</h2>
            <p className="mt-1 text-xs text-gray-500">{t("communities.sectionWishlistHint")}</p>
          </div>
          <div className="px-3 py-2">
            {wishlistState === "guest" && (
              <p className="py-4 text-center text-sm text-gray-500">{t("communities.wishlistAggregateLogin")}</p>
            )}
            {wishlistState === "forbidden" && (
              <p className="py-4 text-center text-sm text-gray-500">{t("communities.aggregateWishlistMembersOnly")}</p>
            )}
            {wishlistState === "loading" && (
              <p className="py-4 text-center text-sm text-gray-500">{t("common.loading")}</p>
            )}
            {wishlistState === "error" && (
              <p className="py-4 text-center text-sm text-red-300">{t("communities.errorGeneric")}</p>
            )}
            {wishlistState === "ok" && wishlistRows.length === 0 && (
              <p className="py-4 text-center text-sm text-gray-500">{t("communities.aggregateEmpty")}</p>
            )}
            {wishlistState === "ok" && wishlistRows.length > 0 && (
              <AggregateCardList
                rows={wishlistRows}
                t={t}
                onLineClick={(row) => setAggregateLinesModal({ kind: "wishlist", row })}
              />
            )}
          </div>
        </section>
        </div>
      </div>

      {aggregateLinesModal && (
        <CommunityAggregateLinesModal
          open
          onClose={() => setAggregateLinesModal(null)}
          kind={aggregateLinesModal.kind}
          cardId={aggregateLinesModal.row.cardId}
          card={aggregateLinesModal.row.card}
          lines={aggregateLinesModal.row.lines}
        />
      )}
    </div>
  );
}

function AggregateCardList({
  rows,
  t,
  onLineClick,
}: {
  rows: CommunityAggregateRow[];
  t: (key: string, params?: Record<string, string | number>) => string;
  onLineClick: (row: CommunityAggregateRow) => void;
}) {
  return (
    <ul className="space-y-1">
      {rows.map((row) => {
        const c = row.card;
        const preview = c ? mergePublicProfileCardWithCatalog(c, undefined, row.cardId) : null;
        const img = preview ? getCardImageUrl(preview) : null;
        const label = c?.name ?? row.cardId;
        return (
          <li key={row.cardId}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onLineClick(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onLineClick(row);
                }
              }}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 outline-none hover:bg-gray-800/70 focus-visible:ring-2 focus-visible:ring-amber-500/80"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="pointer-events-none h-11 w-11 shrink-0 rounded-md border border-gray-600 object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-600">
                    ?
                  </div>
                )}
                <span className="truncate text-sm font-medium text-gray-200">{label}</span>
              </div>
              <div className="pointer-events-none shrink-0 text-right text-xs text-gray-400">
                <div className="font-medium text-emerald-400/90">{t("communities.aggregateQty", { n: row.totalQuantity })}</div>
                <div className="text-gray-500">{t("communities.aggregatePeople", { n: row.memberCount })}</div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
