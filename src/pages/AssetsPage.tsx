import { useState, useMemo, useEffect, useRef, type ChangeEvent } from "react";
import {
  MapPin,
  Filter,
  X,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Select } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { AddAssetModal } from "@/components/assets/AddAssetModal";
import { AssetDetailsDrawer } from "@/components/assets/AssetDetailsDrawer";
import {
  AssetActionDialogs,
  type AssetAction,
} from "@/components/assets/AssetActionDialogs";
import { ProvisionTemplateModal } from "@/components/assets/ProvisionTemplateModal";
import { useToast } from "@/components/ui/Toast";
import { fetchAssetsFromSupabase } from "@/lib/supabaseData";
import { supabase, supabaseConfig } from "@/lib/supabase";
import type { AppUserProfile } from "@/lib/auth";
import {
  classNames,
  getStatusBadgeClass,
  normalizeServiceTag,
} from "@/lib/utils";
import type { Asset, Location, AssetCategory } from "@/types";

interface AssetsPageProps {
  selectedAssetId: string | null;
  onAssetSelect: (id: string) => void;
  refreshVersion?: number;
  locationFilter?: Location | null;
  onClearLocationFilter?: () => void;
  profile: AppUserProfile;
}

const ITEMS_PER_PAGE = 12;
const DETAIL_IMPORT_CATEGORIES: Record<string, string> = {
  laptop: "Laptop",
  "hub monitor": "Monitor",
  "monitor - hub": "Monitor",
  "monitor - dell p2425he": "Monitor",
  "normal monitor": "Monitor",
  "monitor - normal": "Monitor",
  "monitor - dell p2422h": "Monitor",
  monitor: "Monitor",
  "docking station": "Docking Station",
  "docking station - wd19dcs": "Docking Station",
  headset: "Headset",
};

function parseImportDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }

  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    const [, dayText, monthText, yearText] = dmy;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : null;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const excelDate = XLSX.SSF.parse_date_code(Number(text));
    if (!excelDate) return null;
    return `${excelDate.y}-${String(excelDate.m).padStart(2, "0")}-${String(excelDate.d).padStart(2, "0")}`;
  }

  return null;
}

