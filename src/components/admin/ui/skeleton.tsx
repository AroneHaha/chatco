"use client";

interface SkeletonMetricProps {
  count?: number;
}

export function SkeletonMetric({ count = 4 }: SkeletonMetricProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4 flex items-center gap-4 animate-pulse"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-700 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 rounded bg-gray-700" />
            <div className="h-5 w-16 rounded bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  count?: number;
  height?: string;
}

export function SkeletonCard({ count = 1, height = "200px" }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse"
          style={{ height }}
        />
      ))}
    </>
  );
}

interface SkeletonMapProps {
  height?: string;
  label?: string;
}

export function SkeletonMap({ height = "100%", label = "Loading…" }: SkeletonMapProps) {
  return (
    <div
      className="bg-[#131C2E] border border-[#1E2D45] rounded-lg flex items-center justify-center animate-pulse"
      style={{ height }}
    >
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  title?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, title }: SkeletonTableProps) {
  return (
    <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5">
      {title && (
        <div className="h-5 w-40 rounded bg-gray-700 animate-pulse mb-4" />
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-4 flex-1 rounded bg-gray-700 animate-pulse"
                style={{ maxWidth: `${100 / columns}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
