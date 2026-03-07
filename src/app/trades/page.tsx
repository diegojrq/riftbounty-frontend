"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { listTrades } from "@/lib/trades";
import type { TradeSummary, TradeStatusFilter, TradeRoleFilter } from "@/types/trade";

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  PENDING: "Pending",
  COUNTERED: "Countered",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "border-amber-700 bg-amber-900/30 text-amber-400",
  COUNTERED: "border-blue-700 bg-blue-900/30 text-blue-400",
  ACCEPTED: "border-emerald-700 bg-emerald-900/30 text-emerald-400",
  REJECTED: "border-red-800 bg-red-900/30 text-red-400",
  CANCELLED: "border-gray-700 bg-gray-800 text-gray-500",
};

function TradesSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-700" />
              <div className="space-y-1.5">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-700" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-700/60" />
              </div>
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-gray-700" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MyTurnBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full border border-amber-600/60 bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
      </span>
      Your turn
    </span>
  );
}

export default function TradesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [trades, setTrades] = useState<TradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TradeStatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<TradeRoleFilter>("all");

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listTrades({ status: statusFilter, role: roleFilter });
      setTrades(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error loading trades";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace("/login"); return; }
    fetchTrades();
  }, [authLoading, user, router, fetchTrades]);

  const isMyTurn = (trade: TradeSummary) =>
    user && trade.currentTurnSlug === user.slug &&
    (trade.status === "PENDING" || trade.status === "COUNTERED");

  const counterpart = (trade: TradeSummary) => {
    if (!user) return null;
    if (trade.initiatorSlug === user.slug) {
      return { slug: trade.recipientSlug, displayName: trade.recipientDisplayName };
    }
    return { slug: trade.initiatorSlug, displayName: trade.initiatorDisplayName };
  };

  const getRole = (trade: TradeSummary): "initiator" | "recipient" => {
    if (!user) return "recipient";
    return trade.initiatorSlug === user.slug ? "initiator" : "recipient";
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="mb-6 h-8 w-32 animate-pulse rounded bg-gray-700" />
          <TradesSkeleton />
        </div>
      </div>
    );
  }

  const statusOptions: TradeStatusFilter[] = ["all", "PENDING", "COUNTERED", "ACCEPTED", "REJECTED", "CANCELLED"];
  const roleOptions: { value: TradeRoleFilter; label: string }[] = [
    { value: "all", label: "All roles" },
    { value: "initiator", label: "I started" },
    { value: "recipient", label: "Received" },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">My Trades</h1>
          <p className="mt-1 text-sm text-gray-500">To start a trade, visit another player&apos;s profile.</p>
        </div>

        {/* Filters */}
        <div className="mb-5 space-y-3">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1.5">
            {statusOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "border-blue-500 bg-blue-900/40 text-blue-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Role filter */}
          <div className="flex gap-1.5">
            {roleOptions.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRoleFilter(r.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  roleFilter === r.value
                    ? "border-purple-600 bg-purple-900/40 text-purple-300"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/50 p-3 text-sm text-red-200">{error}</div>
        )}

        {loading ? (
          <TradesSkeleton />
        ) : trades.length === 0 ? (
          <div className="rounded-xl border border-gray-700 bg-gray-800 px-6 py-12 text-center">
            <p className="mb-1 text-sm font-medium text-gray-300">No trades found</p>
            <p className="text-xs text-gray-500">
              {statusFilter !== "all" || roleFilter !== "all"
                ? "Try changing the filters."
                : "Visit another player\u2019s profile to start a trade."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {trades.map((trade) => {
              const other = counterpart(trade);
              const role = getRole(trade);
              const myTurn = isMyTurn(trade);

              return (
                <li key={trade.id}>
                  <Link
                    href={`/trades/${trade.id}`}
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-700 bg-gray-800 p-4 transition hover:border-gray-600 hover:bg-gray-750 hover:shadow-lg"
                  >
                    {/* Left: avatar + info */}
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-base font-bold text-gray-400 select-none">
                        {(other?.displayName ?? other?.slug ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {other?.displayName ?? `@${other?.slug}`}
                          {other?.displayName && (
                            <span className="ml-1 text-xs font-normal text-gray-500">@{other.slug}</span>
                          )}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span className="capitalize">{role}</span>
                          <span>·</span>
                          <span>
                            {role === "initiator" ? trade.initiatorItemCount : trade.recipientItemCount} cards offered
                          </span>
                          <span>·</span>
                          <span>
                            {role === "initiator" ? trade.recipientItemCount : trade.initiatorItemCount} cards requested
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: status + my turn badge */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          STATUS_COLORS[trade.status] ?? "border-gray-700 bg-gray-800 text-gray-400"
                        }`}
                      >
                        {STATUS_LABELS[trade.status] ?? trade.status}
                      </span>
                      {myTurn && <MyTurnBadge />}
                      <time className="text-[11px] text-gray-600" dateTime={trade.updatedAt}>
                        {new Date(trade.updatedAt).toLocaleDateString()}
                      </time>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
