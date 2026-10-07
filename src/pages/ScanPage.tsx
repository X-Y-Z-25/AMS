import { useState } from "react";
import {
  ScanLine,
  Search,
  Laptop,
  MapPin,
  User,
  Wrench,
  Trash2,
  ArrowLeftRight,
  Undo2,
  UserCheck,
  Eye,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, ConditionBadge } from "@/components/ui/StatusBadges";
import { useToast } from "@/components/ui/Toast";
import type { AssetAction } from "@/components/assets/AssetActionDialogs";
import type { PageKey } from "@/components/layout/Sidebar";

const getAsset = (query: string) => null;
const getEmployee = (employeeId?: string) => null;

interface ScanPageProps {
  onAssetSelect: (id: string) => void;
  onAction: (action: AssetAction, assetId: string) => void;
  onNavigate: (page: PageKey) => void;
}

export function ScanPage({ onAssetSelect, onAction }: ScanPageProps) {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [foundAssetId, setFoundAssetId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) {
      showToast("Please enter an Asset ID or Serial Number.", "warning");
      return;
    }
    const asset = getAsset(query.trim());
    if (asset) {
      setFoundAssetId(asset.id);
      showToast(`Asset found: ${asset.name}`, "success");
    } else {
      setFoundAssetId(null);
      showToast("No asset found with that ID or serial number.", "error");
    }
  };

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const asset = getAsset("AST-000101");
      if (asset) {
        setQuery(asset.id);
        setFoundAssetId(asset.id);
        showToast(`Scanned: ${asset.id}`, "success");
      }
    }, 1500);
  };

  const asset = foundAssetId ? getAsset(foundAssetId) : null;
  const employee = asset ? getEmployee(asset.assignedToEmployeeId) : null;

  return (
    <div>
      <PageHeader
        title="Scan Asset"
        subtitle="Scan QR/barcode or search by Asset ID / Serial Number"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scanner */}
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            QR / Barcode Scanner
          </h3>
          <div className="relative aspect-square max-w-sm mx-auto rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
            {scanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 animate-pulse"
                  style={{ top: "50%" }}
                />
                <ScanLine className="h-16 w-16 text-blue-600 animate-pulse" />
                <p className="mt-3 text-sm text-gray-500">Scanning...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <ScanLine className="h-16 w-16 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  Camera preview area
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Position QR code within the frame
                </p>
              </div>
            )}
          </div>
          <Button
            variant="primary"
            className="w-full mt-4"
            icon={<ScanLine className="h-4 w-4" />}
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? "Scanning..." : "Start Scan"}
          </Button>
          <p className="mt-2 text-center text-xs text-gray-400">
            QR/barcode library integration ready for backend
          </p>
        </Card>

        {/* Manual Search */}
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Manual Search
          </h3>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter Asset ID or Serial Number..."
              className="h-12 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <Button
            variant="primary"
            className="w-full mt-3"
            icon={<Search className="h-4 w-4" />}
            onClick={handleSearch}
          >
            Search Asset
          </Button>

          {/* Results */}
          {asset && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                  <Laptop className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{asset.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{asset.id}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={asset.status} />
                    <ConditionBadge condition={asset.condition} />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Serial Number</p>
                  <p className="font-medium text-gray-900 font-mono">
                    {asset.serialNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Service Tag</p>
                  <p className="font-medium text-gray-900 font-mono">
                    {asset.serviceTag}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <User className="h-3 w-3" /> Assigned To
                  </p>
                  <p className="font-medium text-gray-900">
                    {employee?.fullName || "Unassigned"}
                  </p>
                  <p className="text-xs text-gray-500">{employee?.id || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </p>
                  <p className="font-medium text-gray-900">{asset.location}</p>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="mb-2 text-xs font-semibold text-gray-500 uppercase">
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    onClick={() => onAssetSelect(asset.id)}
                  >
                    View
                  </Button>
                  {(asset.status === "Available" ||
                    asset.status === "Returned") && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<UserCheck className="h-3.5 w-3.5" />}
                      onClick={() => onAction("assign", asset.id)}
                    >
                      Assign
                    </Button>
                  )}
                  {asset.status === "Assigned" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
                        onClick={() => onAction("transfer", asset.id)}
                      >
                        Transfer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Undo2 className="h-3.5 w-3.5" />}
                        onClick={() => onAction("return", asset.id)}
                      >
                        Return
                      </Button>
                    </>
                  )}
                  {asset.status !== "Under Repair" &&
                    asset.status !== "Disposed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Wrench className="h-3.5 w-3.5" />}
                        onClick={() => onAction("repair", asset.id)}
                      >
                        Repair
                      </Button>
                    )}
                  {asset.status !== "Disposed" && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => onAction("dispose", asset.id)}
                    >
                      Dispose
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
