import type { Asset } from "@/types";
import { normalizeServiceTag } from "@/lib/utils";

export type StockAssetKind =
  | "laptop"
  | "headset"
  | "normalMonitor"
  | "hubMonitor"
  | "docking"
  | "keyboard"
  | "mouse"
  | "bag";

const AVAILABLE_STATUSES = new Set<Asset["status"]>([
  "Available",
  "Reserved",
  "Returned",
]);

export function isStockAssignable(asset: Asset): boolean {
  return AVAILABLE_STATUSES.has(asset.status);
}

function normalizeModelToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/^laptop\s*-\s*/i, "")
    .replace(/^monitor\s*-\s*/i, "")
    .replace(/^dell\s+/i, "")
    .replace(/^poly\s+/i, "")
    .replace(/ego loop/gi, "eco loop")
    .trim();
}

function resolveStockKind(asset: Asset): StockAssetKind | null {
  const category = (asset.category ?? "").toLowerCase();
  const model = (asset.model ?? "").toLowerCase();
  const name = (asset.name ?? "").toLowerCase();

  if (category === "keyboard" || name.includes("keyboard")) return "keyboard";
  if (category === "mouse" || name.includes("mouse")) return "mouse";
  if (
    category === "bag" ||
    name.includes("bag") ||
    name.includes("backpack") ||
    model.includes("targus") ||
    model.includes("ego loop")
  )
    return "bag";
  if (
    category.includes("laptop") ||
    model.includes("latitude") ||
    model.includes("dell 14 pro")
  )
    return "laptop";
  if (
    category.includes("normal") ||
    model.includes("p2422h") ||
    name.includes("p2422h")
  )
    return "normalMonitor";
  if (
    category.includes("hub") ||
    model.includes("p2425he") ||
    name.includes("p2425he")
  )
    return "hubMonitor";
  if (
    category.includes("headset") ||
    model.includes("blackwire") ||
    model.includes("wh5024")
  )
    return "headset";
  if (category.includes("docking") || model.includes("wd19")) return "docking";

  return null;
}

function modelMatches(asset: Asset, selectedModel: string, kind: StockAssetKind): boolean {
  if (!selectedModel.trim()) return true;

  const target = normalizeModelToken(selectedModel);
  const assetModel = normalizeModelToken(asset.model || asset.name || "");
  if (!target) return true;
  if (assetModel.includes(target) || target.includes(assetModel)) return true;

  if (kind === "headset") {
    const headsetAliases: Record<string, string[]> = {
      "dell wh5024": ["wh5024"],
      "poly blackwire 3200": ["blackwire 3200", "3200"],
      "poly blackwire 3300": ["blackwire 3300", "3300"],
    };
    const aliases = headsetAliases[target] ?? [];
    return aliases.some(
      (alias) => assetModel.includes(alias) || nameIncludes(asset, alias),
    );
  }

  return false;
}

function nameIncludes(asset: Asset, fragment: string): boolean {
  return (asset.name ?? "").toLowerCase().includes(fragment.toLowerCase());
}

export function getAssetTagForPicker(asset: Asset, kind: StockAssetKind): string {
  if (kind === "keyboard" || kind === "mouse" || kind === "bag") {
    return normalizeServiceTag(asset.id);
  }
  return normalizeServiceTag(asset.serviceTag);
}

export function filterStockAssetsForPicker(
  assets: Asset[],
  kind: StockAssetKind,
  model: string,
): Asset[] {
  return assets.filter((asset) => {
    if (!isStockAssignable(asset)) return false;
    const assetKind = resolveStockKind(asset);
    if (assetKind !== kind) return false;
    if (!modelMatches(asset, model, kind)) return false;
    const tag = getAssetTagForPicker(asset, kind);
    return Boolean(tag);
  });
}

export function suggestStockAssets(
  assets: Asset[],
  kind: StockAssetKind,
  model: string,
  query: string,
  limit = 8,
): Asset[] {
  const normalizedQuery = normalizeServiceTag(query);
  const pool = filterStockAssetsForPicker(assets, kind, model);

  if (!normalizedQuery) return pool.slice(0, limit);

  return pool
    .filter((asset) => {
      const tag = getAssetTagForPicker(asset, kind);
      const modelLabel = (asset.model || asset.name || "").toUpperCase();
      return (
        tag.includes(normalizedQuery) ||
        modelLabel.includes(normalizedQuery)
      );
    })
    .slice(0, limit);
}

export function findStockAssetByTag(
  assets: Asset[],
  kind: StockAssetKind,
  model: string,
  tagValue: string,
): Asset | undefined {
  const normalized = normalizeServiceTag(tagValue);
  if (!normalized) return undefined;

  return filterStockAssetsForPicker(assets, kind, model).find(
    (asset) => getAssetTagForPicker(asset, kind) === normalized,
  );
}
