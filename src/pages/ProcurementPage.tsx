import { useState } from "react";
import {
  Plus,
  Download,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Select } from "@/components/ui/Form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { ProcurementBadge } from "@/components/ui/StatusBadges";
import { Modal } from "@/components/ui/Modal";
import { Field, TextArea } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { formatCurrencyFull } from "@/lib/utils";
import type { ProcurementStatus } from "@/types";

const procurementOrders: any[] = [];
const vendors: any[] = [];
const CATEGORIES: string[] = [];
const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function ProcurementPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const filtered = procurementOrders.filter((o) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.vendorName.toLowerCase().includes(q) ||
      o.model.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pending = procurementOrders.filter(
    (o) => o.status === "Pending",
  ).length;
  const received = procurementOrders.filter(
    (o) => o.status === "Received",
  ).length;
  const partial = procurementOrders.filter(
    (o) => o.status === "Partially Received",
  ).length;
  const cancelled = procurementOrders.filter(
    (o) => o.status === "Cancelled",
  ).length;

  return (
    <div>
      <PageHeader
        title="Procurement"
        subtitle="Purchase orders and procurement tracking"
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
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setShowModal(true)}
            >
              Create Purchase Order
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        <StatCard
          label="Total POs"
          value={procurementOrders.length}
          icon={<ShoppingCart className="h-6 w-6" />}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Pending"
          value={pending}
          icon={<Clock className="h-6 w-6" />}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Received"
          value={received}
          icon={<CheckCircle2 className="h-6 w-6" />}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Cancelled"
          value={cancelled}
          icon={<XCircle className="h-6 w-6" />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by PO Number, Vendor, Model..."
            className="flex-1"
          />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ProcurementStatus)}
            options={[
              "Pending",
              "Partially Received",
              "Received",
              "Cancelled",
            ].map((s) => ({ label: s, value: s }))}
            placeholder="All Statuses"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <THead>
            <TR>
              <TH>PO Number</TH>
              <TH>Vendor</TH>
              <TH>Order Date</TH>
              <TH>Items</TH>
              <TH className="text-right">Quantity</TH>
              <TH className="text-right">Total Cost</TH>
              <TH>Status</TH>
              <TH>Expected Date</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <TR>
                <TD colSpan={8} className="text-center py-12 text-gray-500">
                  No purchase orders found.
                </TD>
              </TR>
            ) : (
              filtered.map((po) => (
                <TR key={po.id}>
                  <TD className="font-mono text-xs font-medium text-blue-600">
                    {po.id}
                  </TD>
                  <TD className="font-medium text-gray-900">{po.vendorName}</TD>
                  <TD className="text-xs">{po.orderDate}</TD>
                  <TD>
                    <p className="text-sm font-medium">{po.category}</p>
                    <p className="text-xs text-gray-500">{po.model}</p>
                  </TD>
                  <TD className="text-right">
                    <span className="text-sm font-medium">
                      {po.receivedQuantity}
                    </span>
                    <span className="text-xs text-gray-400">
                      {" "}
                      / {po.quantity}
                    </span>
                  </TD>
                  <TD className="text-right font-medium">
                    {formatCurrencyFull(po.totalCost)}
                  </TD>
                  <TD>
                    <ProcurementBadge status={po.status} />
                  </TD>
                  <TD className="text-xs">{po.expectedDate}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Purchase Order"
        description="Enter procurement details"
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
                showToast("Purchase order created successfully.", "success");
              }}
            >
              Create PO
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vendor" required>
            <Select
              value=""
              onChange={() => {}}
              options={vendors.map((v) => ({ label: v.name, value: v.id }))}
              placeholder="Select vendor..."
              className="w-full"
            />
          </Field>
          <Field label="PO Number" required>
            <input
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="PO-2026-XXX"
            />
          </Field>
          <Field label="Purchase Date" required>
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="Expected Delivery">
            <input
              type="date"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </Field>
          <Field label="Asset Category" required>
            <Select
              value=""
              onChange={() => {}}
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
              placeholder="Select..."
              className="w-full"
            />
          </Field>
          <Field label="Model">
            <input
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Model name"
            />
          </Field>
          <Field label="Quantity" required>
            <input
              type="number"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
          </Field>
          <Field label="Unit Cost">
            <input
              type="number"
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
          </Field>
          <Field label="Total Cost">
            <input
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-500 bg-gray-50"
              placeholder="Auto-calculated"
              disabled
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <TextArea
                value=""
                onChange={() => {}}
                placeholder="Additional notes..."
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
