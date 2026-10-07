import { useState } from "react";
import {
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Building,
  MapPin,
  Laptop,
  User,
  ShoppingCart,
  Wrench,
  Trash2,
  Shield,
  UserCheck,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { classNames, formatCategoryLabel } from "@/lib/utils";

const DEPARTMENTS: string[] = [];
const LOCATIONS: string[] = [];
const CATEGORIES: string[] = [];
const ASSET_STATUSES: string[] = [];
const employees: any[] = [];
const vendors: any[] = [];

const reportList = [
  {
    id: "inventory",
    title: "Complete Asset Inventory",
    description: "All assets with full details",
    icon: Laptop,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "employee",
    title: "Employee Asset Report",
    description: "Assets assigned to each employee",
    icon: User,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "department",
    title: "Department Asset Report",
    description: "Asset distribution by department",
    icon: Building,
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    id: "location",
    title: "Location Asset Report",
    description: "Assets across all locations",
    icon: MapPin,
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: "status",
    title: "Asset Status Report",
    description: "Assets grouped by status",
    icon: FileBarChart,
    color: "bg-violet-50 text-violet-600",
  },
  {
    id: "procurement",
    title: "Procurement Report",
    description: "Purchase orders and spending",
    icon: ShoppingCart,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: "repair",
    title: "Repair Report",
    description: "Repair history and costs",
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
  },
  {
    id: "disposal",
    title: "Disposal Report",
    description: "Disposed assets and values",
    icon: Trash2,
    color: "bg-red-50 text-red-600",
  },
  {
    id: "warranty",
    title: "Warranty Expiry Report",
    description: "Assets with expiring warranties",
    icon: Shield,
    color: "bg-amber-50 text-amber-600",
  },
  {
    id: "assignment",
    title: "Assignment Report",
    description: "Asset assignment history",
    icon: UserCheck,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    id: "history",
    title: "Asset History Report",
    description: "Complete lifecycle of assets",
    icon: Clock,
    color: "bg-gray-100 text-gray-600",
  },
];

export function ReportsPage() {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [vendor, setVendor] = useState("");

  const handleGenerate = () => {
    if (!selectedReport) {
      showToast("Please select a report type.", "warning");
      return;
    }
    showToast("Report generated successfully. Preview ready.", "success");
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Generate and export asset management reports"
        actions={
          <>
            <Button
              variant="outline"
              icon={<FileText className="h-4 w-4" />}
              onClick={() =>
                showToast("PDF export ready for backend integration.", "info")
              }
            >
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
            <Button
              variant="outline"
              icon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={() =>
                showToast("Excel export ready for backend integration.", "info")
              }
            >
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Report Selection */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Select Report Type
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reportList.map((report) => {
                const Icon = report.icon;
                const active = selectedReport === report.id;
                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={classNames(
                      "flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all",
                      active
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm",
                    )}
                  >
                    <span
                      className={classNames(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        report.color,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {report.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {report.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div>
          <Card className="p-5 sticky top-0">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              Filters
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Date Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 px-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Department
                </label>
                <Select
                  value={department}
                  onChange={setDepartment}
                  options={DEPARTMENTS.map((d) => ({ label: d, value: d }))}
                  placeholder="All Departments"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Location
                </label>
                <Select
                  value={location}
                  onChange={setLocation}
                  options={LOCATIONS.map((l) => ({ label: l, value: l }))}
                  placeholder="All Locations"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Category
                </label>
                <Select
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES.map((c) => ({
                    label: formatCategoryLabel(c),
                    value: c,
                  }))}
                  placeholder="All Categories"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Status
                </label>
                <Select
                  value={status}
                  onChange={setStatus}
                  options={ASSET_STATUSES.map((s) => ({ label: s, value: s }))}
                  placeholder="All Statuses"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Employee
                </label>
                <Select
                  value={employeeFilter}
                  onChange={setEmployeeFilter}
                  options={employees.map((e) => ({
                    label: `${e.fullName} (${e.id})`,
                    value: e.id,
                  }))}
                  placeholder="All Employees"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600">
                  Vendor
                </label>
                <Select
                  value={vendor}
                  onChange={setVendor}
                  options={vendors.map((v) => ({ label: v.name, value: v.id }))}
                  placeholder="All Vendors"
                  className="w-full"
                />
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mt-4"
              icon={<FileBarChart className="h-4 w-4" />}
              onClick={handleGenerate}
            >
              Generate Report
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
