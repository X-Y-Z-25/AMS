import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  ScanLine,
  CircleUser,
  Laptop,
  Settings,
} from "lucide-react";
import {
  fetchAssetsFromSupabase,
  fetchEmployeesFromSupabase,
} from "@/lib/supabaseData";
import { getInitials, classNames } from "@/lib/utils";
import type { PageKey } from "./Sidebar";
import type { Asset, Employee } from "@/types";

interface HeaderProps {
  onNavigate: (page: PageKey) => void;
  onAssetSelect: (assetId: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
}

interface SearchResult {
  type: "asset" | "employee";
  id: string;
  title: string;
  subtitle: string;
  detail: string;
}

const notifIcons: Record<string, string> = {
  warranty: "⚠️",
  disposal: "🗑️",
  repair: "🔧",
  procurement: "📦",
  return: "↩️",
  info: "ℹ️",
};

export function Header({
  onNavigate,
  onAssetSelect,
  onEmployeeSelect,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [liveAssets, setLiveAssets] = useState<Asset[]>([]);
  const [liveEmployees, setLiveEmployees] = useState<Employee[]>([]);
  const [notifList, setNotifList] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      type:
        | "info"
        | "warranty"
        | "repair"
        | "return"
        | "disposal"
        | "procurement";
      time: string;
      read: boolean;
    }>
  >([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [assets, employees] = await Promise.all([
          fetchAssetsFromSupabase(),
          fetchEmployeesFromSupabase(),
        ]);
        setLiveAssets(assets);
        setLiveEmployees(employees);
      } catch {
        setLiveAssets([]);
        setLiveEmployees([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];
    liveAssets.forEach((a) => {
      if (
        a.id.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        a.serviceTag.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.assignedToEmployeeName?.toLowerCase().includes(q) ||
        a.assignedToEmployeeId?.toLowerCase().includes(q)
      ) {
        results.push({
          type: "asset",
          id: a.id,
          title: a.name,
          subtitle: `${a.id} · ${a.assignedToEmployeeName || "Unassigned"}`,
          detail: `${a.location} · ${a.status}`,
        });
      }
    });
    liveEmployees.forEach((e) => {
      if (
        e.id.toLowerCase().includes(q) ||
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
      ) {
        const count = liveAssets.filter(
          (a) => a.assignedToEmployeeId === e.id,
        ).length;
        results.push({
          type: "employee",
          id: e.id,
          title: e.fullName,
          subtitle: `${e.id} · ${e.department}`,
          detail: `${count} Assets`,
        });
      }
    });
    setSearchResults(results.slice(0, 8));
  }, [searchQuery, liveAssets, liveEmployees]);

  const unreadCount = notifList.filter((n) => !n.read).length;

  const handleResultClick = (result: SearchResult) => {
    setShowSearch(false);
    setSearchQuery("");
    if (result.type === "asset") onAssetSelect(result.id);
    else onEmployeeSelect(result.id);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-700/60 bg-slate-900/95 backdrop-blur-xl px-4 lg:px-6">
      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            placeholder="Search assets, employees, serial numbers, service tags..."
            className="h-10 w-full rounded-xl border border-slate-700/60 bg-slate-800/80 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        {showSearch && searchQuery && (
          <div className="absolute top-full mt-2 w-full rounded-xl border border-slate-700/60 bg-slate-800 shadow-2xl shadow-black/50 z-50 animate-slide-up overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No results for "{searchQuery}"
              </div>
            ) : (
              <ul className="py-1.5 max-h-96 overflow-y-auto">
                {searchResults.map((result) => (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => handleResultClick(result)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <span
                        className={classNames(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                          result.type === "asset"
                            ? "bg-blue-600/20 text-blue-400"
                            : "bg-emerald-600/20 text-emerald-400",
                        )}
                      >
                        {result.type === "asset" ? (
                          <Laptop className="h-4 w-4" />
                        ) : (
                          getInitials(result.title)
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <span className="text-xs text-slate-600 flex-shrink-0">
                        {result.detail}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 lg:gap-2.5">
        <button
          onClick={() => onNavigate("scan")}
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-700/60 px-3 text-sm font-medium text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
          title="Scan QR / Barcode"
        >
          <ScanLine className="h-5 w-5" />
          <span className="hidden lg:inline">Scan</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 lg:w-96 rounded-xl border border-slate-700/60 bg-slate-800 shadow-2xl shadow-black/50 z-50 animate-slide-up overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
                <h3 className="text-sm font-semibold text-white">
                  Notifications
                </h3>
                <button
                  onClick={() =>
                    setNotifList(notifList.map((n) => ({ ...n, read: true })))
                  }
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Mark all read
                </button>
              </div>
              <ul className="max-h-96 overflow-y-auto">
                {notifList.map((n) => (
                  <li
                    key={n.id}
                    className={classNames(
                      "border-b border-slate-700/30 px-4 py-3 hover:bg-slate-700/30 transition-colors cursor-pointer",
                      !n.read && "bg-blue-600/5",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-base flex-shrink-0">
                        {notifIcons[n.type] || "ℹ️"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-100">
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{n.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Settings shortcut */}
        <button
          onClick={() => onNavigate("settings")}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-all"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-10 items-center gap-2 rounded-xl pl-1 pr-2 hover:bg-slate-700/50 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-bold shadow-lg">
              IT
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-100">IT Admin</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <ChevronDown className="hidden md:block h-4 w-4 text-slate-500" />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-700/60 bg-slate-800 shadow-2xl shadow-black/50 z-50 animate-slide-up overflow-hidden">
              <div className="border-b border-slate-700/60 px-4 py-3">
                <p className="text-sm font-semibold text-white">IT Admin</p>
                <p className="text-xs text-slate-500">admin@company.in</p>
              </div>
              <ul className="py-1.5">
                <li>
                  <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors">
                    <CircleUser className="h-4 w-4" /> Profile
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate("settings");
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 transition-colors"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
