"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { getAbilities } from "@/lib/abilities-api";
import { formatAbilityFilterLabel, resolveAbilityFilterChipClass } from "@/lib/card-description";

interface AbilitiesFilterProps {
  selected: string[];
  onChange: (values: string[]) => void;
}

export function AbilitiesFilter({ selected, onChange }: AbilitiesFilterProps) {
  const { t } = useLocale();
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getAbilities();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load abilities");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(token: string) {
    if (selected.includes(token)) {
      onChange(selected.filter((a) => a !== token));
    } else {
      onChange([...selected, token]);
    }
  }

  return (
    <div className="w-full">
      <p className="mb-1 text-xs font-bold italic uppercase tracking-wider text-gray-500">{t("cards.abilities")}</p>
      {loading && (
        <p className="text-xs text-gray-500">{t("cards.abilitiesLoading")}</p>
      )}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="text-xs text-gray-500">{t("cards.abilitiesEmpty")}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = selected.includes(item);
          const base = resolveAbilityFilterChipClass(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => toggle(item)}
              aria-pressed={active}
              title={item}
              className={`${base} max-w-full truncate px-2.5 py-1 transition-[box-shadow,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
                active
                  ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-950"
                  : "opacity-95 hover:opacity-100"
              }`}
            >
              {formatAbilityFilterLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
