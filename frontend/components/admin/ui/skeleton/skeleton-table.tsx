"use client";

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  title?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, title }: SkeletonTableProps) {
  return (
    <div className="bg-[#131C2E] admin-light:bg-white border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-lg p-5 animate-pulse">
      {/* Title */}
      {title && (
        <div className="mb-4">
          <div className="h-5 w-48 rounded bg-gray-700 admin-light:bg-slate-200" />
        </div>
      )}

      {/* Header row */}
      <div className="flex gap-4 pb-3 border-b border-[#1E2D45] admin-light:border-[#E2E8F0]">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`h-${i}`} className="flex-1 h-3 rounded bg-gray-700 admin-light:bg-slate-200" />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="flex gap-4 py-3 border-b border-[#1E2D45]/50 admin-light:border-[#E2E8F0]"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={`c-${colIdx}`}
              className="flex-1 h-3 rounded bg-gray-700/60 admin-light:bg-slate-200"
            />
          ))}
        </div>
      ))}
    </div>
  );
}