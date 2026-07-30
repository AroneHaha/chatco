'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  label?: string;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  from,
  to,
  total,
  label = 'records',
  onPageChange,
}: TablePaginationProps) {
  return (
    <div className="flex min-h-14 flex-col items-center justify-between gap-3 border-t border-[#1E2D45] pt-4 text-xs text-slate-500 sm:flex-row">
      <p>
        Showing <span className="font-medium text-slate-300">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-300">{total}</span> {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="rounded-md border border-[#1E2D45] bg-[#0E1628] p-2 text-slate-400 transition-colors hover:bg-[#1A2540] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-28 rounded-md bg-[#62A0EA]/15 px-4 py-2 text-center font-medium text-[#62A0EA]">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="rounded-md border border-[#1E2D45] bg-[#0E1628] p-2 text-slate-400 transition-colors hover:bg-[#1A2540] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
