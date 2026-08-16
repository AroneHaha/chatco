"use client";

import { useEffect, useState } from "react";

/** Shared connectivity indicator for every conductor screen. */
export default function ConductorConnectivityBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(window.navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div role="status" className="sticky top-0 z-[45] border-b border-amber-400/30 bg-amber-950/95 px-4 py-2 text-center text-xs font-medium text-amber-100">
      Offline mode: cash fares are saved on this device and will sync when the connection returns. GCash is unavailable.
    </div>
  );
}
