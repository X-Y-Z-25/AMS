import { useEffect, useState } from "react";
import { Building2, Printer, FileDown, Save, Eye } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  fetchAssetByIdFromSupabase,
  fetchEmployeesFromSupabase,
} from "@/lib/supabaseData";
import { formatCategoryLabel, formatSerialDisplay } from "@/lib/utils";
import type { Asset, Employee } from "@/types";

interface HandoverFormModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
}

export function HandoverFormModal({
  open,
  onClose,
  assetId,
}: HandoverFormModalProps) {
  const { showToast } = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setEmployee(null);
      return;
    }

    void (async () => {
      const nextAsset = await fetchAssetByIdFromSupabase(assetId);
      setAsset(nextAsset);

      if (nextAsset?.assignedToEmployeeId) {
        const employees = await fetchEmployeesFromSupabase();
        const match = employees.find(
          (item) =>
            item.id === nextAsset.assignedToEmployeeId ||
            item.fullName === nextAsset.assignedToEmployeeName,
        );
        setEmployee(match ?? null);
      } else {
        setEmployee(null);
      }
    })();
  }, [assetId]);

  if (!asset) return null;

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="IT Asset Handover Form"
      description="Preview and generate handover document"
      size="lg"
      footer={
        <>
          <Button
            variant="outline"
            icon={<Eye className="h-4 w-4" />}
            onClick={() => showToast("Preview displayed below.", "info")}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            icon={<FileDown className="h-4 w-4" />}
            onClick={() => showToast("Exporting PDF...", "info")}
          >
            Generate PDF
          </Button>
          <Button
            variant="outline"
            icon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            variant="primary"
            icon={<Save className="h-4 w-4" />}
            onClick={() => {
              showToast("Document saved successfully.", "success");
              onClose();
            }}
          >
            Save Document
          </Button>
        </>
      }
    >
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-8 text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">
                Asset Management System
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Enterprise IT Department
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-100">
              IT ASSET HANDOVER FORM
            </p>
            <p className="text-xs text-amber-400 font-mono">
              Form ID: HF-{asset.id.slice(-6)}
            </p>
          </div>
        </div>

        {/* Employee Section */}
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Employee Information
          </h4>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
            <div>
              <span className="text-slate-400">Employee Name:</span>{" "}
              <span className="font-semibold text-slate-100">
                {employee?.fullName || asset.assignedToEmployeeName || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Employee ID:</span>{" "}
              <span className="font-mono text-amber-400 font-bold">
                {employee?.id || asset.assignedToEmployeeId || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Department:</span>{" "}
              <span className="font-semibold text-slate-200">
                {employee?.department || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Location:</span>{" "}
              <span className="font-semibold text-slate-200">
                {employee?.location || asset.location}
              </span>
            </div>
          </div>
        </div>

        {/* Asset Section */}
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Asset Information
          </h4>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm">
            <div>
              <span className="text-slate-400">Asset ID:</span>{" "}
              <span className="font-mono font-bold text-blue-400">
                {asset.id}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Asset Category:</span>{" "}
              <span className="font-semibold text-slate-100">
                {formatCategoryLabel(asset.category)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Manufacturer:</span>{" "}
              <span className="font-semibold text-slate-100">
                {asset.manufacturer}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Model Name:</span>{" "}
              <span className="font-semibold text-slate-100">
                {asset.model}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Serial Number:</span>{" "}
              <span className="font-mono text-slate-200">
                {formatSerialDisplay(asset.serialNumber)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Service Tag:</span>{" "}
              <span className="font-mono text-amber-400 font-bold">
                {asset.serviceTag}
              </span>
            </div>
          </div>
        </div>

        {/* Accessories */}
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Accessories Included
          </h4>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4">
            <p className="text-sm text-slate-400">
              Standard charger and accessories included with the device.
            </p>
          </div>
        </div>

        {/* Condition */}
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            Condition at Handover
          </h4>
          <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-sm">
            <span className="font-semibold text-emerald-400">
              {asset.condition}
            </span>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-4 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-b-2 border-slate-700 pb-12 mb-2" />
            <p className="text-sm font-semibold text-slate-200">
              Employee Signature
            </p>
            <p className="text-xs text-slate-400">{employee?.fullName || ""}</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-slate-700 pb-12 mb-2" />
            <p className="text-sm font-semibold text-slate-200">
              IT Representative
            </p>
            <p className="text-xs text-slate-400">IT Asset Admin</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-400">Issued Date: {today}</p>
        </div>
      </div>
    </Modal>
  );
}
