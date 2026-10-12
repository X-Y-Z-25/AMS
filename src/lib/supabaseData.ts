import type {
  Asset,
  Employee,
  Location,
  AssetCategory,
  AssetStatus,
  AssetCondition,
  WarrantyStatus,
  Assignment,
  Transfer,
  ReturnRecord,
} from "@/types";
import { supabase, supabaseConfig } from "@/lib/supabase";
import { normalizeSerialNumber, normalizeServiceTag } from "@/lib/utils";

const mapAssetStatus = (value?: string | null): AssetStatus => {
  const normalized = (value ?? "Available").toString();
  if (normalized === "Assigned") return "Assigned";
  if (normalized === "Under Repair") return "Under Repair";
  if (normalized === "Returned") return "Returned";
  if (normalized === "Reserved") return "Reserved";
  if (normalized === "Retired") return "Retired";
  if (normalized === "Disposed") return "Disposed";
  if (normalized === "Lost") return "Lost";
  return "Available";
};

const mapAssetCondition = (value?: string | null): AssetCondition => {
  const normalized = (value ?? "Good").toString();
  if (normalized === "New") return "New";
  if (normalized === "Fair") return "Fair";
  if (normalized === "Damaged") return "Damaged";
  if (normalized === "Beyond Repair") return "Beyond Repair";
  return "Good";
};

const mapWarrantyStatus = (value?: string | null): WarrantyStatus => {
  const normalized = (value ?? "No Warranty").toString();
  if (normalized === "Active") return "Active";
  if (normalized === "Expiring Soon") return "Expiring Soon";
  if (normalized === "Expired") return "Expired";
  return "No Warranty";
};

const mapCategory = (
  value?: string | null,
  modelValue?: string | null,
  nameValue?: string | null,
): AssetCategory => {
  const normalized = (value ?? "Laptop - Latitude 5450").toString();
  const modelAndName = `${modelValue ?? ""} ${nameValue ?? ""}`.toLowerCase();
  if (
    modelAndName.includes("bag") ||
    modelAndName.includes("backpack") ||
    modelAndName.includes("targus") ||
    modelAndName.includes("ego loop")
  )
    return "Bag";
  const mapping: Record<string, AssetCategory> = {
    "Laptop - Latitude 5420": "Laptop - Latitude 5420",
    "Laptop - Latitude 5430": "Laptop - Latitude 5430",
    "Laptop - Latitude 5440": "Laptop - Latitude 5440",
    "Laptop - Latitude 5450": "Laptop - Latitude 5450",
    "Laptop - Dell 14 Pro": "Laptop - Dell 14 Pro",
    "Monitor - Dell P2422H": "Monitor - Dell P2422H",
    "Monitor - Dell P2425HE": "Monitor - Dell P2425HE",
    "Monitor - Hub": "Monitor - Hub",
    "Monitor - Normal": "Monitor - Normal",
    "Docking Station - WD19DCS": "Docking Station - WD19DCS",
    "Docking Station": "Docking Station",
    "Keyboard & Mouse": "Keyboard & Mouse",
    Headset: "Headset",
    Keyboard: "Keyboard",
    Mouse: "Mouse",
    Laptop: "Laptop - Latitude 5450",
    Monitor: "Monitor - Normal",
  };

  if (normalized in mapping) return mapping[normalized];

  const lower = normalized.toLowerCase();
  if (lower === "keyboard") return "Keyboard";
  if (lower === "mouse") return "Mouse";
  if (lower === "laptop") return "Laptop - Latitude 5450";
  if (lower === "monitor") return "Monitor - Normal";
  if (lower === "headset") return "Headset";
  if (lower.includes("docking")) return "Docking Station";

  return mapping[normalized] ?? "Laptop - Latitude 5450";
};

const mapLocation = (value?: string | null): Location => {
  const normalized = (value ?? "").trim().toLowerCase();
  return /global|remote|offshore/.test(normalized)
    ? "Global"
    : "SSC Bangalore";
};

