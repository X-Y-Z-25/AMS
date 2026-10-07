import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput, TextArea } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  assignStockAssetsToEmployee,
  fetchAssetsFromSupabase,
  fetchEmployeesFromSupabase,
  returnAssetsToStock,
  transferAssetsToEmployee,
} from "@/lib/supabaseData";
import {
  getInitials,
  classNames,
  formatCategoryLabel,
  formatSerialDisplay,
} from "@/lib/utils";
import type { Asset, AssetCondition, Employee, Vendor } from "@/types";

const vendors: Vendor[] = [];
const CONDITIONS: string[] = ["New", "Good", "Fair", "Damaged"];
const DISPOSAL_REASONS: string[] = [];
const DISPOSAL_METHODS: string[] = [];

const getAsset = (assets: Asset[], assetId: string) =>
  assets.find((item) => item.id === assetId) ?? null;

export type AssetAction =
  | "assign"
  | "transfer"
  | "return"
  | "repair"
  | "dispose"
  | "retire";

interface AssetActionDialogsProps {
  action: { type: AssetAction; assetId: string } | null;
  onClose: () => void;
  onComplete: () => void;
}

const accessoriesOptions = [
  "Laptop",
  "Monitor - 24 inch",
  "Hub Monitor - 24 inch",
  "Docking Station",
];

