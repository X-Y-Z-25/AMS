import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  AlertTriangle,
  Building2,
  Laptop,
  MapPin,
  Package,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/Table";
import { PageHeader } from "@/components/shared/PageHeader";
import type { PageKey } from "@/components/layout/Sidebar";
import type { Asset, Location } from "@/types";
import { formatCurrencyFull } from "@/lib/utils";
import { supabaseConfig } from "@/lib/supabase";
import {
  fetchActiveAssignmentAssetIdsFromSupabase,
  fetchAssetsFromSupabase,
  fetchPendingRepairsFromSupabase,
  fetchRecentAssetActivityFromSupabase,
  type PendingAssetRepair,
  type RecentAssetActivity,
} from "@/lib/supabaseData";

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
  onLocationClick: (location: Location) => void;
  onAssetSelect: (assetId: string) => void;
  refreshVersion?: number;
}

const LOW_STOCK_THRESHOLD = 5;

const statusLabels: Asset["status"][] = [
  "Available",
  "Assigned",
  "Under Repair",
  "Returned",
  "Reserved",
  "Retired",
  "Disposed",
  "Lost",
];

export function Dashboard({
  onNavigate,
  onLocationClick,
  onAssetSelect,
  refreshVersion = 0,
}: DashboardProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | "All">(
    "All",
  );
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeAssignmentAssetIds, setActiveAssignmentAssetIds] = useState<
    string[]
  >([]);
  const [recentActivity, setRecentActivity] = useState<RecentAssetActivity[]>([]);
  const [pendingRepairs, setPendingRepairs] = useState<PendingAssetRepair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setLoadError(null);

    if (!supabaseConfig.isConfigured) {
      setAssets([]);
      setActiveAssignmentAssetIds([]);
      setRecentActivity([]);
      setPendingRepairs([]);
      setLoadError(
        "Supabase is not configured. Add the Supabase URL and publishable key to your environment.",
      );
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      fetchAssetsFromSupabase(),
      fetchActiveAssignmentAssetIdsFromSupabase(),
      fetchRecentAssetActivityFromSupabase(),
      fetchPendingRepairsFromSupabase(),
    ])
      .then(([nextAssets, nextAssignmentAssetIds, nextActivity, nextRepairs]) => {
        if (cancelled) return;
        setAssets(nextAssets);
        setActiveAssignmentAssetIds(nextAssignmentAssetIds);
        setRecentActivity(nextActivity);
        setPendingRepairs(nextRepairs);
      })
      .catch((error: unknown) => {
        console.error("Could not load dashboard data from Supabase:", error);
        if (!cancelled) {
          setAssets([]);
          setActiveAssignmentAssetIds([]);
          setRecentActivity([]);
          setPendingRepairs([]);
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load dashboard data from Supabase. Check the connection and table permissions.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  const assetsForLocation = useMemo(
    () =>
      selectedLocation === "All"
        ? assets
        : assets.filter((asset) => asset.location === selectedLocation),
    [assets, selectedLocation],
  );
  const activeAssignmentAssetIdSet = useMemo(
    () => new Set(activeAssignmentAssetIds),
    [activeAssignmentAssetIds],
  );
  const isAssetAssigned = useCallback(
    (asset: Asset) =>
      asset.status === "Assigned" ||
      activeAssignmentAssetIdSet.has(asset._uuid ?? ""),
    [activeAssignmentAssetIdSet],
  );

  const assignedCount = assetsForLocation.filter(isAssetAssigned).length;
  const availableCount = assetsForLocation.filter(
    (asset) => asset.status === "Available" && !isAssetAssigned(asset),
  ).length;
  const underRepairCount = assetsForLocation.filter(
    (asset) => asset.status === "Under Repair",
  ).length;
  const retiredCount = assetsForLocation.filter(
    (asset) => asset.status === "Retired" || asset.status === "Disposed",
  ).length;
  const totalValuation = assetsForLocation.reduce(
    (sum, asset) => sum + asset.purchaseCost,
    0,
  );
  const utilizationRate =
    assetsForLocation.length > 0
      ? ((assignedCount / assetsForLocation.length) * 100).toFixed(1)
      : "0.0";

  const availableByCategory = useMemo(() => {
    const counts = new Map<string, number>(
      [...new Set(assets.map((asset) => asset.category))].map((category) => [
        category,
        0,
      ]),
    );
    assetsForLocation.forEach((asset) => {
      if (asset.status !== "Available" || isAssetAssigned(asset)) return;
      counts.set(asset.category, (counts.get(asset.category) ?? 0) + 1);
    });
    return [...counts.entries()].sort((left, right) =>
      left[0].localeCompare(right[0]),
    );
  }, [assets, assetsForLocation, isAssetAssigned]);

  const statusCounts = useMemo(
    () =>
      statusLabels
        .map((status) => ({
          status,
          count:
            status === "Assigned"
              ? assetsForLocation.filter(isAssetAssigned).length
              : status === "Available"
                ? availableCount
                : assetsForLocation.filter((asset) => asset.status === status)
                    .length,
        }))
        .filter((item) => item.count > 0),
    [assetsForLocation, availableCount, isAssetAssigned],
  );

  const lowStockItems = availableByCategory.filter(
    ([, count]) => count < LOW_STOCK_THRESHOLD,
  );

  const locationSummary = useMemo(
    () =>
      (["SSC Bangalore", "Global"] as const).map((location) => {
        const locationAssets = assets.filter((asset) => asset.location === location);
        return {
          location,
          total: locationAssets.length,
          assigned: locationAssets.filter(isAssetAssigned).length,
          available: locationAssets.filter(
            (asset) => asset.status === "Available" && !isAssetAssigned(asset),
          ).length,
          underRepair: locationAssets.filter(
            (asset) => asset.status === "Under Repair",
          ).length,
        };
      }),
    [assets, isAssetAssigned],
  );

  if (isLoading) {
    return (
      <div className="space-y-6 text-slate-100">
        <PageHeader title="Asset Dashboard" subtitle="Loading live asset data from Supabase..." />
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center text-slate-400">
          Loading live asset data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Asset Dashboard"
          subtitle="Live inventory summary from the database"
        />
        <div className="flex items-center gap-1 self-start rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-sm">
          {(["All", "SSC Bangalore", "Global"] as const).map((location) => (
            <button
              key={location}
              onClick={() => setSelectedLocation(location)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                selectedLocation === location
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              {location === "All" ? "All Locations" : location} (
              {location === "All"
                ? assets.length
                : assets.filter((asset) => asset.location === location).length}
              )
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <Card className="border-red-800/70 bg-slate-800/90 p-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-200">
              Dashboard data could not be loaded.
            </p>
            <p className="mt-2 text-sm text-red-300">{loadError}</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Total Assets"
              value={assetsForLocation.length.toLocaleString("en-IN")}
              icon={<Laptop className="h-6 w-6" />}
              iconBg="bg-blue-900/50"
              iconColor="text-blue-400"
              onClick={() => onNavigate("assets")}
            />
            <StatCard
              label="Portfolio Valuation"
              value={`₹${(totalValuation / 100000).toFixed(1)}L`}
              icon={<Package className="h-6 w-6" />}
              iconBg="bg-emerald-900/50"
              iconColor="text-emerald-400"
              trend={formatCurrencyFull(totalValuation)}
            />
            <StatCard
              label="Assigned (In-Use)"
              value={assignedCount.toLocaleString("en-IN")}
              icon={<UserCheck className="h-6 w-6" />}
              iconBg="bg-blue-900/50"
              iconColor="text-blue-400"
              trend={`${utilizationRate}% utilization rate`}
              trendUp
              onClick={() => onNavigate("assignments")}
            />
            <StatCard
              label="Available In Stock"
              value={availableCount.toLocaleString("en-IN")}
              icon={<Package className="h-6 w-6" />}
              iconBg="bg-cyan-900/50"
              iconColor="text-cyan-400"
              onClick={() => onNavigate("stock")}
            />
            <StatCard
              label="Under Repair"
              value={underRepairCount}
              icon={<Wrench className="h-6 w-6" />}
              iconBg="bg-amber-900/50"
              iconColor="text-amber-400"
              onClick={() => onNavigate("repairs")}
            />
            <StatCard
              label="Retired / Disposed"
              value={retiredCount}
              icon={<Archive className="h-6 w-6" />}
              iconBg="bg-slate-800"
              iconColor="text-slate-400"
              onClick={() => onNavigate("disposal")}
            />
          </div>

          {assets.length === 0 && (
            <Card className="border-slate-700 bg-slate-800/90 p-4 text-sm text-slate-300">
              No assets have been added to the database yet.
            </Card>
          )}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="bg-slate-800/90 p-5">
                <CardHeader
                  title="Stock by Category"
                  subtitle="Available inventory grouped by category"
                  action={<Package className="h-5 w-5 text-cyan-400" />}
                />
                <div className="pt-2">
                  <Table>
                    <THead>
                      <TR><TH>Category</TH><TH className="text-right">Available</TH></TR>
                    </THead>
                    <TBody>
                      {availableByCategory.length === 0 ? (
                        <TR><TD colSpan={2} className="py-6 text-center text-slate-400">No available stock.</TD></TR>
                      ) : availableByCategory.map(([category, count]) => (
                        <TR key={category}>
                          <TD>{category}</TD>
                          <TD className="text-right font-semibold text-cyan-300">{count}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>

              <Card className="bg-slate-800/90 p-5">
                <CardHeader
                  title="Stock by Status"
                  subtitle="Current asset lifecycle counts"
                  action={<Building2 className="h-5 w-5 text-blue-400" />}
                />
                <div className="pt-2">
                  <Table>
                    <THead>
                      <TR><TH>Status</TH><TH className="text-right">Assets</TH></TR>
                    </THead>
                    <TBody>
                      {statusCounts.length === 0 ? (
                        <TR><TD colSpan={2} className="py-6 text-center text-slate-400">No status data available.</TD></TR>
                      ) : statusCounts.map(({ status, count }) => (
                        <TR key={status}>
                          <TD>{status}</TD>
                          <TD className="text-right font-semibold text-slate-100">{count}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>

              <Card className="bg-slate-800/90 p-5">
                <CardHeader
                  title="Low Stock Alert"
                  subtitle={`Available category stock below ${LOW_STOCK_THRESHOLD}`}
                  action={<AlertTriangle className="h-5 w-5 text-amber-400" />}
                />
                <div className="pt-2">
                  {lowStockItems.length === 0 ? (
                    <p className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-4 text-sm text-emerald-300">
                      No categories are below the low-stock threshold.
                    </p>
                  ) : (
                    <Table>
                      <THead>
                        <TR><TH>Category</TH><TH className="text-right">Available</TH><TH className="text-right">Threshold</TH></TR>
                      </THead>
                      <TBody>
                        {lowStockItems.map(([category, count]) => (
                          <TR key={category}>
                            <TD className="font-medium text-amber-200">{category}</TD>
                            <TD className="text-right text-amber-300">{count}</TD>
                            <TD className="text-right text-slate-400">{LOW_STOCK_THRESHOLD}</TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  )}
                </div>
              </Card>

              <Card className="bg-slate-800/90 p-5">
                <CardHeader
                  title="Pending Repair"
                  subtitle="Repair requests not yet completed"
                  action={<Wrench className="h-5 w-5 text-amber-400" />}
                />
                <div className="pt-2">
                  <Table>
                    <THead>
                      <TR><TH>Asset</TH><TH>Issue</TH><TH>Status</TH><TH>Date</TH></TR>
                    </THead>
                    <TBody>
                      {pendingRepairs.length === 0 ? (
                        <TR><TD colSpan={4} className="py-6 text-center text-slate-400">No pending repairs.</TD></TR>
                      ) : pendingRepairs.slice(0, 8).map((repair) => (
                        <TR
                          key={repair.id}
                          onClick={() => onAssetSelect(repair.assetId)}
                          className="cursor-pointer hover:bg-slate-700/40"
                        >
                          <TD>
                            <span className="font-medium text-slate-100">{repair.assetName}</span>
                            <span className="mt-1 block font-mono text-xs text-slate-400">{repair.assetId}</span>
                          </TD>
                          <TD className="max-w-[220px] truncate">{repair.issue}</TD>
                          <TD>{repair.status}</TD>
                          <TD>{repair.reportedDate}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>

              <Card className="bg-slate-800/90 p-5">
                <CardHeader
                  title="Recent Activity"
                  subtitle="Latest assignments, transfers, and returns"
                  action={<Laptop className="h-5 w-5 text-blue-400" />}
                />
                <div className="pt-2">
                  <Table>
                    <THead>
                      <TR><TH>Asset</TH><TH>Action</TH><TH>Employee</TH><TH>Date</TH></TR>
                    </THead>
                    <TBody>
                      {recentActivity.length === 0 ? (
                        <TR><TD colSpan={4} className="py-6 text-center text-slate-400">No recent asset activity.</TD></TR>
                      ) : recentActivity.map((entry) => (
                        <TR
                          key={entry.id}
                          onClick={() => onAssetSelect(entry.assetId)}
                          className="cursor-pointer hover:bg-slate-700/40"
                        >
                          <TD>
                            <span className="font-medium text-slate-100">{entry.assetName}</span>
                            <span className="mt-1 block font-mono text-xs text-slate-400">{entry.assetId}</span>
                          </TD>
                          <TD className="text-blue-300">{entry.action}</TD>
                          <TD>{entry.employeeName}</TD>
                          <TD>{entry.date}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>

              <Card className="bg-slate-800/90 p-5">
                <CardHeader
                  title="Assets by Location"
                  subtitle="Inventory totals from the database"
                  action={<MapPin className="h-5 w-5 text-blue-400" />}
                />
                <div className="pt-2">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Location</TH>
                        <TH className="text-right">Total</TH>
                        <TH className="text-right">Assigned</TH>
                        <TH className="text-right">Available</TH>
                        <TH className="text-right">Repair</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {locationSummary.map((location) => (
                        <TR
                          key={location.location}
                          onClick={() => onLocationClick(location.location)}
                          className="cursor-pointer hover:bg-slate-700/40"
                        >
                          <TD className="font-semibold text-slate-100">{location.location}</TD>
                          <TD className="text-right">{location.total}</TD>
                          <TD className="text-right text-blue-300">{location.assigned}</TD>
                          <TD className="text-right text-emerald-300">{location.available}</TD>
                          <TD className="text-right text-amber-300">{location.underRepair}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>
          </div>
        </>
      )}
    </div>
  );
}
