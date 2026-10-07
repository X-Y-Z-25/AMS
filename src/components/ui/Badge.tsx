import type { ReactNode } from 'react';
import { classNames } from '@/lib/utils';

interface BadgeProps {
  className?: string;
  children: ReactNode;
}

export function Badge({ className, children }: BadgeProps) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        className,
      )}
    >
      {children}
    </span>
  );
}
