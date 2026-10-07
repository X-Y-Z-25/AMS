import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  const start = (page - 1) * itemsPerPage + 1;
  const end = Math.min(page * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-3">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-300">{start}</span> to{' '}
        <span className="font-medium text-slate-300">{end}</span> of{' '}
        <span className="font-medium text-slate-300">{totalItems}</span> results
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Prev
        </Button>
        <span className="px-3 text-sm font-medium text-slate-400">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
