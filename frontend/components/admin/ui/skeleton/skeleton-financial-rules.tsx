// components/admin/ui/skeleton/skeleton-financial-rules.tsx

/**
 * Loading state for Settings › Financial Rules. Mirrors the page: centered
 * title + subtitle, the discount card (2x2 type tiles), the loyalty card
 * (input + read-back) and the Save button, in the page's own colors so the
 * content drops into place. Pulse is motion-safe only.
 */

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-white/[0.07] motion-safe:animate-pulse ${className}`} />;
}

function SectionHeading() {
  return (
    <div className="mb-4 flex items-start gap-3">
      <Bar className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="space-y-2 pt-0.5">
        <Bar className="h-4 w-48" />
        <Bar className="h-3 w-72 max-w-full" />
      </div>
    </div>
  );
}

export function SkeletonFinancialRules() {
  return (
    <div role="status" aria-label="Loading financial rules" className="min-h-screen pb-12 px-4 sm:px-6">
      <span className="sr-only">Loading financial rules…</span>
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="flex flex-col items-center gap-2">
          <Bar className="h-8 w-56" />
          <Bar className="h-4 w-72 max-w-full" />
        </div>

        {/* Commuter Discount Rates */}
        <div className="rounded-lg border border-[#1E2D45] bg-[#131C2E] p-4 sm:p-6">
          <SectionHeading />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-[#1E2D45] bg-[#0E1628] p-3">
                <Bar className="h-8 w-8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Bar className="h-3.5 w-24" />
                  <Bar className="h-2.5 w-32" />
                </div>
                <Bar className="h-9 w-24 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty Program */}
        <div className="rounded-lg border border-[#1E2D45] bg-[#131C2E] p-4 sm:p-6">
          <SectionHeading />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-full space-y-2 sm:max-w-56">
              <Bar className="h-3 w-36" />
              <Bar className="h-9 w-full" />
            </div>
            <Bar className="h-12 flex-1 rounded-lg" />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Bar className="h-12 w-full rounded-lg sm:w-44" />
        </div>
      </div>
    </div>
  );
}
