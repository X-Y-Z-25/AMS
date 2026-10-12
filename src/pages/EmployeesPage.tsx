import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  Eye,
  Laptop,
  Plus,
  Download,
  Upload,
  ArrowLeftRight,
  FileText,
  Undo2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  SearchInput,
  Select,
  TextInput,
  Field,
  TextArea,
} from "@/components/ui/Form";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge, ConditionBadge } from "@/components/ui/StatusBadges";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { AddEmployeeModal } from "@/components/employees/AddEmployeeModal";
import { HandoverDocument } from "@/components/assets/HandoverDocument";
import type { AssetAction } from "@/components/assets/AssetActionDialogs";
import {
  initEmployeeWorkbook,
  getExcelEmployees,
  downloadEmployeeExcel,
} from "@/lib/employeeExcelService";
import { supabase, supabaseConfig } from "@/lib/supabase";
import {
  fetchEmployeesFromSupabase,
  fetchAssetsFromSupabase,
  saveEmployeeToSupabase,
  assignStockAssetsToEmployee,
} from "@/lib/supabaseData";
import {
  filterStockAssetsForPicker,
  findStockAssetByTag,
  getAssetTagForPicker,
  type StockAssetKind,
} from "@/lib/assetStockLookup";
import { getInitials, classNames, normalizeServiceTag } from "@/lib/utils";
import type { Asset, Employee } from "@/types";
import type { AppUserProfile } from "@/lib/auth";

interface EmployeesPageProps {
  selectedEmployeeId: string | null;
  onEmployeeSelect: (id: string) => void;
  onAssetSelect: (assetId: string) => void;
  onAction: (action: AssetAction, assetId: string) => void;
  profile: AppUserProfile;
  refreshVersion: number;
}

type EmployeeAssetAction = "handover" | "transfer" | "return";

function getEmployeeAssignedAssets(
  employee: Employee,
  assets: Asset[],
): Asset[] {
  const employeeUuid = employee._uuid ?? "";
  const employeeId = employee.empId ?? employee.id;
  return assets.filter((asset) => {
    if (asset.status !== "Assigned") return false;
    if (employeeUuid && asset.assignedToEmployeeUuid === employeeUuid) return true;
    return (
      asset.assignedToEmployeeId === employeeId ||
      asset.assignedToEmployeeName === employee.fullName
    );
  });
}

const ITEMS_PER_PAGE = 12;
const LOCATIONS = ["SSC Bangalore", "Global"];
const EMPLOYEE_IMPORT_HEADERS = [
  "EMP ID",
  "SAP ID",
  "Emp Name",
  "Email",
  "Phone Number",
  "Process",
  "Supervisor",
  "Manager",
  "Go-Live Date",
  "DOJ",
  "Location",
  "Laptop Model",
  "Laptop Tag",
  "Headset Model",
  "Headset Tag",
  "Bag Type",
  "Normal Monitor Model",
  "Normal Monitor Tag",
  "Hub Monitor Model",
  "Hub Monitor Tag",
  "Keyboard",
  "Mouse",
];

const cleanCell = (value: unknown): string => {
  const text = String(value ?? "").trim();
  return !text || text === "-" ? "" : text;
};

