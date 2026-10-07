import { useMemo, useState } from "react";
import type { Asset } from "@/types";
import {
  getAssetTagForPicker,
  suggestStockAssets,
  type StockAssetKind,
} from "@/lib/assetStockLookup";
import { classNames, normalizeServiceTag } from "@/lib/utils";

interface AssetTagComboboxProps {
  value: string;
  onChange: (value: string) => void;
  assets: Asset[];
  kind: StockAssetKind;
  model: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AssetTagCombobox({
  value,
  onChange,
  assets,
  kind,
  model,
  placeholder = "Type to search stock…",
  disabled = false,
  className,
}: AssetTagComboboxProps) {
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(
    () => suggestStockAssets(assets, kind, model, value, 10),
    [assets, kind, model, value],
  );

  const inputBase =
    "h-10 w-full rounded-lg border border-slate-600/60 bg-slate-800/80 px-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <div className={classNames("relative", className)}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={inputBase}
        onChange={(event) => onChange(normalizeServiceTag(event.target.value))}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && !disabled && suggestions.length > 0 && (
        <ul className="absolute z-[60] mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-600 bg-slate-900 py-1 shadow-xl">
          {suggestions.map((asset) => {
            const tag = getAssetTagForPicker(asset, kind);
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-800"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(tag);
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {tag}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {asset.model || asset.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
