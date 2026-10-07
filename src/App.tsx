import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { Layout } from "@/components/layout/Layout";
import type { PageKey } from "@/components/layout/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { AssetsPage } from "@/pages/AssetsPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { StockPage } from "@/pages/StockPage";
// Procurement is temporarily disabled while the app is migrated to Supabase-backed data.
// import { ProcurementPage } from '@/pages/ProcurementPage';
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { TransfersPage } from "@/pages/TransfersPage";
import { ReturnsPage } from "@/pages/ReturnsPage";
import { ExitUsersPage } from "@/pages/ExitUsersPage";
import { RepairsPage } from "@/pages/RepairsPage";
import { DisposalPage } from "@/pages/DisposalPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { ScanPage } from "@/pages/ScanPage";
// Settings is temporarily disabled until the Supabase schema and admin configuration flow are ready.
// import { SettingsPage } from '@/pages/SettingsPage';
import { AssetDetailsDrawer } from "@/components/assets/AssetDetailsDrawer";
import {
  AssetActionDialogs,
  type AssetAction,
} from "@/components/assets/AssetActionDialogs";
import { HandoverFormModal } from "@/components/assets/HandoverFormModal";
import type { Location } from "@/types";

function AppContent() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);
  const [action, setAction] = useState<{
    type: AssetAction;
    assetId: string;
  } | null>(null);
  const [handoverAssetId, setHandoverAssetId] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<Location | null>(null);
  const [assetDataVersion, setAssetDataVersion] = useState(0);

  const navigate = (p: PageKey) => {
    setPage(p);
    if (p !== "assets") setLocationFilter(null);
  };

  const handleAssetSelect = (id: string) => {
    setSelectedAssetId(id);
    setAssetDrawerOpen(true);
  };

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmployeeId(id);
    setPage("employees");
  };

  const handleLocationClick = (loc: Location) => {
    setLocationFilter(loc);
    setPage("assets");
  };

  const handleAction = (a: AssetAction, assetId: string) => {
    setAction({ type: a, assetId });
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <Dashboard
            onNavigate={navigate}
            onLocationClick={handleLocationClick}
            onAssetSelect={handleAssetSelect}
            refreshVersion={assetDataVersion}
          />
        );
      case "assets":
        return (
          <AssetsPage
            selectedAssetId={selectedAssetId}
            onAssetSelect={handleAssetSelect}
            refreshVersion={assetDataVersion}
            locationFilter={locationFilter}
            onClearLocationFilter={() => setLocationFilter(null)}
          />
        );
      case "employees":
        return (
          <EmployeesPage
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={handleEmployeeSelect}
            onAssetSelect={handleAssetSelect}
          />
        );
      case "stock":
        return <StockPage />;
      // Procurement is postponed until the Supabase schema and procurement tables are live.
      // case 'procurement':
      //   return <ProcurementPage />;
      case "assignments":
        return <AssignmentsPage onAssetSelect={handleAssetSelect} />;
      case "transfers":
        return (
          <TransfersPage
            onAssetSelect={handleAssetSelect}
            refreshVersion={assetDataVersion}
          />
        );
      case "returns":
        return (
          <ReturnsPage
            onAssetSelect={handleAssetSelect}
            refreshVersion={assetDataVersion}
          />
        );
      case "exit-users":
        return <ExitUsersPage />;
      case "repairs":
        return <RepairsPage onAssetSelect={handleAssetSelect} />;
      case "disposal":
        return <DisposalPage onAssetSelect={handleAssetSelect} />;
      case "reports":
        return <ReportsPage />;
      case "scan":
        return (
          <ScanPage
            onAssetSelect={handleAssetSelect}
            onAction={handleAction}
            onNavigate={navigate}
          />
        );
      // Settings is postponed until the Supabase admin/configuration layer is ready.
      // case 'settings':
      //   return <SettingsPage />;
      default:
        return (
          <Dashboard
            onNavigate={navigate}
            onLocationClick={handleLocationClick}
            onAssetSelect={handleAssetSelect}
            refreshVersion={assetDataVersion}
          />
        );
    }
  };

  return (
    <Layout
      current={page}
      onNavigate={navigate}
      onAssetSelect={handleAssetSelect}
      onEmployeeSelect={handleEmployeeSelect}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {renderPage()}

      {/* Global asset drawer - accessible from any page */}
      <AssetDetailsDrawer
        assetId={selectedAssetId}
        open={assetDrawerOpen}
        onClose={() => setAssetDrawerOpen(false)}
        onAction={(a, id) => {
          setAssetDrawerOpen(false);
          handleAction(a, id);
        }}
        onEdit={() => {
          setAssetDrawerOpen(false);
        }}
      />

      {/* Global action dialogs */}
      <AssetActionDialogs
        action={action}
        onClose={() => setAction(null)}
        onComplete={() => setAssetDataVersion((version) => version + 1)}
      />

      {/* Handover form */}
      <HandoverFormModal
        open={handoverAssetId !== null}
        assetId={handoverAssetId || ""}
        onClose={() => setHandoverAssetId(null)}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
