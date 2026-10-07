import { useEffect, useState } from "react";
import { Undo2, Download, Package, Wrench, Archive } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { ConditionBadge } from "@/components/ui/StatusBadges";
import { useToast } from "@/components/ui/Toast";
import { fetchReturnRecordsFromSupabase } from "@/lib/supabaseData";
import type { ReturnRecord } from "@/types";

export function ReturnsPage({
  onAssetSelect,
  refreshVersion = 0,
}: {
  onAssetSelect: (id: string) => void;
  refreshVersion?: number;
}) {
  const { showToast } = useToast();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchReturnRecordsFromSupabase()
      .then((rows) => {
        if (active) setReturns(rows);
      })
      .catch((error) => {
        console.error("Could not load return records:", error);
        if (active) showToast("Could not load return records.", "error");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshVersion, showToast]);

  const outcomeIcons = {
    "Available Stock": Package,
    Repair: Wrench,
    Retired: Archive,
  };

  const outcomeColors = {
    "Available Stock":
      "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
    Repair: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    Retired: "bg-slate-700/60 text-slate-300 border-slate-600/60",
  };

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Asset Returns & Restocking Log"
        subtitle={`${returns.length} asset return operations recorded`}
        actions={
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            onClick={() => showToast("Exporting returns report...", "info")}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Returns"
          value={returns.length}
          icon={<Undo2 className="h-6 w-6" />}
          iconBg="bg-blue-900/50"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Restocked to Available"
          value={returns.filter((r) => r.outcome === "Available Stock").length}
          icon={<Package className="h-6 w-6" />}
          iconBg="bg-emerald-900/50"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Sent to Repair"
          value={returns.filter((r) => r.outcome === "Repair").length}
          icon={<Wrench className="h-6 w-6" />}
          iconBg="bg-amber-900/50"
          iconColor="text-amber-400"
        />
      </div>

      <Card className="bg-slate-800/90 border-slate-700">
        <Table>
          <THead>
            <TR className="border-b border-slate-700 bg-slate-900/60">
              <TH>Return ID</TH>
              <TH>Asset</TH>
              <TH>Employee</TH>
              <TH>Return Date</TH>
              <TH>Condition</TH>
              <TH>Accessories Returned</TH>
              <TH>Missing</TH>
              <TH>Damage Details</TH>
              <TH>Outcome</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={9} className="py-10 text-center text-slate-400">
                  Loading returns...
                </TD>
              </TR>
            ) : returns.length === 0 ? (
              <TR>
                <TD colSpan={9} className="py-10 text-center text-slate-400">
                  No returns recorded.
                </TD>
              </TR>
            ) : returns.map((r) => {
              const OutcomeIcon = outcomeIcons[r.outcome];
              return (
                <TR
                  key={r.id}
                  onClick={() => onAssetSelect(r.assetId)}
                  className="hover:bg-slate-700/40 border-b border-slate-700/50 cursor-pointer"
                >
                  <TD className="font-mono text-xs font-bold text-blue-400">
                    {r.id}
                  </TD>
                  <TD>
                    <p className="font-semibold text-slate-100">
                      {r.assetName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">
                      {r.assetId}
                    </p>
                  </TD>
                  <TD>
                    <p className="text-sm font-semibold text-slate-100">
                      {r.employeeName}
                    </p>
                    <p className="text-xs text-amber-400 font-mono">
                      {r.employeeId}
                    </p>
                  </TD>
                  <TD className="text-xs text-slate-300 whitespace-nowrap">
                    {r.returnDate}
                  </TD>
                  <TD>
                    <ConditionBadge condition={r.condition} />
                  </TD>
                  <TD>
                    {r.accessoriesReturned.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.accessoriesReturned.map((a) => (
                          <span
                            key={a}
                            className="rounded bg-slate-700 px-1.5 py-0.5 text-[11px] font-medium text-slate-200"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </TD>
                  <TD>
                    {r.missingAccessories.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.missingAccessories.map((a) => (
                          <span
                            key={a}
                            className="rounded bg-rose-950/70 border border-rose-800/60 px-1.5 py-0.5 text-[11px] font-bold text-rose-300"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </TD>
                  <TD className="text-xs text-slate-300">
                    {r.damageDetails || "-"}
                  </TD>
                  <TD>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold border ${outcomeColors[r.outcome]}`}
                    >
                      <OutcomeIcon className="h-3 w-3" />
                      {r.outcome}
                    </span>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