const toIsoDate = (value: string): string => {
  const dmy = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

function findEmployeeColumn(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map((alias) =>
    alias.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  return headers.findIndex((header) => normalizedAliases.includes(header));
}

export function EmployeesPage({
  selectedEmployeeId,
  onEmployeeSelect,
  onAssetSelect,
  onAction,
  profile,
  refreshVersion,
}: EmployeesPageProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [processFilter, setProcessFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [handoverAssetId, setHandoverAssetId] = useState("");
  const [employeeActionSelection, setEmployeeActionSelection] = useState<{
    employee: Employee;
    action: EmployeeAssetAction;
  } | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addAssetsModalOpen, setAddAssetsModalOpen] = useState(false);
  const [selectedStockAssetId, setSelectedStockAssetId] = useState("");
  const [pendingAssetIds, setPendingAssetIds] = useState<string[]>([]);
  const [isAssigningAssets, setIsAssigningAssets] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitDate, setExitDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [exitRemark, setExitRemark] = useState("Cleared");
  const [exitReturnStatus, setExitReturnStatus] = useState("Cleared");
  const [isExiting, setIsExiting] = useState(false);
  const [exitSelection, setExitSelection] = useState<
    Record<string, "return" | "missing" | "hold">
  >({});
  const [excelEmployees, setExcelEmployees] = useState<Employee[]>([]);
  const [supabaseEmployees, setSupabaseEmployees] = useState<Employee[]>([]);
  const [supabaseAssets, setSupabaseAssets] = useState<Asset[]>([]);
  const [exitedEmployeeIds, setExitedEmployeeIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    initEmployeeWorkbook();
    setExcelEmployees(getExcelEmployees());

    if (!supabaseConfig.isConfigured) {
      showToast(
        "Supabase is not configured. Employee and asset data from the database will not load.",
        "warning",
      );
      return;
    }

    fetchEmployeesFromSupabase()
      .then(setSupabaseEmployees)
      .catch((error) => {
        console.error(error);
        setSupabaseEmployees([]);
        showToast(
          "Could not load employees from the database. Check Supabase connection and table permissions.",
          "error",
        );
      });
    fetchAssetsFromSupabase()
      .then(setSupabaseAssets)
      .catch((error) => {
        console.error(error);
        setSupabaseAssets([]);
        showToast(
          "Could not load assets from the database. Check Supabase connection and table permissions.",
          "error",
        );
      });
  }, [refreshVersion, showToast]);

  const allEmployees = useMemo(() => {
    const merged: Employee[] = [];
    const seen = new Set<string>();

    [...supabaseEmployees, ...excelEmployees].forEach((employee) => {
      if (seen.has(employee.id)) return;
      seen.add(employee.id);
      merged.push(employee);
    });

    return merged;
  }, [excelEmployees, supabaseEmployees]);

  const handleEmployeeSaved = async () => {
    try {
      const [refreshedEmployees, refreshedAssets] = await Promise.all([
        fetchEmployeesFromSupabase(),
        fetchAssetsFromSupabase(),
      ]);

      setSupabaseEmployees(refreshedEmployees);
      setSupabaseAssets(refreshedAssets);
      setExcelEmployees(getExcelEmployees());
    } catch {
      setSupabaseEmployees([]);
      setSupabaseAssets([]);
      setExcelEmployees(getExcelEmployees());
    }
  };

  const openExitModalForEmployee = (emp: Employee) => {
    const empUuid = emp._uuid ?? "";
    const empId = emp.empId ?? emp.id;
    const assignedAssets = supabaseAssets.filter((asset) => {
      if (empUuid && asset.assignedToEmployeeUuid === empUuid) return true;
      return (
        asset.assignedToEmployeeId === empId ||
        asset.assignedToEmployeeName === emp.fullName
      );
    });
    const defaultSelection = Object.fromEntries(
      assignedAssets.map((asset) => [asset.id, "return" as const]),
    );

    setExitSelection(defaultSelection);
    setExitRemark("Cleared");
    setExitReturnStatus("Cleared");
    setExitDate(new Date().toISOString().split("T")[0]);
    onEmployeeSelect(emp.id);
    setDrawerOpen(true);
    setExitModalOpen(true);
  };

  const handleExitConfirm = async () => {
    if (!selectedEmployee) return;
    if (isExiting) return;
    if (!exitDate) {
      showToast("Select an exit date before confirming the exit.", "error");
      return;
    }

    const missingAssets = employeeAssets.filter(
      (asset) => exitSelection[asset.id] === "missing",
    );
    const returnedAssets = employeeAssets.filter(
      (asset) => exitSelection[asset.id] === "return",
    );
    const pendingAssets = employeeAssets.filter(
      (asset) => exitSelection[asset.id] === "hold",
    );

    setIsExiting(true);
    try {
      const employeeLookup = await supabase
        .from("employees")
        .select("id")
        .eq(
          selectedEmployee._uuid ? "id" : "emp_id",
          selectedEmployee._uuid ?? selectedEmployee.empId ?? selectedEmployee.id,
        )
        .maybeSingle();
      if (employeeLookup.error) throw employeeLookup.error;
      const employeeUuid = employeeLookup.data?.id;

      if (employeeUuid) {
        const updatedAt = new Date().toISOString();
        for (const asset of returnedAssets) {
          const { data, error } = await supabase
            .from("assets")
            .update({
              status: "Available",
              assigned_to: null,
              assigned_date: null,
              updated_at: updatedAt,
            })
            .eq("asset_tag", asset.id)
            .eq("assigned_to", employeeUuid)
            .select("id");
          if (error) throw error;
          if (!data?.length) {
            throw new Error(`Could not return asset ${asset.id}; it is no longer assigned to this employee.`);
          }
        }
        for (const asset of missingAssets) {
          const { data, error } = await supabase
            .from("assets")
            .update({ status: "Lost", updated_at: updatedAt })
            .eq("asset_tag", asset.id)
            .eq("assigned_to", employeeUuid)
            .select("id");
          if (error) throw error;
          if (!data?.length) {
            throw new Error(`Could not mark asset ${asset.id} as missing; it is no longer assigned to this employee.`);
          }
        }

        const assetNotes = [
          exitRemark.trim() ? `Remarks: ${exitRemark.trim()}` : "",
          returnedAssets.length
            ? `Returned: ${returnedAssets.map((asset) => `${asset.model} (${asset.serviceTag || asset.id})`).join(", ")}`
            : "",
          missingAssets.length
            ? `Missing: ${missingAssets.map((asset) => `${asset.model} (${asset.serviceTag || asset.id})`).join(", ")}`
            : "",
          pendingAssets.length
            ? `Pending: ${pendingAssets.map((asset) => `${asset.model} (${asset.serviceTag || asset.id})`).join(", ")}`
            : "",
        ].filter(Boolean);

        const { error: exitInsertError } = await supabase.from("exit_records").insert([
          {
            employee_id: employeeUuid,
            exit_date: exitDate,
            reason: exitReturnStatus,
            asset_return_status:
              missingAssets.length + pendingAssets.length > 0
                ? "Partial"
                : exitReturnStatus === "Cleared"
                  ? "Returned"
                  : exitReturnStatus,
            total_assets: employeeAssets.length,
            pending_assets: missingAssets.length + pendingAssets.length,
            remarks: assetNotes.join(" | ") || exitReturnStatus,
          },
        ]);
        if (exitInsertError) throw exitInsertError;

        const { error: employeeUpdateError } = await supabase
          .from("employees")
          .update({ status: "Inactive" })
          .eq("id", employeeUuid);
        if (employeeUpdateError) throw employeeUpdateError;
      } else {
        throw new Error("Employee record could not be located in the database.");
      }

      setExitedEmployeeIds((previous) =>
        new Set([
          ...previous,
          selectedEmployee.id,
          selectedEmployee.empId ?? "",
        ]),
      );
      setExcelEmployees((previous) =>
        previous.filter(
          (employee) =>
            employee.id !== selectedEmployee.id &&
            employee.empId !== selectedEmployee.empId,
        ),
      );

      setExitModalOpen(false);
      setDrawerOpen(false);
      setExitSelection({});
      setExitRemark("Cleared");
      setExitReturnStatus("Cleared");

        try {
          const [refreshedEmployees, refreshedAssets] = await Promise.all([
            fetchEmployeesFromSupabase(),
            fetchAssetsFromSupabase(),
          ]);
          setSupabaseEmployees(refreshedEmployees);
          setSupabaseAssets(refreshedAssets);
        } catch (refreshError) {
          console.error("Exit was saved but the employee list could not refresh:", refreshError);
        }

      if (missingAssets.length > 0 || pendingAssets.length > 0) {
        showToast(
          `Employee exit recorded. ${returnedAssets.length} asset(s) returned, ${missingAssets.length} marked missing, and ${pendingAssets.length} held for later.`,
          "warning",
        );
      } else {
        showToast(
          `Employee exit recorded. ${returnedAssets.length} asset(s) returned to stock and all items cleared.`,
          "success",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Employee exit could not be recorded.";
      showToast(`Exit was not fully recorded: ${message}`, "error");
      try {
        const [refreshedEmployees, refreshedAssets] = await Promise.all([
          fetchEmployeesFromSupabase(),
          fetchAssetsFromSupabase(),
        ]);
        setSupabaseEmployees(refreshedEmployees);
        setSupabaseAssets(refreshedAssets);
      } catch (refreshError) {
        console.error("Could not refresh employee data after exit error:", refreshError);
      }
    } finally {
      setIsExiting(false);
    }
  };

  const handleDownloadExcel = () => {
    downloadEmployeeExcel();
    showToast("Employee Excel file downloaded.", "success");
  };

  const handleDownloadImportTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([EMPLOYEE_IMPORT_HEADERS]);
    worksheet["!cols"] = EMPLOYEE_IMPORT_HEADERS.map((header) => ({
      wch: Math.max(header.length + 2, 16),
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Import");
    XLSX.writeFile(workbook, "employee-import-template.xlsx");
    showToast("Employee import template downloaded.", "success");
  };

  const handleImportExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!supabaseConfig.isConfigured) {
        showToast("Supabase is not configured. Employee import needs database access.", "error");
        return;
      }

      try {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: "",
        }) as unknown[][];
        if (rows.length < 2) throw new Error("The employee file has no data rows.");

        const headers = rows[0].map((value) =>
          String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, ""),
        );
        const column = (aliases: string[]) => findEmployeeColumn(headers, aliases);
        const indexes = {
          empId: column(["empid", "employeeid"]),
          sfid: column(["sapid", "sfid"]),
          name: column(["empname", "employeename", "name"]),
          email: column(["email", "emailaddress", "emailid"]),
          phone: column(["phone", "phonenumber", "contactnumber"]),
          process: column(["process", "processrole", "processteam"]),
          supervisor: column(["supervisor"]),
          manager: column(["manager"]),
          location: column(["location", "usertype", "employeetype", "type"]),
          goLive: column(["golive", "golivedate", "livedate"]),
          doj: column(["doj", "ddoj", "dateofjoining"]),
          laptopModel: column(["laptopmodel", "laptop"]),
          laptopTag: column(["laptoptag", "laptopservicetag", "servicetag"]),
          headsetModel: column(["headsetmodel", "headset"]),
          headsetTag: column(["headsettag", "headsetservicetag", "headsetserialnumber"]),
          bagModel: column(["bagtype", "bagmodel", "backpack"]),
          normalMonitorModel: column(["normalmonitormodel", "normalmonitor"]),
          normalMonitorTag: column(["normalmonitortag", "normalmonitorservicetag"]),
          hubMonitorModel: column(["hubmonitormodel", "hubmonitor"]),
          hubMonitorTag: column(["hubmonitortag", "hubmonitorservicetag"]),
          keyboard: column(["keyboard", "keyboardtag", "keyboardassettag"]),
          mouse: column(["mouse", "mousetag", "mouseassettag"]),
        };

        if (indexes.empId < 0 || indexes.name < 0 || indexes.email < 0) {
          throw new Error("Required columns are missing. Include EMP ID, Emp Name, and Email.");
        }

        const stockAssets = await fetchAssetsFromSupabase();
        const claimedStockIds = new Set<string>();
        const importRows: Array<{
          employee: Record<string, unknown>;
          assets: Asset[];
        }> = [];
        const missingStock: string[] = [];

        const addStockRequest = (
          row: unknown[],
          rowNumber: number,
          kind: StockAssetKind,
          modelIndex: number,
          tagIndex: number,
          label: string,
          requestedValueIndex?: number,
        ): Asset | undefined => {
          const model = cleanCell(row[modelIndex]);
          const tag = cleanCell(row[tagIndex]);
          const requestedValue = requestedValueIndex === undefined
            ? model || tag
            : cleanCell(row[requestedValueIndex]);
          if (!requestedValue) return undefined;

          const candidate = tag
            ? findStockAssetByTag(stockAssets, kind, model, normalizeServiceTag(tag))
            : filterStockAssetsForPicker(stockAssets, kind, model).find(
                (asset) => !claimedStockIds.has(asset.id),
              );
          if (!candidate || claimedStockIds.has(candidate.id)) {
            missingStock.push(`Row ${rowNumber}: ${label} ${model || tag || "item"}`);
            return undefined;
          }
          claimedStockIds.add(candidate.id);
          return candidate;
        };

        rows.slice(1).forEach((row, rowIndex) => {
          if (!row.some((value) => cleanCell(value))) return;
          const rowNumber = rowIndex + 2;
          const get = (index: number) => index < 0 ? "" : cleanCell(row[index]);
          const employeeId = get(indexes.empId);
          const employeeName = get(indexes.name);
          const email = get(indexes.email);
          if (!employeeId || !employeeName || !email) {
            throw new Error(`Row ${rowNumber}: EMP ID, Emp Name, and Email are required.`);
          }

          const matchedAssets: Asset[] = [];
          const requests = [
            ["laptop", indexes.laptopModel, indexes.laptopTag, "Laptop"],
            ["headset", indexes.headsetModel, indexes.headsetTag, "Headset"],
            ["normalMonitor", indexes.normalMonitorModel, indexes.normalMonitorTag, "Normal monitor"],
            ["hubMonitor", indexes.hubMonitorModel, indexes.hubMonitorTag, "Hub monitor"],
            ["bag", indexes.bagModel, -1, "Bag"],
          ] as const;
          for (const [kind, modelIndex, tagIndex, label] of requests) {
            const asset = addStockRequest(row, rowNumber, kind, modelIndex, tagIndex, label);
            if (asset) matchedAssets.push(asset);
          }

          for (const [kind, valueIndex, label] of [
            ["keyboard", indexes.keyboard, "Keyboard"],
            ["mouse", indexes.mouse, "Mouse"],
          ] as const) {
            if (valueIndex < 0 || !get(valueIndex)) continue;
            const value = get(valueIndex);
            const asset = addStockRequest(
              row,
              rowNumber,
              kind,
              -1,
              /^(KEY|MOS)-\w+$/i.test(value) ? valueIndex : -1,
              label,
              valueIndex,
            );
            if (asset) matchedAssets.push(asset);
          }

          const locationValue = get(indexes.location).toLowerCase();
          const sheetName = workbook.SheetNames[0].toLowerCase();
          const isGlobal = /global|remote|offshore/.test(locationValue) ||
            (locationValue === "" && sheetName.includes("global"));
          const laptop = matchedAssets.find((asset) => asset.category.toLowerCase().includes("laptop"));
          const headset = matchedAssets.find((asset) => asset.category === "Headset");
          const normalMonitor = matchedAssets.find((asset) => asset.model.toLowerCase().includes("p2422h"));
          const hubMonitor = matchedAssets.find((asset) => asset.model.toLowerCase().includes("p2425he"));
          const bag = matchedAssets.find((asset) => asset.category === "Bag");
          const employee: Record<string, unknown> = {
            emp_id: employeeId,
            sfid: get(indexes.sfid),
            full_name: employeeName,
            email,
            phone: get(indexes.phone),
            department: "Operations",
            designation: "Employee",
            location: isGlobal ? "Global" : "SSC Bangalore",
            emp_type: isGlobal ? "global" : "local",
            process: get(indexes.process),
            supervisor: get(indexes.supervisor),
            manager: get(indexes.manager),
            go_live_date: toIsoDate(get(indexes.goLive)) || undefined,
            doj: toIsoDate(get(indexes.doj)) || undefined,
            laptop_required: Boolean(laptop),
            laptop_model: laptop?.model ?? "",
            laptop_service_tag: laptop?.serviceTag ?? "",
            headset_required: Boolean(headset),
            headset_model: headset?.model ?? "",
            headset_service_tag: headset?.serviceTag ?? "",
            backpack_required: Boolean(bag),
            backpack_model: bag?.model ?? "",
            monitor_required: Boolean(normalMonitor),
            monitor_model: normalMonitor?.model ?? "",
            monitor_service_tag: normalMonitor?.serviceTag ?? "",
            monitor_count: Number(Boolean(normalMonitor)),
            hub_monitor_required: Boolean(hubMonitor),
            hub_monitor_model: hubMonitor?.model ?? "",
            hub_monitor_service_tag: hubMonitor?.serviceTag ?? "",
            hub_monitor_count: Number(Boolean(hubMonitor)),
            keyboard_required: matchedAssets.some((asset) => asset.category === "Keyboard"),
            keyboard_quantity: Number(matchedAssets.some((asset) => asset.category === "Keyboard")),
            mouse_required: matchedAssets.some((asset) => asset.category === "Mouse"),
            mouse_quantity: Number(matchedAssets.some((asset) => asset.category === "Mouse")),
            assigned_device_count: matchedAssets.length,
          };
          importRows.push({ employee, assets: matchedAssets });
        });

        if (!importRows.length) throw new Error("No employee data rows were found.");
        if (missingStock.length) {
          throw new Error(`Requested asset(s) are not available in stock: ${missingStock.slice(0, 8).join("; ")}${missingStock.length > 8 ? "; …" : ""}`);
        }

        for (const row of importRows) {
          const saved = await saveEmployeeToSupabase(row.employee as Parameters<typeof saveEmployeeToSupabase>[0]);
          const employeeUuid = saved?.[0]?.id as string | undefined;
          if (!employeeUuid) throw new Error(`Could not retrieve the new employee record for ${row.employee.emp_id}.`);
          if (row.assets.length) {
            await assignStockAssetsToEmployee({
              employeeUuid,
              assetTags: row.assets.map((asset) => getAssetTagForPicker(
                asset,
                asset.category === "Keyboard" ? "keyboard" :
                  asset.category === "Mouse" ? "mouse" :
                    asset.category === "Bag" ? "bag" :
                      asset.category === "Headset" ? "headset" :
                        asset.model.toLowerCase().includes("p2425he") ? "hubMonitor" :
                          asset.model.toLowerCase().includes("p2422h") ? "normalMonitor" :
                            asset.category.toLowerCase().includes("docking") ? "docking" : "laptop",
              )),
            });
          }
        }

        await handleEmployeeSaved();
        showToast(`Imported ${importRows.length} employee record(s) and assigned matching stock.`, "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import employee file.";
        showToast(message, "error");
      }
    };
    input.click();
  };

  const filtered = useMemo(() => {
    return allEmployees.filter((e) => {
      if (
        e.status !== "Working" ||
        exitedEmployeeIds.has(e.id) ||
        (e.empId ? exitedEmployeeIds.has(e.empId) : false)
      )
        return false;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        e.id.toLowerCase().includes(q) ||
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.sfid ?? "").toLowerCase().includes(q) ||
        (e.process ?? "").toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.empId ?? "").toLowerCase().includes(q);
      const matchesProcess = !processFilter || e.process === processFilter;
      const matchesLocation = !locationFilter || e.location === locationFilter;
      return matchesSearch && matchesProcess && matchesLocation;
    });
  }, [search, processFilter, locationFilter, allEmployees, exitedEmployeeIds]);

  const processOptions = [
    ...new Set(
      allEmployees
        .map((employee) => employee.process?.trim())
        .filter((process): process is string => Boolean(process)),
    ),
  ]
    .sort((a, b) => a.localeCompare(b))
    .map((process) => ({ label: process, value: process }));

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageData = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const selectedEmployee = allEmployees.find(
    (e) => e.id === selectedEmployeeId,
  );
  const employeeAssets = useMemo(() => {
    if (!selectedEmployee) return [];
    return getEmployeeAssignedAssets(selectedEmployee, supabaseAssets);
  }, [selectedEmployee, supabaseAssets]);
  const stockAssetOptions = useMemo(
    () =>
      supabaseAssets
        .filter(
          (asset) =>
            ["Available", "Returned", "Reserved"].includes(asset.status) &&
            !pendingAssetIds.includes(asset.id),
        )
        .map((asset) => ({
          value: asset.id,
          label: `${asset.category} · ${asset.model} · ${asset.serviceTag || asset.id}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [supabaseAssets, pendingAssetIds],
  );

  const handleStageStockAsset = () => {
    if (!selectedStockAssetId) return;
    setPendingAssetIds((previous) =>
      previous.includes(selectedStockAssetId)
        ? previous
        : [...previous, selectedStockAssetId],
    );
    setSelectedStockAssetId("");
  };

  const handleAssignAdditionalAssets = async () => {
    if (!selectedEmployee?._uuid || pendingAssetIds.length === 0) return;
    setIsAssigningAssets(true);
    try {
      await assignStockAssetsToEmployee({
        employeeUuid: selectedEmployee._uuid,
        assetTags: pendingAssetIds,
      });
      const [refreshedEmployees, refreshedAssets] = await Promise.all([
        fetchEmployeesFromSupabase(),
        fetchAssetsFromSupabase(),
      ]);
      setSupabaseEmployees(refreshedEmployees);
      setSupabaseAssets(refreshedAssets);
      setPendingAssetIds([]);
      setSelectedStockAssetId("");
      setAddAssetsModalOpen(false);
      showToast(
        `${pendingAssetIds.length} asset(s) added to ${selectedEmployee.fullName}.`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not assign stock assets.";
      showToast(message, "error");
    } finally {
      setIsAssigningAssets(false);
    }
  };

  const handleRowClick = (emp: Employee) => {
    onEmployeeSelect(emp.id);
    setDrawerOpen(true);
  };

  const handleChooseEmployeeAsset = (assetId: string) => {
    if (!employeeActionSelection) return;
    const { employee, action } = employeeActionSelection;
    setEmployeeActionSelection(null);

    if (action === "handover") {
      onEmployeeSelect(employee.id);
      setDrawerOpen(true);
      setHandoverAssetId(assetId);
      return;
    }

    onAction(action, assetId);
  };

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Employees & Staff Directory"
        subtitle={`${allEmployees.length} total staff members`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              onClick={handleImportExcel}
            >
              Import Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={handleDownloadImportTemplate}
            >
              Import Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={handleDownloadExcel}
            >
              Download Excel
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setAddModalOpen(true)}
            >
              Add Employee
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="p-4 bg-slate-800/90 border-slate-700">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by Employee ID, Name, Email..."
            className="flex-1"
          />
          <div className="flex gap-3 flex-wrap">
            <Select
              value={processFilter}
              onChange={(v) => {
                setProcessFilter(v);
                setPage(1);
              }}
              options={processOptions}
              placeholder="All Processes"
            />
            <Select
              value={locationFilter}
              onChange={(v) => {
                setLocationFilter(v);
                setPage(1);
              }}
              options={LOCATIONS.map((l) => ({ label: l, value: l }))}
              placeholder="All Locations"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-slate-800/90 border-slate-700">
        <Table>
          <THead>
            <TR className="border-b border-slate-700 bg-slate-900/60">
              <TH>Employee ID</TH>
              <TH>SAP ID</TH>
              <TH>Employee Name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Process</TH>
              <TH>Location</TH>
              <TH>DOJ</TH>
              <TH>Supervisor</TH>
              <TH>Manager</TH>
              <TH className="text-center">Assigned Devices</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {pageData.length === 0 ? (
              <TR>
                <TD colSpan={13} className="text-center py-12 text-slate-400">
                  No employees found matching your criteria.
                </TD>
              </TR>
            ) : (
              pageData.map((emp) => {
                const count = (() => {
                  if (
                    emp.assignedDeviceCount !== undefined &&
                    emp.assignedDeviceCount > 0
                  )
                    return emp.assignedDeviceCount;
                  const empUuid = emp._uuid ?? "";
                  const empId = emp.empId ?? emp.id;
                  return supabaseAssets.filter((asset) => {
                    if (empUuid && asset.assignedToEmployeeUuid === empUuid)
                      return true;
                    return (
                      asset.assignedToEmployeeId === empId ||
                      asset.assignedToEmployeeName === emp.fullName
                    );
                  }).length;
                })();
                return (
                  <TR
                    key={emp.id}
                    onClick={() => handleRowClick(emp)}
                    className="hover:bg-slate-700/40 border-b border-slate-700/50 cursor-pointer"
                  >
                    <TD className="font-mono text-xs font-bold text-amber-400">
                      {emp.id}
                    </TD>
                    <TD className="font-mono text-xs text-slate-300">
                      {emp.sfid?.trim() ? emp.sfid : "—"}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div
                          className={classNames(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm",
                            emp.avatarColor,
                          )}
                        >
                          {getInitials(emp.fullName)}
                        </div>
                        <span className="font-bold text-slate-100">
                          {emp.fullName}
                        </span>
                      </div>
                    </TD>
                    <TD className="text-xs text-slate-300">{emp.email}</TD>
                    <TD className="text-xs text-slate-300">
                      {emp.phone?.trim() ? emp.phone : "—"}
                    </TD>
                    <TD className="text-xs text-slate-300">
                      {emp.process?.trim() ? emp.process : "—"}
                    </TD>
                    <TD>
                      <span className="text-xs text-slate-300">
                        {emp.location}
                      </span>
                    </TD>
                    <TD className="text-xs text-slate-300">
                      {emp.doj ?? emp.joiningDate ?? "-"}
                    </TD>
                    <TD className="text-xs text-slate-300">
                      {emp.supervisor ?? "-"}
                    </TD>
                    <TD className="text-xs text-slate-300">
                      {emp.manager ?? "-"}
                    </TD>
                    <TD className="text-center">
                      <span
                        className={classNames(
                          "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold",
                          count > 0
                            ? "bg-blue-900/60 text-blue-300 border border-blue-700/60"
                            : "bg-slate-700 text-slate-400",
                        )}
                      >
                        {count}
                      </span>
                    </TD>
                    <TD>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openExitModalForEmployee(emp);
                        }}
                        className={classNames(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border transition-colors",
                          emp.status === "Working"
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/80"
                            : "bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600",
                        )}
                      >
                        {emp.status === "Working" ? "Working" : emp.status}
                      </button>
                    </TD>
                    <TD
                      className="min-w-[330px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye className="h-4 w-4 text-blue-400" />}
                          onClick={() => handleRowClick(emp)}
                        >
                          View
                        </Button>
                        {count > 0 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<FileText className="h-4 w-4 text-blue-400" />}
                              onClick={() =>
                                setEmployeeActionSelection({
                                  employee: emp,
                                  action: "handover",
                                })
                              }
                            >
                              Handover
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<ArrowLeftRight className="h-4 w-4 text-slate-300" />}
                              onClick={() =>
                                setEmployeeActionSelection({
                                  employee: emp,
                                  action: "transfer",
                                })
                              }
                            >
                              Transfer
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Undo2 className="h-4 w-4 text-amber-400" />}
                              onClick={() =>
                                setEmployeeActionSelection({
                                  employee: emp,
                                  action: "return",
                                })
                              }
                            >
                              Return
                            </Button>
                          </>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })
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
        open={Boolean(employeeActionSelection)}
        onClose={() => setEmployeeActionSelection(null)}
        title={
          employeeActionSelection
            ? `Choose an asset to ${employeeActionSelection.action}`
            : "Choose an asset"
        }
        description={employeeActionSelection?.employee.fullName}
        size="lg"
      >
        <div className="space-y-2">
          {(employeeActionSelection
            ? getEmployeeAssignedAssets(
                employeeActionSelection.employee,
                supabaseAssets,
              )
            : []
          ).map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleChooseEmployeeAsset(asset.id)}
              className="flex w-full items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-left transition-colors hover:border-blue-500/60 hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-100">
                  {asset.model}
                </span>
                <span className="mt-1 block truncate font-mono text-xs text-slate-400">
                  {asset.id} · {asset.serviceTag || asset.serialNumber}
                </span>
              </span>
              <span className="flex-shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                Select
              </span>
            </button>
          ))}
          {employeeActionSelection &&
            getEmployeeAssignedAssets(
              employeeActionSelection.employee,
              supabaseAssets,
            ).length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                No assigned assets are available for this employee.
              </p>
            )}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setEmployeeActionSelection(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Employee Details Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
        }}
        title={selectedEmployee?.fullName}
        description={
          selectedEmployee
            ? `${selectedEmployee.id} · ${selectedEmployee.department} · ${selectedEmployee.location}`
            : ""
        }
        width="xl"
      >
        {selectedEmployee && (
          <div className="space-y-6 text-slate-100">
            {/* Employee Info Banner */}
            <div className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/90 p-5">
              <div
                className={classNames(
                  "flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white shadow-md",
                  selectedEmployee.avatarColor,
                )}
              >
                {getInitials(selectedEmployee.fullName)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-100">
                  {selectedEmployee.fullName}
                </h3>
                <p className="text-sm text-slate-400 font-medium">
                  {selectedEmployee.designation}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-800/60">
                    {selectedEmployee.status === "Working"
                      ? "Working"
                      : selectedEmployee.status}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    disabled={
                      selectedEmployee.status !== "Working" ||
                      !selectedEmployee._uuid
                    }
                    onClick={() => {
                      setPendingAssetIds([]);
                      setSelectedStockAssetId("");
                      setAddAssetsModalOpen(true);
                    }}
                  >
                    Add Assets
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openExitModalForEmployee(selectedEmployee)}
                  >
                    Exit Assets
                  </Button>
                </div>
              </div>
            </div>

            {/* Employee Information */}
            <section>
              <h4 className="mb-3 text-sm font-bold text-slate-100">
                Employee Information
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { icon: Mail, label: "Email", value: selectedEmployee.email },
                  {
                    icon: Phone,
                    label: "Phone",
                    value: selectedEmployee.phone,
                  },
                  {
                    icon: Building,
                    label: "Department",
                    value: selectedEmployee.department,
                  },
                  {
                    icon: MapPin,
                    label: "Location",
                    value: selectedEmployee.location,
                  },
                  {
                    icon: Calendar,
                    label: "DOJ",
                    value:
                      selectedEmployee.doj ??
                      selectedEmployee.joiningDate ??
                      "N/A",
                  },
                  {
                    icon: Calendar,
                    label: "Supervisor",
                    value: selectedEmployee.supervisor ?? "N/A",
                  },
                  {
                    icon: Calendar,
                    label: "Manager",
                    value: selectedEmployee.manager ?? "N/A",
                  },
                ].map((field) => {
                  const Icon = field.icon;
                  return (
                    <div
                      key={field.label}
                      className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                    >
                      <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">{field.label}</p>
                        <p className="text-sm font-semibold text-slate-100">
                          {field.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Assigned Assets */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-100">
                  Assigned Assets
                </h4>
                <span className="text-xs text-slate-400">
                  {employeeAssets.length} assets
                </span>
              </div>
              {employeeAssets.length === 0 ? (
                <div className="rounded-lg border border-slate-700 py-8 text-center bg-slate-900/40">
                  <Laptop className="mx-auto h-8 w-8 text-slate-500" />
                  <p className="mt-2 text-sm text-slate-400">
                    No assets currently assigned to this employee.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-900/50">
                            <Laptop className="h-4 w-4 text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-100 truncate">
                              {asset.model}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {asset.id} · {asset.serialNumber} · ST:{" "}
                              <strong className="text-amber-400">
                                {asset.serviceTag}
                              </strong>
                            </p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <StatusBadge status={asset.status} />
                              <ConditionBadge condition={asset.condition} />
                              <span className="text-xs text-slate-400">
                                Assigned: {asset.assignedDate}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="h-3.5 w-3.5 text-blue-400" />}
                            onClick={() => {
                              setDrawerOpen(false);
                              onAssetSelect(asset.id);
                            }}
                          >
                            View Asset
                          </Button>
                          {asset.status === "Assigned" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<FileText className="h-3.5 w-3.5 text-blue-400" />}
                                onClick={() => setHandoverAssetId(asset.id)}
                              >
                                Handover
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ArrowLeftRight className="h-3.5 w-3.5 text-slate-300" />}
                                onClick={() => onAction("transfer", asset.id)}
                              >
                                Transfer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Undo2 className="h-3.5 w-3.5 text-amber-400" />}
                                onClick={() => onAction("return", asset.id)}
                              >
                                Return
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {handoverAssetId && (
              <HandoverDocument
                open
                onClose={() => setHandoverAssetId("")}
                assetId={handoverAssetId}
                profile={profile}
                refreshVersion={refreshVersion}
              />
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={addAssetsModalOpen}
        onClose={() => {
          setAddAssetsModalOpen(false);
          setPendingAssetIds([]);
          setSelectedStockAssetId("");
        }}
        title="Add Assets to Employee"
        description={
          selectedEmployee
            ? `${selectedEmployee.fullName} · ${selectedEmployee.empId ?? selectedEmployee.id}`
            : "Select available assets to assign."
        }
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAddAssetsModalOpen(false);
                setPendingAssetIds([]);
                setSelectedStockAssetId("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={pendingAssetIds.length === 0 || isAssigningAssets}
              loading={isAssigningAssets}
              onClick={() => void handleAssignAdditionalAssets()}
            >
              Assign {pendingAssetIds.length || ""} Asset(s)
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-slate-100">
          {stockAssetOptions.length === 0 && pendingAssetIds.length === 0 ? (
            <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-200">
              No available stock assets to assign.
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Available stock asset">
                <Select
                  value={selectedStockAssetId}
                  onChange={setSelectedStockAssetId}
                  options={stockAssetOptions}
                  placeholder="Select model and service tag"
                  className="w-full"
                />
              </Field>
              <Button
                variant="outline"
                icon={<Plus className="h-4 w-4" />}
                disabled={!selectedStockAssetId}
                onClick={handleStageStockAsset}
              >
                Add to list
              </Button>
            </div>
          )}

          {pendingAssetIds.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-200">
                Assets to assign ({pendingAssetIds.length})
              </h3>
              {pendingAssetIds.map((assetId) => {
                const asset = supabaseAssets.find((item) => item.id === assetId);
                if (!asset) return null;
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {asset.category} · {asset.model}
                      </p>
                      <p className="font-mono text-xs text-amber-300">
                        {asset.serviceTag || asset.id}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPendingAssetIds((previous) =>
                          previous.filter((id) => id !== asset.id),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </Modal>

      <Modal
        open={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        title="Employee Exit & Asset Clearance"
        description={
          selectedEmployee
            ? `${selectedEmployee.fullName} (${selectedEmployee.id})`
            : "Employee asset clearance"
        }
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setExitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isExiting}
              disabled={!selectedEmployee || isExiting}
              onClick={handleExitConfirm}
            >
              {isExiting ? "Recording Exit..." : "Confirm Exit"}
            </Button>
          </>
        }
      >
        {selectedEmployee && (
          <div className="space-y-5 text-slate-100">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400">Employee</p>
                  <p className="text-sm font-bold text-slate-100">
                    {selectedEmployee.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Employee ID</p>
                  <p className="font-mono text-sm font-bold text-amber-400">
                    {selectedEmployee.id}
                  </p>
                </div>
              </div>
            </div>

            <Field label="Exit Date" required>
              <TextInput
                type="date"
                value={exitDate}
                onChange={setExitDate}
                className="w-full"
              />
            </Field>

            <Field label="Return Status" required>
              <Select
                value={exitReturnStatus}
                onChange={setExitReturnStatus}
                options={[
                  { label: "Cleared", value: "Cleared" },
                  { label: "Missing Item(s)", value: "Missing Item(s)" },
                  {
                    label: "Pending Verification",
                    value: "Pending Verification",
                  },
                ]}
                className="w-full"
              />
            </Field>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-100">
                Assigned Assets
              </h4>
              {employeeAssets.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-5 text-center text-sm text-slate-400">
                  No assets assigned to this employee.
                </div>
              ) : (
                employeeAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-100">
                          {asset.model}
                        </p>
                        <p className="font-mono text-xs text-slate-400">
                          {asset.id} · {asset.serialNumber} · ST:{" "}
                          <span className="text-amber-400">
                            {asset.serviceTag}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Type: {asset.category}
                        </p>
                      </div>

                      <div className="w-full sm:w-52">
                        <Select
                          value={exitSelection[asset.id] || "return"}
                          onChange={(value) =>
                            setExitSelection((prev) => ({
                              ...prev,
                              [asset.id]: value as
                                | "return"
                                | "missing"
                                | "hold",
                            }))
                          }
                          options={[
                            { label: "Returned to stock", value: "return" },
                            { label: "Missing / pending", value: "missing" },
                            { label: "Hold for later", value: "hold" },
                          ]}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Field label="Exit Remarks">
              <TextArea
                value={exitRemark}
                onChange={setExitRemark}
                placeholder="Describe clearance status, missing items, or pending follow-up."
                rows={4}
              />
            </Field>
          </div>
        )}
      </Modal>

      <AddEmployeeModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={handleEmployeeSaved}
        stockAssets={supabaseAssets}
      />
    </div>
  );
}
