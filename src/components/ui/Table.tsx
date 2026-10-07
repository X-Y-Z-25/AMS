import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, TableHTMLAttributes } from 'react';
import { classNames } from '@/lib/utils';

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  children: ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/60">
      <table className={classNames('w-full text-left text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700/60">
      {children}
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-700/40 bg-slate-800/40">{children}</tbody>;
}

export function TR({ children, className, onClick, ...props }: { children: ReactNode; className?: string; onClick?: () => void } & Record<string, unknown>) {
  return (
    <tr
      className={classNames(
        'transition-colors duration-100 hover:bg-slate-700/30',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      {...(props as object)}
    >
      {children}
    </tr>
  );
}

export function TH({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th className={classNames('whitespace-nowrap px-4 py-3 font-semibold text-slate-400', className)} {...props}>
      {children}
    </th>
  );
}

export function TD({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <td className={classNames('whitespace-nowrap px-4 py-3 text-slate-300', className)} {...props}>
      {children}
    </td>
  );
}