/** Format a date string as dd-mm-yyyy */
function formatDateDMY(value?: string | null): string {
  if (!value) return "N/A";
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

const mapEmployee = (row: any): Employee => ({
  id: row.emp_id ?? row.id ?? "EMP-NEW",
  fullName: row.full_name ?? row.fullName ?? "New Employee",
  email: row.email ?? "employee@company.com",
  phone: row.phone ?? "",
  department: (row.department ?? "IT") as Employee["department"],
  designation: row.designation ?? "Employee",
  location: mapLocation(row.location),
  locationLabel: mapLocation(row.location),
  joiningDate: formatDateDMY(row.joining_date ?? row.doj),
  status: row.status === "Inactive" ? "Inactive" : "Working",
  avatarColor: "bg-blue-500",
  supervisor: row.supervisor ?? "",
  manager: row.manager ?? "",
  doj: formatDateDMY(row.doj ?? row.joining_date),
  process: row.process ?? "",
  sfid: row.sfid ?? "",
  empId: row.emp_id ?? "",
  // Store the Supabase UUID so we can match assets whose assigned_to is a UUID
  _uuid: row.id ?? "",
  assignedDeviceCount: Number(row.assigned_device_count ?? 0),
});

export async function fetchEmployeesFromSupabase(): Promise<Employee[]> {
  if (!supabaseConfig.isConfigured) return [];

  const { data, error } = await supabase.from("employees").select("*");
  if (error) {
    console.error("fetchEmployeesFromSupabase:", error);
    throw error;
  }
  if (!data) return [];

  // Count assets assigned to each employee UUID
  const { data: assetRows } = await supabase
    .from("assets")
    .select("assigned_to")
    .not("assigned_to", "is", null);
  const assignedCountByUuid = new Map<string, number>();
  (assetRows ?? []).forEach((asset) => {
    if (!asset.assigned_to) return;
    const next = (assignedCountByUuid.get(asset.assigned_to) ?? 0) + 1;
    assignedCountByUuid.set(asset.assigned_to, next);
  });

  return data.map((row) => {
    const mapped = mapEmployee(row);
    // row.id is the Supabase UUID; assets store this in assigned_to
    const assetCount = assignedCountByUuid.get(row.id) ?? 0;
    mapped.assignedDeviceCount = assetCount;
    return mapped;
  });
}

export async function saveEmployeeToSupabase(input: {
  emp_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  location?: "SSC Bangalore" | "Global";
  emp_type?: "local" | "global";
  sfid?: string;
  process?: string;
  supervisor?: string;
  manager?: string;
  go_live_date?: string;
  doj?: string;
  joining_date?: string;
  laptop_required?: boolean;
  laptop_model?: string;
  laptop_service_tag?: string;
  headset_required?: boolean;
  headset_model?: string;
  headset_service_tag?: string;
  backpack_required?: boolean;
  backpack_model?: string;
  monitor_required?: boolean;
  monitor_model?: string;
  monitor_service_tag?: string;
  monitor_count?: number;
  hub_monitor_required?: boolean;
  hub_monitor_model?: string;
  hub_monitor_service_tag?: string;
  hub_monitor_count?: number;
  docking_station_required?: boolean;
  docking_station_model?: string;
  docking_station_service_tag?: string;
  keyboard_required?: boolean;
  keyboard_quantity?: number;
  mouse_required?: boolean;
  mouse_quantity?: number;
  assigned_device_count?: number;
}) {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const basePayload = {
    emp_id: input.emp_id,
    full_name: input.full_name,
    email: input.email,
    phone: input.phone ?? "",
    department: input.department ?? "IT",
    designation: input.designation ?? "Employee",
    location: input.location ?? "SSC Bangalore",
    emp_type: input.emp_type ?? "local",
    sfid: input.sfid ?? "",
    process: input.process ?? "",
    supervisor: input.supervisor ?? "",
    manager: input.manager ?? "",
    go_live_date: input.go_live_date || null,
    doj: input.doj || input.joining_date || null,
    joining_date: input.doj || input.joining_date || null,
    status: "Working",
    assigned_device_count: Number(input.assigned_device_count ?? 0),
  };

  const fullPayload = {
    ...basePayload,
    laptop_required: Boolean(input.laptop_required),
    laptop_model: input.laptop_model ?? "",
    laptop_service_tag: normalizeServiceTag(input.laptop_service_tag),
    headset_required: Boolean(input.headset_required),
    headset_model: input.headset_model ?? "",
    headset_service_tag: normalizeServiceTag(input.headset_service_tag),
    backpack_required: Boolean(input.backpack_required),
    backpack_model: input.backpack_model ?? "",
    monitor_required: Boolean(input.monitor_required),
    monitor_model: input.monitor_model ?? "",
    monitor_service_tag: normalizeServiceTag(input.monitor_service_tag),
    monitor_count: Number(input.monitor_count ?? 0),
    hub_monitor_required: Boolean(input.hub_monitor_required),
    hub_monitor_model: input.hub_monitor_model ?? "",
    hub_monitor_service_tag: normalizeServiceTag(input.hub_monitor_service_tag),
    hub_monitor_count: Number(input.hub_monitor_count ?? 0),
    docking_station_required: Boolean(input.docking_station_required),
    docking_station_model: input.docking_station_model ?? "",
    docking_station_service_tag: normalizeServiceTag(
      input.docking_station_service_tag,
    ),
    keyboard_required: Boolean(input.keyboard_required),
    keyboard_quantity: Number(input.keyboard_quantity ?? 0),
    mouse_required: Boolean(input.mouse_required),
    mouse_quantity: Number(input.mouse_quantity ?? 0),
  };

  const isMissingColumnError = (error: any) => {
    const message = String(error?.message ?? "");
    return (
      error?.code === "PGRST204" ||
      /column .* not found|could not find the '.*' column/i.test(message)
    );
  };

  const throwIfDuplicateEmployee = (error: unknown) => {
    if (typeof error !== "object" || error === null) return;

    const databaseError = error as {
      code?: unknown;
      constraint?: unknown;
      details?: unknown;
      message?: unknown;
    };
    if (databaseError.code !== "23505") return;

    const uniqueErrorText = [
      databaseError.constraint,
      databaseError.details,
      databaseError.message,
    ]
      .filter((part): part is string => typeof part === "string")
      .join(" ");

    if (/employees_emp_id_key|key \(emp_id\)/i.test(uniqueErrorText)) {
      throw new Error(
        `Employee ID "${input.emp_id}" already exists. Enter a unique Employee ID, or open the existing employee to assign assets.`,
      );
    }

    if (/employees_email_key|key \(email\)/i.test(uniqueErrorText)) {
      throw new Error(
        `Email "${input.email}" is already registered. Open the existing employee or use a different email address.`,
      );
    }
  };

  const insertWithPayload = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from("employees")
      .insert([payload])
      .select();
    if (error) {
      if (isMissingColumnError(error)) {
        throw new Error(
          `Supabase employee table is missing a required column: ${error.message}`,
        );
      }
      throwIfDuplicateEmployee(error);
      throw error;
    }
    return data;
  };

  try {
    return await insertWithPayload(fullPayload);
  } catch (error) {
    if (isMissingColumnError(error as any)) {
      return await insertWithPayload(basePayload);
    }
    throw error;
  }
}

