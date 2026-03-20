"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import { CardHoverPreview } from "@/components/cards/CardHoverPreview";
import { CardImg } from "@/components/cards/CardImg";
import { CardDescription } from "@/components/cards/CardDescription";
import { getCardImageUrl } from "@/lib/cards";
import {
  listAdminCards,
  getAdminCard,
  listAdminDomains,
  listAdminSubtypes,
  listAdminSupertypes,
  listAdminAttributes,
  createAdminCard,
  updateAdminCard,
  runAdminTcgSync,
  bumpAdminCatalogVersion,
  type AdminRefItem,
  type AdminTcgSyncSummary,
  type CreateCardDto,
  type UpdateCardDto,
} from "@/lib/admin";
import type { Card } from "@/types/card";

const LIMIT = 20;
const SET_OPTIONS = ["OGN", "SFD"] as const;

function ChipsRow({
  items,
  tone,
  max = 6,
}: {
  items: string[] | undefined;
  tone: "amber" | "blue" | "violet";
  max?: number;
}) {
  const list = (items ?? []).filter(Boolean);
  if (list.length === 0) return null;
  const shown = list.slice(0, max);
  const hidden = Math.max(0, list.length - shown.length);
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  const cls =
    tone === "amber"
      ? `${base} border-amber-500/30 bg-amber-500/10 text-amber-200`
      : tone === "blue"
        ? `${base} border-blue-500/30 bg-blue-500/10 text-blue-200`
        : `${base} border-violet-500/30 bg-violet-500/10 text-violet-200`;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <span key={s} className={cls} title={s}>
          {s}
        </span>
      ))}
      {hidden > 0 && (
        <span className={`${base} border-gray-700 bg-gray-900/30 text-gray-400`} title={list.join(", ")}>
          +{hidden}
        </span>
      )}
    </div>
  );
}

