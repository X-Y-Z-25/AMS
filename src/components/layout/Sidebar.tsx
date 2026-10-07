import {
  LayoutDashboard,
  Laptop,
  Users,
  Package,
  UserCheck,
  ArrowLeftRight,
  Undo2,
  Wrench,
  Trash2,
  FileBarChart,
  ChevronLeft,
  Building2,
  ScanLine,
} from "lucide-react";
import { classNames } from "@/lib/utils";

export type PageKey =
  | "dashboard"
  | "assets"
  | "employees"
  | "stock"
  | "assignments"
  | "transfers"
  | "returns"
  | "exit-users"
  | "repairs"
  | "disposal"
  | "reports"
  | "scan"
  | "settings";

interface SidebarProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const navItems: {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  section?: string;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "assets", label: "Assets", icon: Laptop, section: "Inventory" },
  { key: "employees", label: "Employees", icon: Users },
  { key: "stock", label: "Stock", icon: Package },
  // Procurement is disabled until the Supabase inventory flow is ready.
  // { key: 'procurement', label: 'Procurement',  icon: ShoppingCart },
  {
    key: "assignments",
    label: "Assignments",
    icon: UserCheck,
    section: "Operations",
  },
  { key: "transfers", label: "Transfers", icon: ArrowLeftRight },
  { key: "returns", label: "Returns", icon: Undo2 },
  { key: "exit-users", label: "Exit Users", icon: UserCheck },
  { key: "repairs", label: "Repairs", icon: Wrench },
  { key: "disposal", label: "Disposal", icon: Trash2 },
  {
    key: "reports",
    label: "Reports",
    icon: FileBarChart,
    section: "Analytics",
  },
  { key: "scan", label: "QR / Scan", icon: ScanLine },
];

// Settings is disabled until the Supabase admin/configuration layer is implemented.
const bottomItems: {
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [];

export function Sidebar({
  current,
  onNavigate,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const renderItem = (item: (typeof navItems)[0]) => {
    const Icon = item.icon;
    const active = current === item.key;
    return (
      <li key={item.key}>
        <button
          onClick={() => onNavigate(item.key)}
          className={classNames(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
            active
              ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 border border-transparent",
            collapsed && "justify-center",
          )}
          title={collapsed ? item.label : undefined}
        >
          <Icon
            className={classNames(
              "h-5 w-5 flex-shrink-0 transition-colors",
              active
                ? "text-blue-400"
                : "text-slate-500 group-hover:text-slate-300",
            )}
          />
          {!collapsed && <span className="truncate">{item.label}</span>}
          {active && !collapsed && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse-slow" />
          )}
        </button>
      </li>
    );
  };

  let lastSection = "";
  const itemsWithDividers: JSX.Element[] = [];
  navItems.forEach((item) => {
    if (item.section && item.section !== lastSection && !collapsed) {
      lastSection = item.section;
      itemsWithDividers.push(
        <li key={`section-${item.section}`}>
          <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            {item.section}
          </p>
        </li>,
      );
    }
    itemsWithDividers.push(renderItem(item));
  });

  return (
    <aside
      className={classNames(
        "flex flex-col border-r border-slate-700/60 bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-slate-700/60 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-900/50">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-white">
                Asset Management System
              </p>
              <p className="truncate text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                Enterprise Edition
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">{itemsWithDividers}</ul>
      </nav>

      {/* Bottom Items */}
      <div className="border-t border-slate-700/60 px-2 py-2">
        <ul className="space-y-0.5">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onNavigate(item.key)}
                  className={classNames(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 border",
                    active
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-100 border-transparent",
                    collapsed && "justify-center",
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-700/60 p-2">
        <button
          onClick={onToggleCollapse}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-700/50 hover:text-slate-200 transition-all duration-150"
        >
          <ChevronLeft
            className={classNames(
              "h-5 w-5 flex-shrink-0 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
