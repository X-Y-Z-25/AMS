import { useState, useMemo, useEffect } from "react";
import { UserCheck, Download, Eye } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Select } from "@/components/ui/Form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { ConditionBadge } from "@/components/ui/StatusBadges";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { getInitials } from "@/lib/utils";
import { fetchActiveAssignmentsFromSupabase } from "@/lib/supabaseData";
import { supabaseConfig } from "@/lib/supabase";
import type { Assignment } from "@/types";

const ITEMS_PER_PAGE = 12;

export function AssignmentsPage({
  onAssetSelect,
  refreshVersion = 0,
}: {
  onAssetSelect: (id: string) => void;
  refreshVersion?: number;
}) {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    if (!supabaseConfig.isConfigured) {
      setAssignments([]);
      setLoadError(
        "Supabase is not configured. Assignment data cannot be loaded.",
      );
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    fetchActiveAssignmentsFromSupabase()
      .then((rows) => {
        if (active) setAssignments(rows);
      })
      .catch((error) => {
        console.error("Could not load active assignments:", error);
        if (active) {
          setAssignments([]);
          setLoadError("Could not load assignments from the database.");
          showToast("Could not load assignments from the database.", "error");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshVersion, showToast]);

  const departments = useMemo(
    () =>
      [...new Set(assignments.map((assignment) => assignment.department))].sort(),
    [assignments],
  );

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.assetId.toLowerCase().includes(q) ||
        a.assetName.toLowerCase().includes(q) ||
        a.employeeName.toLowerCase().includes(q) ||
        a.employeeId.toLowerCase().includes(q);
      const matchesDept = !deptFilter || a.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [assignments, search, deptFilter]);

  const employeeCount = new Set(
    assignments.map((assignment) => assignment.employeeId),
  ).size;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageData = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Asset Assignments"
        subtitle={`${assignments.length} assets currently assigned from the database`}
        actions={
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            onClick={() => showToast("Exporting assignments report...", "info")}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Assigned Assets"
          value={assignments.length}
          icon={<UserCheck className="h-6 w-6" />}
          iconBg="bg-blue-900/50"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Active"
          value={assignments.filter((a) => a.status === "Active").length}
          icon={<UserCheck className="h-6 w-6" />}
          iconBg="bg-emerald-900/50"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Employees with Assets"
          value={employeeCount}
          icon={<UserCheck className="h-6 w-6" />}
          iconBg="bg-cyan-900/50"
          iconColor="text-cyan-400"
        />
      </div>

      <Card className="p-4 bg-slate-800/90 border-slate-700">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by Asset ID, Employee Name, Employee ID..."
            className="flex-1"
          />
          <Select
            value={deptFilter}
            onChange={(v) => {
              setDeptFilter(v);
              setPage(1);
            }}
            options={departments.map((d) => ({ label: d, value: d }))}
            placeholder="All Departments"
          />
        </div>
      </Card>

      <Card className="bg-slate-800/90 border-slate-700">
        <Table>
          <THead>
            <TR className="border-b border-slate-700 bg-slate-900/60">
              <TH>Asset ID</TH>
              <TH>Asset Name</TH>
              <TH>Employee ID</TH>
              <TH>Employee Name</TH>
              <TH>Department</TH>
              <TH>Location</TH>
              <TH>Assignment Date</TH>
              <TH>Condition</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={9} className="py-12 text-center text-slate-400">
                  Loading current assignments...
                </TD>
              </TR>
            ) : loadError ? (
              <TR>
                <TD colSpan={9} className="py-12 text-center text-red-300">
                  {loadError}
                </TD>
              </TR>
            ) : pageData.length === 0 ? (
              <TR>
                <TD colSpan={9} className="text-center py-12 text-slate-400">
                  No currently assigned assets found.
                </TD>
              </TR>
            ) : (
              pageData.map((a) => (
                <TR
                  key={a.id}
                  className="hover:bg-slate-700/40 border-b border-slate-700/50"
                >
                  <TD className="font-mono text-xs font-bold text-blue-400">
                    {a.assetId}
                  </TD>
                  <TD className="font-semibold text-slate-100">
                    {a.assetName}
                  </TD>
                  <TD>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-800/50">
                      {a.employeeId}
                    </span>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/80 text-xs font-semibold text-white shadow-sm flex-shrink-0">
                        {getInitials(a.employeeName)}
                      </span>
                      <p className="text-sm font-semibold text-slate-100">
                        {a.employeeName}
                      </p>
                    </div>
                  </TD>
                  <TD>
                    <span className="text-xs text-slate-300 font-medium">
                      {a.department}
                    </span>
                  </TD>
                  <TD>
                    <span className="text-xs text-slate-300 font-medium">
                      {a.location}
                    </span>
                  </TD>
                  <TD className="text-xs text-slate-300">{a.assignmentDate}</TD>
                  <TD>
                    <ConditionBadge condition={a.condition} />
                  </TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="h-3.5 w-3.5 text-blue-400" />}
                        onClick={() => onAssetSelect(a.assetId)}
                      >
                        View
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
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
    </div>
  );
}
