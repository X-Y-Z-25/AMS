import { useState, useEffect } from "react";
import {
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  Database,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  HardDrive,
  Settings as SettingsIcon,
  ChevronRight,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import {
  saveDellCredentials,
  getDellCredentials,
  hasDellCredentials,
  clearDellCredentials,
  testDellConnection,
} from "@/lib/dellApi";
import { fetchAssetsFromSupabase } from "@/lib/supabaseData";
import { syncUncachedDellWarranties } from "@/lib/dellWarrantySync";

const assets: any[] = [];
const employees: any[] = [];
const assignments: any[] = [];
const repairs: any[] = [];
const returns: any[] = [];
const disposals: any[] = [];
const procurementOrders: any[] = [];

// ── Excel Export ─────────────────────────────────────────────────────────────
function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][],
) {
  const escape = (v: string | number | undefined | null) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAssets() {
  exportToCSV(
    "dell_assets_backup.csv",
    [
      "Asset ID",
      "Name",
      "Category",
      "Model",
      "Serial Number",
      "Service Tag",
      "Status",
      "Condition",
      "Location",
      "Assigned To",
      "Purchase Date",
      "Purchase Cost",
      "Vendor",
      "Warranty Start",
      "Warranty End",
      "Warranty Status",
    ],
    assets.map((a) => [
      a.id,
      a.name,
      a.category,
      a.model,
      a.serialNumber,
      a.serviceTag,
      a.status,
      a.condition,
      a.location,
      a.assignedToEmployeeName ?? "",
      a.purchaseDate,
      a.purchaseCost,
      a.vendorName,
      a.warrantyStart,
      a.warrantyEnd,
      a.warrantyStatus,
    ]),
  );
}

function exportEmployees() {
  exportToCSV(
    "dell_employees_backup.csv",
    [
      "Employee ID",
      "Full Name",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Location",
      "Joining Date",
      "Status",
    ],
    employees.map((e) => [
      e.id,
      e.fullName,
      e.email,
      e.phone,
      e.department,
      e.designation,
      e.location,
      e.joiningDate,
      e.status,
    ]),
  );
}

function exportAssignments() {
  exportToCSV(
    "dell_assignments_backup.csv",
    [
      "Assignment ID",
      "Asset ID",
      "Asset Name",
      "Employee ID",
      "Employee Name",
      "Department",
      "Location",
      "Date",
      "Status",
    ],
    assignments.map((a) => [
      a.id,
      a.assetId,
      a.assetName,
      a.employeeId,
      a.employeeName,
      a.department,
      a.location,
      a.assignmentDate,
      a.status,
    ]),
  );
}

function exportFullBackup() {
  exportAssets();
  setTimeout(() => exportEmployees(), 300);
  setTimeout(() => exportAssignments(), 600);
}

// ── Component ────────────────────────────────────────────────────────────────

type TestStatus = "idle" | "testing" | "success" | "error";

interface BulkResult {
  tag: string;
  status: string;
  expiry: string;
  level: string;
}

export function SettingsPage() {
  const { showToast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [isCredSaved, setIsCredSaved] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);

  useEffect(() => {
    const existing = getDellCredentials();
    if (existing) {
      setClientId(existing.clientId);
      setClientSecret("••••••••••••••••");
      setIsCredSaved(true);
    }
  }, []);

  const handleSaveCreds = () => {
    if (
      !clientId.trim() ||
      !clientSecret.trim() ||
      clientSecret === "••••••••••••••••"
    ) {
      showToast("Please enter both Client ID and Client Secret.", "warning");
      return;
    }
    saveDellCredentials(clientId.trim(), clientSecret.trim());
    setIsCredSaved(true);
    setClientSecret("••••••••••••••••");
    setShowSecret(false);
    showToast("Dell API credentials saved successfully.", "success");
  };

  const handleClearCreds = () => {
    clearDellCredentials();
    setClientId("");
    setClientSecret("");
    setIsCredSaved(false);
    setTestStatus("idle");
    showToast("Credentials cleared.", "info");
  };

  const handleTest = async () => {
    if (!hasDellCredentials()) {
      showToast("Save credentials first.", "warning");
      return;
    }
    setTestStatus("testing");
    setTestMessage("");
    const result = await testDellConnection();
    setTestStatus(result.success ? "success" : "error");
    setTestMessage(result.message);
  };

  const handleBulkCheck = async () => {
    if (!hasDellCredentials()) {
      showToast("Configure Dell API credentials first.", "warning");
      return;
    }
    setBulkLoading(true);
    setBulkResults([]);
    try {
      const checkedCount = await syncUncachedDellWarranties();
      const savedAssets = await fetchAssetsFromSupabase();
      const rows = savedAssets
        .filter(
          (asset) =>
            asset.serviceTag &&
            asset.warrantyCheckedAt &&
            /^(Laptop|Monitor|Docking Station)(\s*-|$)/i.test(asset.category) &&
            /dell/i.test(asset.manufacturer),
        )
        .map((asset) => ({
          tag: asset.serviceTag,
          status: asset.warrantyStatus,
          expiry: asset.warrantyEnd === "N/A" ? "—" : asset.warrantyEnd,
          level: "—",
        }));
      setBulkResults(rows);
      showToast(
        `Loaded saved warranty data for ${rows.length} asset(s); ${checkedCount} newly checked.`,
        "success",
      );
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Could not load warranty data.",
        "error",
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExportWarrantyCSV = () => {
    exportToCSV(
      "warranty_audit.csv",
      ["Service Tag", "Warranty Status", "Expiry Date", "Service Level"],
      bulkResults.map((r) => [r.tag, r.status, r.expiry, r.level]),
    );
    showToast("Warranty audit exported.", "success");
  };

  const testStatusIcon = {
    idle: <Wifi className="h-4 w-4 text-slate-500" />,
    testing: <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    error: <XCircle className="h-4 w-4 text-red-400" />,
  };

  const stats = [
    {
      label: "Total Assets",
      value: assets.length,
      icon: HardDrive,
      color: "text-blue-400",
      bg: "bg-blue-900/30",
    },
    {
      label: "Employees",
      value: employees.length,
      icon: Database,
      color: "text-emerald-400",
      bg: "bg-emerald-900/30",
    },
    {
      label: "Assignments",
      value: assignments.length,
      icon: FileSpreadsheet,
      color: "text-violet-400",
      bg: "bg-violet-900/30",
    },
    {
      label: "Active Repairs",
      value: repairs.filter((r) => r.status !== "Completed").length,
      icon: AlertCircle,
      color: "text-amber-400",
      bg: "bg-amber-900/30",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/30">
          <SettingsIcon className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">
            Dell API configuration, data backup &amp; system info
          </p>
        </div>
      </div>

      {/* Database Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-xl border border-slate-700/60 bg-slate-800/60 p-4"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}`}
              >
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-white">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dell API Credentials */}
        <Card>
          <CardHeader
            title="Dell TechDirect API"
            subtitle="Configure OAuth2 credentials for live warranty lookups"
            action={
              <div className="flex items-center gap-2">
                {isCredSaved ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-slow" />
                    Configured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <WifiOff className="h-4 w-4" />
                    Not set
                  </span>
                )}
              </div>
            }
          />
          <div className="space-y-4 p-5">
            {/* Info Box */}
            <div className="rounded-xl bg-blue-900/20 border border-blue-700/30 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="text-blue-300 font-medium">
                    OAuth 2.0 Authentication
                  </p>
                  <p>
                    Get your credentials from{" "}
                    <span className="text-blue-400 font-medium">
                      techdirect.dell.com
                    </span>{" "}
                    → APIs section
                  </p>
                  <p>
                    Or add to{" "}
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">
                      .env
                    </code>{" "}
                    as{" "}
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">
                      VITE_DELL_CLIENT_ID
                    </code>{" "}
                    and{" "}
                    <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">
                      VITE_DELL_CLIENT_SECRET
                    </code>
                  </p>
                </div>
              </div>
            </div>

            <Field label="Client ID" required>
              <TextInput
                value={clientId}
                onChange={(v) => {
                  setClientId(v);
                  setIsCredSaved(false);
                }}
                placeholder="e.g. l7xx1234abcd5678ef..."
              />
            </Field>

            <Field label="Client Secret" required>
              <div className="relative">
                <TextInput
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={(v) => {
                    setClientSecret(v);
                    setIsCredSaved(false);
                  }}
                  placeholder="Your client secret..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <div className="flex gap-3 pt-1">
              <Button
                onClick={handleSaveCreds}
                icon={<Key className="h-4 w-4" />}
                className="flex-1"
              >
                Save Credentials
              </Button>
              {isCredSaved && (
                <Button
                  variant="ghost"
                  onClick={handleClearCreds}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              )}
            </div>

            {/* Test Connection */}
            <div className="border-t border-slate-700/60 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {testStatusIcon[testStatus]}
                  <span className="text-sm text-slate-400">
                    {testStatus === "idle" &&
                      "Test your connection to Dell API"}
                    {testStatus === "testing" &&
                      "Connecting to Dell TechDirect..."}
                    {testStatus === "success" && (
                      <span className="text-emerald-400">{testMessage}</span>
                    )}
                    {testStatus === "error" && (
                      <span className="text-red-400 text-xs">
                        {testMessage}
                      </span>
                    )}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  loading={testStatus === "testing"}
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Test
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Data Backup — Excel Export */}
        <Card>
          <CardHeader
            title="Data Backup"
            subtitle="Export all data to Excel/CSV for backup or offline use"
          />
          <div className="space-y-3 p-5">
            <div className="rounded-xl bg-amber-900/20 border border-amber-700/30 p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-1">
                  <p className="text-amber-300 font-medium">
                    CSV / Excel Compatible
                  </p>
                  <p>
                    All exports are UTF-8 CSV files that open directly in
                    Microsoft Excel, Google Sheets, and LibreOffice Calc.
                  </p>
                </div>
              </div>
            </div>

            {[
              {
                label: "Export All Assets",
                subtitle: `${assets.length} assets with warranty & assignment info`,
                icon: HardDrive,
                fn: exportAssets,
                color: "text-blue-400",
              },
              {
                label: "Export Employees",
                subtitle: `${employees.length} employee records`,
                icon: Database,
                fn: exportEmployees,
                color: "text-emerald-400",
              },
              {
                label: "Export Assignments",
                subtitle: `${assignments.length} active assignments`,
                icon: FileSpreadsheet,
                fn: exportAssignments,
                color: "text-violet-400",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    item.fn();
                    showToast(`${item.label} started.`, "success");
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border border-slate-700/40 bg-slate-800/40 p-4 text-left hover:bg-slate-700/40 hover:border-slate-600/60 transition-all group"
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                  <Download className="h-4 w-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                </button>
              );
            })}

            <Button
              variant="secondary"
              onClick={() => {
                exportFullBackup();
                showToast("Full backup export started (3 files).", "success");
              }}
              icon={<Download className="h-4 w-4" />}
              className="w-full mt-2"
            >
              Export Full Backup (All Files)
            </Button>
          </div>
        </Card>
      </div>

      {/* Bulk Warranty Audit */}
      <Card>
        <CardHeader
          title="🔍 Bulk Warranty Audit"
          subtitle="Check live warranty status for all assets using Dell API"
          action={
            <div className="flex gap-2">
              {bulkResults.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportWarrantyCSV}
                  icon={<Download className="h-4 w-4" />}
                >
                  Export CSV
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleBulkCheck}
                loading={bulkLoading}
                icon={<RefreshCw className="h-4 w-4" />}
                disabled={!hasDellCredentials()}
              >
                Run Audit
              </Button>
            </div>
          }
        />
        <div className="p-5">
          {!hasDellCredentials() && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/40 p-4 text-sm text-slate-400">
              <WifiOff className="h-4 w-4 flex-shrink-0" />
              Configure Dell API credentials above to enable live warranty
              checks.
              <ChevronRight className="h-4 w-4 ml-auto" />
            </div>
          )}
          {bulkLoading && (
            <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-400" />
              Querying Dell TechDirect for {assets.length} assets…
            </div>
          )}
          {bulkResults.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      Service Tag
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Expiry Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      Service Level
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 bg-slate-800/40">
                  {bulkResults.map((r) => (
                    <tr
                      key={r.tag}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {r.tag}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                            r.status === "Active"
                              ? "bg-emerald-900/40 text-emerald-300 ring-emerald-500/30"
                              : r.status === "Expired"
                                ? "bg-red-900/40 text-red-300 ring-red-500/30"
                                : "bg-slate-700/60 text-slate-400 ring-slate-500/30"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.expiry}</td>
                      <td className="px-4 py-3 text-slate-400">{r.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
