import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextInput } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { fetchAssetsFromSupabase } from "@/lib/supabaseData";
import { formatCategoryLabel, generateAssetId } from "@/lib/utils";
import type { Asset } from "@/types";

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const categoryOptions = [
  "Laptop - Latitude 5420",
  "Laptop - Latitude 5430",
  "Laptop - Latitude 5440",
  "Laptop - Latitude 5450",
  "Laptop - Dell 14 Pro",
  "Monitor - Dell P2422H",
  "Monitor - Dell P2425HE",
  "Docking Station - WD19DCS",
  "Headset",
  "Keyboard & Mouse",
];
const locationOptions = ["SSC Bangalore", "Global"];
const conditionOptions = ["New", "Good", "Fair", "Damaged"];
const statusOptions = [
  "Available",
  "Assigned",
  "Under Repair",
  "Returned",
  "Reserved",
];

export function AddAssetModal({ open, onClose, onSaved }: AddAssetModalProps) {
  const { showToast } = useToast();
  const [saveAnother, setSaveAnother] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Asset Info
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [assetId, setAssetId] = useState("");
  const [serial, setSerial] = useState("");
  const [serviceTag, setServiceTag] = useState("");

  // Purchase
  const [purchaseDate, setPurchaseDate] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [cost, setCost] = useState("");
  const [po, setPo] = useState("");
  const [invoice, setInvoice] = useState("");

  // Warranty
  const [warrantyStart, setWarrantyStart] = useState("");
  const [warrantyEnd, setWarrantyEnd] = useState("");

  // Location
  const [location, setLocation] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");

  // Condition & Status
  const [condition, setCondition] = useState("New");
  const [status, setStatus] = useState("Available");

  useEffect(() => {
    void fetchAssetsFromSupabase()
      .then(setAssets)
      .catch(() => setAssets([]));
  }, []);

  useEffect(() => {
    if (!category) {
      setAssetId("");
      return;
    }

    setAssetId(
      generateAssetId(
        category,
        assets.map((asset) => asset.id),
        model,
      ),
    );
  }, [category, model, assets]);

  const reset = () => {
    setCategory("");
    setManufacturer("");
    setModel("");
    setAssetId("");
    setSerial("");
    setServiceTag("");
    setPurchaseDate("");
    setVendorId("");
    setCost("");
    setPo("");
    setInvoice("");
    setWarrantyStart("");
    setWarrantyEnd("");
    setLocation("");
    setBuilding("");
    setFloor("");
    setRoom("");
    setCondition("New");
    setStatus("Available");
  };

  const handleSave = () => {
    showToast(
      `Asset saved successfully. ${saveAnother ? "Ready for next entry." : ""}`,
      "success",
    );
    if (saveAnother) {
      reset();
    } else {
      reset();
      onSaved?.();
      onClose();
    }
  };

  const isFormValid = category && manufacturer && model && assetId && location;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New Asset"
      description="Enter the asset details below"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSaveAnother(true);
              handleSave();
            }}
            disabled={!isFormValid}
          >
            Save & Add Another
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setSaveAnother(false);
              handleSave();
            }}
            disabled={!isFormValid}
          >
            Save Asset
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Asset Information */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-100">
            Asset Information
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-slate-100">
            <Field label="Asset Category" required>
              <Select
                value={category}
                onChange={setCategory}
                options={categoryOptions.map((c) => ({
                  label: formatCategoryLabel(c),
                  value: c,
                }))}
                placeholder="Select..."
                className="w-full"
              />
            </Field>
            <Field label="Asset ID" required>
              <TextInput
                value={assetId}
                onChange={() => {}}
                placeholder="Auto-generated"
                className="w-full"
                readOnly
              />
            </Field>
            <Field label="Manufacturer" required>
              <TextInput
                value={manufacturer}
                onChange={setManufacturer}
                placeholder="e.g. Dell"
                className="w-full"
              />
            </Field>
            <Field label="Model" required>
              <TextInput
                value={model}
                onChange={setModel}
                placeholder="e.g. Latitude 5450, Dell 14 Pro, P2425HE"
                className="w-full"
              />
            </Field>
            <Field label="Serial Number">
              <TextInput
                value={serial}
                onChange={setSerial}
                placeholder="e.g. DL54500125 (optional)"
                className="w-full"
              />
            </Field>
            <Field label="Service Tag">
              <TextInput
                value={serviceTag}
                onChange={setServiceTag}
                placeholder="e.g. XYZ5678 (optional)"
                className="w-full"
              />
            </Field>
          </div>
        </section>

        <div className="border-t border-slate-700/60" />

        {/* Purchase Information */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-100">
            Purchase Information
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-slate-100">
            <Field label="Purchase Date">
              <TextInput
                type="date"
                value={purchaseDate}
                onChange={setPurchaseDate}
                className="w-full"
              />
            </Field>
            <Field label="Vendor">
              <Select
                value={vendorId}
                onChange={setVendorId}
                options={[]}
                placeholder="Select vendor..."
                className="w-full"
              />
            </Field>
            <Field label="Purchase Cost">
              <TextInput
                type="number"
                value={cost}
                onChange={setCost}
                placeholder="0"
                className="w-full"
              />
            </Field>
            <Field label="Purchase Order">
              <TextInput
                value={po}
                onChange={setPo}
                placeholder="PO number"
                className="w-full"
              />
            </Field>
            <Field label="Invoice Number">
              <TextInput
                value={invoice}
                onChange={setInvoice}
                placeholder="Invoice number"
                className="w-full"
              />
            </Field>
          </div>
        </section>

        <div className="border-t border-slate-700/60" />

        {/* Warranty */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-100">
            Warranty
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-slate-100">
            <Field label="Warranty Start Date">
              <TextInput
                type="date"
                value={warrantyStart}
                onChange={setWarrantyStart}
                className="w-full"
              />
            </Field>
            <Field label="Warranty End Date">
              <TextInput
                type="date"
                value={warrantyEnd}
                onChange={setWarrantyEnd}
                className="w-full"
              />
            </Field>
          </div>
        </section>

        <div className="border-t border-slate-700/60" />

        {/* Location */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-100">
            Location
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-slate-100">
            <Field label="Location" required>
              <Select
                value={location}
                onChange={setLocation}
                options={locationOptions.map((l) => ({ label: l, value: l }))}
                placeholder="Select..."
                className="w-full"
              />
            </Field>
            <Field label="Building">
              <TextInput
                value={building}
                onChange={setBuilding}
                placeholder="Building A"
                className="w-full"
              />
            </Field>
            <Field label="Floor">
              <TextInput
                value={floor}
                onChange={setFloor}
                placeholder="Floor 1"
                className="w-full"
              />
            </Field>
            <Field label="Room">
              <TextInput
                value={room}
                onChange={setRoom}
                placeholder="Room 101"
                className="w-full"
              />
            </Field>
          </div>
        </section>

        <div className="border-t border-slate-700/60" />

        {/* Condition & Status */}
        <section>
          <h4 className="mb-3 text-sm font-semibold text-slate-100">
            Condition & Status
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-slate-100">
            <Field label="Condition">
              <Select
                value={condition}
                onChange={setCondition}
                options={conditionOptions.map((c) => ({ label: c, value: c }))}
                className="w-full"
              />
            </Field>
            <Field label="Status">
              <Select
                value={status}
                onChange={setStatus}
                options={statusOptions.map((s) => ({ label: s, value: s }))}
                className="w-full"
              />
            </Field>
          </div>
        </section>
      </div>
    </Modal>
  );
}
