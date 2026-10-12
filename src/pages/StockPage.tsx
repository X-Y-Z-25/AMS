import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Package, Plus, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Select, TextInput } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { supabase, supabaseConfig } from "@/lib/supabase";
import { fetchAssetsFromSupabase } from "@/lib/supabaseData";
import type { Asset } from "@/types";
import { normalizeServiceTag } from "@/lib/utils";

const STOCK_CATEGORIES = [
  "All",
  "Laptop",
  "Headset",
  "Hub Monitor",
  "Normal Monitor",
  "Docking Station",
  "Keyboard",
  "Mouse",
  "Bag",
] as const;
const KEYBOARD_MODELS = [
  "Dell KB216",
  "Dell KM714",
  "Dell KB500",
  "HP Wireless Keyboard",
];
const MOUSE_MODELS = ["Dell MS116", "Logitech M185", "Dell WM126", "HP Mouse"];
const BAG_MODELS = ["Targus Backpack", "Eco Loop Backpack", "Premium Backpack"];

type StockCategory = (typeof STOCK_CATEGORIES)[number];
type WarrantyInfo = {
  label: string;
  tone: "good" | "warning" | "danger" | "neutral";
};

type StockSummaryRow = {
  category: string;
  model: string;
  count: number;
  assetTags: string[];
  serviceTags: string[];
};

const STOCK_ASSET_TAG_PREFIX: Record<string, string> = {
  Laptop: "LAP",
  Keyboard: "KEY",
  "Docking Station": "DOC",
  Mouse: "MOS",
  "Normal Monitor": "MON",
  "Hub Monitor": "MOH",
  Bag: "BAG",
  Headset: "HST",
};

