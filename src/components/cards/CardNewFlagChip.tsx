"use client";

import { useLocale } from "@/lib/locale-context";

/**
 * Selo "NOVA" com efeito foil — metade para dentro da carta, metade para fora (para cima).
 * O pai deve ser `relative overflow-visible`; a carta com `overflow-hidden` fica como irmão abaixo.
 */
export function CardNewFlagChip() {
  const { t } = useLocale();
  return (
    <div className="pointer-events-none absolute left-1/2 top-2 z-[25] -translate-x-1/2 -translate-y-1/2">
      <span
        className="card-flag-new--foil relative inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-950 shadow-[0_3px_10px_rgba(0,0,0,0.35)] ring-1 ring-amber-900/25"
        title={t("cards.flagNew")}
      >
        <span className="relative z-20">{t("cards.flagNew")}</span>
      </span>
    </div>
  );
}
