import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, Mail, X } from "lucide-react";
import type * as XLSXStyle from "xlsx-js-style";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  fetchAssetsFromSupabase,
  fetchEmployeesFromSupabase,
} from "@/lib/supabaseData";
import { supabase } from "@/lib/supabase";
import { formatCategoryLabel, formatSerialDisplay } from "@/lib/utils";
import type { AppUserProfile } from "@/lib/auth";
import type { Asset, Employee } from "@/types";

interface HandoverDocumentProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  profile: AppUserProfile;
  refreshVersion: number;
}

const HANDOVER_DECLARATION = [
  "I declare that I have received the aforementioned assets in good and working condition. The assets allocated are returnable on my last working day and must be duly received by the IT team.",
  "I understand that any damage, loss, or failure to return allocated assets may result in cost recovery by BCD Travel. Non-compliance with this policy may lead to disciplinary or legal consequences, as applicable.",
  "I affirm that I will abide by the IT Security and ICT policies. A floater asset can only be kept for a maximum of two months.",
];

const formatHandoverDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const safeFileName = (value: string) =>
  value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "");

const displayModel = (asset: Asset) =>
  asset.model && asset.model !== "Unknown Model"
    ? asset.model
    : formatCategoryLabel(asset.category)
        .replace(/^(Laptop|Monitor|Docking Station)\s*-\s*/i, "") || "—";

const displayAssetType = (asset: Asset) => {
  const category = asset.category.toLowerCase();
  if (category.includes("laptop")) return "Laptop";
  if (category.includes("monitor")) return "Monitor";
  if (category.includes("docking")) return "Docking Station";
  if (category.includes("headset")) return "Headset";
  if (category.includes("keyboard") && category.includes("mouse")) {
    return "Keyboard & Mouse";
  }
  if (category.includes("keyboard")) return "Keyboard";
  if (category.includes("mouse")) return "Mouse";
  if (category.includes("bag")) return "Bag";
  return formatCategoryLabel(asset.category);
};

const displayServiceTag = (value?: string) => {
  const serviceTag = value?.trim();
  return serviceTag && !/^(?:-|—|–|n\/a|na)$/i.test(serviceTag) ? serviceTag : "";
};

const displaySerialNumber = (value: string) => {
  const serialNumber = formatSerialDisplay(value).trim();
  return /^(?:-|—|–|n\/a|na)$/i.test(serialNumber) ? "" : serialNumber;
};

interface HandoverAssetRow {
  id: string;
  asset: Asset;
  handoverDate: string;
  receivedDate: string;
  receivedBy: string;
  remarks: string;
}

