import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
import { LoginPage } from "@/pages/LoginPage";
import { supabase, supabaseConfig } from "@/lib/supabase";
import type { AppUserProfile } from "@/lib/auth";
import type { Location } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { hasDellCredentials } from "@/lib/dellApi";
import { syncUncachedDellWarranties } from "@/lib/dellWarrantySync";

function AppContent({
  profile,
  onSignOut,
}: {
  profile: AppUserProfile;
  onSignOut: () => void;
}) {
  const { showToast } = useToast();
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
  const [locationFilter, setLocationFilter] = useState<Location | null>(null);
  const [assetDataVersion, setAssetDataVersion] = useState(0);

  useEffect(() => {
    if (!hasDellCredentials()) return;

    syncUncachedDellWarranties()
      .then((checkedCount) => {
        if (checkedCount > 0) {
          setAssetDataVersion((version) => version + 1);
          showToast(
            `Dell warranty checked and saved for ${checkedCount} asset(s).`,
            "success",
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Dell warranty sync failed:", error);
        showToast(
          error instanceof Error
            ? error.message
            : "Dell warranty could not be checked and saved.",
          "warning",
        );
      });
  }, [showToast]);

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
            profile={profile}
          />
        );
      case "employees":
        return (
          <EmployeesPage
            selectedEmployeeId={selectedEmployeeId}
            onEmployeeSelect={handleEmployeeSelect}
            onAssetSelect={handleAssetSelect}
            onAction={handleAction}
            profile={profile}
            refreshVersion={assetDataVersion}
          />
        );
      case "stock":
        return <StockPage />;
      // Procurement is postponed until the Supabase schema and procurement tables are live.
      // case 'procurement':
      //   return <ProcurementPage />;
      case "assignments":
        return (
          <AssignmentsPage
            onAssetSelect={handleAssetSelect}
            refreshVersion={assetDataVersion}
          />
        );
      case "transfers":
        return (
          <TransfersPage
            onAssetSelect={handleAssetSelect}
            onComplete={() => setAssetDataVersion((version) => version + 1)}
            refreshVersion={assetDataVersion}
            profile={profile}
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
      profile={profile}
      onSignOut={onSignOut}
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
        receivedBy={profile.username}
      />
    </Layout>
  );
}

function AuthenticatedApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setProfileError(error.message);
        }
        setSession(data.session);
        setIsCheckingSession(false);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setProfileError(
          error instanceof Error ? error.message : "Could not check login status.",
        );
        setIsCheckingSession(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setProfileError("");
      if (!nextSession) {
        setProfile(null);
        setIsLoadingProfile(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setProfile(null);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError("");
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("app_users")
          .select("user_id, username, gmail")
          .eq("user_id", session.user.id)
          .single();
        if (cancelled) return;
        if (error) {
          setProfileError(
            error.code === "PGRST116"
              ? "This login has no app profile yet. Ask an administrator to add your username and Gmail in Supabase."
              : `Could not load your app profile: ${error.message}`,
          );
          setProfile(null);
          return;
        }
        setProfile({
          userId: data.user_id,
          username: data.username,
          gmail: data.gmail,
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setProfileError(
          error instanceof Error ? error.message : "Could not load your profile.",
        );
        setProfile(null);
      } finally {
        if (!cancelled) setIsLoadingProfile(false);
      }
    };
    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setProfileError(`Could not sign out: ${error.message}`);
  };

  if (!supabaseConfig.isConfigured) {
    return (
      <LoginPage
        error="Supabase is not configured. Add the Supabase URL and publishable key to the app environment."
      />
    );
  }

  if (isCheckingSession || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
        Checking secure session...
      </div>
    );
  }

  if (!session) {
    return <LoginPage error={profileError || undefined} />;
  }

  if (profileError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
          <h1 className="text-xl font-semibold text-white">Profile setup required</h1>
          <p className="mt-3 text-sm text-rose-300">
            {profileError || "The signed-in account does not have an app profile."}
          </p>
          <button
            onClick={() => void handleSignOut()}
            className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppContent
      profile={profile}
      onSignOut={handleSignOut}
    />
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthenticatedApp />
    </ToastProvider>
  );
}
