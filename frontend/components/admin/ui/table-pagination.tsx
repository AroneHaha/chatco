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
    <div className="flex min-h-10 flex-col items-center justify-between gap-2 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-2 text-xs text-slate-500 sm:flex-row">
      <p>
        Showing <span className="font-medium text-slate-300 admin-light:text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-300 admin-light:text-slate-700">{total}</span> {label}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F1F5F9] p-2 text-slate-400 admin-light:text-slate-500 transition-colors hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-24 rounded-md bg-[#62A0EA]/15 admin-light:bg-[#1A5FB4]/10 px-3 py-1.5 text-center font-medium text-[#62A0EA] admin-light:text-[#1A5FB4]">
          Page {currentPage} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-[#F1F5F9] p-2 text-slate-400 admin-light:text-slate-500 transition-colors hover:bg-[#1A2540] admin-light:hover:bg-[#EEF2F7] hover:text-white admin-light:hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
