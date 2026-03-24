"use client";

import { useCallback, useId } from "react";

export interface RangeSliderProps {
  label: string;
  minBound: number;
  maxBound: number;
  valueMin: number;
  valueMax: number;
  onChange: (min: number, max: number) => void;
  /** Step for the range inputs (default 1) */
  step?: number;
  /** Show "Any" when max is at maxBound (default true) */
  showAnyLabel?: boolean;
  /** Label for "any" when max is at maxBound (e.g. for i18n) */
  anyLabel?: string;
  minLabel?: string;
  maxLabel?: string;
  /** Aria suffix for min input (e.g. " minimum") */
  minAriaSuffix?: string;
  /** Aria suffix for max input (e.g. " maximum") */
  maxAriaSuffix?: string;
}

export function RangeSlider({
  label,
  minBound,
  maxBound,
  valueMin,
  valueMax,
  onChange,
  step = 1,
  showAnyLabel = true,
  anyLabel = "Any",
  minLabel = "Min",
  maxLabel = "Max",
  minAriaSuffix = " minimum",
  maxAriaSuffix = " maximum",
}: RangeSliderProps) {
  const id = useId();
  const minId = `${id}-min`;
  const maxId = `${id}-max`;

  const clampMin = useCallback(
    (v: number) => Math.max(minBound, Math.min(valueMax, v)),
    [minBound, valueMax]
  );
  const clampMax = useCallback(
    (v: number) => Math.min(maxBound, Math.max(valueMin, v)),
    [maxBound, valueMin]
  );

  const trackClass =
    "h-2 w-full min-w-0 appearance-none rounded-full bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:bg-gray-800 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:bg-gray-800 [&::-moz-range-thumb]:cursor-pointer";

  /** Colunas fixas: rótulo Min/Max | trilha (divide o espaço) | valor (larga o suficiente p/ números / "Any") */
  const sliderGridClass =
    "grid w-full grid-cols-[2rem_minmax(0,1fr)_minmax(3.25rem,7rem)] items-center gap-x-2 gap-y-2";

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-gray-400">
          {valueMin} – {showAnyLabel && valueMax === maxBound ? anyLabel : valueMax}
        </span>
      </div>
      <div className={sliderGridClass}>
        <label htmlFor={minId} className="text-[10px] text-gray-500">
          {minLabel}
        </label>
        <div className="min-w-0">
          <input
            id={minId}
            type="range"
            min={minBound}
            max={maxBound}
            step={step}
            value={valueMin}
            onChange={(e) => onChange(clampMin(Number(e.target.value)), valueMax)}
            className={trackClass}
            aria-label={`${label}${minAriaSuffix}`}
          />
        </div>
        <span className="text-right text-xs tabular-nums text-gray-400">{valueMin}</span>

        <label htmlFor={maxId} className="text-[10px] text-gray-500">
          {maxLabel}
        </label>
        <div className="min-w-0">
          <input
            id={maxId}
            type="range"
            min={minBound}
            max={maxBound}
            step={step}
            value={valueMax}
            onChange={(e) => onChange(valueMin, clampMax(Number(e.target.value)))}
            className={trackClass}
            aria-label={`${label}${maxAriaSuffix}`}
          />
        </div>
        <span className="text-right text-xs tabular-nums text-gray-400">
          {showAnyLabel && valueMax === maxBound ? anyLabel : valueMax}
        </span>
      </div>
      <div className="flex flex-nowrap justify-between gap-2 px-0.5 text-[10px] text-gray-500">
        <span className="shrink-0">{minBound}</span>
        <span className="shrink-0">{maxBound}</span>
      </div>
    </div>
  );
}