export async function fetchAssetsFromSupabase(): Promise<Asset[]> {
  if (!supabaseConfig.isConfigured) return [];

  const { data: assetsData, error: assetsError } = await supabase
    .from("assets")
    .select("*");
  if (assetsError) {
    console.error("fetchAssetsFromSupabase:", assetsError);
    throw assetsError;
  }
  if (!assetsData) return [];

  const { data: employeesData } = await supabase
    .from("employees")
    .select("id, emp_id, full_name, email, department, location");
  const assetUuids = assetsData
    .map((row) => row.id as string | undefined)
    .filter((id): id is string => Boolean(id));
  const { data: activeAssignmentRows, error: assignmentsError } =
    assetUuids.length
      ? await supabase
          .from("assignments")
          .select("asset_id, employee_id, assigned_date")
          .in("asset_id", assetUuids)
          .eq("status", "Active")
      : { data: [], error: null };
  if (assignmentsError) {
    console.error("fetchAssetsFromSupabase assignments:", assignmentsError);
    throw assignmentsError;
  }

  const activeAssignmentsByAsset = new Map<
    string,
    { employee_id: string; assigned_date: string }[]
  >();
  (activeAssignmentRows ?? []).forEach((assignment) => {
    const current = activeAssignmentsByAsset.get(assignment.asset_id) ?? [];
    current.push(assignment);
    activeAssignmentsByAsset.set(assignment.asset_id, current);
  });

  const employeeMap = new Map<string, any>();
  (employeesData ?? []).forEach((employee) => {
    employeeMap.set(employee.id, employee);
    if (employee.emp_id) employeeMap.set(employee.emp_id, employee);
  });

  const mapped = assetsData.map((row) => {
    const activeAssignments = activeAssignmentsByAsset.get(row.id) ?? [];
    const activeAssignment = row.assigned_to
      ? activeAssignments.find(
          (assignment) => assignment.employee_id === row.assigned_to,
        )
      : activeAssignments.length === 1
        ? activeAssignments[0]
        : undefined;
    const assignedEmployeeUuid =
      row.assigned_to ?? activeAssignment?.employee_id ?? undefined;
    const assignedEmployee = assignedEmployeeUuid
      ? employeeMap.get(assignedEmployeeUuid)
      : undefined;

    // Expose emp_id (e.g. "EMP1025") as the assignedToEmployeeId so the
    // EmployeesPage filter (which compares against emp.empId) works correctly.
    const assignedToEmployeeId: string | undefined =
      assignedEmployee?.emp_id ??
      assignedEmployee?.id ??
      assignedEmployeeUuid ??
      undefined;
    // Also store the raw UUID so EmployeesPage can match via UUID when needed
    const assignedToEmployeeUuid: string | undefined = assignedEmployeeUuid;
    const assignedToEmployeeName: string | undefined =
      assignedEmployee?.full_name ?? assignedEmployee?.fullName ?? undefined;
    const assignedToEmployeeEmail: string | undefined =
      assignedEmployee?.email ?? undefined;
    const location = assignedEmployee
      ? mapLocation(assignedEmployee.location)
      : mapLocation(row.location);
    const category = mapCategory(row.category, row.model, row.name);
    const serviceTagFromDb = (row.service_tag ?? "").toString().trim();
    const rawServiceTag =
      category === "Keyboard" || category === "Mouse"
        ? serviceTagFromDb
        : serviceTagFromDb || (row.asset_tag ?? "").toString().trim();
    const serviceTag = normalizeServiceTag(rawServiceTag);
    const assetTagId = (row.asset_tag ?? "").toString().trim();

    return {
      _uuid: row.id ?? "",
      id:
        assetTagId ||
        `AST-${Math.random().toString(36).slice(2, 8)}`,
      name: row.name ?? "Asset",
      category,
      manufacturer: row.manufacturer ?? "Unknown",
      model: row.model ?? "Unknown Model",
      serialNumber: normalizeSerialNumber(row.serial_number),
      serviceTag,
      lastModifiedBy: row.last_modified_by ?? undefined,
      status:
        assignedEmployeeUuid &&
        ["Available", "Assigned", "Reserved", "Returned"].includes(row.status)
          ? "Assigned"
          : mapAssetStatus(row.status),
      condition: mapAssetCondition(row.condition),
      purchaseDate: row.purchase_date
        ? formatDateDMY(row.purchase_date)
        : "N/A",
      purchaseCost: Number(row.purchase_cost ?? 0),
      vendorId: row.vendor_id ?? "",
      vendorName: "Supabase Vendor",
      purchaseOrder: row.purchase_order ?? "",
      invoiceNumber: row.invoice_number ?? "",
      warrantyStart: row.warranty_start
        ? formatDateDMY(row.warranty_start)
        : "N/A",
      warrantyEnd: row.warranty_end
        ? formatDateDMY(row.warranty_end)
        : "N/A",
      warrantyStatus: mapWarrantyStatus(row.warranty_status),
      warrantyCheckedAt: row.warranty_checked_at ?? undefined,
      location,
      locationLabel: location,
      building: row.building ?? "-",
      floor: row.floor ?? "-",
      room: row.room ?? "-",
      assignedToEmployeeId,
      // Extra field used internally for UUID-based matching in EmployeesPage
      assignedToEmployeeUuid,
      assignedToEmployeeName,
      assignedToEmployeeEmail,
      assignedDate: row.assigned_date
        ? formatDateDMY(row.assigned_date)
        : activeAssignment?.assigned_date
          ? formatDateDMY(activeAssignment.assigned_date)
          : undefined,
      receivedDate: row.received_date
        ? formatDateDMY(row.received_date)
        : "N/A",
      history: [
        {
          id: `hist-${row.id ?? row.asset_tag}`,
          date: row.created_at
            ? formatDateDMY(row.created_at)
            : "N/A",
          action: "Created in Supabase",
          performedBy: "System",
          details: "Imported from database",
        },
      ],
    } satisfies Asset;
  });

  return mapped;
}

