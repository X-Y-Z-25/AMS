// ===== Enums / Union Types =====

export type AssetStatus =
  | "Available"
  | "Assigned"
  | "Under Repair"
  | "Returned"
  | "Reserved"
  | "Retired"
  | "Disposed"
  | "Lost";

export type AssetCondition =
  | "New"
  | "Good"
  | "Fair"
  | "Damaged"
  | "Beyond Repair";

export type AssetCategory =
  | "Laptop - Latitude 5420"
  | "Laptop - Latitude 5430"
  | "Laptop - Latitude 5440"
  | "Laptop - Latitude 5450"
  | "Laptop - Dell 14 Pro"
  | "Monitor - Dell P2422H"
  | "Monitor - Dell P2425HE"
  | "Monitor - Hub"
  | "Monitor - Normal"
  | "Docking Station - WD19DCS"
  | "Docking Station"
  | "Keyboard & Mouse"
  | "Keyboard"
  | "Mouse"
  | "Bag"
  | "Headset";

export type TemplateType =
  | "SSC Bangalore Standard"
  | "Global Remote Workstation"
  | "Custom Kit";

export interface OnboardingTemplateConfig {
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
  cableType?: "HDMI 2.0" | "USB-C 3.1" | "DisplayPort";
  monitorsCount: number; // 0, 1, 2
  monitorType?: "Monitor - Hub" | "Monitor - Normal";
  includeDockingStation: boolean;
}

export type Location = "SSC Bangalore" | "Global";

export type Department =
  | "IT"
  | "HR"
  | "Finance"
  | "Operations"
  | "Sales"
  | "Marketing";

export type WarrantyStatus =
  | "Active"
  | "Expiring Soon"
  | "Expired"
  | "No Warranty";

export type RepairStatus =
  | "Pending"
  | "Sent to Vendor"
  | "Under Repair"
  | "Completed"
  | "Not Repairable";

export type DisposalStatus = "Pending" | "Approved" | "Disposed";

export type DisposalReason =
  | "Beyond Repair"
  | "End of Life"
  | "Damaged"
  | "Lost"
  | "Obsolete"
  | "Replacement";

export type ProcurementStatus =
  | "Pending"
  | "Partially Received"
  | "Received"
  | "Cancelled";

export type DisposalMethod =
  | "Donation"
  | "Recycle"
  | "Sell"
  | "Scrap"
  | "Vendor Buyback";

export type AssignmentStatus = "Active" | "Returned" | "Transferred";

export type TransferStatus = "Completed" | "Pending";

export type NotificationType =
  | "warranty"
  | "disposal"
  | "repair"
  | "procurement"
  | "return"
  | "info";

// ===== Entities =====

export type EmployeeUserType = "global" | "local";

export interface GlobalEmployeeRecord {
  slNo: number;
  empName: string;
  empId: string;
  emailAddress: string;
  doj: string;
  offshore: string;
  processRole: string;
  clipb: string;
  manager: string;
  addressContact: string;
  onboardingType: string;
  laptopMonitorDockingStation: string;
  laptopCharger: string;
  backpack: string;
  headset: string;
  serialNumber: string;
  hubMonitor: string;
  serviceTag: string;
  keyboard: string;
  mouse: string;
  printerShredder: string;
  webcamEngineerName: string;
  remarksStatus: string;
}

export interface LocalEmployeeRecord {
  slNo: number;
  location: string;
  processLineManager: string;
  empName: string;
  wfh: string;
  address: string;
  contactLaptop: string;
  emailAddress: string;
  doj: string;
  go: string;
  empId: string;
  serviceTag: string;
  liveDate: string;
  headsetSerialNumber: string;
  monitor1: string;
  monitor2: string;
  keyboard: string;
  laptopChargerBackpack: string;
  mouse: string;
  additionalAssets: string;
  statusRemarks: string;
}

export type EmployeeStatus = "Working" | "Inactive";

