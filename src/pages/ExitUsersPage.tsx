import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { supabase, supabaseConfig } from "@/lib/supabase";
import {
  fetchAssetsFromSupabase,
  fetchEmployeesFromSupabase,
} from "@/lib/supabaseData";
import type { Employee } from "@/types";

interface ExitUserRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  exitDate: string;
  status: string;
  remarks: string;
  totalAssets: number;
  pendingAssets: number;
  employeeUuid: string;
  pendingItems: string[];
}

function formatExitDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (date) return `${date[3]}-${date[2]}-${date[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-GB");
}

export function ExitUsersPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState<ExitUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clearingRecordId, setClearingRecordId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadExitUsers = async () => {
      if (!supabaseConfig.isConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const [exitResult, employees, loadedAssets] = await Promise.all([
          supabase
            .from("exit_records")
            .select("*")
            .order("exit_date", { ascending: false }),
          fetchEmployeesFromSupabase(),
          fetchAssetsFromSupabase(),
        ]);
        if (exitResult.error) throw exitResult.error;

        const employeesByUuid = new Map<string, Employee>();
        employees.forEach((employee) => {
          if (employee._uuid) employeesByUuid.set(employee._uuid, employee);
        });
        const foundEmployeeIds = new Set<string>();
        const mapped: ExitUserRecord[] = (exitResult.data ?? []).map((row) => {
          const employee = employeesByUuid.get(row.employee_id);
          if (employee?._uuid) foundEmployeeIds.add(employee._uuid);
          const pendingItems = loadedAssets
            .filter(
              (asset) =>
                asset.assignedToEmployeeUuid === row.employee_id &&
                (asset.status === "Assigned" || asset.status === "Lost"),
            )
            .map(
              (asset) =>
                `${asset.model} · ${asset.serviceTag || asset.id} (${asset.status})`,
            );
          return {
            id: row.id,
            employeeUuid: row.employee_id,
            employeeName: employee?.fullName ?? "Former employee",
            employeeId: employee?.empId ?? employee?.id ?? row.employee_id,
            exitDate: formatExitDate(row.exit_date),
            status:
              row.asset_return_status === "Returned"
                ? "Cleared"
                : row.asset_return_status === "Partial"
                  ? "Missing / pending items"
                  : row.asset_return_status ?? "Pending",
            remarks: row.remarks ?? row.reason ?? "-",
            totalAssets: Number(row.total_assets ?? 0),
            pendingAssets: Number(row.pending_assets ?? 0),
            pendingItems,
          };
        });

        employees
          .filter(
            (employee) =>
              employee.status === "Inactive" &&
              employee._uuid &&
              !foundEmployeeIds.has(employee._uuid),
          )
          .forEach((employee) => {
            mapped.push({
              id: `inactive-${employee._uuid}`,
              employeeUuid: employee._uuid!,
              employeeName: employee.fullName,
              employeeId: employee.empId ?? employee.id,
              exitDate: "-",
              status: "Exit recorded; clearance details unavailable",
              remarks: "Employee is inactive.",
              totalAssets: employee.assignedDeviceCount ?? 0,
              pendingAssets: employee.assignedDeviceCount ?? 0,
              pendingItems: loadedAssets
                .filter(
                  (asset) =>
                    asset.assignedToEmployeeUuid === employee._uuid &&
                    (asset.status === "Assigned" || asset.status === "Lost"),
                )
                .map(
                  (asset) =>
                    `${asset.model} · ${asset.serviceTag || asset.id} (${asset.status})`,
                ),
            });
          });

        if (active) {
          setRecords(mapped);
        }
      } catch (error) {
        console.error("Could not load exit users:", error);
        if (active) {
          setRecords([]);
          showToast("Could not load exit records from the database.", "error");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadExitUsers();
    return () => {
      active = false;
    };
  }, [showToast]);

  const handleClearAssets = async (record: ExitUserRecord) => {
    if (record.status === "Cleared") return;
    setClearingRecordId(record.id);
    try {
      const now = new Date().toISOString();
      const { error: assetError } = await supabase
        .from("assets")
        .update({
          status: "Available",
          assigned_to: null,
          assigned_date: null,
          updated_at: now,
        })
        .eq("assigned_to", record.employeeUuid)
        .in("status", ["Assigned", "Lost"]);
      if (assetError) throw assetError;

      if (record.id.startsWith("inactive-")) {
        const { error } = await supabase.from("exit_records").insert({
          employee_id: record.employeeUuid,
          exit_date: new Date().toISOString().slice(0, 10),
          asset_return_status: "Returned",
          total_assets: record.totalAssets,
          pending_assets: 0,
          remarks: "Cleared",
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("exit_records")
          .update({
            asset_return_status: "Returned",
            pending_assets: 0,
            remarks: "Cleared",
          })
          .eq("id", record.id);
        if (error) throw error;
      }

      setRecords((previous) =>
        previous.map((item) =>
          item.id === record.id
            ? {
                ...item,
                status: "Cleared",
                remarks: "Cleared",
                pendingAssets: 0,
                pendingItems: [],
              }
            : item,
        ),
      );
      showToast("Exit record cleared and pending assets returned to stock.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not clear this exit record.";
      showToast(message, "error");
    } finally {
      setClearingRecordId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Exit Users & Asset Clearance"
        subtitle={`${records.length} exit record(s)`}
      />

      <Card className="bg-slate-800/90 border-slate-700">
        <Table>
          <THead>
            <TR className="border-b border-slate-700 bg-slate-900/60">
              <TH>Employee</TH>
              <TH>Exit Date</TH>
              <TH>Assets</TH>
              <TH>Status</TH>
              <TH>Remarks</TH>
              <TH>Action</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={6} className="py-12 text-center text-slate-400">
                  Loading exit records...
                </TD>
              </TR>
            ) : records.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-12 text-center text-slate-400">
                  No exit records found.
                </TD>
              </TR>
            ) : (
              records.map((record) => (
                <TR
                  key={record.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/40"
                >
                  <TD>
                    <p className="font-semibold text-slate-100">
                      {record.employeeName}
                    </p>
                    <p className="text-xs text-amber-400 font-mono">
                      {record.employeeId}
                    </p>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-slate-300">
                    {record.exitDate}
                  </TD>
                  <TD className="text-xs text-slate-300">
                    {record.totalAssets - record.pendingAssets} returned, {record.pendingAssets} pending
                    {record.pendingAssets > 0 && (
                      <div className="mt-1 space-y-1 text-amber-300">
                        {record.pendingItems.length > 0
                          ? record.pendingItems.map((item) => (
                              <p key={item}>{item}</p>
                            ))
                          : <p>{record.pendingAssets} asset(s) pending</p>}
                      </div>
                    )}
                  </TD>
                  <TD>
                    {record.status === "Cleared" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {record.status}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-800/60 bg-amber-950/60 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {record.status}
                      </span>
                    )}
                  </TD>
                  <TD className="max-w-[360px] whitespace-normal break-words text-xs text-slate-300">
                    {record.remarks === "-"
                      ? "No remarks recorded."
                      : record.remarks}
                  </TD>
                  <TD className="text-right">
                    <Button
                      variant={record.status === "Cleared" ? "outline" : "success"}
                      size="sm"
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      disabled={record.status === "Cleared" || clearingRecordId === record.id}
                      loading={clearingRecordId === record.id}
                      onClick={() => void handleClearAssets(record)}
                    >
                      {record.status === "Cleared" ? "Cleared" : "Clear"}
                    </Button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}