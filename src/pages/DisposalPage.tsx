import { useState } from "react";
import { Trash2, Download, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { DisposalBadge, ConditionBadge } from "@/components/ui/StatusBadges";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Select, TextArea } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { formatCurrencyFull } from "@/lib/utils";

const disposals: any[] = [];
const assets: any[] = [];
const DISPOSAL_REASONS: string[] = [];
const DISPOSAL_METHODS: string[] = [];
const CONDITIONS: string[] = ["New", "Good", "Fair", "Damaged"];

export function DisposalPage({
  onAssetSelect,
}: {
  onAssetSelect: (id: string) => void;
}) {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pending = disposals.filter((d) => d.status === "Pending").length;
  const disposedThisMonth = disposals.filter(
    (d) => d.status === "Disposed",
  ).length;
  const totalValue = disposals
    .filter((d) => d.status === "Disposed")
    .reduce((sum, d) => sum + d.value, 0);

  const availableAssets = assets.filter((a) => a.status !== "Disposed");

  return (
    <div>
      <PageHeader
        title="Disposal"
        subtitle="Manage asset disposal and retirement"
        actions={
          <>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() =>
                showToast("Export ready for backend integration.", "info")
              }
            >
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowModal(true)}
            >
              Dispose Asset
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard
          label="Pending Disposal"
          value={pending}
          icon={<AlertCircle className="h-6 w-6" />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Disposed This Month"
          value={disposedThisMonth}
          icon={<Trash2 className="h-6 w-6" />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          label="Total Disposal Value"
          value={formatCurrencyFull(totalValue)}
          icon={<Trash2 className="h-6 w-6" />}
          iconBg="bg-gray-100"
          iconColor="text-gray-600"
        />
      </div>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>Disposal ID</TH>
              <TH>Asset</TH>
              <TH>Disposal Date</TH>
              <TH>Reason</TH>
              <TH>Condition</TH>
              <TH>Method</TH>
              <TH>Approved By</TH>
              <TH className="text-right">Value</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {disposals.map((d) => (
              <TR key={d.id} onClick={() => onAssetSelect(d.assetId)}>
                <TD className="font-mono text-xs font-medium text-blue-600">
                  {d.id}
                </TD>
                <TD>
                  <p className="font-medium text-gray-900">{d.assetName}</p>
                  <p className="text-xs text-gray-500 font-mono">{d.assetId}</p>
                </TD>
                <TD className="text-xs">{d.disposalDate || "Pending"}</TD>
                <TD className="text-sm">{d.reason}</TD>
                <TD>
                  <ConditionBadge condition={d.condition} />
                </TD>
                <TD className="text-sm">{d.method}</TD>
                <TD className="text-sm">{d.approvedBy || "-"}</TD>
                <TD className="text-right font-medium">
                  {d.value > 0 ? formatCurrencyFull(d.value) : "-"}
                </TD>
                <TD>
                  <DisposalBadge status={d.status} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Dispose Asset"
        description="Submit an asset for disposal approval"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowModal(false);
                setConfirmOpen(true);
              }}
            >
              Submit for Approval
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-800">
              Warning: Disposal requires approval. This action cannot be easily
              undone once approved.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Asset" required>
              <Select
                value=""
                onChange={() => {}}
                options={availableAssets.map((a) => ({
                  label: `${a.id} - ${a.name}`,
                  value: a.id,
                }))}
                placeholder="Select asset..."
                className="w-full"
              />
            </Field>
            <Field label="Disposal Date" required>
              <input
                type="date"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </Field>
            <Field label="Reason" required>
              <Select
                value=""
                onChange={() => {}}
                options={DISPOSAL_REASONS.map((r) => ({ label: r, value: r }))}
                placeholder="Select reason..."
                className="w-full"
              />
            </Field>
            <Field label="Condition" required>
              <Select
                value=""
                onChange={() => {}}
                options={CONDITIONS.map((c) => ({ label: c, value: c }))}
                placeholder="Select..."
                className="w-full"
              />
            </Field>
            <Field label="Disposal Method" required>
              <Select
                value=""
                onChange={() => {}}
                options={DISPOSAL_METHODS.map((m) => ({ label: m, value: m }))}
                placeholder="Select method..."
                className="w-full"
              />
            </Field>
            <Field label="Approved By" required>
              <input
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Approver name"
                defaultValue="IT Manager"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Remarks">
                <TextArea
                  value=""
                  onChange={() => {}}
                  placeholder="Additional notes..."
                />
              </Field>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() =>
          showToast("Disposal request submitted for approval.", "success")
        }
        title="Confirm Disposal"
        message="Are you sure you want to submit this asset for disposal? This will require manager approval before final disposal."
        confirmLabel="Confirm Disposal"
      />
    </div>
  );
}
