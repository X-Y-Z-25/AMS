import { useRef, useState } from "react";
import { Globe, MapPin, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, TextInput, Select } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import {
  assignStockAssetsToEmployee,
  saveEmployeeToSupabase,
} from "@/lib/supabaseData";
import {
  filterStockAssetsForPicker,
  findStockAssetByTag,
  getAssetTagForPicker,
} from "@/lib/assetStockLookup";
import { normalizeServiceTag } from "@/lib/utils";
import { AssetTagCombobox } from "@/components/employees/AssetTagCombobox";
import type { Asset, EmployeeUserType } from "@/types";

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  stockAssets?: Asset[];
}

type Step = "choose" | "form";

type YesNo = "Yes" | "No";

interface EmployeeFormState {
  empId: string;
  sfid: string;
  empName: string;
  email: string;
  phone: string;
  process: string;
  supervisor: string;
  manager: string;
  goLiveDate: string;
  doj: string;
  laptopRequired: YesNo;
  laptopModel: string;
  laptopServiceTag: string;
  headsetRequired: YesNo;
  headsetModel: string;
  headsetServiceTag: string;
  backpackRequired: YesNo;
  backpackModel: string;
  normalMonitorRequired: YesNo;
  normalMonitorModel: string;
  normalMonitorServiceTag: string;
  hubMonitorRequired: YesNo;
  hubMonitorModel: string;
  hubMonitorServiceTag: string;
  dockingStationRequired: YesNo;
  dockingStationModel: string;
  dockingStationServiceTag: string;
  keyboardRequired: YesNo;
  keyboardAssetTag: string;
  mouseRequired: YesNo;
  mouseAssetTag: string;
}

const yesNoOptions = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
];

function getSaveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error !== "object" || error === null) {
    return "Unknown database error.";
  }

  const details = error as {
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    code?: unknown;
  };
  return [details.message, details.details, details.hint, details.code]
    .filter((part): part is string => typeof part === "string" && Boolean(part))
    .join(" ") || "Unknown database error.";
}

const laptopModels = [
  "Laptop - Latitude 5420",
  "Laptop - Latitude 5430",
  "Laptop - Latitude 5440",
  "Laptop - Latitude 5450",
  "Laptop - Dell 14 Pro",
];

const headsetModels = [
  "Dell WH5024",
  "Poly Blackwire 3200",
  "Poly Blackwire 3300",
];

const backpackModels = [
  "Targus Backpack",
  "Eco Loop Backpack",
  "Premium Backpack",
];
const normalMonitorModels = ["Dell P2422H"];
const hubMonitorModels = ["Dell P2425HE"];
const dockingModels = ["WD19DCS"];
const getInitialForm = (): EmployeeFormState => ({
  empId: "",
  sfid: "",
  empName: "",
  email: "",
  phone: "",
  process: "",
  supervisor: "",
  manager: "",
  goLiveDate: "",
  doj: "",
  laptopRequired: "No",
  laptopModel: "",
  laptopServiceTag: "",
  headsetRequired: "No",
  headsetModel: "",
  headsetServiceTag: "",
  backpackRequired: "No",
  backpackModel: "",
  normalMonitorRequired: "No",
  normalMonitorModel: "",
  normalMonitorServiceTag: "",
  hubMonitorRequired: "No",
  hubMonitorModel: "",
  hubMonitorServiceTag: "",
  dockingStationRequired: "No",
  dockingStationModel: "WD19DCS",
  dockingStationServiceTag: "",
  keyboardRequired: "No",
  keyboardAssetTag: "",
  mouseRequired: "No",
  mouseAssetTag: "",
});

