import type {
  Asset,
  Assignment,
  Disposal,
  Employee,
  LocationStat,
  Notification,
  ProcurementOrder,
  RecentActivity,
  Repair,
  ReturnRecord,
  Transfer,
  Vendor,
  AssetCategory,
  Department,
  Location,
} from "@/types";

// Mock data is intentionally blanked out to avoid showing sample inventory in the front end.
// The app is configured for a database-backed implementation.

export const CATEGORIES: AssetCategory[] = [];
export const LOCATIONS: Location[] = [];
export const ONBOARDING_TEMPLATES: Array<{
  id: string;
  name: string;
  location: Location;
  description: string;
  defaultLaptopModel: AssetCategory;
  includeBag: boolean;
  includeCharger: boolean;
  includeHeadset: boolean;
  includeKeyboard: boolean;
  includeMouse: boolean;
  includeCable: boolean;
  monitorsCount?: number;
  includeDockingStation?: boolean;
  monitorType?: AssetCategory;
  cableType?: string;
}> = [];

export const DEPARTMENTS: Department[] = [];
export const ASSET_STATUSES = [] as const;
export const CONDITIONS = [] as const;
export const DISPOSAL_REASONS = [] as const;
export const DISPOSAL_METHODS = [] as const;

export const vendors: Vendor[] = [];
export function getVendor(id?: string): Vendor | undefined {
  return undefined;
}

export interface ExitAssetSummary {
  assetId: string;
  assetName: string;
  category: AssetCategory;
  serviceTag: string;
  status: "return" | "missing" | "hold";
}

export interface ExitUserRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  exitDate: string;
  status: "Cleared" | "Missing Item(s)" | "Pending Verification";
  remarks: string;
  assetSummary: ExitAssetSummary[];
}

export const exitUsers: ExitUserRecord[] = [];
export function addExitRecord(record: ExitUserRecord) {
  exitUsers.unshift(record);
}

export const employees: Employee[] = [];
export function getEmployee(id?: string): Employee | undefined {
  return undefined;
}

export function getEmployeeAssets(employeeId?: string): Asset[] {
  return [];
}

export const assets: Asset[] = [];
export function getAsset(id?: string): Asset | undefined {
  return undefined;
}

export const procurementOrders: ProcurementOrder[] = [];
export const assignments: Assignment[] = [];
export const transfers: Transfer[] = [];
export const returns: ReturnRecord[] = [];
export const repairs: Repair[] = [];
export const disposals: Disposal[] = [];
export const notifications: Notification[] = [];
export const recentActivity: RecentActivity[] = [];
export const locationStats: LocationStat[] = [];

export function getDashboardStats() {
  return {
    total: 0,
    assigned: 0,
    available: 0,
    underRepair: 0,
    retired: 0,
    disposed: 0,
    actualTotal: 0,
    actualAssigned: 0,
    actualAvailable: 0,
    actualUnderRepair: 0,
    actualRetired: 0,
    actualDisposed: 0,
    actualReturned: 0,
    actualLost: 0,
    actualReserved: 0,
    addedThisMonth: 0,
    assignedThisMonth: 0,
    returnedThisMonth: 0,
    warrantyExpiringSoon: 0,
  };
}

export function getAssetsByLocation(location?: Location): Asset[] {
  return [];
}

export function getStatusDistribution(location?: Location) {
  return [];
}

export function getCategoryDistribution(location?: Location) {
  return [];
}

export function getLaptopModelDistribution(location?: Location) {
  return [];
}

export function getPeripheralsDistribution(location?: Location) {
  return [];
}

export function getLocationShareDistribution() {
  return [];
}

export function getDepartmentAllocationData() {
  return [];
}

export function getFinancialValuationByCategory(location?: Location) {
  return [];
}

export function getWarrantyLifecycleDistribution(location?: Location) {
  return [];
}

export function getLaptopModelAssignmentCounts(location?: Location) {
  return [];
}

export function getEmployeeDocuments(employeeId?: string, assetId?: string) {
  return [];
}