function parseAssetTagSequence(tag: string, prefix: string): number | null {
  const match = tag.trim().match(new RegExp(`^${prefix}-(\\d+)$`, "i"));
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function getNextStockAssetTags(
  assets: Asset[],
  category: string,
  quantity: number,
): string[] {
  const prefix = STOCK_ASSET_TAG_PREFIX[category] ?? "AST";
  let maxSequence = 0;

  for (const asset of assets) {
    const fromId = parseAssetTagSequence(asset.id, prefix);
    if (fromId !== null) maxSequence = Math.max(maxSequence, fromId);

    const fromService = parseAssetTagSequence(asset.serviceTag, prefix);
    if (fromService !== null) maxSequence = Math.max(maxSequence, fromService);
  }

  return Array.from({ length: quantity }, (_, index) => {
    const next = maxSequence + index + 1;
    return `${prefix}-${String(next).padStart(3, "0")}`;
  });
}

function usesStockAssetTag(category: string): boolean {
  return category === "Keyboard" || category === "Mouse" || category === "Bag";
}

function normalizeStockCategoryInput(value: string): string {
  const normalized = (value ?? "").trim().toLowerCase();

  if (!normalized) return "Other";
  if (normalized.includes("hub monitor") || normalized.includes("hub-monitor"))
    return "Hub Monitor";
  if (
    normalized.includes("normal monitor") ||
    normalized.includes("normal-monitor")
  )
    return "Normal Monitor";
  if (
    normalized.includes("docking station") ||
    normalized.includes("docking-station") ||
    normalized.includes("dock")
  )
    return "Docking Station";
  if (normalized.includes("headset")) return "Headset";
  if (normalized.includes("laptop")) return "Laptop";
  if (normalized.includes("keyboard")) return "Keyboard";
  if (normalized.includes("mouse")) return "Mouse";
  if (normalized.includes("monitor")) return "Normal Monitor";
  if (
    normalized.includes("bag") ||
    normalized.includes("backpack") ||
    normalized.includes("targus") ||
    normalized.includes("ego loop")
  )
    return "Bag";

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function mapStockCategoryToDb(
  category: string,
):
  | "Laptop"
  | "Monitor"
  | "Docking Station"
  | "Headset"
  | "Keyboard"
  | "Mouse"
  | "Bag"
  | "Other" {
  const normalized = normalizeStockCategoryInput(category);

  if (normalized === "Laptop") return "Laptop";
  if (normalized === "Hub Monitor" || normalized === "Normal Monitor")
    return "Monitor";
  if (normalized === "Docking Station") return "Docking Station";
  if (normalized === "Headset") return "Headset";
  if (normalized === "Keyboard") return "Keyboard";
  if (normalized === "Mouse") return "Mouse";
  if (normalized === "Bag") return "Other";
  return "Other";
}

function getBatteryLabel(asset: Asset): WarrantyInfo {
  const dmy = asset.warrantyEnd.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const end = dmy
    ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    : asset.warrantyEnd && asset.warrantyEnd !== "N/A"
      ? new Date(asset.warrantyEnd)
      : null;
  if (!end || Number.isNaN(end.getTime())) {
    return { label: "—", tone: "neutral" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft <= 0) return { label: "Expired", tone: "danger" };
  if (daysLeft <= 90)
    return { label: `${daysLeft} days left`, tone: "warning" };
  return { label: `${daysLeft} days left`, tone: "good" };
}

function getGroupCategory(asset: Asset): string {
  const categoryLookup = normalizeStockCategoryInput(asset.category);
  const modelText = (asset.model || "").toLowerCase();
  const nameText = (asset.name || "").toLowerCase();

  if (categoryLookup === "Keyboard") return "Keyboard";
  if (categoryLookup === "Mouse") return "Mouse";
  if (categoryLookup === "Bag") return "Bag";
  if (categoryLookup === "Hub Monitor" || modelText.includes("p2425he"))
    return "Hub Monitor";
  if (categoryLookup === "Normal Monitor" || modelText.includes("p2422h"))
    return "Normal Monitor";
  if (categoryLookup === "Docking Station" || modelText.includes("wd19dcs"))
    return "Docking Station";
  if (
    categoryLookup === "Headset" ||
    modelText.includes("blackwire") ||
    modelText.includes("wh5024")
  )
    return "Headset";
  if (
    categoryLookup === "Laptop" ||
    modelText.includes("latitude") ||
    modelText.includes("dell 14 pro")
  )
    return "Laptop";
  if (nameText.includes("hub monitor")) return "Hub Monitor";
  if (nameText.includes("normal monitor")) return "Normal Monitor";
  if (nameText.includes("docking")) return "Docking Station";
  if (nameText.includes("headset")) return "Headset";
  if (nameText.includes("laptop")) return "Laptop";
  if (
    nameText.includes("bag") ||
    nameText.includes("backpack") ||
    nameText.includes("targus") ||
    nameText.includes("ego loop")
  )
    return "Bag";

  return categoryLookup;
}

function getGroupModel(asset: Asset): string {
  if (asset.model) return asset.model;
  if (asset.category) return asset.category;
  return asset.name || "Unknown model";
}

function createStockImportWorkbook() {
  const rows = [
    ["Category", "Model", "Service Tag"],
    ["Laptop", "Latitude 5450", "LT-5450-001"],
    ["Headset", "Blackwire 3200", "HS-3200-001"],
    ["Hub Monitor", "P2425HE", "MON-2425HE-001"],
    ["Normal Monitor", "P2422H", "MON-2422H-001"],
    ["Docking Station", "WD19DCS", "DOC-WD19DCS-001"],
    ["Bag", "Targus Backpack", ""],
    ["Bag", "Eco Loop Backpack", ""],
    ["Bag", "Premium Backpack", ""],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 18 }, { wch: 24 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Import");
  return workbook;
}

export function StockPage() {
  const { showToast } = useToast();
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<StockCategory>("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stockAssets, setStockAssets] = useState<Asset[]>([]);
  const dellWarrantyMap = useMemo(() => {
    const warrantyByTag: Record<string, WarrantyInfo> = {};
    for (const asset of stockAssets) {
      if (asset.serviceTag) warrantyByTag[asset.serviceTag] = getBatteryLabel(asset);
    }
    return warrantyByTag;
  }, [stockAssets]);
  const [addStockForm, setAddStockForm] = useState({
    category: "Keyboard",
    model: "Dell KB216",
    quantity: "10",
  });

  const refreshStock = async () => {
    setIsLoading(true);
    try {
      const nextItems = await fetchAssetsFromSupabase();
      const availableItems = nextItems.filter(
        (asset) =>
          asset.status === "Available" ||
          asset.status === "Returned" ||
          asset.status === "Reserved",
      );
      setStockAssets(availableItems);
    } catch {
      setStockAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshStock();
  }, []);

  const groupedStock = useMemo<StockSummaryRow[]>(() => {
    const groups = new Map<string, StockSummaryRow>();

    for (const asset of stockAssets) {
      const category = getGroupCategory(asset);
      const model = getGroupModel(asset);
      const key = `${category}|${model}`;
      const current = groups.get(key) ?? {
        category,
        model,
        count: 0,
        assetTags: [],
        serviceTags: [],
      };
      current.count += 1;
      if (asset.id) current.assetTags.push(asset.id);
      if (usesStockAssetTag(category)) {
        if (asset.id) current.serviceTags.push(asset.id);
      } else if (asset.serviceTag) {
        current.serviceTags.push(asset.serviceTag);
      }
      groups.set(key, current);
    }

    return Array.from(groups.values()).sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.model.localeCompare(b.model),
    );
  }, [stockAssets]);

  const filtered = useMemo(() => {
    return groupedStock.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        item.category.toLowerCase().includes(q) ||
        item.model.toLowerCase().includes(q) ||
        item.assetTags.some((tag) => tag.toLowerCase().includes(q)) ||
        item.serviceTags.some((tag) => tag.toLowerCase().includes(q));
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [groupedStock, search, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(
      STOCK_CATEGORIES.map((key) => [key, 0]),
    ) as Record<StockCategory, number>;

    for (const item of groupedStock) {
      if (item.category in counts) {
        counts[item.category as StockCategory] += item.count;
      }
    }

    return counts;
  }, [groupedStock]);

  const newCount = stockAssets.filter(
    (asset) => asset.condition === "New",
  ).length;
  const readyCount = stockAssets.filter(
    (asset) => asset.status === "Available",
  ).length;

  const handleDownloadTemplate = () => {
    const workbook = createStockImportWorkbook();
    XLSX.writeFile(workbook, "stock-import-template.xlsx");
    showToast("Stock template downloaded.", "success");
  };

  const handleBulkImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!supabaseConfig.isConfigured) {
      showToast(
        "Supabase is not configured yet. Add your project URL and key first.",
        "error",
      );
      event.target.value = "";
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        raw: false,
        defval: "",
      }) as Array<Array<string>>;

      if (!rows.length) {
        showToast(
          "The uploaded file is empty. Please use the stock template.",
          "error",
        );
        event.target.value = "";
        return;
      }

      const headers = rows[0].map((value) =>
        String(value).trim().toLowerCase(),
      );
      const categoryIndex = headers.findIndex((header) =>
        ["category", "asset type", "type"].includes(header),
      );
      const modelIndex = headers.findIndex((header) =>
        ["model", "device model", "asset model"].includes(header),
      );
      const serviceTagIndex = headers.findIndex((header) =>
        ["service tag", "service_tag", "serial tag", "tag"].includes(header),
      );

      if (categoryIndex === -1 || modelIndex === -1 || serviceTagIndex === -1) {
        showToast(
          "Please use the stock template headers: Category, Model, Service Tag.",
          "error",
        );
        event.target.value = "";
        return;
      }

      const parsedRows = rows
        .slice(1)
        .map((row) => ({
          category: String(row[categoryIndex] ?? "").trim(),
          model: String(row[modelIndex] ?? "").trim(),
          serviceTag: String(row[serviceTagIndex] ?? "").trim(),
        }))
        .filter(
          (row) =>
            row.category &&
            row.model &&
            (row.serviceTag || normalizeStockCategoryInput(row.category) === "Bag"),
        );

      if (!parsedRows.length) {
        showToast(
          "No valid stock rows were found in the uploaded file.",
          "error",
        );
        event.target.value = "";
        return;
      }

      // Pre-build per-prefix sequence counters so multiple rows of the same
      // category get correctly incremented tags (LAP-001, LAP-002 …)
      const prefixCounters = new Map<string, number>();
      const allAssets = await fetchAssetsFromSupabase();
      const getNextTagForPrefix = (prefix: string): string => {
        const existingMax = allAssets
          .map((a) => a.id)
          .filter((id) => id.toUpperCase().startsWith(`${prefix}-`))
          .reduce((max, id) => {
            const n = parseAssetTagSequence(id, prefix);
            return n !== null ? Math.max(max, n) : max;
          }, 0);
        const currentCounter = prefixCounters.get(prefix) ?? existingMax;
        const next = currentCounter + 1;
        prefixCounters.set(prefix, next);
        return `${prefix}-${String(next).padStart(3, "0")}`;
      };

      const assetPayload = parsedRows.map((row) => {
        const category = mapStockCategoryToDb(row.category);
        const model = row.model.trim();
        const serviceTag = normalizeServiceTag(row.serviceTag);
        const now = new Date().toISOString();

        // Generate a proper structured asset tag: LAP-001, MON-001, DOC-001 etc.
        const normalizedCategory = normalizeStockCategoryInput(row.category);
        const tagPrefix =
          STOCK_ASSET_TAG_PREFIX[normalizedCategory] ??
          STOCK_ASSET_TAG_PREFIX[category] ??
          "AST";

        return {
          asset_tag: getNextTagForPrefix(tagPrefix),
          name: `${normalizeStockCategoryInput(row.category)} - ${model}`,
          category,
          model,
          manufacturer: model.includes("Latitude")
            ? "Dell"
            : model.includes("P242")
              ? "Dell"
              : model.includes("Blackwire")
                ? "Poly"
                : "Stock",
          serial_number: "",
          service_tag: serviceTag || null,
          status: "Available",
          condition: "New",
          purchase_date: now.split("T")[0],
          purchase_cost: 0,
          vendor_id: null,
          warranty_start: null,
          warranty_end: null,
          warranty_status: "No Warranty",
          location: "SSC Bangalore",
          building: "",
          floor: "",
          room: "",
          assigned_to: null,
          assigned_date: null,
          received_date: now.split("T")[0],
          created_at: now,
          updated_at: now,
        };
      });

      const { error } = await supabase
        .from("assets")
        .upsert(assetPayload, { onConflict: "service_tag" });
      if (error) {
        throw error;
      }

      await refreshStock();
      setShowBulkModal(false);
      showToast(
        `Imported ${assetPayload.length} stock records successfully.`,
        "success",
      );
    } catch (error) {
      console.error("Bulk stock import failed:", error);
      showToast(
        "Bulk stock import failed. Please check the Excel columns and file format.",
        "error",
      );
    } finally {
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = "";
      }
    }
  };

  const handleAddStockSave = async () => {
    const quantity = Number(addStockForm.quantity);
    const category = addStockForm.category;

    if (!category || !Number.isFinite(quantity) || quantity <= 0) {
      showToast("Please enter a valid quantity greater than zero.", "error");
      return;
    }

    if (!["Keyboard", "Mouse", "Bag"].includes(category)) {
      showToast(
        "Add stock (by quantity) supports Keyboard, Mouse, and Bag entries. Use Bulk Import for other asset types.",
        "error",
      );
      return;
    }

    if (!supabaseConfig.isConfigured) {
      showToast(
        "Supabase is not configured yet. Add your project URL and key first.",
        "error",
      );
      return;
    }

    try {
      const model =
        category === "Keyboard"
          ? addStockForm.model || "Dell KB216"
          : category === "Mouse"
            ? addStockForm.model || "Dell MS116"
            : addStockForm.model || "Targus Backpack";
      const allAssets = await fetchAssetsFromSupabase();
      const assetTags = getNextStockAssetTags(
        allAssets,
        category,
        quantity,
      );
      const manufacturer =
        category === "Keyboard" || category === "Mouse" ? "Dell" : "Generic";
      const payload = assetTags.map((assetTag) => {
        const now = new Date().toISOString();

        return {
          asset_tag: assetTag,
          name: `${category} - ${model}`,
          category: mapStockCategoryToDb(category),
          model,
          manufacturer,
          serial_number: "",
          service_tag: null,
          status: "Available",
          condition: "New",
          purchase_date: now.split("T")[0],
          purchase_cost: 0,
          vendor_id: null,
          warranty_start: null,
          warranty_end: null,
          warranty_status: "No Warranty",
          location: "SSC Bangalore",
          building: "",
          floor: "",
          room: "",
          assigned_to: null,
          assigned_date: null,
          received_date: now.split("T")[0],
          created_at: now,
          updated_at: now,
        };
      });

      const { error } = await supabase.from("assets").insert(payload);
      if (error) {
        throw error;
      }

      await refreshStock();
      setShowAddModal(false);
      setAddStockForm({
        category: "Keyboard",
        model: "Dell KB216",
        quantity: "10",
      });
      showToast(
        `${quantity} ${category}(s) added to stock successfully.`,
        "success",
      );
    } catch (error) {
      console.error("Add stock failed:", error);
      showToast("The stock addition failed. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Stock Inventory & Available Devices"
        subtitle={`Tracking ${stockAssets.length} total devices available in stock`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={handleDownloadTemplate}
            >
              <span className="hidden sm:inline">Download Template</span>
            </Button>
            <Button
              variant="outline"
              icon={<Upload className="h-4 w-4" />}
              onClick={() => setShowBulkModal(true)}
            >
              Bulk Import
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowAddModal(true)}
            >
              Add Stock
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Stock"
          value={isLoading ? "..." : stockAssets.length}
          icon={<Package className="h-6 w-6" />}
          iconBg="bg-blue-900/50"
          iconColor="text-blue-400"
        />
        <StatCard
          label="New Devices"
          value={newCount}
          icon={<Package className="h-6 w-6" />}
          iconBg="bg-emerald-900/50"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Ready for Assignment"
          value={readyCount}
          icon={<Package className="h-6 w-6" />}
          iconBg="bg-cyan-900/50"
          iconColor="text-cyan-400"
        />
      </div>

      <Card className="p-4 bg-slate-800/90 border-slate-700">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder="Search by category, model, or tag..."
            className="flex-1"
          />
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
        {STOCK_CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          const count =
            category === "All" ? stockAssets.length : categoryCounts[category];

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={[
                "rounded-xl border p-3 text-left transition-all",
                isActive
                  ? "border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-950/30"
                  : "border-slate-700 bg-slate-900/50 hover:border-slate-500",
              ].join(" ")}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {category}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-bold text-slate-100">
                  {count}
                </span>
                <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                  items
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="bg-slate-800/90 border-slate-700 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {selectedCategory === "All"
                ? "All Stock Items"
                : `${selectedCategory} Stock`}
            </h3>
            <p className="text-xs text-slate-400">
              {filtered.length} stock group(s) shown
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            Loading stock from the database...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-300">
                  <th className="px-2 py-2 font-semibold">Category</th>
                  <th className="px-2 py-2 font-semibold">Model</th>
                  <th className="px-2 py-2 font-semibold">Stock Count</th>
                  <th className="px-2 py-2 font-semibold">Asset Tag</th>
                  <th className="px-2 py-2 font-semibold">Service Tag</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const warrantySummary = row.serviceTags
                    .map((tag) => dellWarrantyMap[tag])
                    .filter(Boolean)
                    .slice(0, 1);

                  return (
                    <tr
                      key={`${row.category}-${row.model}`}
                      className="border-b border-slate-800 text-slate-200 hover:bg-slate-800/70"
                    >
                      <td className="px-2 py-2 font-medium">{row.category}</td>
                      <td className="px-2 py-2 text-slate-300">{row.model}</td>
                      <td className="px-2 py-2 text-blue-300 font-semibold">
                        {row.count}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-slate-300">
                        {row.assetTags.length
                          ? `${row.assetTags.slice(0, 4).join(", ")}${
                              row.assetTags.length > 4
                                ? ` +${row.assetTags.length - 4} more`
                                : ""
                            }`
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-[11px] text-slate-300">
                        {usesStockAssetTag(row.category) ? (
                          "—"
                        ) : row.serviceTags.length ? (
                          <>
                            {row.serviceTags.slice(0, 4).join(", ")}
                            {row.serviceTags.length > 4
                              ? ` +${row.serviceTags.length - 4} more`
                              : ""}
                            {warrantySummary.length > 0 && (
                              <span className="ml-2 rounded-full border border-emerald-600/40 bg-emerald-900/20 px-2 py-0.5 text-[10px] text-emerald-300">
                                {warrantySummary[0].label}
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            No stock items found for this category.
          </div>
        )}
      </Card>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Stock Item"
        description="Add keyboards, mice, or one of the three bag variants in quantity. Asset tags are generated automatically, with each unit stored as an assignable stock item."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddStockSave}>
              Save to Stock
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 text-slate-100">
          <Field label="Category" required>
            <Select
              value={addStockForm.category}
              onChange={(value) => {
                const nextCategory = value as "Keyboard" | "Mouse" | "Bag";
                setAddStockForm((prev) => ({
                  ...prev,
                  category: nextCategory,
                  model:
                    nextCategory === "Keyboard"
                      ? "Dell KB216"
                      : nextCategory === "Mouse"
                        ? "Dell MS116"
                        : BAG_MODELS[0],
                }));
              }}
              options={[
                { label: "Keyboard", value: "Keyboard" },
                { label: "Mouse", value: "Mouse" },
                { label: "Bag", value: "Bag" },
              ]}
              placeholder="Select category"
              className="w-full"
            />
          </Field>

          <Field label="Model" required>
            <Select
              value={addStockForm.model}
              onChange={(value) =>
                setAddStockForm((prev) => ({ ...prev, model: value }))
              }
              options={(addStockForm.category === "Keyboard"
                ? KEYBOARD_MODELS
                : addStockForm.category === "Mouse"
                  ? MOUSE_MODELS
                  : BAG_MODELS
              ).map((model) => ({ label: model, value: model }))}
              placeholder="Select model"
              className="w-full"
            />
          </Field>

          <Field
            label="Quantity"
            required
            hint="This amount is added to the existing stock count."
          >
            <TextInput
              type="number"
              value={addStockForm.quantity}
              onChange={(value) =>
                setAddStockForm((prev) => ({ ...prev, quantity: value }))
              }
              placeholder="Enter quantity"
              min={1}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk Import Stock"
        description="Download the template, update the Category / Model / Service Tag columns, then upload it here. Imported records are added to the existing stock without clearing old assets."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Button variant="outline" onClick={() => setShowBulkModal(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-slate-200">
              Required template columns
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="px-2 py-2">A</th>
                    <th className="px-2 py-2">B</th>
                    <th className="px-2 py-2">C</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-800">
                    <td className="px-2 py-2">Category</td>
                    <td className="px-2 py-2">Model</td>
                    <td className="px-2 py-2">Service Tag</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="px-2 py-2">Laptop</td>
                    <td className="px-2 py-2">Latitude 5450</td>
                    <td className="px-2 py-2">LT-5450-001</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="px-2 py-2">Headset</td>
                    <td className="px-2 py-2">Blackwire 3200</td>
                    <td className="px-2 py-2">HS-3200-001</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="px-2 py-2">Hub Monitor</td>
                    <td className="px-2 py-2">P2425HE</td>
                    <td className="px-2 py-2">MON-2425HE-001</td>
                  </tr>
                  <tr className="border-b border-slate-800">
                    <td className="px-2 py-2">Normal Monitor</td>
                    <td className="px-2 py-2">P2422H</td>
                    <td className="px-2 py-2">MON-2422H-001</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2">Docking Station</td>
                    <td className="px-2 py-2">WD19DCS</td>
                    <td className="px-2 py-2">DOC-WD19DCS-001</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
            <Upload className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-200">
              Upload your Excel or CSV file
            </p>
            <p className="mt-1 text-xs text-slate-400">
              No location column is required. Only Category, Model, and Service
              Tag are used.
            </p>
            <input
              ref={bulkFileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleBulkImportFile}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => bulkFileInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