export interface Employee {
  id: string; // EMP1025
  fullName: string;
  email: string;
  phone: string;
  department: Department;
  designation: string;
  location: Location;
  joiningDate: string;
  status: EmployeeStatus;
  avatarColor: string;
  userType?: EmployeeUserType;
  excelRecord?: GlobalEmployeeRecord | LocalEmployeeRecord;
  supervisor?: string;
  manager?: string;
  doj?: string;
  process?: string;
  sfid?: string;
  empId?: string;
  /** Supabase UUID (row.id) – used internally for asset matching */
  _uuid?: string;
  assignedDeviceCount?: number;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstNumber: string;
  address: string;
}

export interface AssetHistoryEntry {
  id: string;
  date: string;
  action: string;
  performedBy: string;
  details?: string;
}

export interface Asset {
  id: string; // AST-000125
  /** Supabase assets.id UUID used by transfer and return records */
  _uuid?: string;
  name: string;
  category: AssetCategory;
  manufacturer: string;
  model: string;
  serialNumber: string;
  serviceTag: string;
  status: AssetStatus;
  condition: AssetCondition;
  // Purchase
  purchaseDate: string;
  purchaseCost: number;
  vendorId: string;
  vendorName: string;
  purchaseOrder: string;
  invoiceNumber: string;
  // Warranty
  warrantyStart: string;
  warrantyEnd: string;
  warrantyStatus: WarrantyStatus;
  // Location
  location: Location;
  building: string;
  floor: string;
  room: string;
  // Assignment
  assignedToEmployeeId?: string;
  /** Raw Supabase UUID stored in assets.assigned_to – for internal matching */
  assignedToEmployeeUuid?: string;
  assignedToEmployeeName?: string;
  assignedDate?: string;
  // Stock
  receivedDate: string;
  // History
  history: AssetHistoryEntry[];
}

export interface AssetDocument {
  id: string;
  name: string;
  type:
    | "Asset Photo"
    | "Handover Form"
    | "Purchase Document"
    | "Warranty Document"
    | "Other";
  oneDriveUrl: string;
}

export interface ProcurementOrder {
  id: string; // PO number
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDate: string;
  category: AssetCategory;
  model: string;
  quantity: number;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  status: ProcurementStatus;
  notes?: string;
}

export interface Assignment {
  id: string;
  assetId: string;
  assetName: string;
  employeeId: string;
  employeeName: string;
  department: Department;
  location: Location;
  assignmentDate: string;
  condition: AssetCondition;
  accessories: string[];
  remarks?: string;
  status: AssignmentStatus;
}

export interface Transfer {
  id: string;
  assetId: string;
  assetName: string;
  fromEmployeeId: string;
  fromEmployeeName: string;
  fromLocation: Location;
  toEmployeeId: string;
  toEmployeeName: string;
  toLocation: Location;
  transferDate: string;
  reason: string;
  status: TransferStatus;
}

export interface ReturnRecord {
  id: string;
  assetId: string;
  assetName: string;
  employeeId: string;
  employeeName: string;
  returnDate: string;
  condition: AssetCondition;
  accessoriesReturned: string[];
  missingAccessories: string[];
  damageDetails?: string;
  remarks?: string;
  outcome: "Available Stock" | "Repair" | "Retired";
}

export interface Repair {
  id: string;
  assetId: string;
  assetName: string;
  issue: string;
  vendorId: string;
  vendorName: string;
  sentDate: string;
  expectedReturn: string;
  cost: number;
  status: RepairStatus;
}

export interface Disposal {
  id: string;
  assetId: string;
  assetName: string;
  disposalDate: string;
  reason: DisposalReason;
  condition: AssetCondition;
  method: DisposalMethod;
  approvedBy: string;
  remarks?: string;
  status: DisposalStatus;
  value: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface RecentActivity {
  id: string;
  assetId: string;
  action: string;
  detail: string;
  time: string;
}

export interface LocationStat {
  location: Location;
  total: number;
  assigned: number;
  available: number;
  repair: number;
  retired: number;
  disposed: number;
}
