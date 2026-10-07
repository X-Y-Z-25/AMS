import { type ReactNode } from 'react';
import { Sidebar, type PageKey } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  onAssetSelect: (assetId: string) => void;
  onEmployeeSelect: (employeeId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: ReactNode;
}

export function Layout({
  current,
  onNavigate,
  onAssetSelect,
  onEmployeeSelect,
  collapsed,
  onToggleCollapse,
  children,
}: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        current={current}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onNavigate={onNavigate}
          onAssetSelect={onAssetSelect}
          onEmployeeSelect={onEmployeeSelect}
        />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          <div className="mx-auto max-w-[1600px] p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
