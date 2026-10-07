import type {
  AssetStatus,
  AssetCondition,
  WarrantyStatus,
  RepairStatus,
  DisposalStatus,
  ProcurementStatus,
} from "@/types";

export function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCurrencyFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function classNames(
  ...classes: (string | false | undefined | null)[]
): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCategoryLabel(value: string): string {
  if (!value) return value;

  return value
    .replace(/^Laptop\s*-\s*/i, "")
    .replace(/^Monitor\s*-\s*/i, "")
    .replace(/^Docking Station\s*-\s*/i, "")
    .replace(/^Dell\s+/i, "")
    .replace(/\s*\((Hub|Normal)\)$/i, "")
    .trim();
}

export function getStockGroupLabel(category: string): string {
  if (!category) return "Other";
  const normalized = category.toLowerCase();

  if (normalized.includes("laptop")) return "Laptop";
  if (normalized.includes("headset")) return "Headset";
  if (normalized.includes("docking")) return "Docking Station";
  if (normalized.includes("hub")) return "Monitor (Hub)";
  if (normalized.includes("monitor") || normalized.includes("normal"))
    return "Monitor (Normal)";
  if (normalized.includes("keyboard")) return "Keyboard";
  if (normalized.includes("mouse")) return "Mouse";

  return formatCategoryLabel(category);
}

export function normalizeServiceTag(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

export function normalizeSerialNumber(value?: string | null): string {
  return (value ?? "").trim().toUpperCase();
}

export function formatSerialDisplay(value?: string): string {
  const serial = normalizeSerialNumber(value);
  if (!serial || serial === "DL54500127") return "—";
  return serial;
}

export function getAssetTagPrefix(category: string, model?: string): string {
  const categoryName = (category || "").toLowerCase();
  const modelName = (model || "").toLowerCase();

  if (modelName.includes("mouse") || categoryName.includes("mouse"))
    return "MOS";
  if (modelName.includes("keyboard") || categoryName.includes("keyboard"))
    return "KEY";
  if (categoryName.includes("hub")) return "MOH";
  if (categoryName.includes("monitor")) return "MON";
  if (categoryName.includes("docking")) return "DOC";
  if (categoryName.includes("headset")) return "HST";
  if (categoryName.includes("laptop")) return "LAP";

  return "AST";
}

export function generateAssetId(
  category: string,
  existingIds: string[] = [],
  model?: string,
): string {
  const prefix = getAssetTagPrefix(category, model);
  const numbers = existingIds
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.split("-")[1]))
    .filter((value) => Number.isFinite(value));

  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const statusStyles: Record<AssetStatus, string> = {
  Available: "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/30",
  Assigned: "bg-blue-900/40 text-blue-300 ring-1 ring-blue-500/30",
  "Under Repair": "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/30",
  Returned: "bg-cyan-900/40 text-cyan-300 ring-1 ring-cyan-500/30",
  Reserved: "bg-violet-900/40 text-violet-300 ring-1 ring-violet-500/30",
  Retired: "bg-slate-700/60 text-slate-400 ring-1 ring-slate-500/30",
  Disposed: "bg-red-900/40 text-red-300 ring-1 ring-red-500/30",
  Lost: "bg-rose-900/40 text-rose-300 ring-1 ring-rose-500/30",
};

export function getStatusBadgeClass(status: AssetStatus): string {
  return (
    statusStyles[status] ||
    "bg-slate-700/60 text-slate-400 ring-1 ring-slate-500/30"
  );
}

const conditionStyles: Record<AssetCondition, string> = {
  New: "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/30",
  Good: "bg-blue-900/40 text-blue-300 ring-1 ring-blue-500/30",
  Fair: "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/30",
  Damaged: "bg-orange-900/40 text-orange-300 ring-1 ring-orange-500/30",
  "Beyond Repair": "bg-red-900/40 text-red-300 ring-1 ring-red-500/30",
};

export function getConditionBadgeClass(condition: AssetCondition): string {
  return conditionStyles[condition];
}

const warrantyStyles: Record<WarrantyStatus, string> = {
  Active: "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/30",
  "Expiring Soon": "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/30",
  Expired: "bg-red-900/40 text-red-300 ring-1 ring-red-500/30",
  "No Warranty": "bg-slate-700/60 text-slate-400 ring-1 ring-slate-500/30",
};

export function getWarrantyBadgeClass(status: WarrantyStatus): string {
  return warrantyStyles[status];
}

export function getRepairBadgeClass(status: RepairStatus): string {
  const map: Record<RepairStatus, string> = {
    Pending: "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/30",
    "Sent to Vendor": "bg-blue-900/40 text-blue-300 ring-1 ring-blue-500/30",
    "Under Repair":
      "bg-orange-900/40 text-orange-300 ring-1 ring-orange-500/30",
    Completed: "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/30",
    "Not Repairable": "bg-red-900/40 text-red-300 ring-1 ring-red-500/30",
  };
  return map[status];
}

export function getDisposalBadgeClass(status: DisposalStatus): string {
  const map: Record<DisposalStatus, string> = {
    Pending: "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/30",
    Approved: "bg-blue-900/40 text-blue-300 ring-1 ring-blue-500/30",
    Disposed: "bg-red-900/40 text-red-300 ring-1 ring-red-500/30",
  };
  return map[status];
}

export function getProcurementBadgeClass(status: ProcurementStatus): string {
  const map: Record<ProcurementStatus, string> = {
    Pending: "bg-amber-900/40 text-amber-300 ring-1 ring-amber-500/30",
    "Partially Received":
      "bg-cyan-900/40 text-cyan-300 ring-1 ring-cyan-500/30",
    Received: "bg-emerald-900/40 text-emerald-300 ring-1 ring-emerald-500/30",
    Cancelled: "bg-red-900/40 text-red-300 ring-1 ring-red-500/30",
  };
  return map[status];
}
