import { useEffect, useState } from "react";
import { ArrowLeftRight, Download, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, StatCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  fetchTransferRecordsFromSupabase,
  returnTransferredAssetToStock,
} from "@/lib/supabaseData";
import type { Transfer } from "@/types";
import type { AppUserProfile } from "@/lib/auth";

export function TransfersPage({
  onAssetSelect,
  onComplete,
  refreshVersion = 0,
  profile,
}: {
  onAssetSelect: (id: string) => void;
  onComplete: () => void;
  refreshVersion?: number;
  profile: AppUserProfile;
}) {
  const { showToast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [returningTransferId, setReturningTransferId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    fetchTransferRecordsFromSupabase()
      .then((rows) => {
        if (active) setTransfers(rows);
      })
      .catch((error) => {
        console.error("Could not load transfer records:", error);
        if (active) showToast("Could not load transfer records.", "error");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshVersion, showToast]);

  const completed = transfers.filter((t) => t.status === "Completed").length;

  const handleReturnToStock = async (transfer: Transfer) => {
    if (
      !transfer.canReturnToStock ||
      !transfer.assetTag ||
      !transfer.currentEmployeeUuid ||
      returningTransferId
    ) {
      return;
    }

    setReturningTransferId(transfer.id);
    try {
      await returnTransferredAssetToStock({
        assetTag: transfer.assetTag,
        employeeUuid: transfer.currentEmployeeUuid,
        returnDate: new Date().toISOString().slice(0, 10),
        receivedBy: profile.username,
      });
      const rows = await fetchTransferRecordsFromSupabase();
      setTransfers(rows);
      showToast(`${transfer.assetId} returned to stock.`, "success");
      onComplete();
    } catch (error) {
      console.error("Could not return transferred asset to stock:", error);
      showToast(
        error instanceof Error
          ? error.message
          : "Could not return the asset to stock.",
        "error",
      );
    } finally {
      setReturningTransferId(null);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      <PageHeader
        title="Asset Transfers Log"
        subtitle={`${transfers.length} asset transfer operations logged`}
        actions={
          <Button
            variant="outline"
            icon={<Download className="h-4 w-4" />}
            onClick={() => showToast("Exporting transfers report...", "info")}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total Transfers"
          value={transfers.length}
          icon={<ArrowLeftRight className="h-6 w-6" />}
          iconBg="bg-blue-900/50"
          iconColor="text-blue-400"
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={<ArrowLeftRight className="h-6 w-6" />}
          iconBg="bg-emerald-900/50"
          iconColor="text-emerald-400"
        />
        <StatCard
          label="Pending"
          value={transfers.filter((t) => t.status === "Pending").length}
          icon={<ArrowLeftRight className="h-6 w-6" />}
          iconBg="bg-amber-900/50"
          iconColor="text-amber-400"
        />
      </div>

      <Card className="bg-slate-800/90 border-slate-700">
        <Table>
          <THead>
            <TR className="border-b border-slate-700 bg-slate-900/60">
              <TH>Serial Number</TH>
              <TH>Asset</TH>
              <TH>From Employee</TH>
              <TH>From Location</TH>
              <TH>To Employee</TH>
              <TH>To Location</TH>
              <TH>Date</TH>
              <TH>Reason</TH>
              <TH>Status</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading ? (
              <TR>
                <TD colSpan={10} className="py-10 text-center text-slate-400">
                  Loading transfers...
                </TD>
              </TR>
            ) : transfers.length === 0 ? (
              <TR>
                <TD colSpan={10} className="py-10 text-center text-slate-400">
                  No transfers recorded.
                </TD>
              </TR>
            ) : transfers.map((t) => (
              <TR
                key={t.id}
                onClick={() => onAssetSelect(t.assetId)}
                className="hover:bg-slate-700/40 border-b border-slate-700/50 cursor-pointer"
              >
                <TD className="font-mono text-xs font-bold text-blue-400">
                  {t.serialNumber}
                </TD>
                <TD>
                  <p className="font-semibold text-slate-100">{t.assetName}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {t.assetId}
                  </p>
                </TD>
                <TD>
                  <p className="text-sm font-semibold text-slate-100">
                    {t.fromEmployeeName}
                  </p>
                  <p className="text-xs text-amber-400 font-mono">
                    {t.fromEmployeeId}
                  </p>
                </TD>
                <TD className="text-xs text-slate-300">{t.fromLocation}</TD>
                <TD>
                  <p className="text-sm font-semibold text-slate-100">
                    {t.toEmployeeName}
                  </p>
                  <p className="text-xs text-amber-400 font-mono">
                    {t.toEmployeeId}
                  </p>
                </TD>
                <TD className="text-xs text-slate-300">{t.toLocation}</TD>
                <TD className="text-xs text-slate-300 whitespace-nowrap">
                  {t.transferDate}
                </TD>
                <TD className="text-xs text-slate-300">{t.reason}</TD>
                <TD>
                  <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                    {t.status}
                  </span>
                </TD>
                <TD className="text-right">
                  {t.canReturnToStock ? (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<PackageCheck className="h-4 w-4" />}
                      loading={returningTransferId === t.id}
                      disabled={returningTransferId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleReturnToStock(t);
                      }}
                    >
                      {returningTransferId === t.id
                        ? "Returning..."
                        : "Return to Stock"}
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
