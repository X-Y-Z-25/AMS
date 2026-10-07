import { useState } from "react";
import {
  Sparkles,
  Laptop,
  Monitor,
  Headphones,
  HardDrive,
  PackageCheck,
  Check,
  User,
  MapPin,
  Building,
  Plus,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import type { Location, AssetCategory, Department } from "@/types";

const employees: any[] = [];
const assets: any[] = [];
const ONBOARDING_TEMPLATES: any[] = [
  { id: "default", name: "Default Template", location: "SSC Bangalore" },
];
const DEPARTMENTS: Department[] = ["IT"];
const assignments: any[] = [];

interface ProvisionTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onCompleted?: (handoverAssetId: string) => void;
}

export function ProvisionTemplateModal({
  open,
  onClose,
  onCompleted,
}: ProvisionTemplateModalProps) {
  const { showToast } = useToast();

  // Employee Selection
  const [isNewEmployee, setIsNewEmployee] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    employees[0]?.id || "",
  );
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpId, setNewEmpId] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDept, setNewEmpDept] = useState<Department>("IT");

  // Template Selection
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    ONBOARDING_TEMPLATES[0].id,
  );

  // Serialized Equipment Configuration
  const [selectedLaptopModel, setSelectedLaptopModel] = useState<AssetCategory>(
    "Laptop - Latitude 5450",
  );
  const [monitorsCount, setMonitorsCount] = useState<number>(0);
  const [monitorType, setMonitorType] = useState<AssetCategory>(
    "Monitor - Dell P2425HE",
  );
  const [includeDock, setIncludeDock] = useState(false);

  // Accessories Checklist
  const [includeBag, setIncludeBag] = useState(true);
  const [includeCharger, setIncludeCharger] = useState(true);
  const [includeHeadset, setIncludeHeadset] = useState(true);
  const [includeKeyboard, setIncludeKeyboard] = useState(false);
  const [includeMouse, setIncludeMouse] = useState(false);
  const [includeCable, setIncludeCable] = useState(false);
  const [cableType, setCableType] = useState("HDMI 2.0 (2m)");

  const currentTemplate =
    ONBOARDING_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    ONBOARDING_TEMPLATES[0];
  const targetLocation: Location = currentTemplate.location;

  // Sync defaults when template changes
  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = ONBOARDING_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    if (tpl.location === "SSC Bangalore") {
      setIncludeBag(true);
      setIncludeCharger(true);
      setIncludeHeadset(true);
      setIncludeKeyboard(false);
      setIncludeMouse(false);
      setIncludeCable(false);
      setMonitorsCount(0);
      setIncludeDock(false);
    } else {
      // Global Template
      setIncludeBag(true);
      setIncludeCharger(true);
      setIncludeHeadset(true);
      setIncludeKeyboard(true);
      setIncludeMouse(true);
      setIncludeCable(true);
      setCableType("HDMI 2.0 (2m)");
      setMonitorsCount(1);
      setMonitorType("Monitor - Dell P2425HE");
      setIncludeDock(true);
    }
  };

  // Find an available laptop of the selected model (or first available in matching location)
  const availableLaptops = assets.filter(
    (a) =>
      a.category === selectedLaptopModel &&
      (a.status === "Available" || a.status === "Returned"),
  );

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const employeeName = isNewEmployee
    ? newEmpName
    : selectedEmployee?.fullName || "";
  const employeeId = isNewEmployee ? newEmpId : selectedEmployee?.id || "";
  const employeeDept = isNewEmployee
    ? newEmpDept
    : selectedEmployee?.department || "IT";

  const handleGenerateAndAssign = () => {
    if (!employeeName || !employeeId) {
      showToast("Please specify the employee details.", "error");
      return;
    }

    // Pick laptop asset to assign
    const laptopToAssign =
      availableLaptops[0] ||
      assets.find((a) => a.category === selectedLaptopModel) ||
      assets[0];

    // Build accessories array
    const accessoriesList: string[] = [];
    if (includeBag) accessoriesList.push("Dell Professional Laptop Bag");
    if (includeCharger) accessoriesList.push("65W USB-C Power Adapter");
    if (includeHeadset) accessoriesList.push("Jabra Evolve2 30 Headset");
    if (includeKeyboard)
      accessoriesList.push("Dell Pro Wireless Keyboard KM5221W");
    if (includeMouse) accessoriesList.push("Dell Pro Wireless Mouse KM5221W");
    if (includeCable) accessoriesList.push(`High-Speed ${cableType}`);
    if (monitorsCount > 0)
      accessoriesList.push(`${monitorsCount}x ${monitorType}`);
    if (includeDock) accessoriesList.push("Dell Performance Dock WD19DCS");

    // Update the in-memory asset
    laptopToAssign.status = "Assigned";
    laptopToAssign.assignedToEmployeeId = employeeId;
    laptopToAssign.assignedToEmployeeName = employeeName;
    laptopToAssign.assignedDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    // Add assignment record
    assignments.unshift({
      id: `ASG-${String(assignments.length + 1).padStart(4, "0")}`,
      assetId: laptopToAssign.id,
      assetName: laptopToAssign.name,
      employeeId,
      employeeName,
      department: employeeDept,
      location: targetLocation,
      assignmentDate: laptopToAssign.assignedDate,
      condition: "Good",
      accessories: accessoriesList,
      remarks: `Provisioned via ${currentTemplate.name}`,
      status: "Active",
    });

    showToast(
      `Kit successfully provisioned for ${employeeName}! Handover form generated.`,
      "success",
    );
    onCompleted?.(laptopToAssign.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asset Provisioning Kit Generator"
      description="Automate employee equipment bundling, assignment, and handover form generation"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<PackageCheck className="h-4 w-4" />}
            onClick={handleGenerateAndAssign}
          >
            Provision Kit & Generate Handover Form
          </Button>
        </>
      }
    >
      <div className="space-y-6 text-slate-100">
        {/* Step 1: Employee Selection */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <User className="h-4 w-4 text-blue-400" />
              1. Employee Recipient
            </h4>
            <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setIsNewEmployee(false)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  !isNewEmployee
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Existing Employee
              </button>
              <button
                type="button"
                onClick={() => setIsNewEmployee(true)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  isNewEmployee
                    ? "bg-blue-600 text-white font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                + New Joiner
              </button>
            </div>
          </div>

          {!isNewEmployee ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Select Employee" required>
                <Select
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                  options={employees.map((e) => ({
                    label: `${e.fullName} (${e.id}) — ${e.department} [${e.location}]`,
                    value: e.id,
                  }))}
                  className="w-full"
                />
              </Field>
              <div className="rounded-lg bg-slate-800 p-3 border border-slate-700 text-xs space-y-1">
                <p className="font-bold text-slate-100">
                  {selectedEmployee?.fullName}
                </p>
                <p className="text-slate-400">
                  {selectedEmployee?.email} • {selectedEmployee?.designation}
                </p>
                <p className="text-blue-400 font-semibold">
                  {selectedEmployee?.department} • {selectedEmployee?.location}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Full Name" required>
                <TextInput
                  value={newEmpName}
                  onChange={setNewEmpName}
                  placeholder="e.g. Ananya Sharma"
                />
              </Field>
              <Field label="Employee ID" required>
                <TextInput
                  value={newEmpId}
                  onChange={setNewEmpId}
                  placeholder="e.g. EMP1050"
                />
              </Field>
              <Field label="Email">
                <TextInput
                  value={newEmpEmail}
                  onChange={setNewEmpEmail}
                  placeholder="ananya.s@company.com"
                />
              </Field>
              <Field label="Department">
                <Select
                  value={newEmpDept}
                  onChange={(v) => setNewEmpDept(v as Department)}
                  options={DEPARTMENTS.map((d) => ({ label: d, value: d }))}
                />
              </Field>
            </div>
          )}
        </section>

        {/* Step 2: Choose Template */}
        <section>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100 mb-3">
            <Sparkles className="h-4 w-4 text-amber-400" />
            2. Choose Provisioning Template
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ONBOARDING_TEMPLATES.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleTemplateChange(tpl.id)}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-950/40 shadow-sm"
                      : "border-slate-700 bg-slate-800/80 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-900/60 px-2 py-0.5 text-[11px] font-bold text-blue-300 mb-1 border border-blue-700/50">
                        <MapPin className="h-3 w-3" />
                        {tpl.location}
                      </span>
                      <h5 className="font-bold text-slate-100 text-sm">
                        {tpl.name}
                      </h5>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 3: Serialized Hardware (Laptops, Monitors, Docks) */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100 mb-3">
            <Laptop className="h-4 w-4 text-blue-400" />
            3. Serialized Hardware Selection
          </h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Laptop Model" required>
              <Select
                value={selectedLaptopModel}
                onChange={(v) => setSelectedLaptopModel(v as AssetCategory)}
                options={[
                  {
                    label: "Dell Latitude 5450 (High Perf)",
                    value: "Laptop - Latitude 5450",
                  },
                  {
                    label: "Dell Latitude 5440 (Standard)",
                    value: "Laptop - Latitude 5440",
                  },
                  {
                    label: "Dell Latitude 5430 (Standard)",
                    value: "Laptop - Latitude 5430",
                  },
                  {
                    label: "Dell Latitude 5420 (Core)",
                    value: "Laptop - Latitude 5420",
                  },
                  {
                    label: "Dell 14 Pro (Pro Series)",
                    value: "Laptop - Dell 14 Pro",
                  },
                ]}
                className="w-full"
              />
            </Field>

            {targetLocation === "Global" && (
              <>
                <Field label="Monitors Included">
                  <Select
                    value={monitorsCount.toString()}
                    onChange={(v) => setMonitorsCount(parseInt(v, 10))}
                    options={[
                      { label: "0 Monitors (Laptop Only)", value: "0" },
                      { label: "1x Monitor", value: "1" },
                      { label: "2x Monitors (Dual Screen)", value: "2" },
                    ]}
                    className="w-full"
                  />
                </Field>

                {monitorsCount > 0 && (
                  <Field label="Monitor Type">
                    <Select
                      value={monitorType}
                      onChange={(v) => setMonitorType(v as AssetCategory)}
                      options={[
                        {
                          label: 'Dell 24" P2425HE USB-C Hub Monitor',
                          value: "Monitor - Dell P2425HE",
                        },
                        {
                          label: 'Dell 24" P2422H Monitor',
                          value: "Monitor - Dell P2422H",
                        },
                        {
                          label: 'Dell 27" USB-C Hub Monitor',
                          value: "Monitor - Hub",
                        },
                      ]}
                      className="w-full"
                    />
                  </Field>
                )}
              </>
            )}
          </div>
        </section>

        {/* Step 4: Kit Accessories (Auto-Bundled) */}
        <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <PackageCheck className="h-4 w-4 text-emerald-400" />
              4. Standard Kit Accessories (Bundled in Handover)
            </h4>
            <span className="text-xs text-slate-400">
              Non-serialized accessories included
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={includeBag}
                onChange={(e) => setIncludeBag(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>💼 Laptop Bag</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={includeCharger}
                onChange={(e) => setIncludeCharger(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>🔌 65W Charger</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={includeHeadset}
                onChange={(e) => setIncludeHeadset(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>🎧 Jabra / Dell Headset</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={includeKeyboard}
                onChange={(e) => setIncludeKeyboard(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>⌨️ Wireless Keyboard</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={includeMouse}
                onChange={(e) => setIncludeMouse(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>🖱️ Optical Mouse</span>
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={includeCable}
                onChange={(e) => setIncludeCable(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>🔀 Display Cable</span>
            </label>

            {targetLocation === "Global" && (
              <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-xs font-medium cursor-pointer hover:bg-slate-700 col-span-2">
                <input
                  type="checkbox"
                  checked={includeDock}
                  onChange={(e) => setIncludeDock(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                />
                <span>⚡ Dell WD19DCS Docking Station</span>
              </label>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