export async function fetchActiveAssignmentAssetIdsFromSupabase(): Promise<string[]> {
  if (!supabaseConfig.isConfigured) return [];

  const { data, error } = await supabase
    .from("assignments")
    .select("asset_id")
    .eq("status", "Active");

  if (error) {
    console.error("fetchActiveAssignmentAssetIdsFromSupabase:", error);
    throw error;
  }

  return [...new Set((data ?? []).map((assignment) => assignment.asset_id))];
}

export async function fetchActiveAssignmentsFromSupabase(): Promise<Assignment[]> {
  if (!supabaseConfig.isConfigured) return [];

  const [{ data: rows, error }, assets, employees] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, asset_id, employee_id, assigned_date, status, notes")
      .eq("status", "Active")
      .order("assigned_date", { ascending: false }),
    fetchAssetsFromSupabase(),
    fetchEmployeesFromSupabase(),
  ]);

  if (error) {
    console.error("fetchActiveAssignmentsFromSupabase:", error);
    throw error;
  }

  const assetsByUuid = new Map(assets.map((asset) => [asset._uuid, asset]));
  const employeesByUuid = new Map(
    employees.map((employee) => [employee._uuid, employee]),
  );
  const activeRowsByAsset = new Map<string, (typeof rows)[number][]>();

  (rows ?? []).forEach((row) => {
    const current = activeRowsByAsset.get(row.asset_id) ?? [];
    current.push(row);
    activeRowsByAsset.set(row.asset_id, current);
  });

  const assignments: Assignment[] = [];
  const assignedAssetUuids = new Set<string>();

  assets.forEach((asset) => {
    const assetUuid = asset._uuid;
    const activeRows = assetUuid
      ? activeRowsByAsset.get(assetUuid) ?? []
      : [];
    const currentOwnerUuid =
      asset.status === "Assigned" ? asset.assignedToEmployeeUuid : undefined;
    const activeRow = currentOwnerUuid
      ? activeRows.find((row) => row.employee_id === currentOwnerUuid) ??
        undefined
      : activeRows[0];
    const employeeUuid = currentOwnerUuid ?? activeRow?.employee_id;

    if (!employeeUuid || !assetUuid) return;
    const employee = employeesByUuid.get(employeeUuid);
    const id = activeRow?.id ?? `asset-${assetUuid}`;

    assignments.push({
      id,
      assetId: asset.id,
      assetName: asset.name,
      employeeId: employee?.empId ?? employee?.id ?? employeeUuid,
      employeeName: employee?.fullName ?? "Employee",
      department: employee?.department ?? "IT",
      location: employee?.location ?? asset.location,
      assignmentDate:
        activeRow?.assigned_date
          ? formatDateDMY(activeRow.assigned_date)
          : asset.assignedDate ?? "N/A",
      condition: asset.condition,
      accessories: [],
      remarks: activeRow?.notes ?? undefined,
      status: "Active",
    });
    assignedAssetUuids.add(assetUuid);
  });

  activeRowsByAsset.forEach((activeRows, assetUuid) => {
    if (assignedAssetUuids.has(assetUuid)) return;

    const asset = assetsByUuid.get(assetUuid);
    const activeRow = activeRows[0];
    const employee = employeesByUuid.get(activeRow.employee_id);
    if (!asset) return;

    assignments.push({
      id: activeRow.id,
      assetId: asset.id,
      assetName: asset.name,
      employeeId: employee?.empId ?? employee?.id ?? activeRow.employee_id,
      employeeName: employee?.fullName ?? "Employee",
      department: employee?.department ?? "IT",
      location: employee?.location ?? asset.location,
      assignmentDate: formatDateDMY(activeRow.assigned_date),
      condition: asset.condition,
      accessories: [],
      remarks: activeRow.notes ?? undefined,
      status: "Active",
    });
  });

  const toTimestamp = (value: string) => {
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    const normalized = match
      ? `${match[3]}-${match[2]}-${match[1]}`
      : value;
    const timestamp = new Date(normalized).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  return assignments.sort(
    (left, right) =>
      toTimestamp(right.assignmentDate) - toTimestamp(left.assignmentDate),
  );
}

