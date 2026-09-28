// components/admin/ui/skeleton/skeleton-voucher-generator.tsx

/**
 * Loading state for Settings › Voucher Generator. Mirrors the page: centered
 * title, the generator card (type choice cards, quantity, summary + button)
 * and the voucher list (header + rows with code, meta and time-left chip).
 * Pulse is motion-safe only.
 */

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-white/[0.07] motion-safe:animate-pulse ${className}`} />;
}

const CODE_WIDTHS = ['w-44', 'w-48', 'w-40', 'w-44', 'w-48'];

export function SkeletonVoucherGenerator() {
  return (
    <div role="status" aria-label="Loading vouchers" className="min-h-screen pb-12 px-4 sm:px-6">
      <span className="sr-only">Loading vouchers…</span>
      <div className="mx-auto w-full max-w-3xl space-y-6">

        <div className="flex flex-col items-center gap-2">
          <Bar className="h-8 w-60" />
          <Bar className="h-4 w-64 max-w-full" />
        </div>

        {/* Generate Vouchers */}
        <div className="rounded-lg border border-[#1E2D45] bg-[#131C2E] p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <Bar className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="space-y-2 pt-0.5">
              <Bar className="h-4 w-40" />
              <Bar className="h-3 w-60 max-w-full" />
            </div>
          </div>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-[#1E2D45] bg-[#0E1628] p-3">
                  <Bar className="h-9 w-9 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Bar className="h-3.5 w-20" />
                    <Bar className="h-2.5 w-32" />
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full space-y-2 sm:w-1/2">
              <Bar className="h-3 w-16" />
              <Bar className="h-9 w-full" />
            </div>
            <div className="flex flex-col gap-3 border-t border-[#1E2D45] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Bar className="h-4 w-48" />
              <Bar className="h-10 w-full rounded-lg sm:w-32" />
            </div>
          </div>
        </div>

        {/* Voucher list */}
        <div className="overflow-hidden rounded-lg border border-[#1E2D45] bg-[#131C2E]">
          <div className="flex items-center justify-between border-b border-[#1E2D45] px-4 py-3 sm:px-5">
            <Bar className="h-4 w-24" />
            <Bar className="h-7 w-7" />
          </div>
          <div className="divide-y divide-[#1E2D45]">
            {CODE_WIDTHS.map((width, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Bar className="hidden h-9 w-9 shrink-0 sm:block" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Bar className={`h-4 max-w-full ${width}`} />
                  <Bar className="h-2.5 w-36" />
                </div>
                {i % 2 === 0 && <Bar className="h-6 w-20 shrink-0" />}
                <Bar className="h-7 w-7 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
