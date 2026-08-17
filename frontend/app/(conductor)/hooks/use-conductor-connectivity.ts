"use client";

import { useEffect, useState } from "react";
import { syncPendingTransactions } from "@/lib/conductor/services/transactions.service";

/** Browser connectivity state plus a best-effort pending cash flush. */
export function useConductorConnectivity(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    const onOnline = () => {
      setIsOnline(true);
      void syncPendingTransactions();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void syncPendingTransactions();
    const retry = window.setInterval(() => {
      if (navigator.onLine) void syncPendingTransactions();
    }, 15000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.clearInterval(retry);
    };
  }, []);

  return isOnline;
}