export async function assignStockAssetsToEmployee(input: {
  employeeUuid: string;
  assetTags: string[];
}) {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const uniqueTags = [
    ...new Set(input.assetTags.map((tag) => normalizeServiceTag(tag)).filter(Boolean)),
  ];
  if (!uniqueTags.length) return;

  const now = new Date().toISOString();

  const payload = {
    status: "Assigned" as const,
    assigned_to: input.employeeUuid,
    assigned_date: now,
    updated_at: now,
  };

  const assignmentRows: Array<{
    asset_id: string;
    employee_id: string;
    assigned_date: string;
    status: "Active";
  }> = [];

  for (const tag of uniqueTags) {
    const byAssetTag = await supabase
      .from("assets")
      .update(payload)
      .eq("asset_tag", tag)
      .in("status", ["Available", "Returned", "Reserved"])
      .select("id");

    if (byAssetTag.error) throw byAssetTag.error;
    const assetUuidByTag = byAssetTag.data?.[0]?.id;
    if (assetUuidByTag) {
      assignmentRows.push({
        asset_id: assetUuidByTag,
        employee_id: input.employeeUuid,
        assigned_date: now,
        status: "Active",
      });
      continue;
    }

    const byServiceTag = await supabase
      .from("assets")
      .update(payload)
      .eq("service_tag", tag)
      .in("status", ["Available", "Returned", "Reserved"])
      .select("id");

    if (byServiceTag.error) throw byServiceTag.error;
    if ((byServiceTag.data ?? []).length === 0) {
      throw new Error(`No available stock asset found for tag "${tag}".`);
    }
    assignmentRows.push({
      asset_id: byServiceTag.data[0].id,
      employee_id: input.employeeUuid,
      assigned_date: now,
      status: "Active",
    });
  }

  if (assignmentRows.length) {
    const { error } = await supabase.from("assignments").insert(assignmentRows);
    if (error) throw error;
  }
}