function AccessoryCheckbox({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (a: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {accessoriesOptions.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onToggle(a)}
          className={classNames(
            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            selected.includes(a)
              ? "border-blue-500 bg-blue-900/40 text-blue-300"
              : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200",
          )}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

export function AssetActionDialogs({
  action,
  onClose,
  onComplete,
}: AssetActionDialogsProps) {
  const { showToast } = useToast();
  const [confirmDispose, setConfirmDispose] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [isSavingTransfer, setIsSavingTransfer] = useState(false);
  const [isSavingReturn, setIsSavingReturn] = useState(false);

  // Assign state
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const [assignCondition, setAssignCondition] = useState("Good");
  const [assignAccessories, setAssignAccessories] = useState<string[]>([]);
  const [assignRemarks, setAssignRemarks] = useState("");
  const [assignDate, setAssignDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Transfer state
  const [transferToEmployeeId, setTransferToEmployeeId] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [transferReason, setTransferReason] = useState("Temp Allocation");
  const [transferItemsChoice, setTransferItemsChoice] = useState<
    Record<string, "Yes" | "No">
  >({});

  // Return state
  const [returnCondition, setReturnCondition] = useState("Good");
  const [returnAccessories, setReturnAccessories] = useState<string[]>([]);
  const [returnMissing, setReturnMissing] = useState<string[]>([]);
  const [returnDamage, setReturnDamage] = useState("");
  const [returnRemarks, setReturnRemarks] = useState("");
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [returnItemsChoice, setReturnItemsChoice] = useState<
    Record<string, "Yes" | "No">
  >({});

  // Repair state
  const [repairIssue, setRepairIssue] = useState("");
  const [repairVendorId, setRepairVendorId] = useState("");
  const [repairExpectedReturn, setRepairExpectedReturn] = useState("");
  const [repairCost, setRepairCost] = useState("");
  const [repairDate, setRepairDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Dispose state
  const [disposeReason, setDisposeReason] = useState("");
  const [disposeMethod, setDisposeMethod] = useState("");
  const [disposeApprovedBy, setDisposeApprovedBy] = useState("IT Manager");
  const [disposeRemarks, setDisposeRemarks] = useState("");
  const [disposeDate, setDisposeDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    if (!action) return;
    let active = true;
    Promise.all([fetchAssetsFromSupabase(), fetchEmployeesFromSupabase()])
      .then(([nextAssets, nextEmployees]) => {
        if (!active) return;
        setAssets(nextAssets);
        setEmployees(nextEmployees);
      })
      .catch((error) => {
        console.error("Could not load operation data:", error);
        if (active) showToast("Could not load employees and stock for this operation.", "error");
      });
    return () => {
      active = false;
    };
  }, [action, showToast]);

  const targetAsset = action ? getAsset(assets, action.assetId) : undefined;
  const currentOwnerId = targetAsset?.assignedToEmployeeId;

  // Find all devices owned by current employee for multi-item transfer
  const currentEmpDevices = useMemo(
    () =>
      targetAsset && currentOwnerId
        ? assets.filter((asset) => asset.assignedToEmployeeId === currentOwnerId)
        : targetAsset
          ? [targetAsset]
          : [],
    [assets, currentOwnerId, targetAsset],
  );

  // Initialize transfer choices when transfer modal opens
  useEffect(() => {
    if (action?.type === "transfer" && targetAsset) {
      const initialChoices: Record<string, "Yes" | "No"> = {};
      currentEmpDevices.forEach((dev) => {
        initialChoices[dev.id] = "Yes";
      });
      setTransferItemsChoice(initialChoices);
    }

    if (action?.type === "return" && targetAsset) {
      const initialChoices: Record<string, "Yes" | "No"> = {};
      currentEmpDevices.forEach((dev) => {
        initialChoices[dev.id] = "Yes";
      });
      setReturnItemsChoice(initialChoices);
    }
  }, [action, currentEmpDevices, targetAsset]);

  if (!action || !targetAsset) return null;

  const workingEmployees = employees.filter((employee) => employee.status === "Working");
  const employeeOptions = workingEmployees.map((e) => ({
    label: `${e.fullName} (${e.id})`,
    value: e.id,
  }));
  const vendorOptions = vendors.map((v) => ({ label: v.name, value: v.id }));
  const conditionOptions = CONDITIONS.map((c) => ({ label: c, value: c }));

  const toggleAccessory = (
    list: string[],
    setList: (v: string[]) => void,
    item: string,
  ) => {
    setList(
      list.includes(item) ? list.filter((a) => a !== item) : [...list, item],
    );
  };

  const resetState = () => {
    setAssignEmployeeId("");
    setAssignCondition("Good");
    setAssignAccessories([]);
    setAssignRemarks("");
    setTransferToEmployeeId("");
    setTransferReason("Temp Allocation");
    setTransferItemsChoice({});
    setReturnCondition("Good");
    setReturnAccessories([]);
    setReturnMissing([]);
    setReturnDamage("");
    setReturnRemarks("");
    setReturnItemsChoice({});
    setRepairIssue("");
    setRepairVendorId("");
    setRepairExpectedReturn("");
    setRepairCost("");
    setDisposeReason("");
    setDisposeMethod("");
    setDisposeRemarks("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const selectedTargetEmp =
    action.type === "transfer"
      ? transferToEmployeeId.trim()
        ? (workingEmployees.find(
            (e) =>
              e.id.toLowerCase() === transferToEmployeeId.trim().toLowerCase(),
          ) ??
          workingEmployees.find((e) =>
            e.id
              .toLowerCase()
              .includes(transferToEmployeeId.trim().toLowerCase()),
          ))
        : undefined
      : workingEmployees.find((e) => e.id === assignEmployeeId);

  const handleConfirmAssignment = async () => {
    if (!selectedTargetEmp || !targetAsset) return;
    if (!selectedTargetEmp._uuid) {
      showToast("This employee is not available in the database for assignment.", "error");
      return;
    }
    if (!["Available", "Returned", "Reserved"].includes(targetAsset.status)) {
      showToast("This asset is not available in stock and cannot be assigned.", "error");
      return;
    }

    setIsSavingAssignment(true);
    try {
      await assignStockAssetsToEmployee({
        employeeUuid: selectedTargetEmp._uuid,
        assetTags: [targetAsset.id],
      });
      const [nextAssets, nextEmployees] = await Promise.all([
        fetchAssetsFromSupabase(),
        fetchEmployeesFromSupabase(),
      ]);
      setAssets(nextAssets);
      setEmployees(nextEmployees);
      showToast(
        `Asset ${targetAsset.id} assigned successfully to ${selectedTargetEmp.fullName}.`,
        "success",
      );
      resetState();
      onComplete();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Asset assignment failed.";
      showToast(message, "error");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  // ===== ASSIGN =====
  if (action.type === "assign") {
    return (
      <Modal
        open
        onClose={handleClose}
        title="Assign Asset"
        description={`${targetAsset.name} (${targetAsset.model}) · ${targetAsset.id}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={
                !assignEmployeeId ||
                isSavingAssignment ||
                !["Available", "Returned", "Reserved"].includes(targetAsset.status)
              }
              onClick={() => void handleConfirmAssignment()}
            >
              {isSavingAssignment ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-slate-100">
          {!['Available', 'Returned', 'Reserved'].includes(targetAsset.status) && (
            <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 text-sm text-amber-200">
              This asset is not available in stock and cannot be assigned.
            </div>
          )}
          {employees.length === 0 && (
            <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 text-sm text-amber-200">
              No employees are available for assignment.
            </div>
          )}
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Model:</span>{" "}
                <span className="font-semibold text-slate-100">
                  {targetAsset.model}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Serial:</span>{" "}
                <span className="font-mono text-slate-200">
                  {formatSerialDisplay(targetAsset.serialNumber)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Service Tag:</span>{" "}
                <span className="font-mono text-amber-400">
                  {targetAsset.serviceTag}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Category:</span>{" "}
                <span className="font-semibold text-slate-200">
                  {formatCategoryLabel(targetAsset.category)}
                </span>
              </div>
            </div>
          </div>

          <Field label="Select Employee" required>
            <Select
              value={assignEmployeeId}
              onChange={setAssignEmployeeId}
              options={employeeOptions}
              placeholder="Choose employee..."
              className="w-full"
            />
          </Field>

          {selectedTargetEmp && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-950/40 p-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedTargetEmp.avatarColor} text-white text-sm font-semibold`}
              >
                {getInitials(selectedTargetEmp.fullName)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {selectedTargetEmp.fullName}
                </p>
                <p className="text-xs text-slate-400">
                  ID: {selectedTargetEmp.id} · {selectedTargetEmp.department} ·{" "}
                  {selectedTargetEmp.location}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Assignment Date" required>
              <TextInput
                type="date"
                value={assignDate}
                onChange={setAssignDate}
                className="w-full"
              />
            </Field>
            <Field label="Condition" required>
              <Select
                value={assignCondition}
                onChange={setAssignCondition}
                options={conditionOptions}
                className="w-full"
              />
            </Field>
          </div>

          <Field label="Accessories Included">
            <AccessoryCheckbox
              selected={assignAccessories}
              onToggle={(a) =>
                toggleAccessory(assignAccessories, setAssignAccessories, a)
              }
            />
          </Field>

          <Field label="Remarks">
            <TextArea
              value={assignRemarks}
              onChange={setAssignRemarks}
              placeholder="Additional notes..."
            />
          </Field>
        </div>
      </Modal>
    );
  }

  // ===== TRANSFER =====
  if (action.type === "transfer") {
    const currentEmp = employees.find(
      (e) =>
        e.id === targetAsset.assignedToEmployeeId ||
        e._uuid === targetAsset.assignedToEmployeeUuid,
    );

    const handleConfirmTransfer = async () => {
      if (!selectedTargetEmp || !currentEmp?._uuid || !selectedTargetEmp._uuid) {
        showToast("Select a Working employee and verify the current owner.", "error");
        return;
      }

      const itemsToTransfer = currentEmpDevices.filter(
        (d) => transferItemsChoice[d.id] === "Yes",
      );
      if (!itemsToTransfer.length) {
        showToast("Select at least one device to transfer.", "warning");
        return;
      }

      setIsSavingTransfer(true);
      try {
        await transferAssetsToEmployee({
          assetTags: itemsToTransfer.map((item) => item.id),
          fromEmployeeUuid: currentEmp._uuid,
          toEmployeeUuid: selectedTargetEmp._uuid,
          toLocation: selectedTargetEmp.location,
          transferDate,
          reason: transferReason,
        });
        const [nextAssets, nextEmployees] = await Promise.all([
          fetchAssetsFromSupabase(),
          fetchEmployeesFromSupabase(),
        ]);
        setAssets(nextAssets);
        setEmployees(nextEmployees);
        showToast(
          `Successfully transferred ${itemsToTransfer.length} asset(s) to ${selectedTargetEmp.fullName} (${selectedTargetEmp.id}).`,
          "success",
        );
        resetState();
        onComplete();
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Asset transfer failed.";
        showToast(message, "error");
      } finally {
        setIsSavingTransfer(false);
      }
    };

    return (
      <Modal
        open
        onClose={handleClose}
        title="Transfer Asset"
        description={`${targetAsset.model} · ${targetAsset.id}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedTargetEmp || isSavingTransfer}
              onClick={() => void handleConfirmTransfer()}
            >
              {isSavingTransfer ? "Transferring..." : "Confirm Transfer"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-slate-100">
          <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/90 p-4">
            <Field label="Employee ID" required>
              <TextInput
                value={transferToEmployeeId}
                onChange={setTransferToEmployeeId}
                placeholder="Type employee ID e.g. EMP1025"
                className="w-full"
              />
            </Field>

            {selectedTargetEmp ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${selectedTargetEmp.avatarColor} text-white font-bold text-sm shadow-md`}
                >
                  {getInitials(selectedTargetEmp.fullName)}
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-300">
                    {selectedTargetEmp.fullName}{" "}
                    <span className="text-xs text-emerald-400 font-mono">
                      ({selectedTargetEmp.id})
                    </span>
                  </p>
                  <p className="text-xs text-slate-300">
                    Dept:{" "}
                    <strong className="text-slate-100">
                      {selectedTargetEmp.department}
                    </strong>{" "}
                    · Location:{" "}
                    <strong className="text-slate-100">
                      {selectedTargetEmp.location}
                    </strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-2.5 text-center text-xs text-slate-400">
                Type a valid employee ID to auto-display the employee name.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Transfer Date" required>
              <TextInput
                type="date"
                value={transferDate}
                onChange={setTransferDate}
                className="w-full"
              />
            </Field>
            <Field label="Reason for Transfer" required>
              <Select
                value={transferReason}
                onChange={setTransferReason}
                options={[
                  { label: "Temp Allocation", value: "Temp Allocation" },
                  { label: "Other", value: "Other" },
                ]}
                className="w-full"
              />
            </Field>
          </div>

          {/* Current Employee Assigned Devices Selection List */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Current Devices to Transfer from{" "}
              {currentEmp?.fullName || "Current Employee"}:
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              {currentEmpDevices.map((dev) => {
                const choice = transferItemsChoice[dev.id] || "Yes";
                return (
                  <div
                    key={dev.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/80 p-2.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-100">
                        {dev.model}{" "}
                        <span className="font-mono text-[11px] text-blue-400">
                          ({dev.id})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        ST:{" "}
                        <span className="font-mono text-amber-400">
                          {dev.serviceTag}
                        </span>{" "}
                        · Category: {dev.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium">
                        Transfer?
                      </span>
                      <select
                        value={choice}
                        onChange={(e) =>
                          setTransferItemsChoice((prev) => ({
                            ...prev,
                            [dev.id]: e.target.value as "Yes" | "No",
                          }))
                        }
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-100 focus:border-blue-500"
                      >
                        <option
                          value="Yes"
                          className="bg-slate-900 text-emerald-400 font-bold"
                        >
                          Yes
                        </option>
                        <option
                          value="No"
                          className="bg-slate-900 text-rose-400 font-bold"
                        >
                          No
                        </option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // ===== RETURN =====
  if (action.type === "return") {
    const currentEmp = employees.find(
      (e) =>
        e.id === targetAsset.assignedToEmployeeId ||
        e._uuid === targetAsset.assignedToEmployeeUuid,
    );
    const employeeAssets =
      currentEmp && currentOwnerId
        ? assets.filter(
            (asset) => asset.assignedToEmployeeId === currentOwnerId,
          )
        : [targetAsset];

    const handleConfirmReturn = async () => {
      const itemsToReturn = employeeAssets.filter(
        (asset) => returnItemsChoice[asset.id] !== "No",
      );

      if (itemsToReturn.length === 0) {
        showToast(
          "No asset selected for return. Please choose at least one item.",
          "warning",
        );
        return;
      }

      const employeeUuid = currentEmp?._uuid ?? targetAsset.assignedToEmployeeUuid;
      if (!employeeUuid) {
        showToast("The current employee could not be located in the database.", "error");
        return;
      }

      const returnNotes = [
        returnRemarks.trim(),
        returnAccessories.length ? `Returned: ${returnAccessories.join(", ")}` : "",
        returnMissing.length ? `Missing: ${returnMissing.join(", ")}` : "",
        returnDamage.trim() ? `Damage: ${returnDamage.trim()}` : "",
      ].filter(Boolean).join(" | ");

      setIsSavingReturn(true);
      try {
        await returnAssetsToStock({
          assetTags: itemsToReturn.map((asset) => asset.id),
          employeeUuid,
          returnDate,
          condition: returnCondition as AssetCondition,
          remarks: returnNotes,
        });
        const [nextAssets, nextEmployees] = await Promise.all([
          fetchAssetsFromSupabase(),
          fetchEmployeesFromSupabase(),
        ]);
        setAssets(nextAssets);
        setEmployees(nextEmployees);
        showToast(
          `${itemsToReturn.length} asset(s) returned successfully and restocked into Available Stock.`,
          "success",
        );
        resetState();
        onComplete();
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Asset return failed.";
        showToast(message, "error");
      } finally {
        setIsSavingReturn(false);
      }
    };

    return (
      <Modal
        open
        onClose={handleClose}
        title="Return Assets to Stock"
        description={`${currentEmp?.fullName || targetAsset.assignedToEmployeeName || "Employee"} · ${currentEmp?.id || targetAsset.assignedToEmployeeId || "EMP"}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSavingReturn}
              onClick={() => void handleConfirmReturn()}
            >
              {isSavingReturn ? "Returning..." : "Confirm & Return to Stock"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-slate-100">
          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Employee:</span>{" "}
                <span className="font-semibold text-slate-100">
                  {currentEmp?.fullName ||
                    targetAsset.assignedToEmployeeName ||
                    "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Employee ID:</span>{" "}
                <span className="font-mono text-amber-400">
                  {currentEmp?.id || targetAsset.assignedToEmployeeId || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Location:</span>{" "}
                <span className="font-semibold text-slate-200">
                  {targetAsset.location}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Assets to Review:</span>{" "}
                <span className="font-semibold text-slate-100">
                  {employeeAssets.length}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Return Date" required>
              <TextInput
                type="date"
                value={returnDate}
                onChange={setReturnDate}
                className="w-full"
              />
            </Field>
            <Field label="Return Condition" required>
              <Select
                value={returnCondition}
                onChange={setReturnCondition}
                options={conditionOptions}
                className="w-full"
              />
            </Field>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select assets to return from{" "}
              {currentEmp?.fullName || "this employee"}:
            </label>
            <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              {employeeAssets.map((asset) => {
                const choice = returnItemsChoice[asset.id] || "Yes";
                return (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-800/80 p-2.5"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-100">
                        {asset.model}{" "}
                        <span className="font-mono text-[11px] text-blue-400">
                          ({asset.id})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        ST:{" "}
                        <span className="font-mono text-amber-400">
                          {asset.serviceTag}
                        </span>{" "}
                        · Type: {formatCategoryLabel(asset.category)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300 font-medium">
                        Return?
                      </span>
                      <select
                        value={choice}
                        onChange={(e) =>
                          setReturnItemsChoice((prev) => ({
                            ...prev,
                            [asset.id]: e.target.value as "Yes" | "No",
                          }))
                        }
                        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-100 focus:border-blue-500"
                      >
                        <option
                          value="Yes"
                          className="bg-slate-900 text-emerald-400 font-bold"
                        >
                          Yes
                        </option>
                        <option
                          value="No"
                          className="bg-slate-900 text-rose-400 font-bold"
                        >
                          No
                        </option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="Accessories Returned">
            <AccessoryCheckbox
              selected={returnAccessories}
              onToggle={(a) =>
                toggleAccessory(returnAccessories, setReturnAccessories, a)
              }
            />
          </Field>

          <Field label="Missing Accessories">
            <AccessoryCheckbox
              selected={returnMissing}
              onToggle={(a) =>
                toggleAccessory(returnMissing, setReturnMissing, a)
              }
            />
          </Field>

          <Field label="Damage Details (If Any)">
            <TextArea
              value={returnDamage}
              onChange={setReturnDamage}
              placeholder="Describe any scratches or physical damage..."
            />
          </Field>

          <Field label="Remarks">
            <TextArea
              value={returnRemarks}
              onChange={setReturnRemarks}
              placeholder="Additional notes..."
            />
          </Field>

          <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-3">
            <p className="text-xs font-semibold text-emerald-300">
              Selected items will be marked as{" "}
              <strong className="underline">Available</strong> and appear again
              in the stock list.
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  // ===== REPAIR =====
  if (action.type === "repair") {
    return (
      <Modal
        open
        onClose={handleClose}
        title="Send for Repair"
        description={`${targetAsset.model} · ${targetAsset.id}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!repairIssue || !repairVendorId}
              onClick={() => {
                targetAsset.status = "Under Repair";
                targetAsset.history.push({
                  id: `H-RPR-${Date.now()}`,
                  date: repairDate,
                  action: "Sent for Repair",
                  performedBy: "IT Admin",
                  details: repairIssue,
                });
                showToast(
                  `Asset ${targetAsset.id} sent for repair. Issue: ${repairIssue}.`,
                  "success",
                );
                resetState();
                onComplete();
                onClose();
              }}
            >
              Send for Repair
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-slate-100">
          <Field label="Issue Description" required>
            <TextArea
              value={repairIssue}
              onChange={setRepairIssue}
              placeholder="Describe the issue..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Repair Vendor" required>
              <Select
                value={repairVendorId}
                onChange={setRepairVendorId}
                options={vendorOptions}
                placeholder="Choose vendor..."
                className="w-full"
              />
            </Field>
            <Field label="Sent Date" required>
              <TextInput
                type="date"
                value={repairDate}
                onChange={setRepairDate}
                className="w-full"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected Return Date">
              <TextInput
                type="date"
                value={repairExpectedReturn}
                onChange={setRepairExpectedReturn}
                className="w-full"
              />
            </Field>
            <Field label="Estimated Cost">
              <TextInput
                type="number"
                value={repairCost}
                onChange={setRepairCost}
                placeholder="0"
                className="w-full"
              />
            </Field>
          </div>
        </div>
      </Modal>
    );
  }

  // ===== DISPOSE =====
  if (action.type === "dispose") {
    return (
      <>
        <Modal
          open
          onClose={handleClose}
          title="Dispose Asset"
          description={`${targetAsset.model} · ${targetAsset.id}`}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!disposeReason || !disposeMethod}
                onClick={() => setConfirmDispose(true)}
              >
                Submit for Approval
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-slate-100">
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3">
              <p className="text-xs font-semibold text-red-300">
                Warning: This action marks the asset for disposal. It requires
                approval before final disposal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Disposal Date" required>
                <TextInput
                  type="date"
                  value={disposeDate}
                  onChange={setDisposeDate}
                  className="w-full"
                />
              </Field>
              <Field label="Reason" required>
                <Select
                  value={disposeReason}
                  onChange={setDisposeReason}
                  options={DISPOSAL_REASONS.map((r) => ({
                    label: r,
                    value: r,
                  }))}
                  placeholder="Choose reason..."
                  className="w-full"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Disposal Method" required>
                <Select
                  value={disposeMethod}
                  onChange={setDisposeMethod}
                  options={DISPOSAL_METHODS.map((m) => ({
                    label: m,
                    value: m,
                  }))}
                  placeholder="Choose method..."
                  className="w-full"
                />
              </Field>
              <Field label="Approved By" required>
                <TextInput
                  value={disposeApprovedBy}
                  onChange={setDisposeApprovedBy}
                  className="w-full"
                />
              </Field>
            </div>

            <Field label="Remarks">
              <TextArea
                value={disposeRemarks}
                onChange={setDisposeRemarks}
                placeholder="Additional notes..."
              />
            </Field>
          </div>
        </Modal>
        <ConfirmDialog
          open={confirmDispose}
          onClose={() => setConfirmDispose(false)}
          onConfirm={() => {
            targetAsset.status = "Disposed";
            showToast(
              `Disposal request submitted for asset ${targetAsset.id}. Pending approval.`,
              "success",
            );
            resetState();
            onComplete();
            onClose();
          }}
          title="Confirm Disposal"
          message={`Are you sure you want to dispose of ${targetAsset.name} (${targetAsset.id})? This action will be submitted for approval.`}
          confirmLabel="Confirm Disposal"
        />
      </>
    );
  }

  // ===== RETIRE =====
  if (action.type === "retire") {
    return (
      <ConfirmDialog
        open
        onClose={handleClose}
        onConfirm={() => {
          targetAsset.status = "Retired";
          showToast(`Asset ${targetAsset.id} has been retired.`, "success");
          resetState();
          onComplete();
          onClose();
        }}
        title="Retire Asset"
        message={`Are you sure you want to retire ${targetAsset.name} (${targetAsset.id})? Retired assets can be disposed of later.`}
        confirmLabel="Retire Asset"
        variant="primary"
      />
    );
  }

  return null;
}
