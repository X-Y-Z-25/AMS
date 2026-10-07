import { useState, useEffect } from "react";
import {
  Laptop,
  Building,
  ShoppingCart,
  Shield,
  MapPin,
  User,
  Edit,
  UserCheck,
  ArrowLeftRight,
  Undo2,
  Wrench,
  Trash2,
  History,
  FileText,
  Package,
} from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import {
  StatusBadge,
  ConditionBadge,
  WarrantyBadge,
} from "@/components/ui/StatusBadges";
import { useToast } from "@/components/ui/Toast";
import {
  fetchAssetByIdFromSupabase,
  fetchEmployeesFromSupabase,
} from "@/lib/supabaseData";
import {
  formatCurrencyFull,
  getInitials,
  classNames,
  formatCategoryLabel,
  formatSerialDisplay,
} from "@/lib/utils";
import type { AssetAction } from "./AssetActionDialogs";

interface AssetDetailsDrawerProps {
  assetId: string | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: AssetAction, assetId: string) => void;
  onEdit: (assetId: string) => void;
}

type Tab = "overview" | "history" | "documents";

export function AssetDetailsDrawer({
  assetId,
  open,
  onClose,
  onAction,
  onEdit,
}: AssetDetailsDrawerProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [asset, setAsset] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setEmployee(null);
      return;
    }

    fetchAssetByIdFromSupabase(assetId).then((nextAsset) => {
      setAsset(nextAsset);
      if (nextAsset?.assignedToEmployeeId) {
        fetchEmployeesFromSupabase().then((employees) => {
          const match = employees.find(
            (item) =>
              item.id === nextAsset.assignedToEmployeeId ||
              item.fullName === nextAsset.assignedToEmployeeName,
          );
          setEmployee(match ?? null);
        });
      } else {
        setEmployee(null);
      }
    });
  }, [assetId]);

  if (!asset) return null;

  const documents: any[] = [];

  const tabs: { key: Tab; label: string; icon: typeof Laptop }[] = [
    { key: "overview", label: "Overview", icon: Laptop },
    { key: "history", label: "History", icon: History },
    { key: "documents", label: "Documents", icon: FileText },
  ];

  const sections = [
    {
      title: "Basic Hardware Information",
      icon: Laptop,
      fields: [
        {
          label: "Asset ID",
          value: (
            <span className="font-mono font-bold text-blue-400">
              {asset.id}
            </span>
          ),
        },
        {
          label: "Model Name",
          value: (
            <span className="font-semibold text-slate-100">{asset.model}</span>
          ),
        },
        { label: "Category", value: formatCategoryLabel(asset.category) },
        { label: "Manufacturer", value: asset.manufacturer },
        {
          label: "Serial Number",
          value: (
            <span className="font-mono text-slate-200">
              {formatSerialDisplay(asset.serialNumber)}
            </span>
          ),
        },
        {
          label: "Service Tag",
          value: (
            <span className="font-mono font-bold text-amber-400">
              {asset.serviceTag}
            </span>
          ),
        },
      ],
    },
    {
      title: "Purchase Information",
      icon: ShoppingCart,
      fields: [
        { label: "Purchase Date", value: asset.purchaseDate },
        {
          label: "Purchase Cost",
          value: formatCurrencyFull(asset.purchaseCost),
        },
        { label: "Vendor", value: asset.vendorName },
        { label: "Purchase Order", value: asset.purchaseOrder },
        { label: "Invoice Number", value: asset.invoiceNumber },
      ],
    },
    {
      title: "Warranty Status",
      icon: Shield,
      fields: [
        { label: "Warranty Start", value: asset.warrantyStart },
        { label: "Warranty End", value: asset.warrantyEnd },
        {
          label: "Warranty Status",
          value: <WarrantyBadge status={asset.warrantyStatus} />,
        },
      ],
    },
    {
      title: "Location Details",
      icon: MapPin,
      fields: [
        { label: "Location", value: asset.location },
        { label: "Building", value: asset.building },
        { label: "Floor", value: asset.floor },
        { label: "Room", value: asset.room },
      ],
    },
    {
      title: "Employee Assignment",
      icon: User,
      fields: employee
        ? [
            {
              label: "Employee Name",
              value: (
                <span className="font-bold text-slate-100">
                  {employee.fullName}
                </span>
              ),
            },
            {
              label: "Employee ID",
              value: (
                <span className="font-mono text-amber-400 font-bold">
                  {employee.id}
                </span>
              ),
            },
            { label: "Department", value: employee.department },
            { label: "Designation", value: employee.designation },
            { label: "Assigned Date", value: asset.assignedDate || "-" },
          ]
        : [
            {
              label: "Status",
              value: (
                <span className="text-emerald-400 font-bold">
                  Unassigned (Available in Stock)
                </span>
              ),
            },
          ],
    },
    {
      title: "Condition & State",
      icon: Package,
      fields: [
        {
          label: "Condition",
          value: <ConditionBadge condition={asset.condition} />,
        },
        { label: "Status", value: <StatusBadge status={asset.status} /> },
      ],
    },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={asset.model}
      description={`${asset.id} · ${asset.manufacturer} ${asset.model}`}
      width="xl"
      footer={
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            icon={<Edit className="h-4 w-4" />}
            onClick={() => onEdit(asset.id)}
          >
            Edit
          </Button>
          {asset.status === "Available" || asset.status === "Returned" ? (
            <Button
              variant="primary"
              size="sm"
              icon={<UserCheck className="h-4 w-4" />}
              onClick={() => onAction("assign", asset.id)}
            >
              Assign
            </Button>
          ) : null}
          {asset.status === "Assigned" && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeftRight className="h-4 w-4" />}
                onClick={() => onAction("transfer", asset.id)}
              >
                Transfer
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Undo2 className="h-4 w-4" />}
                onClick={() => onAction("return", asset.id)}
              >
                Return
              </Button>
            </>
          )}
          {asset.status !== "Under Repair" && asset.status !== "Disposed" && (
            <Button
              variant="outline"
              size="sm"
              icon={<Wrench className="h-4 w-4" />}
              onClick={() => onAction("repair", asset.id)}
            >
              Repair
            </Button>
          )}
          {asset.status !== "Disposed" && (
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => onAction("dispose", asset.id)}
            >
              Dispose
            </Button>
          )}
        </div>
      }
    >
      {/* Status Banner */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-slate-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-900/50 border border-blue-700/50">
          <Laptop className="h-6 w-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={asset.status} />
            <ConditionBadge condition={asset.condition} />
          </div>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            SN: {formatSerialDisplay(asset.serialNumber)} · ST:{" "}
            <strong className="text-amber-400">{asset.serviceTag}</strong>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-slate-700">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={classNames(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
                tab === t.key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6 text-slate-100">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title}>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-100">
                  <Icon className="h-4 w-4 text-slate-400" />
                  {section.title}
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  {section.fields.map((field) => (
                    <div key={field.label}>
                      <dt className="text-xs font-medium text-slate-400">
                        {field.label}
                      </dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-100">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "history" && (
        <div className="relative pl-6 text-slate-100">
          <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-700" />
          <ul className="space-y-5">
            {asset.history.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[18px] top-1 h-3 w-3 rounded-full border-2 border-blue-500 bg-slate-900" />
                <div>
                  <p className="text-sm font-bold text-slate-100">
                    {entry.action}
                  </p>
                  {entry.details && (
                    <p className="text-xs text-slate-300 mt-0.5">
                      {entry.details}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span>{entry.date}</span>
                    <span>·</span>
                    <span>by {entry.performedBy}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "documents" && (
        <div className="text-slate-100">
          {employee ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${employee.avatarColor} text-white text-sm font-bold`}
                >
                  {getInitials(employee.fullName)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100">
                    {employee.fullName}
                  </p>
                  <p className="text-xs text-slate-400">
                    ID: {employee.id} · {employee.department}
                  </p>
                </div>
              </div>
              <h4 className="mb-3 text-sm font-bold text-slate-100">
                Handover & Asset Documents
              </h4>
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/80 p-3 hover:bg-slate-700/60 transition-colors"
                  >
                    <FileText className="h-5 w-5 flex-shrink-0 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate-400">{doc.type}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        showToast("Mock handover document opened.", "info")
                      }
                    >
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-2 text-sm text-slate-400">
                No documents available. Asset is currently in Stock
                (Unassigned).
              </p>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