export async function transferAssetsToEmployee(input: {
  assetTags: string[];
  fromEmployeeUuid: string;
  toEmployeeUuid: string;
  toLocation: Location;
  transferDate: string;
  reason: string;
}) {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }
  if (!input.fromEmployeeUuid || !input.toEmployeeUuid) {
    throw new Error("Both employees must exist in the database to transfer assets.");
  }

  const { error } = await supabase.rpc("transfer_assets_to_employee", {
    p_asset_tags: [...new Set(input.assetTags)],
    p_from_employee_uuid: input.fromEmployeeUuid,
    p_to_employee_uuid: input.toEmployeeUuid,
    p_to_location: input.toLocation,
    p_transfer_date: new Date(
      `${input.transferDate}T00:00:00`,
    ).toISOString(),
    p_reason: input.reason,
  });

  if (error) {
    console.error("transferAssetsToEmployee:", error);
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "The database transfer transaction is not installed. Run supabase/fix_asset_transfer.sql in the Supabase SQL Editor, then retry.",
      );
    }
    throw error;
  }
}

export async function returnAssetsToStock(input: {
  assetTags: string[];
  employeeUuid: string;
  returnDate: string;
  condition: AssetCondition;
  remarks: string;
  receivedBy: string;
}) {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }
  if (!input.employeeUuid) {
    throw new Error("The current employee could not be located in the database.");
  }
  if (!input.assetTags.length) {
    throw new Error("Select at least one assigned asset to return.");
  }

  if (!input.receivedBy.trim()) {
    throw new Error("The logged-in receiver name is required to record the return.");
  }

  const { error } = await supabase.rpc("return_assets_to_stock", {
    p_asset_tags: [...new Set(input.assetTags)],
    p_employee_uuid: input.employeeUuid,
    p_return_date: new Date(`${input.returnDate}T00:00:00`).toISOString(),
    p_condition: input.condition,
    p_remarks: input.remarks.trim() || "Returned",
    p_received_by: input.receivedBy.trim(),
  });

  if (error) {
    console.error("returnAssetsToStock:", error);
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "The database return workflow is not installed. Run supabase/fix_handover_returns.sql in the Supabase SQL Editor, then retry.",
      );
    }
    throw error;
  }
}

export async function returnTransferredAssetToStock(input: {
  assetTag: string;
  employeeUuid: string;
  returnDate: string;
  receivedBy: string;
}) {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }
  if (!input.assetTag || !input.employeeUuid) {
    throw new Error("The asset and its current employee are required.");
  }

  const { error } = await supabase.rpc("return_transferred_asset_to_stock", {
    p_asset_tag: input.assetTag,
    p_employee_uuid: input.employeeUuid,
    p_return_date: new Date(`${input.returnDate}T00:00:00`).toISOString(),
    p_received_by: input.receivedBy,
  });

  if (error) {
    console.error("returnTransferredAssetToStock:", error);
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "The database stock-return transaction is not installed. Run supabase/fix_handover_returns.sql in the Supabase SQL Editor, then retry.",
      );
    }
    throw error;
  }
}

export async function sendAssetForRepair(input: {
  assetTag: string;
  employeeUuid: string;
  vendorName: "Dell" | "Poly";
  issue: string;
  reportedDate: string;
  temporaryAssetTag?: string;
}) {
  if (!supabaseConfig.isConfigured) {
    throw new Error("Supabase is not configured.");
  }
  if (!input.assetTag || !input.employeeUuid) {
    throw new Error("The assigned asset and employee are required.");
  }
  if (!input.issue.trim()) {
    throw new Error("Enter an issue description before sending the asset for repair.");
  }

  const { error } = await supabase.rpc("send_asset_for_repair", {
    p_asset_tag: input.assetTag,
    p_employee_uuid: input.employeeUuid,
    p_vendor_name: input.vendorName,
    p_issue_summary: input.issue.trim(),
    p_reported_date: new Date(`${input.reportedDate}T00:00:00`).toISOString(),
    p_temporary_asset_tag: input.temporaryAssetTag ?? null,
  });

  if (error) {
    console.error("sendAssetForRepair:", error);
    if (error.code === "PGRST202" || error.code === "42883") {
      throw new Error(
        "The database repair workflow is not installed. Run supabase/fix_asset_repair.sql in the Supabase SQL Editor, then retry.",
      );
    }
    throw error;
  }
}

export interface RecentAssetActivity {
  id: string;
  assetId: string;
  assetName: string;
  action: string;
  employeeName: string;
  date: string;
}

