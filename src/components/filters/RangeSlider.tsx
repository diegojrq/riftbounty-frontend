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
  "h-2 w-full appearance-none rounded-full bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-500 [&::-webkit-slider-thumb]:bg-gray-800 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-500 [&::-moz-range-thumb]:bg-gray-800 [&::-moz-range-thumb]:cursor-pointer";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          {label}
        </span>
        <span className="text-xs tabular-nums text-gray-400">
          {valueMin} – {showAnyLabel && valueMax === maxBound ? "Any" : valueMax}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label htmlFor={minId} className="w-8 shrink-0 text-[10px] text-gray-500">Min</label>
          <input
            id={minId}
            type="range"
            min={minBound}
            max={maxBound}
            step={step}
            value={valueMin}
            onChange={(e) => onChange(clampMin(Number(e.target.value)), valueMax)}
            className={trackClass}
            aria-label={`${label} minimum`}
          />
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-gray-400">{valueMin}</span>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={maxId} className="w-8 shrink-0 text-[10px] text-gray-500">Max</label>
          <input
            id={maxId}
            type="range"
            min={minBound}
            max={maxBound}
            step={step}
            value={valueMax}
            onChange={(e) => onChange(valueMin, clampMax(Number(e.target.value)))}
            className={trackClass}
            aria-label={`${label} maximum`}
          />
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-gray-400">
            {showAnyLabel && valueMax === maxBound ? "Any" : valueMax}
          </span>
        </div>
      </div>
      <div className="flex justify-between px-0.5 text-[10px] text-gray-500">
        <span>{minBound}</span>
        <span>{maxBound}</span>
      </div>
    </div>
  );
}

