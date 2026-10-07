import type { ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={classNames(
        'rounded-xl border border-slate-700/60 bg-slate-800/80 shadow-lg backdrop-blur-sm',
        onClick && 'cursor-pointer transition-all duration-200 hover:shadow-blue-900/20 hover:shadow-xl hover:border-slate-600/80 hover:-translate-y-0.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={classNames('flex items-center justify-between border-b border-slate-700/60 px-5 py-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, iconBg, iconColor, trend, trendUp, onClick }: StatCardProps) {
  return (
    <Card onClick={onClick} className="p-5 glow-blue-hover transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p className={classNames('mt-1 text-xs font-medium', trendUp ? 'text-emerald-400' : 'text-slate-500')}>
              {trend}
            </p>
          )}
        </div>
        <div className={classNames('flex h-12 w-12 items-center justify-center rounded-xl', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </Card>
  );
}