export interface PendingAssetRepair {
  id: string;
  assetId: string;
  assetName: string;
  issue: string;
  status: string;
  reportedDate: string;
}

export async function fetchPendingRepairsFromSupabase(): Promise<
  PendingAssetRepair[]
> {
  if (!supabaseConfig.isConfigured) return [];

  const [{ data: repairRows, error }, assets] = await Promise.all([
    supabase
      .from("repair_requests")
      .select("id, asset_id, issue_summary, status, reported_date")
      .in("status", ["Pending", "Sent to Vendor", "Under Repair"])
      .order("reported_date", { ascending: false }),
    fetchAssetsFromSupabase(),
  ]);

  if (error) {
    console.error("fetchPendingRepairsFromSupabase:", error);
    throw error;
  }

  const assetsByUuid = new Map(
    assets.map((asset) => [asset._uuid, asset]),
  );
  return (repairRows ?? []).map((row) => {
    const asset = assetsByUuid.get(row.asset_id);
    return {
      id: row.id,
      assetId: asset?.id ?? row.asset_id,
      assetName: asset?.name ?? "Asset",
      issue: row.issue_summary,
      status: row.status,
      reportedDate: formatDateDMY(row.reported_date),
    };
  });
}

export async function fetchRecentAssetActivityFromSupabase(
  limit = 8,
): Promise<RecentAssetActivity[]> {
  if (!supabaseConfig.isConfigured) return [];

  const [assignmentResult, transferResult, returnResult, assets, employees] =
    await Promise.all([
      supabase
        .from("assignments")
        .select("id, asset_id, employee_id, assigned_date, status")
        .order("assigned_date", { ascending: false })
        .eq("status", "Active")
        .limit(limit),
      supabase
        .from("transfers")
        .select("id, asset_id, to_employee_id, transfer_date")
        .order("transfer_date", { ascending: false })
        .limit(limit),
      supabase
        .from("returns")
        .select("id, asset_id, employee_id, returned_date")
        .order("returned_date", { ascending: false })
        .limit(limit),
      fetchAssetsFromSupabase(),
      fetchEmployeesFromSupabase(),
    ]);

  if (assignmentResult.error) {
    console.error("Could not load assignment activity:", assignmentResult.error);
    throw assignmentResult.error;
  }
  if (transferResult.error) {
    console.error("Could not load transfer activity:", transferResult.error);
    throw transferResult.error;
  }
  if (returnResult.error) {
    console.error("Could not load return activity:", returnResult.error);
    throw returnResult.error;
  }

  const assetsByUuid = new Map(assets.map((asset) => [asset._uuid, asset]));
  const employeesByUuid = new Map(
    employees.map((employee) => [employee._uuid, employee]),
  );
  const activity: RecentAssetActivity[] = [];
  const loggedAssignedAssetIds = new Set<string>();

  (assignmentResult.data ?? []).forEach((row) => {
    const asset = assetsByUuid.get(row.asset_id);
    const employee = employeesByUuid.get(row.employee_id);
    if (!asset || !employee) return;
    loggedAssignedAssetIds.add(row.asset_id);
    activity.push({
      id: `assignment-${row.id}`,
      assetId: asset.id,
      assetName: asset.name,
      action: "Assigned",
      employeeName: employee.fullName,
      date: formatDateDMY(row.assigned_date),
    });
  });

  (transferResult.data ?? []).forEach((row) => {
    const asset = assetsByUuid.get(row.asset_id);
    const employee = employeesByUuid.get(row.to_employee_id);
    if (!asset || !employee) return;
    activity.push({
      id: `transfer-${row.id}`,
      assetId: asset.id,
      assetName: asset.name,
      action: "Transferred",
      employeeName: employee.fullName,
      date: formatDateDMY(row.transfer_date),
    });
  });

  (returnResult.data ?? []).forEach((row) => {
    const asset = assetsByUuid.get(row.asset_id);
    const employee = employeesByUuid.get(row.employee_id);
    if (!asset || !employee) return;
    activity.push({
      id: `return-${row.id}`,
      assetId: asset.id,
      assetName: asset.name,
      action: "Returned to stock",
      employeeName: employee.fullName,
      date: formatDateDMY(row.returned_date),
    });
  });

  assets.forEach((asset) => {
    const employeeUuid = asset.assignedToEmployeeUuid;
    if (
      asset.status !== "Assigned" ||
      !asset._uuid ||
      loggedAssignedAssetIds.has(asset._uuid) ||
      !employeeUuid
    )
      return;
    const employee = employeesByUuid.get(employeeUuid);
    if (!employee) return;
    activity.push({
      id: `asset-assignment-${asset._uuid}`,
      assetId: asset.id,
      assetName: asset.name,
      action: "Assigned",
      employeeName: employee.fullName,
      date: asset.assignedDate ?? "N/A",
    });
  });

  return activity
    .sort((left, right) => {
      const toTimestamp = (value: string) => {
        const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        const normalized = match
          ? `${match[3]}-${match[2]}-${match[1]}`
          : value;
        const timestamp = new Date(normalized).getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
      };
      const leftDate = toTimestamp(left.date);
      const rightDate = toTimestamp(right.date);
      return rightDate - leftDate;
    })
    .slice(0, limit);
}

