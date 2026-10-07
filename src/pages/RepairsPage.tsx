import { useState, useMemo } from "react";
import { Wrench, Download, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Select, TextInput, TextArea } from "@/components/ui/Form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { RepairBadge } from "@/components/ui/StatusBadges";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { formatCurrencyFull } from "@/lib/utils";
import type { RepairStatus } from "@/types";

const repairs: any[] = [];
const assets: any[] = [];
const vendors: any[] = [];

const ITEMS_PER_PAGE = 10;

export function RepairsPage({
  onAssetSelect,
}: {
  onAssetSelect: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    return repairs.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.assetId.toLowerCase().includes(q) ||
        r.assetName.toLowerCase().includes(q) ||
        r.issue.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageData = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const underRepair = repairs.filter(
    (r) => r.status === "Under Repair" || r.status === "Sent to Vendor",
  ).length;
  const completed = repairs.filter((r) => r.status === "Completed").length;
  const pending = repairs.filter((r) => r.status === "Pending").length;

  const availableAssets = assets.filter(
    (a) => a.status !== "Disposed" && a.status !== "Retired",
  );

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Repairs & Vendor Maintenance"
        subtitle="Track assets sent for repair and vendor maintenance status"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => showToast("Exporting repairs report...", "info")}
            >
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="primary"
              icon={<Wrench className="h-4 w-4" />}
              onClick={() => setShowModal(true)}
            >
              Send for Repair
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Under Repair"
          value={underRepair}
          icon={<Wrench className="h-6 w-6" />}
          iconBg="bg-amber-900/50"
          iconColor="text-amber-400"
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={<CheckCircle2 className="h-6 w-6" />}
          iconBg="bg-emerald-900/50"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Pending"
          value={pending}
          icon={<Clock className="h-6 w-6" />}
          iconBg="bg-blue-900/50"
          iconColor="text-blue-400"
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
            placeholder="Search by Repair ID, Asset, Issue..."
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as RepairStatus)}
            options={[
              "Pending",
              "Sent to Vendor",
              "Under Repair",
              "Completed",
              "Not Repairable",
            ].map((s) => ({ label: s, value: s }))}
            placeholder="All Statuses"
          />
        </div>
      </Card>

      <Card className="bg-slate-800/90 border-slate-700">
        <Table>
          <THead>
            <TR className="border-b border-slate-700 bg-slate-900/60">
              <TH>Repair ID</TH>
              <TH>Asset</TH>
              <TH>Issue Description</TH>
              <TH>Vendor</TH>
              <TH>Sent Date</TH>
              <TH>Expected Return</TH>
              <TH className="text-right">Cost</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {pageData.length === 0 ? (
              <TR>
                <TD colSpan={8} className="text-center py-12 text-slate-400">
                  No repair records found.
                </TD>
              </TR>
            ) : (
              pageData.map((r) => (
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
                  <TD className="text-xs text-slate-300 max-w-[200px] truncate">
                    {r.issue}
                  </TD>
                  <TD className="text-xs text-slate-300 font-medium">
                    {r.vendorName}
                  </TD>
                  <TD className="text-xs text-slate-300 whitespace-nowrap">
                    {r.sentDate}
                  </TD>
                  <TD className="text-xs text-slate-300 whitespace-nowrap">
                    {r.expectedReturn}
                  </TD>
                  <TD className="text-right font-semibold text-slate-100">
                    {r.cost > 0 ? formatCurrencyFull(r.cost) : "-"}
                  </TD>
                  <TD>
                    <RepairBadge status={r.status} />
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

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Send Asset for Repair"
        description="Create a new repair record"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setShowModal(false);
                showToast("Repair record created successfully.", "success");
              }}
            >
              Send for Repair
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-slate-100">
          <Field label="Asset" required>
            <Select
              value=""
              onChange={() => {}}
              options={availableAssets.map((a) => ({
                label: `${a.id} - ${a.name} (${a.model})`,
                value: a.id,
              }))}
              placeholder="Select asset..."
              className="w-full"
            />
          </Field>
          <Field label="Repair Vendor" required>
            <Select
              value=""
              onChange={() => {}}
              options={vendors.map((v) => ({ label: v.name, value: v.id }))}
              placeholder="Select vendor..."
              className="w-full"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Issue Description" required>
              <TextArea
                value=""
                onChange={() => {}}
                placeholder="Describe the issue..."
              />
            </Field>
          </div>
          <Field label="Sent Date" required>
            <TextInput type="date" className="w-full" />
          </Field>
          <Field label="Expected Return Date">
            <TextInput type="date" className="w-full" />
          </Field>
          <Field label="Estimated Cost">
            <TextInput type="number" placeholder="0" className="w-full" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
