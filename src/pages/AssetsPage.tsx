import { useState, useMemo, useEffect } from "react";
import {
  Eye,
  FileText,
  UserCheck,
  ArrowLeftRight,
  Undo2,
  Wrench,
  Trash2,
  Laptop,
  MapPin,
  Building2,
  Filter,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Select } from "@/components/ui/Form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { AddAssetModal } from "@/components/assets/AddAssetModal";
import { AssetDetailsDrawer } from "@/components/assets/AssetDetailsDrawer";
import {
  AssetActionDialogs,
  type AssetAction,
} from "@/components/assets/AssetActionDialogs";
import { ProvisionTemplateModal } from "@/components/assets/ProvisionTemplateModal";
import { HandoverFormModal } from "@/components/assets/HandoverFormModal";
import { useToast } from "@/components/ui/Toast";
import { fetchAssetsFromSupabase } from "@/lib/supabaseData";
import { supabaseConfig } from "@/lib/supabase";
import { getInitials, classNames, getStatusBadgeClass } from "@/lib/utils";
import type { Asset, Location, AssetCategory, Department } from "@/types";

interface AssetsPageProps {
  selectedAssetId: string | null;
  onAssetSelect: (id: string) => void;
  refreshVersion?: number;
  locationFilter?: Location | null;
  onClearLocationFilter?: () => void;
}

const ITEMS_PER_PAGE = 12;

export function AssetsPage({
  selectedAssetId,
  onAssetSelect,
  refreshVersion = 0,
  locationFilter,
  onClearLocationFilter,
}: AssetsPageProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [locationFilterState, setLocationFilterState] = useState("");
  const [page, setPage] = useState(1);
  const [liveAssets, setLiveAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [refreshVersion]);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverAssetId, setHandoverAssetId] = useState<string>("");
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
    return liveAssets.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.id.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        a.serviceTag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.assignedToEmployeeName?.toLowerCase().includes(q) ||
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
  }, [liveAssets, search, categoryFilter, effectiveLocation, deptFilter]);

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

  const handleOpenHandoverForm = (assetId: string) => {
    setHandoverAssetId(assetId);
    setShowHandoverModal(true);
  };

  const handleAction = (type: AssetAction, assetId: string) => {
    setAction({ type, assetId });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Assets Inventory"
        subtitle={`${liveAssets.length} assets in database · ${assignedAssets.length} assigned to employees`}
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
          <Table>
            <THead>
              <TR className="border-b border-slate-700 bg-slate-900/60">
                <TH>Asset Tag</TH>
                <TH>Model Name</TH>
                <TH>Service Tag</TH>
                <TH>Status</TH>
                <TH>Employee ID</TH>
                <TH>Employee Name</TH>
                <TH>Location</TH>
                <TH>Assigned Date</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {liveAssets.length === 0 ? (
                <TR>
                  <TD colSpan={9} className="text-center py-12 text-slate-400">
                    No asset data is available yet.
                  </TD>
                </TR>
              ) : pageData.length === 0 ? (
                <TR>
                  <TD colSpan={9} className="text-center py-12 text-slate-400">
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
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/80 text-xs font-semibold text-white shadow-sm flex-shrink-0">
                          {getInitials(asset.assignedToEmployeeName || "")}
                        </span>
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {asset.assignedToEmployeeName || "Unassigned"}
                        </p>
                      </div>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                        <MapPin className="h-3.5 w-3.5 text-blue-400" />
                        {asset.location}
                      </span>
                    </TD>
                    <TD className="text-xs text-slate-300 whitespace-nowrap">
                      {asset.assignedDate || "-"}
                    </TD>
                    <TD
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={
                            <FileText className="h-3.5 w-3.5 text-blue-400" />
                          }
                          onClick={() => handleOpenHandoverForm(asset.id)}
                          title="Generate / Print Handover Form"
                        >
                          Handover
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={
                            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-300" />
                          }
                          onClick={() => handleAction("transfer", asset.id)}
                          title="Transfer Asset"
                        >
                          Transfer
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={
                            <Undo2 className="h-3.5 w-3.5 text-amber-400" />
                          }
                          onClick={() => handleAction("return", asset.id)}
                          title="Record Return"
                        >
                          Return
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
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

      {/* Drawers and Modals */}
      <AssetDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        assetId={selectedAssetId}
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
        onCompleted={(assetId) => {
          handleOpenHandoverForm(assetId);
        }}
      />

      <HandoverFormModal
        open={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        assetId={handoverAssetId}
      />

      {action && (
        <AssetActionDialogs
          action={action}
          onClose={() => setAction(null)}
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