export async function fetchTransferRecordsFromSupabase(): Promise<Transfer[]> {
  if (!supabaseConfig.isConfigured) return [];
  const [{ data: rows, error }, assets, employees] = await Promise.all([
    supabase
      .from("transfers")
      .select("*")
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false }),
    fetchAssetsFromSupabase(),
    fetchEmployeesFromSupabase(),
  ]);
  if (error) throw error;

  const assetsByUuid = new Map(assets.map((asset) => [asset._uuid, asset]));
  const employeesByUuid = new Map(employees.map((employee) => [employee._uuid, employee]));
  const latestTransferByAsset = new Map<string, string>();
  (rows ?? []).forEach((row) => {
    if (!latestTransferByAsset.has(row.asset_id)) {
      latestTransferByAsset.set(row.asset_id, row.id);
    }
  });
  return (rows ?? []).map((row) => {
    const asset = assetsByUuid.get(row.asset_id);
    const from = employeesByUuid.get(row.from_employee_id);
    const to = employeesByUuid.get(row.to_employee_id);
    return {
      id: row.id,
      serialNumber: `TR-${String(row.serial_number).padStart(6, "0")}`,
      assetId: asset?.id ?? row.asset_id,
      assetName: asset?.name ?? "Asset",
      fromEmployeeId: from?.empId ?? from?.id ?? "-",
      fromEmployeeName: from?.fullName ?? "Former employee",
      fromLocation: from?.location ?? "SSC Bangalore",
      toEmployeeId: to?.empId ?? to?.id ?? "-",
      toEmployeeName: to?.fullName ?? "Employee",
      toLocation: to?.location ?? "SSC Bangalore",
      transferDate: formatDateDMY(row.transfer_date),
      reason: row.reason ?? "-",
      status: row.status === "Pending" ? "Pending" : "Completed",
      assetTag: asset?.id,
      currentEmployeeUuid: to?._uuid,
      canReturnToStock:
        latestTransferByAsset.get(row.asset_id) === row.id &&
        row.status !== "Pending" &&
        asset?.status === "Assigned" &&
        asset.assignedToEmployeeUuid === row.to_employee_id,
    } satisfies Transfer;
  });
}

export async function fetchReturnRecordsFromSupabase(): Promise<ReturnRecord[]> {
  if (!supabaseConfig.isConfigured) return [];
  const [{ data: rows, error }, assets, employees] = await Promise.all([
    supabase.from("returns").select("*").order("returned_date", { ascending: false }),
    fetchAssetsFromSupabase(),
    fetchEmployeesFromSupabase(),
  ]);
  if (error) throw error;

  const assetsByUuid = new Map(assets.map((asset) => [asset._uuid, asset]));
  const employeesByUuid = new Map(employees.map((employee) => [employee._uuid, employee]));
  return (rows ?? []).map((row) => {
    const asset = assetsByUuid.get(row.asset_id);
    const employee = employeesByUuid.get(row.employee_id);
    const condition: AssetCondition = row.condition === "New" || row.condition === "Fair" || row.condition === "Damaged" || row.condition === "Beyond Repair"
      ? row.condition
      : "Good";
    return {
      id: row.id,
      assetId: asset?.id ?? row.asset_id,
      assetName: asset?.name ?? "Asset",
      employeeId: employee?.empId ?? employee?.id ?? "-",
      employeeName: employee?.fullName ?? "Former employee",
      returnDate: formatDateDMY(row.returned_date),
      condition,
      accessoriesReturned: [],
      missingAccessories: [],
      damageDetails: "",
      remarks: row.remarks ?? "",
      outcome: "Available Stock",
    } satisfies ReturnRecord;
  });
}

export async function fetchAssetByIdFromSupabase(
  assetId: string,
): Promise<Asset | null> {
  if (!assetId) return null;
  const assets = await fetchAssetsFromSupabase();
  return (
    assets.find(
      (asset) =>
        asset.id === assetId ||
        asset.serviceTag === assetId ||
        asset.serialNumber === assetId,
    ) ?? null
  );
}
