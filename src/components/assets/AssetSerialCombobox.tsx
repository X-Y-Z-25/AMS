import { useMemo, useState } from "react";
import type { Asset } from "@/types";
import { normalizeSerialNumber } from "@/lib/utils";
import { classNames } from "@/lib/utils";

interface AssetSerialComboboxProps {
  assets: Asset[];
  value: string;
  onChange: (assetId: string, serialNumber: string) => void;
  placeholder?: string;
}

export function AssetSerialCombobox({
  assets,
  value,
  onChange,
  placeholder = "Type to search serial number...",
}: AssetSerialComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedAsset = assets.find((asset) => asset.id === value);
  const displayedValue = selectedAsset?.serialNumber ?? query;

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeSerialNumber(query);
    return [...assets]
      .filter((asset) =>
        !normalizedQuery ||
        normalizeSerialNumber(asset.serialNumber).includes(normalizedQuery),
      )
      .sort((left, right) =>
        left.serialNumber.localeCompare(right.serialNumber),
      )
      .slice(0, 10);
  }, [assets, query]);

  const inputBase =
    "h-10 w-full rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <div className="relative">
      <input
        type="text"
        value={displayedValue}
        placeholder={placeholder}
        autoComplete="off"
        className={classNames(inputBase)}
        onChange={(event) => {
          setQuery(normalizeSerialNumber(event.target.value));
          onChange("", "");
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-[60] mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl">
          {suggestions.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-800"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(asset.id, asset.serialNumber);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="font-mono text-xs font-bold text-amber-300">
                  {asset.serialNumber}
                </span>
                <span className="text-[11px] text-slate-400">
                  {asset.model} · {asset.id}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && suggestions.length === 0 && (
        <p className="absolute z-[60] mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-xl">
          No matching serial number in available stock.
        </p>
      )}
    </div>
  );
}
