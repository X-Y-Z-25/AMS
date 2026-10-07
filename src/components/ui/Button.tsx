import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:   'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500 shadow-lg shadow-blue-900/30',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 focus-visible:ring-slate-500 shadow-sm',
  outline:   'border border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700/60 hover:text-white focus-visible:ring-slate-500',
  ghost:     'text-slate-400 hover:bg-slate-700/60 hover:text-slate-100 focus-visible:ring-slate-500',
  danger:    'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500 shadow-lg shadow-red-900/30',
  success:   'bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500 shadow-lg shadow-emerald-900/30',
  warning:   'bg-amber-600 text-white hover:bg-amber-500 focus-visible:ring-amber-500 shadow-lg shadow-amber-900/30',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', icon, children, className, loading, disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={classNames(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}
