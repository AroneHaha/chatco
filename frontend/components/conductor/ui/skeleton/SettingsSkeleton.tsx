// No min-h-screen/sidebar padding here — this is embedded inside
// SettingsContent, which is itself embedded inside either the full page's
// own page-chrome wrapper or ConductorSettingsModal's bounded popover
// panel; either owns the outer sizing. No animate-pulse either — a static
// placeholder, not a pulsing one.
export function SettingsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8 space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-white/[0.06] rounded" />
        <div className="h-4 w-56 bg-white/[0.04] rounded" />
      </div>
      {[1, 2, 3].map((item) => (
        <div key={item} className="bg-[#071A2E] border border-white/[0.06] rounded-2xl p-6 h-36" />
      ))}
    </div>
  );
}
