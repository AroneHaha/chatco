// components/admin/ui/skeleton/skeleton-operations-rules.tsx

/**
 * Loading state for Settings › Operations Rules. Mirrors the page: centered
 * title, two SettingsSection cards of two field tiles each, the reminder
 * timeline strip and the Save button. Pulse is motion-safe only.
 */

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-white/[0.07] motion-safe:animate-pulse ${className}`} />;
}

function Section({ withTimeline = false }: { withTimeline?: boolean }) {
  return (
    <div className="rounded-lg border border-[#1E2D45] bg-[#131C2E] p-4 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <Bar className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="space-y-2 pt-0.5">
          <Bar className="h-4 w-44" />
          <Bar className="h-3 w-72 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-[#1E2D45] bg-[#0E1628]/60 p-3">
            <div className="flex items-start gap-3">
              <Bar className="h-8 w-8 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bar className="h-3.5 w-32" />
                <Bar className="h-2.5 w-full max-w-56" />
              </div>
            </div>
            <Bar className="h-9 w-full" />
          </div>
        ))}
      </div>
      {withTimeline && <Bar className="mt-4 h-11 w-full rounded-lg" />}
    </div>
  );
}

export function SkeletonOperationsRules() {
  return (
    <div role="status" aria-label="Loading operations rules" className="min-h-screen pb-12 px-4 sm:px-6">
      <span className="sr-only">Loading operations rules…</span>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Bar className="h-8 w-72 max-w-full" />
          <Bar className="h-4 w-64 max-w-full" />
        </div>
        <Section />
        <Section withTimeline />
        <div className="flex justify-center pt-2">
          <Bar className="h-12 w-full rounded-lg sm:w-44" />
        </div>
      </div>
    </div>
  );
}