function formatWarrantyRemaining(value: string): string {
  if (!value || value === "N/A") return "—";
  const match = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const endDate = match
    ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
    : new Date(value);
  if (Number.isNaN(endDate.getTime())) return "—";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  if (endDate < today) return "Expired";

  let years = endDate.getFullYear() - today.getFullYear();
  let months = endDate.getMonth() - today.getMonth();
  let days = endDate.getDate() - today.getDate();
  if (days < 0) {
    months -= 1;
    const previousMonthDays = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      0,
    ).getDate();
    days += previousMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}Y ${months}M ${days}D`;
}

export function AssetsPage({
  selectedAssetId,
  onAssetSelect,
  refreshVersion = 0,
  locationFilter,
  onClearLocationFilter,
  profile,
}: AssetsPageProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [locationFilterState, setLocationFilterState] = useState("");
  const [page, setPage] = useState(1);
  const [liveAssets, setLiveAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOtherDetailsModal, setShowOtherDetailsModal] = useState(false);
  const [isImportingDetails, setIsImportingDetails] = useState(false);
  const detailImportInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    if (!supabaseConfig.isConfigured) {
      setLiveAssets([]);
      setIsLoading(false);
      showToast(
        "Supabase is not configured. Asset data from the database will not load.",
        "warning",
      );
      return () => {
        cancelled = true;
      };
    }

    fetchAssetsFromSupabase()
      .then((assets) => {
        if (!cancelled) {
          setLiveAssets(assets);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setLiveAssets([]);
          showToast(
            "Could not load assets from the database. Check Supabase connection and permissions.",
            "error",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshVersion, showToast]);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [action, setAction] = useState<{
    type: AssetAction;
    assetId: string;
  } | null>(null);

  const effectiveLocation = locationFilter || locationFilterState || "";

  const categoryOptions = useMemo(
    () => Array.from(new Set(liveAssets.map((asset) => asset.category))).sort(),
    [liveAssets],
  );
  const locationOptions = useMemo(
    () => Array.from(new Set(liveAssets.map((asset) => asset.location))).sort(),
    [liveAssets],
  );

  const assignedAssets = useMemo(
    () => liveAssets.filter((a) => a.status === "Assigned"),
    [liveAssets],
  );

  const filtered = useMemo(() => {
    return assignedAssets.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.id.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        a.serviceTag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.assignedToEmployeeName?.toLowerCase().includes(q) ||
        a.assignedToEmployeeEmail?.toLowerCase().includes(q) ||
        a.assignedToEmployeeId?.toLowerCase().includes(q);

      const matchesCategory = !categoryFilter || a.category === categoryFilter;
      const matchesLocation =
        !effectiveLocation || a.location === effectiveLocation;

      const matchesDept =
        !deptFilter ||
        (a.assignedToEmployeeName ?? "")
          .toLowerCase()
          .includes(deptFilter.toLowerCase());

      return matchesSearch && matchesCategory && matchesLocation && matchesDept;
    });
  }, [assignedAssets, search, categoryFilter, effectiveLocation, deptFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageData = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const modelStats = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        category: string;
        color: string;
        assigned: number;
        available: number;
        total: number;
      }
    >();

    for (const asset of liveAssets) {
      const key = asset.category;
      const existing = groups.get(key) ?? {
        label: asset.category,
        category: key,
        color: "#3b82f6",
        assigned: 0,
        available: 0,
        total: 0,
      };
      existing.total += 1;
      if (asset.status === "Assigned") existing.assigned += 1;
      if (asset.status === "Available") existing.available += 1;
      groups.set(key, existing);
    }

    return Array.from(groups.values()).slice(0, 8);
  }, [liveAssets]);

  const handleRowClick = (asset: Asset) => {
    onAssetSelect(asset.id);
    setDrawerOpen(true);
  };

  const handleAction = (type: AssetAction, assetId: string) => {
    setAction({ type, assetId });
  };

  const handleDownloadDetailsTemplate = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Category", "Invoice", "Purchase Date", "Service Tag"],
      ["Laptop", "INV-2026-001", "2026-01-15", "DELL-SERVICE-TAG"],
      ["Hub Monitor", "INV-2026-002", "2026-01-15", "MONITOR-SERVICE-TAG"],
      ["Normal Monitor", "INV-2026-003", "2026-01-15", "MONITOR-SERVICE-TAG"],
      ["Docking Station", "INV-2026-004", "2026-01-15", "DOCK-SERVICE-TAG"],
      ["Headset", "INV-2026-005", "2026-01-15", "HEADSET-SERVICE-TAG"],
    ]);
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 24 },
      { wch: 18 },
      { wch: 28 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asset Details");
    XLSX.writeFile(workbook, "asset-other-details-template.xlsx");
  };

  const handleImportOtherDetails = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImportingDetails(true);
    let updatedCount = 0;

    try {
      if (!supabaseConfig.isConfigured) {
        throw new Error("Supabase is not configured. Cannot update asset details.");
      }

      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
      });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = firstSheetName
        ? workbook.Sheets[firstSheetName]
        : undefined;
      if (!firstSheet) throw new Error("The selected workbook has no worksheet.");

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        raw: true,
        defval: "",
      }) as unknown[][];
      if (rows.length < 2) {
        throw new Error("The file has no asset detail rows to import.");
      }

      const headers = rows[0].map((value) =>
        String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
      );
      const categoryIndex = headers.indexOf("category");
      const invoiceIndex = headers.findIndex((header) =>
        ["invoice", "invoicenumber", "invoiceno"].includes(header),
      );
      const purchaseDateIndex = headers.findIndex((header) =>
        ["purchasedate", "dateofpurchase"].includes(header),
      );
      const serviceTagIndex = headers.findIndex((header) =>
        ["servicetag", "serialtag", "tag"].includes(header),
      );
      if (
        categoryIndex === -1 ||
        invoiceIndex === -1 ||
        purchaseDateIndex === -1 ||
        serviceTagIndex === -1
      ) {
        throw new Error(
          "Use the template headers: Category, Invoice, Purchase Date, Service Tag.",
        );
      }

      const parsedRows = rows
        .slice(1)
        .map((row, index) => {
          const categoryLabel = String(row[categoryIndex] ?? "").trim();
          const category =
            DETAIL_IMPORT_CATEGORIES[categoryLabel.toLowerCase()];
          const invoice = String(row[invoiceIndex] ?? "").trim();
          const purchaseDate = parseImportDate(row[purchaseDateIndex]);
          const serviceTag = normalizeServiceTag(
            String(row[serviceTagIndex] ?? ""),
          );
          return {
            rowNumber: index + 2,
            categoryLabel,
            category,
            invoice,
            purchaseDate,
            serviceTag,
          };
        })
        .filter(
          (row) =>
            row.categoryLabel ||
            row.invoice ||
            row.purchaseDate ||
            row.serviceTag,
        );

      if (parsedRows.length === 0) {
        throw new Error("No non-empty asset detail rows were found.");
      }

      const validationErrors: string[] = [];
      const seenTags = new Set<string>();
      for (const row of parsedRows) {
        if (!row.category) {
          validationErrors.push(
            `Row ${row.rowNumber}: Category must be Laptop, Hub Monitor, Normal Monitor, Docking Station, or Headset.`,
          );
        }
        if (!row.invoice) {
          validationErrors.push(`Row ${row.rowNumber}: Invoice is required.`);
        }
        if (!row.purchaseDate) {
          validationErrors.push(
            `Row ${row.rowNumber}: Purchase Date is missing or invalid.`,
          );
        }
        if (!row.serviceTag) {
          validationErrors.push(`Row ${row.rowNumber}: Service Tag is required.`);
        } else if (seenTags.has(row.serviceTag)) {
          validationErrors.push(
            `Row ${row.rowNumber}: Service Tag ${row.serviceTag} appears more than once.`,
          );
        } else {
          seenTags.add(row.serviceTag);
        }
      }
      if (validationErrors.length) {
        throw new Error(validationErrors.slice(0, 5).join(" "));
      }

      const {
        data: matchingAssets,
        error: matchingAssetsError,
      } = await supabase
        .from("assets")
        .select("id, service_tag, category")
        .not("service_tag", "is", null);
      if (matchingAssetsError) throw matchingAssetsError;

      const assetsByServiceTag = new Map<
        string,
        { id: string; category: string }[]
      >();
      (matchingAssets ?? []).forEach((asset) => {
        const tag = normalizeServiceTag(asset.service_tag);
        const matches = assetsByServiceTag.get(tag) ?? [];
        matches.push({ id: asset.id, category: asset.category });
        assetsByServiceTag.set(tag, matches);
      });
      const unmatchedTags = parsedRows
        .filter((row) => !assetsByServiceTag.has(row.serviceTag))
        .map((row) => row.serviceTag);
      if (unmatchedTags.length) {
        throw new Error(
          `No database asset matches these service tags: ${unmatchedTags.slice(0, 5).join(", ")}.`,
        );
      }

      for (const row of parsedRows) {
        const matches = assetsByServiceTag.get(row.serviceTag) ?? [];
        if (matches.length !== 1) {
          throw new Error(
            `Service tag ${row.serviceTag} matches multiple database assets.`,
          );
        }
        const [asset] = matches;
        if (asset.category !== row.category) {
          throw new Error(
            `Category in row ${row.rowNumber} does not match the database category for service tag ${row.serviceTag}.`,
          );
        }
        const { error } = await supabase
          .from("assets")
          .update({
            category: row.category,
            invoice_number: row.invoice,
            purchase_date: row.purchaseDate,
            updated_at: new Date().toISOString(),
          })
          .eq("id", asset.id);
        if (error) {
          throw new Error(
            `Import stopped at service tag ${row.serviceTag}: ${error.message}`,
          );
        }
        updatedCount += 1;
      }

      const updatedAssets = await fetchAssetsFromSupabase();
      setLiveAssets(updatedAssets);
      setShowOtherDetailsModal(false);
      showToast(
        `Updated invoice and purchase details for ${parsedRows.length} asset(s).`,
        "success",
      );
    } catch (error) {
      console.error("Could not import additional asset details:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Could not import additional asset details.";
      showToast(
        updatedCount > 0
          ? `${message} ${updatedCount} earlier asset(s) were already updated.`
          : message,
        "error",
      );
    } finally {
      setIsImportingDetails(false);
      if (detailImportInputRef.current) {
        detailImportInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Assigned Assets"
        subtitle={`${assignedAssets.length} assets currently assigned to employees`}
        actions={
          <Button
            variant="outline"
            icon={<Upload className="h-4 w-4" />}
            onClick={() => setShowOtherDetailsModal(true)}
          >
            Add Other Details
          </Button>
        }
      />

      {/* Location Filter Banner if active */}
      {locationFilter && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            Filtered by location: <strong>{locationFilter}</strong>
          </span>
          <button
            onClick={onClearLocationFilter}
            className="ml-auto text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Live Laptop & Hardware Model Assignment Counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {modelStats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => {
              setCategoryFilter(
                stat.category === categoryFilter ? "" : stat.category,
              );
              setPage(1);
            }}
            className={`cursor-pointer rounded-xl border p-3 transition-all ${
              categoryFilter === stat.category
                ? "border-blue-500 bg-blue-900/30 ring-2 ring-blue-500/40"
                : "border-slate-700/70 bg-slate-800/80 hover:border-slate-600 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300 truncate">
                {stat.label}
              </span>
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-bold text-slate-100">
                {stat.assigned}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Assigned
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>{stat.available} stock</span>
              <span>{stat.total} tot</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4 bg-slate-800/90 border-slate-700">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by Employee Name, ID, Asset ID, Serial Number, Service Tag..."
            className="flex-1"
          />
          <div className="flex gap-3 flex-wrap">
            <Select
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v as AssetCategory);
                setPage(1);
              }}
              options={categoryOptions.map((c) => ({ label: c, value: c }))}
              placeholder="All Device Models"
            />
            <Select
              value={deptFilter}
              onChange={(v) => {
                setDeptFilter(v);
                setPage(1);
              }}
              options={Array.from(
                new Set(
                  liveAssets.map((asset) => asset.assignedToEmployeeName),
                ),
              )
                .filter(Boolean)
                .map((name) => ({ label: name!, value: name! }))}
              placeholder="All Employees"
            />
            {!locationFilter && (
              <Select
                value={locationFilterState}
                onChange={(v) => {
                  setLocationFilterState(v as Location);
                  setPage(1);
                }}
                options={locationOptions.map((l) => ({ label: l, value: l }))}
                placeholder="All Locations"
              />
            )}
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800/90 border-slate-700">
        {isLoading ? (
          <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-400">
            Loading asset data...
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR className="border-b border-slate-700 bg-slate-900/60">
                <TH>Asset Tag</TH>
                <TH>Model Name</TH>
                <TH>Service Tag</TH>
                <TH>Invoice</TH>
                <TH>Purchase Date</TH>
                <TH>Warranty Left</TH>
                <TH>Status</TH>
                <TH>Employee ID</TH>
                <TH>Employee Email</TH>
                <TH>Location</TH>
                <TH>Assigned Date</TH>
              </TR>
            </THead>
            <TBody>
              {assignedAssets.length === 0 ? (
                <TR>
                  <TD colSpan={11} className="text-center py-12 text-slate-400">
                    No assigned assets are available.
                  </TD>
                </TR>
              ) : pageData.length === 0 ? (
                <TR>
                  <TD colSpan={11} className="text-center py-12 text-slate-400">
                    No assets found matching your criteria.
                  </TD>
                </TR>
              ) : (
                pageData.map((asset) => (
                  <TR
                    key={asset.id}
                    onClick={() => handleRowClick(asset)}
                    className="hover:bg-slate-700/40 border-b border-slate-700/50 cursor-pointer"
                  >
                    <TD className="font-mono text-xs font-semibold text-blue-400">
                      {asset.id}
                    </TD>
                    <TD>
                      <p className="font-semibold text-slate-100 text-sm">
                        {asset.model}
                      </p>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {asset.serviceTag || "—"}
                      </span>
                    </TD>
                    <TD className="max-w-[180px] break-words text-xs text-slate-300">
                      {asset.invoiceNumber || "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-slate-300">
                      {asset.purchaseDate === "N/A" ? "—" : asset.purchaseDate}
                    </TD>
                    <TD className="whitespace-nowrap text-xs font-medium text-slate-300">
                      {formatWarrantyRemaining(asset.warrantyEnd)}
                    </TD>
                    <TD>
                      <span
                        className={classNames(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          getStatusBadgeClass(asset.status),
                        )}
                      >
                        {asset.status}
                      </span>
                    </TD>
                    <TD>
                      <span className="font-mono text-xs font-semibold text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/50">
                        {asset.assignedToEmployeeId || "-"}
                      </span>
                    </TD>
                    <TD>
                      <p className="text-sm font-medium text-slate-200">
                        {asset.assignedToEmployeeEmail || "—"}
                      </p>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-blue-400" />
                        {asset.locationLabel || asset.location}
                      </span>
                    </TD>
                    <TD className="text-xs text-slate-300 whitespace-nowrap">
                      {asset.assignedDate || "-"}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          </div>
        )}

        {filtered.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </Card>

      <Modal
        open={showOtherDetailsModal}
        onClose={() => setShowOtherDetailsModal(false)}
        title="Add Other Asset Details"
        description="Import invoice and purchase details for existing assets by matching each service tag."
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={handleDownloadDetailsTemplate}
            >
              Download Template
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowOtherDetailsModal(false)}
            >
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-sm font-semibold text-slate-200">
              Required columns
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700">
                    {["Category", "Invoice", "Purchase Date", "Service Tag"].map(
                      (heading) => (
                        <th key={heading} className="px-2 py-2">{heading}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2">Laptop</td>
                    <td className="px-2 py-2">INV-2026-001</td>
                    <td className="px-2 py-2">2026-01-15</td>
                    <td className="px-2 py-2">DELL-SERVICE-TAG</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2">Hub Monitor / Normal Monitor</td>
                    <td className="px-2 py-2">INV-2026-002</td>
                    <td className="px-2 py-2">2026-01-15</td>
                    <td className="px-2 py-2">MONITOR-SERVICE-TAG</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2">Docking Station / Headset</td>
                    <td className="px-2 py-2">INV-2026-003</td>
                    <td className="px-2 py-2">2026-01-15</td>
                    <td className="px-2 py-2">DEVICE-SERVICE-TAG</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Dates may be YYYY-MM-DD or DD-MM-YYYY. Rows are matched to existing
              database assets by Service Tag. Warranty left is calculated from
              the asset’s saved warranty end date.
            </p>
          </div>

          <div className="rounded-lg border-2 border-dashed border-slate-700 bg-slate-900/60 p-6 text-center">
            <Upload className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-200">
              Upload Excel or CSV
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Supported categories: Laptop, Hub Monitor, Normal Monitor,
              Docking Station, and Headset.
            </p>
            <input
              ref={detailImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportOtherDetails}
            />
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              loading={isImportingDetails}
              disabled={isImportingDetails}
              onClick={() => detailImportInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>
        </div>
      </Modal>

      {/* Drawers and Modals */}
      <AssetDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        assetId={selectedAssetId}
        onEdit={() => setDrawerOpen(false)}
        onAction={(type, id) => {
          setDrawerOpen(false);
          handleAction(type, id);
        }}
      />

      <AddAssetModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => showToast("Asset added successfully.", "success")}
      />

      <ProvisionTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onCompleted={onAssetSelect}
      />

      {action && (
        <AssetActionDialogs
          action={action}
          onClose={() => setAction(null)}
          receivedBy={profile.username}
          onComplete={() => {
            setAction(null);
            fetchAssetsFromSupabase()
              .then(setLiveAssets)
              .catch((error) => {
                console.error("Could not refresh assets after operation:", error);
                showToast("The operation completed, but the asset list could not refresh.", "warning");
              });
          }}
        />
      )}
    </div>
  );
}
