"use client";

import { useEffect, useState } from "react";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";

export interface ConductorProfile {
  name: string | null;
  username: string | null;
  email: string | null;
  /** Public R2 URL of the uploaded photo; null shows the default avatar. */
  photoUrl: string | null;
}

// One request per page load, shared by every avatar in the shell (sidebar,
// dock, dashboard card/bar, Settings). Logout reloads the page, so the cache
// never carries one conductor's profile into another account.
let cachedProfile: ConductorProfile | null = null;
let inFlight: Promise<ConductorProfile | null> | null = null;
let profileRevision = 0;
const PROFILE_UPDATED_EVENT = "conductor:profile-updated";

function loadConductorProfile(): Promise<ConductorProfile | null> {
  if (!inFlight) {
    const requestRevision = profileRevision;
    inFlight = fetch(CONDUCTOR_API.profile, { headers: { Accept: "application/json" } })
      .then(response => (response.ok ? response.json() : null))
      .then(json => {
        const data = json?.data;
        if (!data) {
          // Let the next mount retry instead of caching the failure.
          if (requestRevision === profileRevision) inFlight = null;
          return cachedProfile;
        }
        const loadedProfile: ConductorProfile = {
          name: data.name ?? null,
          username: data.username ?? null,
          email: data.email ?? null,
          photoUrl: data.profile_picture_url || null,
        };
        // An upload may complete while this initial GET is in flight. Keep
        // the newer uploaded URL instead of restoring the stale response.
        if (requestRevision === profileRevision) {
          cachedProfile = loadedProfile;
          inFlight = null;
        }
        return cachedProfile;
      })
      .catch(() => {
        if (requestRevision === profileRevision) inFlight = null;
        return cachedProfile;
      });
  }
  return inFlight;
}

/** Update the shared shell/profile cache after a self-service image upload. */
export function patchConductorProfile(patch: Partial<ConductorProfile>): void {
  cachedProfile = {
    name: null,
    username: null,
    email: null,
    photoUrl: null,
    ...cachedProfile,
    ...patch,
  };
  profileRevision += 1;
  inFlight = null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

/** The signed-in conductor's profile; null until it loads or if it fails. */
export function useConductorProfile(): ConductorProfile | null {
  const [profile, setProfile] = useState<ConductorProfile | null>(cachedProfile);

  useEffect(() => {
    const handleProfileUpdated = () => setProfile(cachedProfile);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdated);
  }, []);

  useEffect(() => {
    if (cachedProfile) return;
    let active = true;
    void loadConductorProfile().then(loaded => {
      if (active && loaded) setProfile(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return profile;
}
