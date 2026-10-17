// components/admin/ui/skeleton/skeleton-fare-matrix.tsx

/**
 * Loading state for Settings › Fare Matrix. Mirrors the real page section by
 * section (header, route picker, route editor, fare info, calculator, search,
 * point list) with the same card colors, radii and heights, so the content
 * drops into place instead of the layout jumping when data arrives.
 * Pulse is motion-safe only (off under prefers-reduced-motion).
 */

const CARD = 'rounded-2xl border border-white/[0.06] admin-light:border-[#E2E8F0] bg-[#071A2E] admin-light:bg-white';
const INSET = 'rounded-xl border border-white/5 admin-light:border-[#E2E8F0] bg-[#050F1A]/60 admin-light:bg-[#F8FAFC]';

function Bar({ className }: { className: string }) {
  return <div className={`max-w-full rounded-md bg-white/[0.07] admin-light:bg-slate-200 motion-safe:animate-pulse ${className}`} />;
}

// Varied name widths so the list reads as real rows, not a repeated block.
const ROW_NAME_WIDTHS = ['w-40', 'w-56', 'w-32', 'w-48', 'w-44', 'w-36', 'w-52'];

export function SkeletonFareRouteEditor() {
  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-[#62A0EA]/20 admin-light:border-[#1A5FB4]/20 bg-[#071A2E] admin-light:bg-white p-5">
      <div className="flex flex-col gap-3 @[40rem]/fare-matrix:flex-row @[40rem]/fare-matrix:items-start @[40rem]/fare-matrix:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Bar className="h-5 w-5 rounded" />
            <Bar className="h-4 w-44" />
          </div>
          <Bar className="h-3 w-[28rem] max-w-full" />
          <Bar className="h-3 w-80 max-w-full" />
        </div>
        <Bar className="h-12 w-40 shrink-0 rounded-xl" />
      </div>
      <div className="grid min-w-0 gap-4 @[56rem]/fare-matrix:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-120 min-w-0 rounded-2xl border border-white/10 admin-light:border-[#CBD5E1] bg-[#050F1A]/60 admin-light:bg-[#F8FAFC] motion-safe:animate-pulse" />
        <div className="min-w-0 space-y-3">
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
  );
}

export function SkeletonFareMatrix() {
  return (
    <div role="status" aria-label="Loading fare matrix" className="min-h-screen pb-12 px-4 sm:px-6">
      <span className="sr-only">Loading fare matrix…</span>
      <div className="@container/fare-matrix mx-auto min-w-0 w-full max-w-5xl space-y-6">

        {/* Header: title + point count, Refresh + Add Point Area */}
        <div className="flex flex-col gap-4 @[40rem]/fare-matrix:flex-row @[40rem]/fare-matrix:items-center @[40rem]/fare-matrix:justify-between">
          <div className="min-w-0 space-y-2">
            <Bar className="h-8 w-72 max-w-full" />
            <Bar className="h-4 w-52" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Bar className="h-11 w-11 shrink-0 rounded-xl" />
            <Bar className="h-11 w-full rounded-xl @[40rem]/fare-matrix:w-40" />
          </div>
        </div>

        {/* Managed Route picker */}
        <div className={`${CARD} p-4`}>
          <div className="grid grid-cols-1 items-end gap-3 @[20rem]/fare-matrix:grid-cols-2 @[48rem]/fare-matrix:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="min-w-0 space-y-2 @[20rem]/fare-matrix:col-span-2 @[48rem]/fare-matrix:col-span-1">
              <Bar className="h-2.5 w-24" />
              <Bar className="h-11 w-full rounded-xl" />
            </div>
            <Bar className="h-11 w-full rounded-xl @[48rem]/fare-matrix:w-32" />
            <Bar className="h-11 w-full rounded-xl @[48rem]/fare-matrix:w-36" />
          </div>
        </div>

        {/* Published Route Editor: title + help text, live-version box, then
            the map with its 320px control sidebar (stacked in narrow panels). */}
        <SkeletonFareRouteEditor />

        {/* Barangay-Based Fare System */}
        <div className={`${CARD} p-5`}>
          <div className="mb-4 flex items-center gap-3">
            <Bar className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
              <Bar className="h-3.5 w-48" />
              <Bar className="h-3 w-72 max-w-full" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 @[28rem]/fare-matrix:grid-cols-3">
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
          <div className="mb-4 grid grid-cols-1 gap-3 @[32rem]/fare-matrix:grid-cols-2">
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <Bar className="h-2.5 w-28" />
            <Bar className="h-2.5 w-40" />
          </div>
        </div>

        {/* Point areas list */}
        <div className={`${CARD} divide-y divide-white/5 admin-light:divide-[#E2E8F0] overflow-hidden`}>
          {ROW_NAME_WIDTHS.map((width, i) => (
            <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3.5 @[32rem]/fare-matrix:grid-cols-[2rem_minmax(0,1fr)_auto]">
              <Bar className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bar className={`h-3.5 max-w-full ${width}`} />
                {i < 3 && <Bar className="h-2 w-20" />}
              </div>
              <div className="col-start-2 flex min-w-0 items-center justify-between gap-3 @[32rem]/fare-matrix:col-start-auto @[32rem]/fare-matrix:justify-end">
                <div className="flex shrink-0 flex-col gap-1.5 @[32rem]/fare-matrix:items-end">
                  <Bar className="h-3 w-14" />
                  <Bar className="h-2.5 w-12" />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
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