export function AddEmployeeModal({
  open,
  onClose,
  onSaved,
  stockAssets = [],
}: AddEmployeeModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("choose");
  const [userType, setUserType] = useState<EmployeeUserType | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(getInitialForm);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const reset = () => {
    setStep("choose");
    setUserType(null);
    setForm(getInitialForm());
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleRequestClose = () => {
    if (!savingRef.current) handleClose();
  };

  const handleChooseType = (type: EmployeeUserType) => {
    setUserType(type);
    setStep("form");
  };

  const updateField = <K extends keyof EmployeeFormState>(
    key: K,
    value: EmployeeFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!userType) return;

    if (!form.empId.trim() || !form.empName.trim() || !form.email.trim()) {
      showToast("Employee ID, Employee Name, and Email are required.", "error");
      return;
    }

    if (form.laptopRequired === "Yes" && !form.laptopModel.trim()) {
      showToast(
        "Please select the laptop model when laptop is assigned.",
        "error",
      );
      return;
    }

    if (form.laptopRequired === "Yes" && !form.laptopServiceTag.trim()) {
      showToast(
        "Please enter the laptop service tag when laptop is assigned.",
        "error",
      );
      return;
    }

    if (
      form.headsetRequired === "Yes" &&
      (!form.headsetModel.trim() || !form.headsetServiceTag.trim())
    ) {
      showToast(
        "Please select the headset model and service tag when headset is assigned.",
        "error",
      );
      return;
    }

    if (form.backpackRequired === "Yes" && !form.backpackModel.trim()) {
      showToast(
        "Please select the backpack model when backpack is assigned.",
        "error",
      );
      return;
    }

    if (
      form.normalMonitorRequired === "Yes" &&
      (!form.normalMonitorModel.trim() || !form.normalMonitorServiceTag.trim())
    ) {
      showToast(
        "Please enter the normal monitor model and service tag when monitor is assigned.",
        "error",
      );
      return;
    }

    if (
      form.hubMonitorRequired === "Yes" &&
      (!form.hubMonitorModel.trim() || !form.hubMonitorServiceTag.trim())
    ) {
      showToast(
        "Please enter the hub monitor model and service tag when hub monitor is assigned.",
        "error",
      );
      return;
    }

    if (
      form.dockingStationRequired === "Yes" &&
      (!form.dockingStationModel.trim() ||
        !form.dockingStationServiceTag.trim())
    ) {
      showToast(
        "Please enter the docking station model and service tag when docking station is assigned.",
        "error",
      );
      return;
    }

    if (form.keyboardRequired === "Yes" && !form.keyboardAssetTag.trim()) {
      showToast(
        "Please select a keyboard asset tag from stock when keyboard is assigned.",
        "error",
      );
      return;
    }

    if (form.mouseRequired === "Yes" && !form.mouseAssetTag.trim()) {
      showToast(
        "Please select a mouse asset tag from stock when mouse is assigned.",
        "error",
      );
      return;
    }

    const assetTagsToAssign: string[] = [];
    const stockChecks: Array<{
      kind:
        | "laptop"
        | "headset"
        | "normalMonitor"
        | "hubMonitor"
        | "docking"
        | "keyboard"
        | "mouse"
        | "bag";
      model: string;
      tag: string;
      label: string;
    }> = [];

    if (form.laptopRequired === "Yes") {
      stockChecks.push({
        kind: "laptop",
        model: form.laptopModel,
        tag: form.laptopServiceTag,
        label: "Laptop",
      });
    }
    if (form.headsetRequired === "Yes") {
      stockChecks.push({
        kind: "headset",
        model: form.headsetModel,
        tag: form.headsetServiceTag,
        label: "Headset",
      });
    }
    if (form.normalMonitorRequired === "Yes") {
      stockChecks.push({
        kind: "normalMonitor",
        model: form.normalMonitorModel,
        tag: form.normalMonitorServiceTag,
        label: "Normal monitor",
      });
    }
    if (form.hubMonitorRequired === "Yes") {
      stockChecks.push({
        kind: "hubMonitor",
        model: form.hubMonitorModel,
        tag: form.hubMonitorServiceTag,
        label: "Hub monitor",
      });
    }
    if (form.dockingStationRequired === "Yes") {
      stockChecks.push({
        kind: "docking",
        model: form.dockingStationModel,
        tag: form.dockingStationServiceTag,
        label: "Docking station",
      });
    }
    if (form.keyboardRequired === "Yes") {
      stockChecks.push({
        kind: "keyboard",
        model: "",
        tag: form.keyboardAssetTag,
        label: "Keyboard",
      });
    }
    if (form.mouseRequired === "Yes") {
      stockChecks.push({
        kind: "mouse",
        model: "",
        tag: form.mouseAssetTag,
        label: "Mouse",
      });
    }
    if (form.backpackRequired === "Yes") {
      stockChecks.push({
        kind: "bag",
        model: form.backpackModel,
        tag: "",
        label: "Bag",
      });
    }

    for (const check of stockChecks) {
      const normalizedTag = normalizeServiceTag(check.tag);
      const match =
        check.kind === "bag"
          ? filterStockAssetsForPicker(stockAssets, "bag", check.model)[0]
          : findStockAssetByTag(
              stockAssets,
              check.kind,
              check.model,
              normalizedTag,
            );
      if (!match) {
        showToast(
          `${check.label}: no available ${check.model || "item"} in stock. Add stock before assigning it.`,
          "error",
        );
        return;
      }
      assetTagsToAssign.push(
        check.kind === "bag"
          ? getAssetTagForPicker(match, "bag")
          : normalizedTag,
      );
    }

    const totalAssignedDevices = stockChecks.length;

    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    try {
      const savedRows = await saveEmployeeToSupabase({
        emp_id: form.empId.trim(),
        full_name: form.empName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.process.trim() || "IT",
        designation: "Employee",
        location: userType === "global" ? "Global" : "SSC Bangalore",
        emp_type: userType,
        sfid: form.sfid.trim(),
        process: form.process.trim(),
        supervisor: form.supervisor.trim(),
        manager: form.manager.trim(),
        go_live_date: form.goLiveDate || undefined,
        doj: form.doj || undefined,
        laptop_required: form.laptopRequired === "Yes",
        laptop_model: form.laptopRequired === "Yes" ? form.laptopModel : "",
        laptop_service_tag:
          form.laptopRequired === "Yes"
            ? normalizeServiceTag(form.laptopServiceTag)
            : "",
        headset_required: form.headsetRequired === "Yes",
        headset_model: form.headsetRequired === "Yes" ? form.headsetModel : "",
        headset_service_tag:
          form.headsetRequired === "Yes"
            ? normalizeServiceTag(form.headsetServiceTag)
            : "",
        backpack_required: form.backpackRequired === "Yes",
        backpack_model:
          form.backpackRequired === "Yes" ? form.backpackModel : "",
        monitor_required:
          form.normalMonitorRequired === "Yes" ||
          form.hubMonitorRequired === "Yes",
        monitor_model:
          form.normalMonitorRequired === "Yes" ? form.normalMonitorModel : "",
        monitor_service_tag:
          form.normalMonitorRequired === "Yes"
            ? normalizeServiceTag(form.normalMonitorServiceTag)
            : "",
        monitor_count: Number(form.normalMonitorRequired === "Yes"),
        hub_monitor_required: form.hubMonitorRequired === "Yes",
        hub_monitor_model:
          form.hubMonitorRequired === "Yes" ? form.hubMonitorModel : "",
        hub_monitor_service_tag:
          form.hubMonitorRequired === "Yes"
            ? normalizeServiceTag(form.hubMonitorServiceTag)
            : "",
        hub_monitor_count: Number(form.hubMonitorRequired === "Yes"),
        docking_station_required: form.dockingStationRequired === "Yes",
        docking_station_model:
          form.dockingStationRequired === "Yes" ? form.dockingStationModel : "",
        docking_station_service_tag:
          form.dockingStationRequired === "Yes"
            ? normalizeServiceTag(form.dockingStationServiceTag)
            : "",
        keyboard_required: form.keyboardRequired === "Yes",
        keyboard_quantity: Number(form.keyboardRequired === "Yes"),
        mouse_required: form.mouseRequired === "Yes",
        mouse_quantity: Number(form.mouseRequired === "Yes"),
        assigned_device_count: totalAssignedDevices,
      });

      const employeeUuid = savedRows?.[0]?.id as string | undefined;
      if (!employeeUuid) {
        throw new Error("The employee record was not returned after saving.");
      }

      if (employeeUuid && assetTagsToAssign.length > 0) {
        try {
          await assignStockAssetsToEmployee({
            employeeUuid,
            assetTags: assetTagsToAssign,
          });
        } catch (error) {
          const assignmentMessage = getSaveErrorMessage(error);
          showToast(
            `Employee saved, but the selected assets could not be assigned: ${assignmentMessage}`,
            "warning",
          );
          await onSaved?.();
          handleClose();
          return;
        }
      }

      showToast("Employee saved to the database successfully.", "success");
      await onSaved?.();
      handleClose();
    } catch (error) {
      showToast(
        `Could not save employee: ${getSaveErrorMessage(error)}`,
        "error",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleRequestClose}
      title={
        step === "choose"
          ? "Add Employee"
          : userType === "global"
            ? "Add Remote Employee"
            : "Add Local Employee"
      }
      description={
        step === "choose"
          ? "Select the employee type. The system will store the record in the Supabase database."
          : "Enter the employee details and asset allocation information. Location is assigned automatically based on the employee type."
      }
      size="xl"
      footer={
        step === "choose" ? (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setStep("choose")}
              disabled={isSaving}
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleRequestClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={isSaving}
            >
              {isSaving ? "Saving Employee..." : "Save Employee"}
            </Button>
          </>
        )
      }
    >
      {step === "choose" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleChooseType("global")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 p-8 text-center transition-all hover:border-blue-500 hover:bg-blue-50/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <Globe className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Remote / Global
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                For remote employees with a full hardware kit.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleChooseType("local")}
            className="group flex flex-col items-center gap-4 rounded-xl border-2 border-gray-200 p-8 text-center transition-all hover:border-emerald-500 hover:bg-emerald-50/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition-colors">
              <MapPin className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Local</h3>
              <p className="mt-1 text-sm text-gray-500">
                For on-site SSC Bangalore employees.
              </p>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Employee ID" required>
              <TextInput
                value={form.empId}
                onChange={(v) => updateField("empId", v)}
                placeholder="Enter EMP ID"
              />
            </Field>
            <Field label="SAP ID">
              <TextInput
                value={form.sfid}
                onChange={(v) => updateField("sfid", v)}
                placeholder="Enter SAP ID"
              />
            </Field>
            <Field label="Employee Name" required>
              <TextInput
                value={form.empName}
                onChange={(v) => updateField("empName", v)}
                placeholder="Enter employee name"
              />
            </Field>
            <Field label="Email ID" required>
              <TextInput
                type="email"
                value={form.email}
                onChange={(v) => updateField("email", v)}
                placeholder="name@company.com"
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={form.phone}
                onChange={(v) => updateField("phone", v)}
                placeholder="Contact number"
              />
            </Field>
            <Field label="Process">
              <TextInput
                value={form.process}
                onChange={(v) => updateField("process", v)}
                placeholder="Process / team"
              />
            </Field>
            <Field label="Supervisor">
              <TextInput
                value={form.supervisor}
                onChange={(v) => updateField("supervisor", v)}
                placeholder="Supervisor name"
              />
            </Field>
            <Field label="Manager">
              <TextInput
                value={form.manager}
                onChange={(v) => updateField("manager", v)}
                placeholder="Manager name"
              />
            </Field>
            <Field label="Go-Live Date">
              <TextInput
                type="date"
                value={form.goLiveDate}
                onChange={(v) => updateField("goLiveDate", v)}
              />
            </Field>
            <Field label="DOJ">
              <TextInput
                type="date"
                value={form.doj}
                onChange={(v) => updateField("doj", v)}
              />
            </Field>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-300">
              Asset Allocation
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Laptop">
                <Select
                  value={form.laptopRequired}
                  onChange={(v) => updateField("laptopRequired", v as YesNo)}
                  options={yesNoOptions}
                />
              </Field>
              {form.laptopRequired === "Yes" && (
                <>
                  <Field label="Laptop Model">
                    <Select
                      value={form.laptopModel}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          laptopModel: v,
                          laptopServiceTag: "",
                        }))
                      }
                      options={laptopModels.map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      placeholder="Select model"
                    />
                  </Field>
                  <Field
                    label="Laptop Service Tag"
                    hint="Type a few characters to pick from stock for the selected model."
                  >
                    <AssetTagCombobox
                      value={form.laptopServiceTag}
                      onChange={(v) => updateField("laptopServiceTag", v)}
                      assets={stockAssets}
                      kind="laptop"
                      model={form.laptopModel}
                      placeholder="Search service tag"
                      disabled={!form.laptopModel}
                    />
                  </Field>
                </>
              )}

              <Field label="Headset">
                <Select
                  value={form.headsetRequired}
                  onChange={(v) => updateField("headsetRequired", v as YesNo)}
                  options={yesNoOptions}
                />
              </Field>
              {form.headsetRequired === "Yes" && (
                <>
                  <Field label="Headset Model">
                    <Select
                      value={form.headsetModel}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          headsetModel: v,
                          headsetServiceTag: "",
                        }))
                      }
                      options={headsetModels.map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      placeholder="Select headset model"
                    />
                  </Field>
                  <Field label="Headset Service Tag">
                    <AssetTagCombobox
                      value={form.headsetServiceTag}
                      onChange={(v) => updateField("headsetServiceTag", v)}
                      assets={stockAssets}
                      kind="headset"
                      model={form.headsetModel}
                      placeholder="Search service tag"
                      disabled={!form.headsetModel}
                    />
                  </Field>
                </>
              )}

              <Field label="Backpack">
                <Select
                  value={form.backpackRequired}
                  onChange={(v) => updateField("backpackRequired", v as YesNo)}
                  options={yesNoOptions}
                />
              </Field>
              {form.backpackRequired === "Yes" && (
                <Field label="Backpack Model">
                  <Select
                    value={form.backpackModel}
                    onChange={(v) => updateField("backpackModel", v)}
                    options={backpackModels.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                    placeholder="Select backpack"
                  />
                </Field>
              )}

              <Field label="Normal Monitor">
                <Select
                  value={form.normalMonitorRequired}
                  onChange={(v) =>
                    updateField("normalMonitorRequired", v as YesNo)
                  }
                  options={yesNoOptions}
                />
              </Field>
              {form.normalMonitorRequired === "Yes" && (
                <>
                  <Field label="Normal Monitor Model">
                    <Select
                      value={form.normalMonitorModel}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          normalMonitorModel: v,
                          normalMonitorServiceTag: "",
                        }))
                      }
                      options={normalMonitorModels.map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      placeholder="Select normal monitor model"
                    />
                  </Field>
                  <Field label="Normal Monitor Service Tag">
                    <AssetTagCombobox
                      value={form.normalMonitorServiceTag}
                      onChange={(v) =>
                        updateField("normalMonitorServiceTag", v)
                      }
                      assets={stockAssets}
                      kind="normalMonitor"
                      model={form.normalMonitorModel}
                      placeholder="Search service tag"
                      disabled={!form.normalMonitorModel}
                    />
                  </Field>
                </>
              )}

              <Field label="Hub Monitor">
                <Select
                  value={form.hubMonitorRequired}
                  onChange={(v) =>
                    updateField("hubMonitorRequired", v as YesNo)
                  }
                  options={yesNoOptions}
                />
              </Field>
              {form.hubMonitorRequired === "Yes" && (
                <>
                  <Field label="Hub Monitor Model">
                    <Select
                      value={form.hubMonitorModel}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          hubMonitorModel: v,
                          hubMonitorServiceTag: "",
                        }))
                      }
                      options={hubMonitorModels.map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      placeholder="Select hub monitor model"
                    />
                  </Field>
                  <Field label="Hub Monitor Service Tag">
                    <AssetTagCombobox
                      value={form.hubMonitorServiceTag}
                      onChange={(v) => updateField("hubMonitorServiceTag", v)}
                      assets={stockAssets}
                      kind="hubMonitor"
                      model={form.hubMonitorModel}
                      placeholder="Search service tag"
                      disabled={!form.hubMonitorModel}
                    />
                  </Field>
                </>
              )}

              <Field label="Docking Station">
                <Select
                  value={form.dockingStationRequired}
                  onChange={(v) =>
                    updateField("dockingStationRequired", v as YesNo)
                  }
                  options={yesNoOptions}
                />
              </Field>
              {form.dockingStationRequired === "Yes" && (
                <>
                  <Field label="Docking Station Model">
                    <Select
                      value={form.dockingStationModel}
                      onChange={(v) =>
                        setForm((prev) => ({
                          ...prev,
                          dockingStationModel: v,
                          dockingStationServiceTag: "",
                        }))
                      }
                      options={dockingModels.map((item) => ({
                        label: item,
                        value: item,
                      }))}
                      placeholder="Select docking station model"
                    />
                  </Field>
                  <Field label="Docking Station Service Tag">
                    <AssetTagCombobox
                      value={form.dockingStationServiceTag}
                      onChange={(v) =>
                        updateField("dockingStationServiceTag", v)
                      }
                      assets={stockAssets}
                      kind="docking"
                      model={form.dockingStationModel}
                      placeholder="Search service tag"
                      disabled={!form.dockingStationModel}
                    />
                  </Field>
                </>
              )}

              <Field label="Keyboard">
                <Select
                  value={form.keyboardRequired}
                  onChange={(v) => updateField("keyboardRequired", v as YesNo)}
                  options={yesNoOptions}
                />
              </Field>
              {form.keyboardRequired === "Yes" && (
                <Field label="Keyboard Asset Tag">
                  <AssetTagCombobox
                    value={form.keyboardAssetTag}
                    onChange={(v) => updateField("keyboardAssetTag", v)}
                    assets={stockAssets}
                    kind="keyboard"
                    model=""
                    placeholder="Search KEY- tag"
                  />
                </Field>
              )}

              <Field label="Mouse">
                <Select
                  value={form.mouseRequired}
                  onChange={(v) => updateField("mouseRequired", v as YesNo)}
                  options={yesNoOptions}
                />
              </Field>
              {form.mouseRequired === "Yes" && (
                <Field label="Mouse Asset Tag">
                  <AssetTagCombobox
                    value={form.mouseAssetTag}
                    onChange={(v) => updateField("mouseAssetTag", v)}
                    assets={stockAssets}
                    kind="mouse"
                    model=""
                    placeholder="Search MOS- tag"
                  />
                </Field>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
