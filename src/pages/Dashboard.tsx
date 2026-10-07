import { useEffect, useMemo, useState } from "react";
import {
  Laptop,
  UserCheck,
  Package,
  Wrench,
  Archive,
  MapPin,
  IndianRupee,
  ShieldCheck,
  Building2,
  BarChart3,
} from "lucide-react";
import { Card, CardHeader, StatCard } from "@/components/ui/Card";
import { BarChart, DonutChart, PieChart } from "@/components/ui/Charts";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { PageHeader } from "@/components/shared/PageHeader";
import type { PageKey } from "@/components/layout/Sidebar";
import type { Asset, Location } from "@/types";
import { formatCurrencyFull } from "@/lib/utils";
import {
  fetchAssetsFromSupabase,
  fetchRecentAssetActivityFromSupabase,
  type RecentAssetActivity,
} from "@/lib/supabaseData";

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
  onLocationClick: (location: Location) => void;
  onAssetSelect: (assetId: string) => void;
  refreshVersion?: number;
}

const chartColors = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a78bfa",
  "#f97316",
  "#ef4444",
  "#14b8a6",
  "#eab308",
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
  const [recentActivity, setRecentActivity] = useState<RecentAssetActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchAssetsFromSupabase(),
      fetchRecentAssetActivityFromSupabase().catch((error) => {
        console.error("Could not load recent asset activity:", error);
        return [];
      }),
    ])
      .then(([nextAssets, nextActivity]) => {
        if (!cancelled) {
          setAssets(nextAssets);
          setRecentActivity(nextActivity);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
          setRecentActivity([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  const locFilter = selectedLocation === "All" ? undefined : selectedLocation;
  const filteredAssets = useMemo(
    () => (locFilter ? assets.filter((a) => a.location === locFilter) : assets),
    [assets, locFilter],
  );

  const totalCount = filteredAssets.length;
  const assignedCount = filteredAssets.filter(
    (a) => a.status === "Assigned",
  ).length;
  const availableCount = filteredAssets.filter(
    (a) => a.status === "Available",
  ).length;
  const underRepairCount = filteredAssets.filter(
    (a) => a.status === "Under Repair",
  ).length;
  const retiredCount = filteredAssets.filter(
    (a) => a.status === "Retired" || a.status === "Disposed",
  ).length;
  const totalValuation = filteredAssets.reduce(
    (sum, a) => sum + a.purchaseCost,
    0,
  );
  const utilizationRate =
    totalCount > 0 ? ((assignedCount / totalCount) * 100).toFixed(1) : "0";

  const statusData = [
    {
      label: "Available",
      value: filteredAssets.filter((a) => a.status === "Available").length,
      color: "#22c55e",
    },
    {
      label: "Assigned",
      value: filteredAssets.filter((a) => a.status === "Assigned").length,
      color: "#3b82f6",
    },
    {
      label: "Under Repair",
      value: filteredAssets.filter((a) => a.status === "Under Repair").length,
      color: "#f59e0b",
    },
    {
      label: "Returned",
      value: filteredAssets.filter((a) => a.status === "Returned").length,
      color: "#8b5cf6",
    },
    {
      label: "Retired",
      value: filteredAssets.filter((a) => a.status === "Retired").length,
      color: "#64748b",
    },
    {
      label: "Disposed",
      value: filteredAssets.filter((a) => a.status === "Disposed").length,
      color: "#ef4444",
    },
  ].filter((entry) => entry.value > 0);

  const locationData = ["SSC Bangalore", "Global"].map((location) => ({
    label: location,
    value: assets.filter((a) => a.location === location).length,
    color: location === "SSC Bangalore" ? "#3b82f6" : "#22c55e",
  }));

  const categoryData = Object.entries(
    filteredAssets.reduce<Record<string, number>>((acc, asset) => {
      acc[asset.category] = (acc[asset.category] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value], index) => ({
      label: label
        .replace("Laptop - ", "")
        .replace("Monitor - ", "")
        .replace("Docking Station - ", ""),
      value,
      color: chartColors[index % chartColors.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const locationMatrix = ["SSC Bangalore", "Global"].map((location) => {
    const items = assets.filter((a) => a.location === location);
    const assigned = items.filter((a) => a.status === "Assigned").length;
    const available = items.filter((a) => a.status === "Available").length;
    const repair = items.filter((a) => a.status === "Under Repair").length;
    const retiredDisposed = items.filter(
      (a) => a.status === "Retired" || a.status === "Disposed",
    ).length;
    const total = items.length;

    return {
      location,
      total,
      assigned,
      available,
      repair,
      retiredDisposed,
      utilization: total > 0 ? ((assigned / total) * 100).toFixed(1) : "0.0",
    };
  });

  if (isLoading) {
    return (
      <div className="space-y-6 text-slate-100">
        <PageHeader
          title="Asset Dashboard"
          subtitle="Loading live asset data from Supabase..."
        />
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
          <button
            onClick={() => setSelectedLocation("All")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${selectedLocation === "All" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}
          >
            All Locations ({assets.length})
          </button>
          <button
            onClick={() => setSelectedLocation("SSC Bangalore")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${selectedLocation === "SSC Bangalore" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}
          >
            SSC Bangalore (
            {assets.filter((a) => a.location === "SSC Bangalore").length})
          </button>
          <button
            onClick={() => setSelectedLocation("Global")}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${selectedLocation === "Global" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}
          >
            Global ({assets.filter((a) => a.location === "Global").length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total Assets"
          value={totalCount.toLocaleString("en-IN")}
          icon={<Laptop className="h-6 w-6" />}
          iconBg="bg-blue-900/50"
          iconColor="text-blue-400"
          onClick={() => onNavigate("assets")}
        />
        <StatCard
          label="Portfolio Valuation"
          value={`₹${(totalValuation / 100000).toFixed(1)}L`}
          icon={<IndianRupee className="h-6 w-6" />}
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

      {totalCount === 0 ? (
        <Card className="p-8 bg-slate-800/90 border-slate-700">
          <div className="text-center text-slate-400">
            <p className="text-lg font-semibold text-slate-200">
              No asset data is available yet.
            </p>
            <p className="mt-2 text-sm">
              The dashboard is connected to Supabase and will update when assets
              are added to the database.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5 bg-slate-800/90 border-slate-700">
              <CardHeader
                title="Asset Status"
                subtitle="Operational lifecycle status"
                action={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
              />
              <div className="pt-4">
                <DonutChart
                  data={statusData}
                  size={180}
                  centerValue={String(totalCount)}
                  centerLabel="Assets"
                />
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/90 border-slate-700">
              <CardHeader
                title="Location Share"
                subtitle="Assets by deployment location"
                action={<MapPin className="h-5 w-5 text-blue-400" />}
              />
              <div className="pt-4">
                <PieChart data={locationData} size={180} />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5 bg-slate-800/90 border-slate-700">
              <CardHeader
                title="Asset Categories"
                subtitle="Top category distribution"
                action={<BarChart3 className="h-5 w-5 text-blue-400" />}
              />
              <div className="pt-4">
                <BarChart data={categoryData} height={220} showValues />
              </div>
            </Card>

            <Card className="p-5 bg-slate-800/90 border-slate-700">
              <CardHeader
                title="Location Utilization"
                subtitle="Assigned vs available per location"
                action={<Building2 className="h-5 w-5 text-cyan-400" />}
              />
              <div className="pt-4">
                <BarChart
                  data={locationMatrix.map((row) => ({
                    label: row.location,
                    value: row.assigned,
                    color:
                      row.location === "SSC Bangalore" ? "#3b82f6" : "#22c55e",
                    formattedValue: `${row.utilization}%`,
                  }))}
                  height={220}
                  showValues
                />
              </div>
            </Card>
          </div>

          <Card className="p-5 bg-slate-800/90 border-slate-700">
            <CardHeader
              title="Recent Asset Activity"
              subtitle="Latest assignments, transfers, and returns"
              action={<Laptop className="h-5 w-5 text-blue-400" />}
            />
            <div className="pt-2">
              <Table>
                <THead>
                  <TR className="border-b border-slate-700 bg-slate-900/60">
                    <TH>Asset</TH>
                    <TH>Action</TH>
                    <TH>Employee</TH>
                    <TH>Date</TH>
                  </TR>
                </THead>
                <TBody>
                  {recentActivity.length === 0 ? (
                    <TR>
                      <TD colSpan={4} className="py-8 text-center text-slate-400">
                        No recent asset activity.
                      </TD>
                    </TR>
                  ) : (
                    recentActivity.map((entry) => (
                      <TR
                        key={entry.id}
                        onClick={() => onAssetSelect(entry.assetId)}
                        className="cursor-pointer border-b border-slate-700/50 hover:bg-slate-700/40"
                      >
                        <TD>
                          <p className="font-semibold text-slate-100">
                            {entry.assetName}
                          </p>
                          <p className="font-mono text-xs text-slate-400">
                            {entry.assetId}
                          </p>
                        </TD>
                        <TD className="text-xs font-semibold text-blue-300">
                          {entry.action}
                        </TD>
                        <TD className="text-sm text-slate-200">
                          {entry.employeeName}
                        </TD>
                        <TD className="whitespace-nowrap text-xs text-slate-300">
                          {entry.date}
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Card>

          <Card className="p-5 bg-slate-800/90 border-slate-700">
            <CardHeader
              title="Location Inventory Matrix"
              subtitle="Direct comparison across all locations"
              action={<MapPin className="h-5 w-5 text-slate-400" />}
            />
            <div className="overflow-x-auto pt-2">
              <Table>
                <THead>
                  <TR className="border-b border-slate-700 bg-slate-900/60">
                    <TH>Location</TH>
                    <TH className="text-right">Total Assets</TH>
                    <TH className="text-right">Assigned</TH>
                    <TH className="text-right">Available</TH>
                    <TH className="text-right">Under Repair</TH>
                    <TH className="text-right">Retired / Disposed</TH>
                    <TH className="text-right">Utilization</TH>
                  </TR>
                </THead>
                <TBody>
                  {locationMatrix.map((loc) => (
                    <TR
                      key={loc.location}
                      onClick={() => onLocationClick(loc.location as Location)}
                      className="hover:bg-slate-700/40 border-b border-slate-700/50 cursor-pointer"
                    >
                      <TD>
                        <span className="flex items-center gap-2 font-bold text-slate-100">
                          <MapPin className="h-4 w-4 text-blue-400" />
                          {loc.location}
                        </span>
                      </TD>
                      <TD className="text-right font-bold text-slate-100">
                        {loc.total}
                      </TD>
                      <TD className="text-right text-emerald-400 font-bold">
                        {loc.assigned}
                      </TD>
                      <TD className="text-right text-blue-400 font-bold">
                        {loc.available}
                      </TD>
                      <TD className="text-right text-amber-400 font-bold">
                        {loc.repair}
                      </TD>
                      <TD className="text-right text-slate-400 font-medium">
                        {loc.retiredDisposed}
                      </TD>
                      <TD className="text-right">
                        <span className="inline-flex items-center rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-800/60">
                          {loc.utilization}%
                        </span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