export function HandoverDocument({
  open,
  onClose,
  assetId,
  profile,
  refreshVersion,
}: HandoverDocumentProps) {
  const { showToast } = useToast();
  const documentRef = useRef<HTMLElement>(null);
  const [handoverRows, setHandoverRows] = useState<HandoverAssetRow[]>([]);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [handoverDate, setHandoverDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    const scrollTimer = window.setTimeout(() => {
      documentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
    return () => window.clearTimeout(scrollTimer);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !assetId) return;

    setIsLoading(true);
    setLoadError("");
    setHandoverRows([]);
    setEmployee(null);
    setHandoverDate(new Date());

    Promise.all([
      fetchAssetsFromSupabase(),
      fetchEmployeesFromSupabase(),
      supabase
        .from("returns")
        .select("id, asset_id, employee_id, returned_date, received_by, remarks")
        .order("returned_date", { ascending: false }),
      supabase
        .from("assignments")
        .select("asset_id, employee_id, assigned_date, status")
        .eq("status", "Returned")
        .order("assigned_date", { ascending: false }),
    ])
      .then(([allAssets, employees, returnsResult, assignmentsResult]) => {
        if (cancelled) return;
        if (returnsResult.error) throw returnsResult.error;
        if (assignmentsResult.error) throw assignmentsResult.error;
        const selectedAsset = allAssets.find((asset) => asset.id === assetId);
        if (!selectedAsset) {
          throw new Error("The selected asset could not be found in the database.");
        }
        const selectedReturn = (returnsResult.data ?? []).find(
          (record) => record.asset_id === selectedAsset._uuid,
        );
        const employeeUuid =
          selectedAsset.assignedToEmployeeUuid ?? selectedReturn?.employee_id;
        const matchedEmployee = employees.find(
          (item) =>
            (employeeUuid && item._uuid === employeeUuid) ||
            item.id === selectedAsset.assignedToEmployeeId ||
            item.empId === selectedAsset.assignedToEmployeeId,
        );
        if (!matchedEmployee) {
          throw new Error("The assigned employee could not be found in the database.");
        }

        const assignedAssets = allAssets.filter(
          (asset) =>
            asset.status === "Assigned" &&
            ((matchedEmployee._uuid &&
              asset.assignedToEmployeeUuid === matchedEmployee._uuid) ||
              asset.assignedToEmployeeId === matchedEmployee.id ||
              asset.assignedToEmployeeId === matchedEmployee.empId),
        );
        if (
          selectedAsset.status === "Assigned" &&
          !assignedAssets.some((asset) => asset.id === selectedAsset.id)
        ) {
          assignedAssets.push(selectedAsset);
        }
        const rows: HandoverAssetRow[] = assignedAssets.map((asset) => ({
          id: `assigned-${asset._uuid || asset.id}`,
          asset,
          handoverDate: asset.assignedDate || "",
          receivedDate: "",
          receivedBy: "",
          remarks: "",
        }));
        const assetsByUuid = new Map(
          allAssets.map((asset) => [asset._uuid, asset]),
        );
        (returnsResult.data ?? [])
          .filter((record) => record.employee_id === matchedEmployee._uuid)
          .forEach((record) => {
            const returnedAsset = assetsByUuid.get(record.asset_id);
            if (!returnedAsset) return;
            const previousAssignment = (assignmentsResult.data ?? []).find(
              (assignment) =>
                assignment.asset_id === record.asset_id &&
                assignment.employee_id === record.employee_id &&
                new Date(assignment.assigned_date) <=
                  new Date(record.returned_date),
            );
            rows.push({
              id: `returned-${record.id}`,
              asset: returnedAsset,
              handoverDate: previousAssignment
                ? formatHandoverDate(new Date(previousAssignment.assigned_date))
                : "",
              receivedDate: formatHandoverDate(new Date(record.returned_date)),
              receivedBy: record.received_by?.trim() || "Not recorded",
              remarks: record.remarks ?? "Returned",
            });
          });
        setHandoverRows(rows);
        setEmployee(matchedEmployee);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Could not load handover data:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load employee and assigned asset data.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, assetId, refreshVersion, profile.username]);

  const dateLabel = handoverDate ? formatHandoverDate(handoverDate) : "";
  if (!open) return null;

  const downloadPdf = async () => {
    if (!employee || handoverRows.length === 0 || !handoverDate) return;
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 9;
      const contentWidth = pageWidth - margin * 2;
      const x = margin;
      let y = 10;

      pdf.setDrawColor(35, 52, 72);
      pdf.setLineWidth(0.45);
      pdf.rect(5, 5, pageWidth - 10, pdf.internal.pageSize.getHeight() - 10);

      pdf.setTextColor(32, 48, 65);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(17);
      pdf.text("BCD", x + 2, y + 10);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("travel", x + 15, y + 10);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.text("Asset Handover Form", pageWidth / 2, y + 10, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(`Date: ${dateLabel}`, pageWidth - x - 2, y + 10, { align: "right" });
      y += 17;

      const employeeRows = [
        [
          ["Name", employee.fullName],
          ["Employee ID", employee.empId || employee.id],
        ],
        [
          ["Process", employee.process || "—"],
          ["Date of Joining", employee.doj || employee.joiningDate || "—"],
        ],
        [
          ["Location", employee.location],
        ],
      ];
      const labelWidths = [27, 27, 25, 27, 22, 26];
      let employeeRowY = y;
      employeeRows.forEach((row) => {
        const rowHeight = 6;
        const cellWidth = contentWidth / row.length;
        let cursorX = x;
        row.forEach(([label, value], cellIndex) => {
          const labelWidth = labelWidths[cellIndex * 2] ?? 25;
          const valueWidth = cellWidth - labelWidth;
          pdf.setDrawColor(95, 110, 125);
          pdf.setLineWidth(0.2);
          pdf.rect(cursorX, employeeRowY, labelWidth, rowHeight);
          pdf.rect(cursorX + labelWidth, employeeRowY, valueWidth, rowHeight);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(8);
          pdf.text(label, cursorX + 1.2, employeeRowY + 4);
          pdf.setFont("helvetica", "normal");
          pdf.text(
            pdf.splitTextToSize(String(value), valueWidth - 2)[0] ?? "—",
            cursorX + labelWidth + 1.2,
            employeeRowY + 4,
          );
          cursorX += labelWidth + valueWidth;
        });
        employeeRowY += rowHeight;
      });
      y = employeeRowY + 3;

      const columns = [
        { label: "Sl.\nNo", width: 10 },
        { label: "Type", width: 19 },
        { label: "Model", width: 28 },
        { label: "Serial Number /\nService Tag", width: 32 },
        { label: "Qty", width: 9 },
        { label: "Handover\nDate", width: 20 },
        { label: "Handover\nBy", width: 22 },
        { label: "Employee\nSign", width: 22 },
        { label: "Received\nDate", width: 20 },
        { label: "Received\nBy", width: 22 },
        { label: "Receiver\nSign", width: 22 },
        { label: "Remarks", width: contentWidth - 226 },
      ];
      const headerHeight = 13;
      const rowHeight = 15;
      const drawAssetTableHeader = (top: number) => {
        let headerX = x;
        pdf.setFillColor(31, 58, 95);
        columns.forEach((column) => {
          pdf.setDrawColor(95, 110, 125);
          pdf.rect(headerX, top, column.width, headerHeight, "FD");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.5);
          pdf.setTextColor(255, 255, 255);
          pdf.text(
            column.label.split("\n"),
            headerX + column.width / 2,
            top + 4,
            { align: "center" },
          );
          headerX += column.width;
        });
        pdf.setTextColor(32, 48, 65);
        return top + headerHeight;
      };
      let tableX: number;
      y = drawAssetTableHeader(y);

      handoverRows.forEach((row, index) => {
        const { asset } = row;
        if (y + rowHeight > 174) {
          pdf.addPage("a4", "landscape");
          y = 12;
          y = drawAssetTableHeader(y);
        }
        const cells = [
          String(index + 1),
          displayAssetType(asset),
          displayModel(asset),
          [displaySerialNumber(asset.serialNumber), displayServiceTag(asset.serviceTag)]
            .filter(Boolean)
            .join("\n"),
          "1",
          row.handoverDate || "—",
          profile.username,
          "",
          row.receivedDate,
          row.receivedBy,
          "",
          row.remarks,
        ];
        tableX = x;
        columns.forEach((column, cellIndex) => {
          pdf.setDrawColor(95, 110, 125);
          pdf.rect(tableX, y, column.width, rowHeight);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.5);
          const lines = pdf.splitTextToSize(cells[cellIndex], column.width - 2);
          pdf.text(lines.slice(0, 2), tableX + column.width / 2, y + 4, {
            align: "center",
          });
          tableX += column.width;
        });
        y += rowHeight;
      });

      y += 4;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.3);
      HANDOVER_DECLARATION.forEach((paragraph) => {
        const lines = pdf.splitTextToSize(`• ${paragraph}`, contentWidth);
        if (y + lines.length * 3.5 > 192) {
          pdf.addPage("a4", "landscape");
          y = 14;
        }
        pdf.text(lines, x + 1, y);
        y += lines.length * 3.5 + 1;
      });

      if (y + 36 > 202) {
        pdf.addPage("a4", "landscape");
        y = 14;
      }
      y += 3;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("Version History:", x + 1, y);
      y += 2;
      const versionColumns = [
        ["Sl. No", 18],
        ["Document", 44],
        ["Current Revision", 38],
        ["Changes Incorporated / Removed", 140],
      ] as const;
      let historyX = x + 1;
      pdf.setFillColor(31, 58, 95);
      versionColumns.forEach(([label, width]) => {
        pdf.rect(historyX, y, width, 6, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(label, historyX + 1, y + 4);
        historyX += width;
      });
      pdf.setTextColor(32, 48, 65);
      y += 6;
      [
        ["1", "Asset Handover Form", "1", "Initial Release"],
        ["2", "Asset Handover Form", "1.1", "2026 Release"],
      ].forEach((row) => {
        historyX = x + 1;
        versionColumns.forEach(([, width], cellIndex) => {
          pdf.rect(historyX, y, width, 6);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(6.5);
          pdf.text(row[cellIndex], historyX + 1, y + 4);
          historyX += width;
        });
        y += 6;
      });

      y += 8;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.text(
        `Last modified by: ${profile.username}`,
        pageWidth - x - 1,
        pdf.internal.pageSize.getHeight() - 12,
        { align: "right" },
      );

      pdf.save(`${safeFileName(employee.fullName)}-handover.pdf`);
    } catch (error) {
      console.error("Could not generate handover PDF:", error);
      showToast("Could not generate the handover PDF.", "error");
    }
  };

  const downloadExcel = async () => {
    if (!employee || handoverRows.length === 0 || !handoverDate) return;
    try {
      const XLSX = (await import("xlsx-js-style")).default;
      const sheetRows: (string | number)[][] = [
        ["BCD travel", "", "", "Asset Handover Form", "", "", `Date: ${dateLabel}`],
        [],
        ["Name", employee.fullName, "Employee ID", employee.empId || employee.id],
        ["Process", employee.process || "—", "Date of Joining", employee.doj || employee.joiningDate || "—"],
        ["Location", employee.location],
        [],
        [
          "Sl. No",
          "Type",
          "Model",
          "Serial Number",
          "Service Tag",
          "Qty",
          "Handover Date",
          "Handover By",
          "Employee Sign",
          "Received Date",
          "Received By",
          "Receiver Sign",
          "Remarks",
        ],
        ...handoverRows.map((row, index) => [
          index + 1,
          displayAssetType(row.asset),
          displayModel(row.asset),
          displaySerialNumber(row.asset.serialNumber),
          displayServiceTag(row.asset.serviceTag),
          1,
          row.handoverDate || "—",
          profile.username,
          "",
          row.receivedDate,
          row.receivedBy,
          "",
          row.remarks,
        ]),
        [],
        ["Declaration"],
        ...HANDOVER_DECLARATION.map((paragraph) => [paragraph]),
        [],
        ["Version History:"],
        ["Sl. No", "Document", "Current Revision", "Changes Incorporated / Removed"],
        ["1", "Asset Handover Form", "1", "Initial Release"],
        ["2", "Asset Handover Form", "1.1", "2026 Release"],
        [],
        ["", "", "", "", "", "", "", "", "", "", "Last modified by", "", profile.username],
      ];
      const sheet = XLSX.utils.aoa_to_sheet(sheetRows);
      sheet["!cols"] = [
        { wch: 7 }, { wch: 16 }, { wch: 22 }, { wch: 19 }, { wch: 18 },
        { wch: 6 }, { wch: 16 }, { wch: 18 }, { wch: 15 }, { wch: 16 },
        { wch: 18 }, { wch: 15 }, { wch: 28 },
      ];
      const headingStyle: XLSXStyle.CellStyle = {
        fill: { patternType: "solid", fgColor: { rgb: "1F3A5F" } },
        font: { bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
      };
      const styleRow = (rowIndex: number, columnCount: number) => {
        for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          if (!sheet[address]) sheet[address] = { t: "s", v: "" };
          sheet[address].s = headingStyle;
        }
      };
      styleRow(0, 7);
      styleRow(6, 13);
      styleRow(handoverRows.length + 13, 4);
      styleRow(handoverRows.length + 14, 4);
      for (let rowIndex = 7; rowIndex < handoverRows.length + 7; rowIndex += 1) {
        for (let columnIndex = 0; columnIndex < 13; columnIndex += 1) {
          const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
          if (!sheet[address]) sheet[address] = { t: "s", v: "" };
          sheet[address].s = {
            alignment: {
              horizontal: "center",
              vertical: "center",
              wrapText: true,
            },
            border: {
              top: { style: "thin", color: { rgb: "64748B" } },
              bottom: { style: "thin", color: { rgb: "64748B" } },
              left: { style: "thin", color: { rgb: "64748B" } },
              right: { style: "thin", color: { rgb: "64748B" } },
            },
          };
        }
      }
      sheet["!rows"] = Array.from(
        { length: handoverRows.length + 7 },
        (_, index) =>
          index === 6 ? { hpt: 34 } : index >= 7 ? { hpt: 30 } : { hpt: 22 },
      );
      const lastModifiedRow = handoverRows.length + 18;
      const lastModifiedLabel =
        sheet[XLSX.utils.encode_cell({ r: lastModifiedRow, c: 10 })];
      const lastModifiedUsername =
        sheet[XLSX.utils.encode_cell({ r: lastModifiedRow, c: 12 })];
      if (lastModifiedLabel) {
        lastModifiedLabel.s = {
          alignment: { horizontal: "right" },
          font: { bold: true },
        };
      }
      if (lastModifiedUsername) {
        lastModifiedUsername.s = { alignment: { horizontal: "right" } };
      }
      sheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 0, c: 5 } },
        { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },
        ...HANDOVER_DECLARATION.map((_, index) => ({
          s: { r: handoverRows.length + 9 + index, c: 0 },
          e: { r: handoverRows.length + 9 + index, c: 12 },
        })),
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Asset Handover");
      XLSX.writeFile(workbook, `${safeFileName(employee.fullName)}-handover.xlsx`);
    } catch (error) {
      console.error("Could not generate handover Excel file:", error);
      showToast("Could not generate the handover Excel file.", "error");
    }
  };

  const openOutlookDraft = () => {
    if (!employee || !handoverDate) return;
    try {
      const body = [
        `Hello ${employee.fullName},`,
        "",
        "Please find the asset handover details below.",
        "",
        `Employee ID: ${employee.empId || employee.id}`,
        `Process: ${employee.process || "—"}`,
        `Location: ${employee.location}`,
        `Date: ${dateLabel}`,
        "",
        ...handoverRows.map(
          (row, index) =>
            `${index + 1}. ${displayAssetType(row.asset)} | ${displayModel(row.asset)} | Serial: ${displaySerialNumber(row.asset.serialNumber)} | Service Tag: ${displayServiceTag(row.asset.serviceTag)} | Qty: 1 | Handover By: ${profile.username}${row.receivedDate ? ` | Received ${row.receivedDate} by ${row.receivedBy} | Remarks: ${row.remarks}` : ""}`,
        ),
        "",
        ...HANDOVER_DECLARATION,
      ].join("\n");
      const composeUrl = new URL("https://outlook.office.com/mail/deeplink/compose");
      composeUrl.searchParams.set("to", employee.email);
      composeUrl.searchParams.set(
        "cc",
        "DL:IN SSC BLR ICT; nayamathulla.sharieff@bcdtravel.com",
      );
      composeUrl.searchParams.set(
        "subject",
        `Asset Handover Form - ${employee.fullName} (${employee.empId || employee.id})`,
      );
      composeUrl.searchParams.set("body", body);
      window.open(composeUrl.toString(), "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Could not open the Outlook handover draft:", error);
      showToast("Could not open the Outlook handover draft.", "error");
    }
  };

  return (
    <section
      ref={documentRef}
      tabIndex={-1}
      className="mt-6 scroll-mt-6 rounded-xl border border-slate-700 bg-slate-800/90 p-4 shadow-xl outline-none sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-white">Asset Handover Form</h2>
          <p className="mt-1 text-sm text-slate-400">
            Formal handover document for this employee’s assigned equipment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={<Download className="h-4 w-4" />} disabled={!employee || handoverRows.length === 0} onClick={downloadPdf}>
            Download PDF
          </Button>
          <Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />} disabled={!employee || handoverRows.length === 0} onClick={downloadExcel}>
            Download Excel
          </Button>
          <Button variant="primary" icon={<Mail className="h-4 w-4" />} disabled={!employee || handoverRows.length === 0} onClick={openOutlookDraft}>
            Outlook
          </Button>
          <Button variant="ghost" icon={<X className="h-4 w-4" />} onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-400">
          Loading employee and assigned assets from the database...
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-sm text-rose-300">
          {loadError}
        </div>
      ) : employee ? (
        <article className="handover-document mx-auto max-w-[1180px] border border-slate-400 bg-white p-3 text-[11px] leading-tight text-slate-900 shadow-lg sm:p-5 print:max-w-none print:border-0 print:p-0 print:shadow-none">
          <header className="grid min-h-[78px] grid-cols-[1fr_2fr_1fr] items-center border-x border-t border-slate-700 px-3 sm:px-5">
            <div className="flex items-baseline text-[#213f68]" aria-label="BCD travel">
              <span className="text-2xl font-black tracking-tight">BCD</span>
              <span className="ml-1 text-sm font-medium">travel</span>
              <span className="ml-1 -mt-4 text-[9px] tracking-[-3px] text-amber-500">●●●</span>
            </div>
            <h3 className="text-center text-base font-semibold underline underline-offset-2 sm:text-lg">
              Asset Handover Form
            </h3>
            <p className="text-right text-xs"><strong>Date:</strong> {dateLabel}</p>
          </header>

          <div className="grid grid-cols-[1fr_1fr] border border-slate-700">
            <div className="grid grid-cols-[86px_1fr] border-b border-r border-slate-600">
              <strong className="border-r border-slate-600 bg-slate-50 px-1 py-1">Name</strong>
              <span className="px-1 py-1">{employee.fullName}</span>
            </div>
            <div className="grid grid-cols-[86px_1fr] border-b border-slate-600">
              <strong className="border-r border-slate-600 bg-slate-50 px-1 py-1">Employee ID</strong>
              <span className="px-1 py-1">{employee.empId || employee.id}</span>
            </div>
            <div className="grid grid-cols-[86px_1fr] border-r border-slate-600">
              <strong className="border-r border-slate-600 bg-slate-50 px-1 py-1">Process</strong>
              <span className="px-1 py-1">{employee.process || "—"}</span>
            </div>
            <div className="grid grid-cols-[86px_1fr] border-slate-600">
              <strong className="border-r border-slate-600 bg-slate-50 px-1 py-1">Date of Joining</strong>
              <span className="px-1 py-1">{employee.doj || employee.joiningDate || "—"}</span>
            </div>
            <div className="col-span-2 grid grid-cols-[86px_1fr] border-t border-slate-600">
              <strong className="border-r border-slate-600 bg-slate-50 px-1 py-1">Location</strong>
              <span className="px-1 py-1">{employee.location}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] table-fixed border-collapse text-center text-[10px]">
              <colgroup>
                <col className="w-[4%]" /><col className="w-[7%]" />
                <col className="w-[10%]" /><col className="w-[12%]" />
                <col className="w-[4%]" /><col className="w-[8%]" />
                <col className="w-[8%]" /><col className="w-[8%]" />
                <col className="w-[8%]" /><col className="w-[9%]" />
                <col className="w-[8%]" /><col className="w-[14%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-100">
                  {["Sl. No", "Type", "Model", "Serial Number / Service Tag", "Qty", "Handover Date", "Handover By", "Employee Sign", "Received Date", "Received By", "Receiver Sign", "Remarks"].map((heading) => (
                    <th key={heading} className="h-12 whitespace-normal border border-slate-600 bg-[#1f3a5f] px-1 py-1 font-semibold text-white">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {handoverRows.map((row, index) => {
                  const { asset } = row;
                  return (
                  <tr key={row.id} className="h-10">
                    <td className="border border-slate-600 px-1">{index + 1}</td>
                    <td className="border border-slate-600 px-1">{displayAssetType(asset)}</td>
                    <td className="border border-slate-600 px-1">{displayModel(asset)}</td>
                    <td className="break-all border border-slate-600 px-1 font-mono">
                      {displaySerialNumber(asset.serialNumber) && (
                        <span className="block">{displaySerialNumber(asset.serialNumber)}</span>
                      )}
                      {displayServiceTag(asset.serviceTag) && (
                        <span className="block text-[9px]">{displayServiceTag(asset.serviceTag)}</span>
                      )}
                    </td>
                    <td className="border border-slate-600 px-1">1</td>
                    <td className="border border-slate-600 px-1">{row.handoverDate || "—"}</td>
                    <td className="border border-slate-600 px-1">{profile.username}</td>
                    <td className="border border-slate-600 px-1" />
                    <td className="border border-slate-600 px-1">{row.receivedDate}</td>
                    <td className="border border-slate-600 px-1">{row.receivedBy}</td>
                    <td className="border border-slate-600 px-1" />
                    <td className="border border-slate-600 px-1">{row.remarks}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="mt-3 list-disc space-y-1 border-b border-slate-400 px-5 pb-2 text-[10px] leading-snug">
            {HANDOVER_DECLARATION.map((statement) => (
              <li key={statement}>{statement}</li>
            ))}
          </ul>

          <section className="mt-1 max-w-[760px]">
            <h4 className="mb-1 font-semibold">Version History:</h4>
            <table className="w-full border-collapse text-[9px]">
              <thead className="bg-[#1f3a5f] text-white">
                <tr>
                  {["Sl. No", "Document", "Current Revision", "Changes Incorporated / Removed"].map((heading) => (
                    <th key={heading} className="border border-slate-600 px-2 py-1 text-left">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-600 px-2 py-1">1</td>
                  <td className="border border-slate-600 px-2 py-1">Asset Handover Form</td>
                  <td className="border border-slate-600 px-2 py-1">1</td>
                  <td className="border border-slate-600 px-2 py-1">Initial Release</td>
                </tr>
                <tr>
                  <td className="border border-slate-600 px-2 py-1">2</td>
                  <td className="border border-slate-600 px-2 py-1">Asset Handover Form</td>
                  <td className="border border-slate-600 px-2 py-1">1.1</td>
                  <td className="border border-slate-600 px-2 py-1">2026 Release</td>
                </tr>
              </tbody>
            </table>
          </section>

          <footer className="mt-2 text-right text-[9px]">
            Last modified by: <strong>{profile.username}</strong>
          </footer>

        </article>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-8 text-center text-sm text-slate-400">
          No handover details are available.
        </div>
      )}
    </section>
  );
}
