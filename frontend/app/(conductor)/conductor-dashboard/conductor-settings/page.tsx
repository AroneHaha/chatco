"use client";

import SettingsContent from "@/components/conductor/settings/settings-content";
import ThemeToggle from "@/components/commuter/profile/profile-theme-toggle";

/**
 * Full-page Settings — kept for phones/tablets (below xl:) and for anyone
 * linking or refreshing directly into this URL. At xl:+, ConductorDock
 * opens the same view as a popover instead (ConductorSettingsModal) so the
 * conductor doesn't navigate away from whatever tab they were on; both
 * shells render the exact same SettingsContent, which owns all of the
 * actual settings/logout logic.
 */
export default function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#050F1A] lg:pl-64 xl:pl-0">
      <div className="mx-auto flex w-full max-w-4xl shrink-0 items-start justify-between gap-4 px-4 pt-6 lg:pt-8">
        <div className="min-w-0">
          <h1 className="text-white font-bold text-xl lg:text-2xl">Settings</h1>
          <p className="text-white/40 text-sm mt-1">Manage your app preferences and account</p>
        </div>
        <ThemeToggle />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-8">
        <SettingsContent showHeader={false} />
      </div>
    </div>
  );
}