function MultiSelect({
  label,
  items,
  selectedIds,
  disabled,
  onChangeIds,
}: {
  label: string;
  items: AdminRefItem[];
  selectedIds: number[];
  disabled?: boolean;
  onChangeIds: (ids: number[]) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => it.name.toLowerCase().includes(qq));
  }, [items, q]);
  const selectedItems = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const byId = new Map(items.map((it) => [it.id, it] as const));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as AdminRefItem[];
  }, [items, selectedIds]);

  function toggle(id: number) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangeIds([...next.values()]);
  }

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-gray-400">{label}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
            disabled
              ? "border-gray-700 text-gray-600"
              : open
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-gray-600 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
          }`}
          aria-expanded={open}
        >
          {selectedIds.length > 0 ? t("admin.selectedCount", { count: selectedIds.length }) : t("admin.noneSelected")}
        </button>
      </div>

      {selectedItems.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedItems.slice(0, 6).map((it) => (
            <button
              key={it.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(it.id)}
              className="group flex items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] text-gray-200 hover:border-gray-500"
              title={t("admin.removeSelection")}
            >
              <span className="max-w-[10rem] truncate">{it.name}</span>
              <span className="text-gray-500 group-hover:text-red-300">×</span>
            </button>
          ))}
          {selectedItems.length > 6 && (
            <span className="rounded-full border border-gray-800 bg-gray-900 px-2 py-1 text-[11px] text-gray-500">
              +{selectedItems.length - 6}
            </span>
          )}
        </div>
      )}

      {open && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/95 p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("admin.searchInList")}
              className="w-full rounded border border-gray-700 bg-gray-950/40 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChangeIds([])}
              className="rounded border border-gray-700 px-2 py-2 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-60"
              title={t("admin.clearSelection")}
            >
              {t("admin.clear")}
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto rounded border border-gray-800 bg-gray-950/20">
            <ul className="divide-y divide-gray-800">
              {filtered.map((it) => {
                const checked = selectedSet.has(it.id);
                return (
                  <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-gray-800/40">
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(it.id)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="truncate text-sm text-gray-200">{it.name}</span>
                    </label>
                    <span className="text-[10px] text-gray-600">#{it.id}</span>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-sm text-gray-500">{t("admin.noResults")}</li>
              )}
            </ul>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-400 hover:text-white"
            >
              {t("admin.done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCardsPage() {
  const { t } = useLocale();
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncRunning, setSyncRunning] = useState(false);
  const [catalogBumpRunning, setCatalogBumpRunning] = useState(false);
  const [lastCatalogVersion, setLastCatalogVersion] = useState<string | number | null>(null);
  const [syncSummary, setSyncSummary] = useState<AdminTcgSyncSummary | null>(null);
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

  const [domains, setDomains] = useState<AdminRefItem[]>([]);
  const [subtypes, setSubtypes] = useState<AdminRefItem[]>([]);
  const [supertypes, setSupertypes] = useState<AdminRefItem[]>([]);
  const [attributes, setAttributes] = useState<AdminRefItem[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const [formDomainIds, setFormDomainIds] = useState<number[]>([]);
  const [formSubtypeIds, setFormSubtypeIds] = useState<number[]>([]);
  const [formSupertypeIds, setFormSupertypeIds] = useState<number[]>([]);
  const [formAttributeIds, setFormAttributeIds] = useState<number[]>([]);

  // Para update: omitir campo mantém; array presente substitui (vazio remove)
  const [touchedDomainIds, setTouchedDomainIds] = useState(false);
  const [touchedSubtypeIds, setTouchedSubtypeIds] = useState(false);
  const [touchedSupertypeIds, setTouchedSupertypeIds] = useState(false);
  const [touchedAttributeIds, setTouchedAttributeIds] = useState(false);

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

  const formatGroupErrors = (errors: unknown[]): string => {
    return errors
      .map((entry) => {
        if (typeof entry === "string") return entry;
        try {
          return JSON.stringify(entry);
        } catch {
          return String(entry);
        }
      })
      .join(", ");
  };

  const fetchRefs = useCallback(async () => {
    setRefsLoading(true);
    try {
      const [d, st, su, a] = await Promise.all([
        listAdminDomains(),
        listAdminSubtypes(),
        listAdminSupertypes(),
        listAdminAttributes(),
      ]);
      setDomains(d);
      setSubtypes(st);
      setSupertypes(su);
      setAttributes(a);
    } finally {
      setRefsLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchRefs().catch(() => {});
  }, [fetchRefs]);

  const openCreate = () => {
    setEditingId(null);
    setEditPreviewCard(null);
    setFormScraperId("");
    setFormName("");
    setFormSet("");
    setFormRarity("");
    setFormType("");
    setFormCollectorNumber("");
    setFormDomainIds([]);
    setFormSubtypeIds([]);
    setFormSupertypeIds([]);
    setFormAttributeIds([]);
    setTouchedDomainIds(true);
    setTouchedSubtypeIds(true);
    setTouchedSupertypeIds(true);
    setTouchedAttributeIds(true);
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

      // Mapear nomes -> ids usando as refs (se refs não carregaram ainda, tenta carregar agora)
      const ensureRefs = async () => {
        if (domains.length && subtypes.length && supertypes.length && attributes.length) return;
        await fetchRefs();
      };
      await ensureRefs();

      const byName = (items: AdminRefItem[]) => new Map(items.map((i) => [i.name, i.id] as const));
      const domainByName = byName(domains);
      const subtypeByName = byName(subtypes);
      const supertypeByName = byName(supertypes);
      const attributeByName = byName(attributes);

      setFormDomainIds((card.domains ?? []).map((n) => domainByName.get(n)).filter((x): x is number => typeof x === "number"));
      setFormSubtypeIds((card.subtypes ?? []).map((n) => subtypeByName.get(n)).filter((x): x is number => typeof x === "number"));
      setFormSupertypeIds((card.supertypes ?? []).map((n) => supertypeByName.get(n)).filter((x): x is number => typeof x === "number"));
      setFormAttributeIds((card.attributes ?? []).map((n) => attributeByName.get(n)).filter((x): x is number => typeof x === "number"));

      setTouchedDomainIds(false);
      setTouchedSubtypeIds(false);
      setTouchedSupertypeIds(false);
      setTouchedAttributeIds(false);
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
        if (touchedDomainIds) body.domainIds = formDomainIds;
        if (touchedSubtypeIds) body.subtypeIds = formSubtypeIds;
        if (touchedSupertypeIds) body.supertypeIds = formSupertypeIds;
        if (touchedAttributeIds) body.attributeIds = formAttributeIds;
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
          domainIds: formDomainIds,
          subtypeIds: formSubtypeIds,
          supertypeIds: formSupertypeIds,
          attributeIds: formAttributeIds,
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

  const handleTcgSync = async () => {
    if (syncRunning) return;
    setSyncRunning(true);
    try {
      const result = await runAdminTcgSync();
      setSyncSummary(result);
      toast.success(t("admin.tcgSyncSuccess"));
      fetchList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already running")) {
        toast.error(t("admin.tcgSyncAlreadyRunning"));
      } else if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      } else {
        toast.error(t("admin.tcgSyncError"));
      }
    } finally {
      setSyncRunning(false);
    }
  };

  const handleCatalogVersionBump = async () => {
    if (catalogBumpRunning) return;
    setCatalogBumpRunning(true);
    try {
      const result = await bumpAdminCatalogVersion();
      setLastCatalogVersion(result.version);
      toast.success(t("admin.catalogVersionBumpSuccess", { version: String(result.version) }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("403") || msg.toLowerCase().includes("admin")) {
        toast.error(t("admin.forbidden"));
      } else {
        toast.error(t("admin.catalogVersionBumpError"));
      }
    } finally {
      setCatalogBumpRunning(false);
    }
  };

  return (
    <div>
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
          {SET_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleTcgSync}
          disabled={syncRunning}
          className="inline-flex items-center gap-2 rounded border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20 hover:text-blue-100 disabled:opacity-60"
        >
          {syncRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-transparent" />
          )}
          {syncRunning ? t("admin.tcgSyncRunning") : t("admin.tcgSyncButton")}
        </button>
        <button
          type="button"
          onClick={handleCatalogVersionBump}
          disabled={catalogBumpRunning}
          className="inline-flex items-center gap-2 rounded border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20 hover:text-violet-100 disabled:opacity-60"
        >
          {catalogBumpRunning && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-transparent" />
          )}
          {catalogBumpRunning ? t("admin.catalogVersionBumpRunning") : t("admin.catalogVersionBumpButton")}
        </button>
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
        >
          {t("admin.newCard")}
        </button>
      </div>

      {syncSummary && (
        <div className="mb-4 rounded-lg border border-blue-900/60 bg-blue-950/30 p-4 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-300">
            {t("admin.tcgSyncSummaryTitle")}
          </p>
          <div className="grid grid-cols-1 gap-2 text-blue-100 md:grid-cols-2">
            <p>{t("admin.tcgSyncStartedAt")}: {new Date(syncSummary.startedAt).toLocaleString()}</p>
            <p>{t("admin.tcgSyncFinishedAt")}: {new Date(syncSummary.finishedAt).toLocaleString()}</p>
            <p>{t("admin.tcgSyncMatched")}: {syncSummary.matched}</p>
            <p>{t("admin.tcgSyncNoMatch")}: {syncSummary.noMatch}</p>
            <p>{t("admin.tcgSyncPricesUpdated")}: {syncSummary.pricesUpdated}</p>
            <p>{t("admin.tcgSyncPricesSkipped")}: {syncSummary.pricesSkipped}</p>
            <p>{t("admin.tcgSyncRemainingWithoutProductId")}: {syncSummary.remainingWithoutProductId}</p>
            <p>
              {t("admin.tcgSyncGroupErrors")}:{" "}
              {syncSummary.groupErrors.length > 0
                ? formatGroupErrors(syncSummary.groupErrors as unknown[])
                : t("admin.tcgSyncNoGroupErrors")}
            </p>
          </div>
        </div>
      )}

      {lastCatalogVersion !== null && (
        <div className="mb-4 rounded-lg border border-violet-900/60 bg-violet-950/30 px-4 py-3 text-sm text-violet-100">
          {t("admin.catalogVersionCurrent", { version: String(lastCatalogVersion) })}
        </div>
      )}

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
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.supertypes")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.subtypes")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">{t("admin.attributes")}</th>
                <th className="px-4 py-3 font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {cards.map((card) => (
                <tr key={card.uuid} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2 text-white">
                    <CardHoverPreview card={card}>
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openView(card.uuid)}
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
                  <td className="px-4 py-2 align-top">
                    <ChipsRow items={(card as unknown as { supertypes?: string[] }).supertypes} tone="amber" max={6} />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <ChipsRow items={(card as unknown as { subtypes?: string[] }).subtypes} tone="violet" max={6} />
                  </td>
                  <td className="px-4 py-2 align-top">
                    <ChipsRow items={(card as unknown as { attributes?: string[] }).attributes} tone="blue" max={6} />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => openView(card.uuid)}
                      className={`mr-2 ${viewBtn}`}
                    >
                      {t("admin.viewCard")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(card.uuid)}
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
                        {SET_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
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

                  <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                    <MultiSelect
                      label={t("admin.domains")}
                      items={domains}
                      selectedIds={formDomainIds}
                      disabled={refsLoading || saving}
                      onChangeIds={(ids) => { setFormDomainIds(ids); setTouchedDomainIds(true); }}
                    />
                    <MultiSelect
                      label={t("admin.subtypes")}
                      items={subtypes}
                      selectedIds={formSubtypeIds}
                      disabled={refsLoading || saving}
                      onChangeIds={(ids) => { setFormSubtypeIds(ids); setTouchedSubtypeIds(true); }}
                    />
                    <MultiSelect
                      label={t("admin.supertypes")}
                      items={supertypes}
                      selectedIds={formSupertypeIds}
                      disabled={refsLoading || saving}
                      onChangeIds={(ids) => { setFormSupertypeIds(ids); setTouchedSupertypeIds(true); }}
                    />
                    <MultiSelect
                      label={t("admin.attributes")}
                      items={attributes}
                      selectedIds={formAttributeIds}
                      disabled={refsLoading || saving}
                      onChangeIds={(ids) => { setFormAttributeIds(ids); setTouchedAttributeIds(true); }}
                    />
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

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.domains")}</p>
                        <p className="text-sm text-gray-200">{(viewCard as unknown as { domains?: string[] }).domains?.join(", ") || "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.supertypes")}</p>
                        <p className="text-sm text-gray-200">{(viewCard as unknown as { supertypes?: string[] }).supertypes?.join(", ") || "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.subtypes")}</p>
                        <p className="text-sm text-gray-200">{(viewCard as unknown as { subtypes?: string[] }).subtypes?.join(", ") || "—"}</p>
                      </div>
                      <div className="rounded border border-gray-800 bg-gray-950/20 px-3 py-2">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t("admin.attributes")}</p>
                        <p className="text-sm text-gray-200">{(viewCard as unknown as { attributes?: string[] }).attributes?.join(", ") || "—"}</p>
                      </div>
                    </div>
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
