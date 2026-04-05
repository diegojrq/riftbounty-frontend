"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocale } from "@/lib/locale-context";
import {
  DECLARED_VALUE_MAX,
  TRADE_DECLARED_VALUE_INVALID_I18N_KEY,
} from "@/lib/trade-declared-value";

export function TradeDeclaredValueInput({
  value,
  onCommit,
  disabled,
  ariaLabel,
  className,
}: {
  value: number | null;
  onCommit: (n: number | null) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const { t } = useLocale();
  const [text, setText] = useState(() => (value != null ? String(value) : ""));

  useEffect(() => {
    setText(value != null ? String(value) : "");
  }, [value]);

  function commit() {
    const trimmed = text.trim().replace(",", ".");
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const n = Number.parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > DECLARED_VALUE_MAX) {
      toast.error(t(TRADE_DECLARED_VALUE_INVALID_I18N_KEY));
      setText(value != null ? String(value) : "");
      return;
    }
    const rounded = Math.round(n * 100) / 100;
    onCommit(rounded);
    setText(String(rounded));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      disabled={disabled}
      aria-label={ariaLabel}
      placeholder="—"
      title={t("trades.declaredValueHint")}
      className={
        className ??
        "w-[4.5rem] rounded border border-gray-600 bg-gray-900 px-1 py-0.5 text-center text-[10px] tabular-nums text-gray-200 outline-none placeholder:text-gray-600 focus:border-emerald-600 disabled:opacity-50 sm:w-[5rem]"
      }
    />
  );
}
