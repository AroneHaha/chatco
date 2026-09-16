"use client";

import SettingsContent from "@/components/conductor/settings/settings-content";

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
    <div className="min-h-screen bg-[#050F1A] pb-24 lg:pb-8 lg:pl-64 xl:pl-0">
      <SettingsContent />
    </div>
  );
}
