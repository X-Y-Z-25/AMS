import * as XLSX from "xlsx";
import type {
  Employee,
  GlobalEmployeeRecord,
  LocalEmployeeRecord,
} from "@/types";
import {
  GLOBAL_EMPLOYEE_COLUMNS,
  LOCAL_EMPLOYEE_COLUMNS,
  COMPLETE_EMPLOYEE_COLUMNS,
  createEmptyGlobalRecord,
  createEmptyLocalRecord,
} from "@/data/employeeColumns";

const STORAGE_KEY = "itam-employee-workbook";
const EXCEL_FILENAME = "employees.xlsx";

const SHEET_GLOBAL = "Global User";
const SHEET_LOCAL = "Local User";
const SHEET_COMPLETE = "Complete";

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-orange-500",
];

export interface EmployeeWorkbookData {
  global: GlobalEmployeeRecord[];
  local: LocalEmployeeRecord[];
}

let workbookCache: EmployeeWorkbookData = { global: [], local: [] };
let initialized = false;

function recordToRow(
  record: GlobalEmployeeRecord | LocalEmployeeRecord,
  columns: { key: string; label: string }[],
): string[] {
  return columns.map((col) =>
    String((record as Record<string, string | number>)[col.key] ?? ""),
  );
}

function rowToGlobalRecord(row: string[], slNo: number): GlobalEmployeeRecord {
  const record = createEmptyGlobalRecord(slNo);
  GLOBAL_EMPLOYEE_COLUMNS.forEach((col, i) => {
    if (col.key !== "slNo") {
      record[col.key] = row[i] ?? "";
    }
  });
  return record;
}

function rowToLocalRecord(row: string[], slNo: number): LocalEmployeeRecord {
  const record = createEmptyLocalRecord(slNo);
  LOCAL_EMPLOYEE_COLUMNS.forEach((col, i) => {
    if (col.key !== "slNo") {
      record[col.key] = row[i] ?? "";
    }
  });
  return record;
}

function createWorkbook(data: EmployeeWorkbookData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  const globalHeader = GLOBAL_EMPLOYEE_COLUMNS.map((c) => c.label);
  const globalRows = data.global.map((r) =>
    recordToRow(r, GLOBAL_EMPLOYEE_COLUMNS),
  );
  const globalSheet = XLSX.utils.aoa_to_sheet([globalHeader, ...globalRows]);
  XLSX.utils.book_append_sheet(wb, globalSheet, SHEET_GLOBAL);

  const localHeader = LOCAL_EMPLOYEE_COLUMNS.map((c) => c.label);
  const localRows = data.local.map((r) =>
    recordToRow(r, LOCAL_EMPLOYEE_COLUMNS),
  );
  const localSheet = XLSX.utils.aoa_to_sheet([localHeader, ...localRows]);
  XLSX.utils.book_append_sheet(wb, localSheet, SHEET_LOCAL);

  const completeSheet = XLSX.utils.aoa_to_sheet([COMPLETE_EMPLOYEE_COLUMNS]);
  XLSX.utils.book_append_sheet(wb, completeSheet, SHEET_COMPLETE);

  return wb;
}

function parseGlobalSheet(
  sheet: XLSX.WorkSheet | undefined,
): GlobalEmployeeRecord[] {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];
  if (rows.length <= 1) return [];

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, i) => rowToGlobalRecord(row, i + 1));
}

function parseLocalSheet(
  sheet: XLSX.WorkSheet | undefined,
): LocalEmployeeRecord[] {
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
  }) as string[][];
  if (rows.length <= 1) return [];

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row, i) => rowToLocalRecord(row, i + 1));
}

function loadFromStorage(): EmployeeWorkbookData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EmployeeWorkbookData;
  } catch {
    return null;
  }
}

function saveToStorage(data: EmployeeWorkbookData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  workbookCache = data;
}

export function initEmployeeWorkbook(): EmployeeWorkbookData {
  if (initialized) return workbookCache;

  const stored = loadFromStorage();
  if (stored) {
    workbookCache = stored;
  } else {
    workbookCache = { global: [], local: [] };
    saveToStorage(workbookCache);
  }

  initialized = true;
  return workbookCache;
}

export function getEmployeeWorkbookData(): EmployeeWorkbookData {
  if (!initialized) initEmployeeWorkbook();
  return workbookCache;
}

export function addGlobalEmployee(
  record: Omit<GlobalEmployeeRecord, "slNo">,
): GlobalEmployeeRecord {
  const data = getEmployeeWorkbookData();
  const slNo = data.global.length + 1;
  const fullRecord: GlobalEmployeeRecord = {
    ...createEmptyGlobalRecord(slNo),
    ...record,
    slNo,
  };
  data.global.push(fullRecord);
  saveToStorage(data);
  return fullRecord;
}

export function addLocalEmployee(
  record: Omit<LocalEmployeeRecord, "slNo">,
): LocalEmployeeRecord {
  const data = getEmployeeWorkbookData();
  const slNo = data.local.length + 1;
  const fullRecord: LocalEmployeeRecord = {
    ...createEmptyLocalRecord(slNo),
    ...record,
    slNo,
  };
  data.local.push(fullRecord);
  saveToStorage(data);
  return fullRecord;
}

export function globalRecordToEmployee(
  record: GlobalEmployeeRecord,
  index: number,
): Employee {
  return {
    id: record.empId || `GLB-${record.slNo}`,
    fullName: record.empName,
    email: record.emailAddress,
    phone: record.addressContact,
    department: "Operations",
    designation: record.processRole,
    location: "Global",
    joiningDate: record.doj,
    status: record.remarksStatus?.toLowerCase().includes("inactive")
      ? "Inactive"
      : "Working",
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    userType: "global",
    excelRecord: record,
  };
}

export function localRecordToEmployee(
  record: LocalEmployeeRecord,
  index: number,
): Employee {
  return {
    id: record.empId || `LOC-${record.slNo}`,
    fullName: record.empName,
    email: record.emailAddress,
    phone: record.contactLaptop,
    department: "Operations",
    designation: record.processLineManager,
    location: (record.location === "Global"
      ? "Global"
      : "SSC Bangalore") as Employee["location"],
    joiningDate: record.doj,
    status: record.statusRemarks?.toLowerCase().includes("inactive")
      ? "Inactive"
      : "Working",
    avatarColor: AVATAR_COLORS[(index + 3) % AVATAR_COLORS.length],
    userType: "local",
    excelRecord: record,
  };
}

export function getExcelEmployees(): Employee[] {
  const data = getEmployeeWorkbookData();
  const global = data.global.map((r, i) => globalRecordToEmployee(r, i));
  const local = data.local.map((r, i) => localRecordToEmployee(r, i));
  return [...global, ...local];
}

export function downloadEmployeeExcel(): void {
  const data = getEmployeeWorkbookData();
  const wb = createWorkbook(data);
  XLSX.writeFile(wb, EXCEL_FILENAME);
}

export function importEmployeeExcel(file: File): Promise<EmployeeWorkbookData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error("Failed to read file");

        const wb = XLSX.read(buffer, { type: "array" });
        const data: EmployeeWorkbookData = {
          global: parseGlobalSheet(wb.Sheets[SHEET_GLOBAL]),
          local: parseLocalSheet(wb.Sheets[SHEET_LOCAL]),
        };
        saveToStorage(data);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export function exportInitialTemplate(): void {
  const wb = createWorkbook({ global: [], local: [] });
  XLSX.writeFile(wb, "employee-template.xlsx");
}
