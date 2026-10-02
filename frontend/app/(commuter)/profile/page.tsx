"use client";

import ProfileContent from "@/components/commuter/profile/profile-content";

/**
 * Full-page Profile — used below xl:, from the lg: sidebar, and for anyone
 * linking or refreshing directly into /profile. At xl:+, CommuterDock opens
 * the same view as a popover instead (CommuterProfileModal), mirroring the
 * conductor's Settings; both render ProfileContent, which owns the logic.
 */
export default function ProfilePage() {
  return <ProfileContent />;
}
