"use client";

import { useEffect, useState } from "react";
import { CONDUCTOR_API } from "@/lib/conductor/endpoints";

export interface ConductorProfile {
  name: string | null;
  username: string | null;
  email: string | null;
  /** Public R2 URL of the photo admin uploaded; null shows the default avatar. */
  photoUrl: string | null;
}

// One request per page load, shared by every avatar in the shell (sidebar,
// dock, dashboard card/bar, Settings). Logout reloads the page, so the cache
// never carries one conductor's profile into another account.
let cachedProfile: ConductorProfile | null = null;
let inFlight: Promise<ConductorProfile | null> | null = null;

function loadConductorProfile(): Promise<ConductorProfile | null> {
  if (!inFlight) {
    inFlight = fetch(CONDUCTOR_API.profile, { headers: { Accept: "application/json" } })
      .then(response => (response.ok ? response.json() : null))
      .then(json => {
        const data = json?.data;
        if (!data) {
          // Let the next mount retry instead of caching the failure.
          inFlight = null;
          return null;
        }
        cachedProfile = {
          name: data.name ?? null,
          username: data.username ?? null,
          email: data.email ?? null,
          photoUrl: data.profile_picture_url || null,
        };
        return cachedProfile;
      })
      .catch(() => {
        inFlight = null;
        return null;
      });
  }
  return inFlight;
}

/** The signed-in conductor's profile; null until it loads or if it fails. */
export function useConductorProfile(): ConductorProfile | null {
  const [profile, setProfile] = useState<ConductorProfile | null>(cachedProfile);

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
