"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { useLocale } from "@/lib/locale-context";
import type { Card } from "@/types/card";
import { getCardId } from "@/lib/card-id";
import { getCardDisplayName } from "@/lib/card-display-name";
import type { CardsListResponse, CardsQueryParams } from "@/types/card";

function toQueryRecord(p: CardsQueryParams): Record<string, string | number | undefined> {
  return p as Record<string, string | number | undefined>;
}

interface CardPickerModalProps {
  title: string;
  onSelect: (card: Card) => void;
  onClose: () => void;
  /** Optional type filter (e.g. "legend", "unit", "rune") */
  typeFilter?: string;
}

export function CardPickerModal({ title, onSelect, onClose, typeFilter }: CardPickerModalProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params: CardsQueryParams = {
        limit: 100,
        offset: 0,
        ...(query.trim().length >= 2 && { name: query.trim() }),
        ...(typeFilter && { type: typeFilter }),
      };
      const res = await apiGet<CardsListResponse>("/cards", toQueryRecord(params));
      setItems(res.data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  const canSearch = query.trim().length >= 2 || !!typeFilter;

  useEffect(() => {
    if (!canSearch) {
      setItems([]);
      return;
    }
    const t = setTimeout(search, query.trim().length >= 2 ? 400 : 0);
    return () => clearTimeout(t);
  }, [query, typeFilter, canSearch, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg bg-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-700 p-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("picker.searchByNameMin")}
            className="mt-2 w-full rounded border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <p className="py-4 text-center text-gray-400">{t("picker.searching")}</p>
          ) : items.length === 0 ? (
            <p className="py-4 text-center text-gray-400">
              {!canSearch ? t("picker.typeToSearch") : t("cards.noCardsFound")}
            </p>
          ) : (
            <ul className="space-y-1">
              {items.map((card) => (
                <li key={getCardId(card)}>
                  <button
                    type="button"
                    onClick={() => onSelect(card)}
                    className="w-full rounded px-3 py-2 text-left text-sm text-white hover:bg-gray-700"
                  >
                    {(card.collector_number ?? card.collectorNumber) && (
                      <span className="mr-2 text-gray-400">{card.collector_number ?? card.collectorNumber}</span>
                    )}
                    {getCardDisplayName(card)}
                    {card.type && <span className="ml-2 text-gray-500">({card.type})</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-gray-700 p-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded bg-gray-700 py-2 text-sm text-white hover:bg-gray-600"
          >
            {t("picker.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
