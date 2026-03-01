"use client";

export const ATTRIBUTE_OPTIONS = [
  "Accelerate",
  "Action",
  "Assault",
  "Assault 2",
  "Assault 3",
  "Deflect",
  "Deflect 2",
  "Ganking",
  "Hidden",
  "Quick-Draw",
  "Reaction",
  "Shield",
  "Shield 2",
  "Shield 3",
  "Shield 5",
  "Tank",
  "Temporary",
  "Unique",
  "Vision",
  "Weaponmaster",
] as const;

interface AttributesFilterProps {
  selected: string[];
  onChange: (values: string[]) => void;
}

export function AttributesFilter({ selected, onChange }: AttributesFilterProps) {
  function toggle(attr: string) {
    if (selected.includes(attr)) {
      onChange(selected.filter((a) => a !== attr));
    } else {
      onChange([...selected, attr]);
    }
  }

  return (
    <div className="w-full">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Attributes</p>
      <div className="flex flex-wrap gap-1.5">
        {ATTRIBUTE_OPTIONS.map((attr) => {
          const active = selected.includes(attr);
          return (
            <button
              key={attr}
              type="button"
              onClick={() => toggle(attr)}
              aria-pressed={active}
              className={`rounded border px-2.5 py-1 text-xs font-medium transition-all ${
                active
                  ? "border-blue-500 bg-blue-500/20 text-blue-300"
                  : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500 hover:text-gray-300"
              }`}
            >
              {attr}
            </button>
          );
        })}
      </div>
    </div>
  );
}
