// components/admin/ui/skeleton/skeleton-fare-matrix.tsx

/**
 * Loading state for Settings › Fare Matrix. Mirrors the real page section by
 * section (header, route picker, route editor, fare info, calculator, search,
 * point list) with the same card colors, radii and heights, so the content
 * drops into place instead of the layout jumping when data arrives.
 * Pulse is motion-safe only (off under prefers-reduced-motion).
 */

const CARD = 'rounded-2xl border border-white/[0.06] bg-[#071A2E]';
const INSET = 'rounded-xl border border-white/5 bg-[#050F1A]/60';

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-white/[0.07] motion-safe:animate-pulse ${className}`} />;
}

// Varied name widths so the list reads as real rows, not a repeated block.
const ROW_NAME_WIDTHS = ['w-40', 'w-56', 'w-32', 'w-48', 'w-44', 'w-36', 'w-52'];

export function SkeletonFareMatrix() {
  return (
    <div role="status" aria-label="Loading fare matrix" className="min-h-screen pb-12 px-4 sm:px-6">
      <span className="sr-only">Loading fare matrix…</span>
      <div className="mx-auto w-full max-w-5xl space-y-6">

        {/* Header: title + point count, Refresh + Add Point Area */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Bar className="h-8 w-72 max-w-full" />
            <Bar className="h-4 w-52" />
          </div>
          <div className="flex items-center gap-2">
            <Bar className="h-11 w-11 shrink-0 rounded-xl" />
            <Bar className="h-11 w-full rounded-xl sm:w-40" />
          </div>
        </div>

        {/* Managed Route picker */}
        <div className={`${CARD} p-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Bar className="h-2.5 w-24" />
              <Bar className="h-11 w-full rounded-xl" />
            </div>
            <Bar className="h-11 w-full rounded-xl sm:w-32" />
            <Bar className="h-11 w-full rounded-xl sm:w-36" />
          </div>
        </div>

        {/* Published Route Editor: title + help text, live-version box, then
            the map with its 320px control sidebar (stacked below xl). */}
        <div className="space-y-4 rounded-2xl border border-[#62A0EA]/20 bg-[#071A2E] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bar className="h-5 w-5 rounded" />
                <Bar className="h-4 w-44" />
              </div>
              <Bar className="h-3 w-[28rem] max-w-full" />
              <Bar className="h-3 w-80 max-w-full" />
            </div>
            <Bar className="h-12 w-40 shrink-0 rounded-xl" />
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-120 rounded-2xl border border-white/10 bg-[#050F1A]/60 motion-safe:animate-pulse" />
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`${INSET} space-y-2 p-3`}>
                  <Bar className="h-2.5 w-24" />
                  <Bar className="h-9 w-full rounded-lg" />
                </div>
              ))}
              <Bar className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Barangay-Based Fare System */}
        <div className={`${CARD} p-5`}>
          <div className="mb-4 flex items-center gap-3">
            <Bar className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="space-y-2">
              <Bar className="h-3.5 w-48" />
              <Bar className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${INSET} flex flex-col items-center gap-2 px-4 py-3`}>
                <Bar className="h-2.5 w-16" />
                <Bar className="h-6 w-20" />
                <Bar className="h-2.5 w-24 max-w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Fare Calculator Preview */}
        <div className={`${CARD} p-5`}>
          <Bar className="mb-4 h-3 w-44" />
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-2">
                <Bar className="h-2.5 w-24" />
                <Bar className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <Bar className="mx-auto h-3 w-52" />
        </div>

        {/* Search + count */}
        <div className="space-y-3">
          <Bar className="h-12 w-full rounded-xl" />
          <div className="flex items-center justify-between px-1">
            <Bar className="h-2.5 w-28" />
            <Bar className="h-2.5 w-40" />
          </div>
        </div>

        {/* Point areas list */}
        <div className={`${CARD} divide-y divide-white/5 overflow-hidden`}>
          {ROW_NAME_WIDTHS.map((width, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Bar className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bar className={`h-3.5 max-w-full ${width}`} />
                {i < 3 && <Bar className="h-2 w-20" />}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="flex flex-col items-end gap-1.5">
                  <Bar className="h-3 w-14" />
                  <Bar className="h-2.5 w-12" />
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  {[0, 1, 2, 3].map((j) => <Bar key={j} className="h-6 w-6 rounded-md" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
