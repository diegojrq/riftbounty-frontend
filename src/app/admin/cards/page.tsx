"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { CardImg } from "@/components/cards/CardImg";
import { CardDescription } from "@/components/cards/CardDescription";
import { getCardImageUrl } from "@/lib/cards";
import {
  listAdminCards,
  getAdminCard,
  createAdminCard,
  updateAdminCard,
  type CreateCardDto,
  type UpdateCardDto,
} from "@/lib/admin";
import { useRiotCatalogSets } from "@/lib/riot-catalog-sets-context";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";

const LIMIT = 20;

export default function AdminCardsPage() {
  const { t } = useLocale();
  const { sets: catalogSets } = useRiotCatalogSets();
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [setFilter, setSetFilter] = useState<string>("");
  const [offset, setOffset] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formScraperId, setFormScraperId] = useState("");
  const [formName, setFormName] = useState("");
  const [formSet, setFormSet] = useState("");
  const [formRarity, setFormRarity] = useState("");
  const [formType, setFormType] = useState("");
  const [formCollectorNumber, setFormCollectorNumber] = useState("");
  const [saving, setSaving] = useState(false);


  const [viewId, setViewId] = useState<string | null>(null);
  const [viewCard, setViewCard] = useState<Card | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editPreviewCard, setEditPreviewCard] = useState<Card | null>(null);

  const actionBase =
    "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-0";
  const viewBtn =
    `${actionBase} border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:text-blue-100 focus:ring-blue-500/40`;
  const editBtn =
    `${actionBase} border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:text-amber-100 focus:ring-amber-500/40`;

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminCards({
        limit: LIMIT,
        offset,
        ...(nameFilter.trim() ? { name: nameFilter.trim() } : {}),
        ...(setFilter ? { set: setFilter } : {}),
      });
      setCards(res.items);
      setTotalCount(res.totalCount);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setLoading(false);
    }
  }, [offset, nameFilter, setFilter, t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);


  const openCreate = () => {
    setEditingId(null);
    setEditPreviewCard(null);
    setFormScraperId("");
    setFormName("");
    setFormSet("");
    setFormRarity("");
    setFormType("");
    setFormCollectorNumber("");
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    setEditingId(id);
    setModalOpen(true);
    setSaving(true);
    try {
      const card = await getAdminCard(id);
      setEditPreviewCard(card);
      setFormScraperId(card.scraperId ?? card.scraper_id ?? "");
      setFormName(card.name ?? "");
      setFormSet(card.set ?? card.cardSet ?? "");
      setFormRarity(card.rarity ?? "");
      setFormType(card.type ?? "");
      setFormCollectorNumber(card.collectorNumber ?? card.collector_number ?? "");

    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openView = async (id: string) => {
    setViewId(id);
    setViewCard(null);
    setViewLoading(true);
    try {
      const card = await getAdminCard(id);
      setViewCard(card);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setViewId(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formScraperId.trim()) {
      toast.error(t("admin.scraperId") + " is required");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const body: UpdateCardDto = {
          name: formName.trim() || undefined,
          set: formSet || undefined,
          cardSet: formSet || undefined,
          rarity: formRarity || undefined,
          type: formType || undefined,
          collectorNumber: formCollectorNumber.trim() || undefined,
        };
        const updated = await updateAdminCard(editingId, body);
        setEditPreviewCard(updated);
        toast.success(t("admin.updated"));
      } else {
        const body: CreateCardDto = {
          scraperId: formScraperId.trim(),
          name: formName.trim() || undefined,
          set: formSet || undefined,
          cardSet: formSet || undefined,
          rarity: formRarity || undefined,
          type: formType || undefined,
          collectorNumber: formCollectorNumber.trim() || undefined,
        };
        const created = await createAdminCard(body);
        setEditPreviewCard(created);
        toast.success(t("admin.created"));
      }
      setModalOpen(false);
      fetchList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 space-y-2">
        <Link
          href="/admin"
          className="inline-block text-sm text-amber-500/90 hover:text-amber-400"
        >
          ← {t("admin.backToAdminHome")}
        </Link>
        <h2 className="text-lg font-semibold text-white">{t("admin.cardsPageHeading")}</h2>
        <p className="max-w-2xl text-sm text-gray-400">{t("admin.cardsPageLead")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder={t("admin.searchPlaceholder")}
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          value={setFilter}
          onChange={(e) => setSetFilter(e.target.value)}
          className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">{t("admin.set")} (all)</option>
          {catalogSets.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          {t("admin.newCard")}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">{t("common.loading")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-gray-700 bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.name")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.set")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.rarity")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.type")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.collectorNumber")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {cards.map((card) => (
                <tr key={getCardId(card)} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-white">
                    <CardHoverPreview card={card}>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openView(getCardId(card))}
                          className="truncate text-left font-medium text-gray-100 hover:text-white hover:underline"
                          title={t("admin.viewCard")}
                        >
                          {card.name}
                        </button>
                      </span>
                    </CardHoverPreview>
                  </td>
                  <td className="px-4 py-2 text-gray-400">{card.set ?? card.cardSet ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{card.rarity ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{card.type ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-400">{card.collectorNumber ?? card.collector_number ?? "—"}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => openView(getCardId(card))}
                      className={`mr-2 ${viewBtn}`}
                    >
                      {t("admin.viewCard")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(getCardId(card))}
                      className={editBtn}
                    >
                      {t("admin.editCard")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalCount > LIMIT && (
        <div className="mt-4 flex items-center gap-4">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
            className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            {offset + 1}–{Math.min(offset + LIMIT, totalCount)} of {totalCount}
          </span>
          <button
            type="button"
            disabled={offset + LIMIT >= totalCount}
            onClick={() => setOffset((o) => o + LIMIT)}
            className="rounded border border-gray-600 px-3 py-1.5 text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {editingId ? t("admin.editCard") : t("admin.newCard")}
                </p>
                <p className="truncate text-lg font-semibold text-white">
                  {formName?.trim() || editPreviewCard?.name || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                  {t("admin.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !formScraperId.trim()}
                  className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20 hover:text-amber-100 disabled:opacity-50"
                >
                  {saving ? t("common.loading") : t("admin.save")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[360px_1fr]">
              <div className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
                {saving && editingId && !editPreviewCard ? (
                  <div className="h-[520px] animate-pulse rounded bg-gray-800/60" />
                ) : (
                  <CardImg
                    src={getCardImageUrl(editPreviewCard ?? ({ name: formName || "—" } as unknown as Card)) ?? "/images/card-back.webp"}
                    alt={formName || editPreviewCard?.name || "Card"}
                    className="w-full rounded object-contain"
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.scraperId")} *</label>
                    <input
                      type="text"
                      value={formScraperId}
                      onChange={(e) => setFormScraperId(e.target.value)}
                      disabled={!!editingId}
                      className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.name")}</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.set")}</label>
                      <select
                        value={formSet}
                        onChange={(e) => setFormSet(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      >
                        <option value="">—</option>
                        {catalogSets.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.rarity")}</label>
                      <input
                        type="text"
                        value={formRarity}
                        onChange={(e) => setFormRarity(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.type")}</label>
                      <input
                        type="text"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">{t("admin.collectorNumber")}</label>
                      <input
                        type="text"
                        value={formCollectorNumber}
                        onChange={(e) => setFormCollectorNumber(e.target.value)}
                        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View (read-only) modal */}
      {viewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{t("admin.viewCard")}</p>
                <p className="truncate text-lg font-semibold text-white">{viewCard?.name ?? "—"}</p>
              </div>
              <button
                type="button"
                onClick={() => { setViewId(null); setViewCard(null); }}
                className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                {t("admin.close")}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[360px_1fr]">
              <div className="rounded-lg border border-gray-800 bg-gray-950/30 p-3">
                {viewLoading ? (
                  <div className="h-[520px] animate-pulse rounded bg-gray-800/60" />
                ) : viewCard ? (
                  <CardImg
                    src={getCardImageUrl(viewCard) ?? "/images/card-back.webp"}
                    alt={viewCard.name ?? "Card"}
                    className="w-full rounded object-contain"
                  />
                ) : (
                  <div className="h-[520px] rounded bg-gray-800/40" />
                )}
              </div>

              <div className="min-w-0">
                {viewLoading ? (
                  <p className="text-sm text-gray-500">{t("common.loading")}</p>
                ) : !viewCard ? (
                  <p className="text-sm text-gray-500">—</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.set")}</p>
                        <p className="text-gray-200">{viewCard.set ?? viewCard.cardSet ?? "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.rarity")}</p>
                        <p className="text-gray-200">{viewCard.rarity ?? "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.type")}</p>
                        <p className="text-gray-200">{viewCard.type ?? "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.collectorNumber")}</p>
                        <p className="text-gray-200">{viewCard.collectorNumber ?? viewCard.collector_number ?? "—"}</p>
                      </div>
                    </div>

                    {"description" in viewCard && (viewCard as { description?: string }).description && (
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Text</p>
                        <CardDescription
                          text={(viewCard as { description: string }).description}
                          className="text-sm text-gray-200"
                          domain={(viewCard.domain ?? (viewCard.domains?.[0] ?? undefined)) as string | undefined}
                        />
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
