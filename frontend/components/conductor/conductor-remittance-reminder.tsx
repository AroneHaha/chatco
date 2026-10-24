"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { list, markAllRead, type Announcement } from "@/lib/shared/services/announcement.service";

const REMINDER_TYPE = "REMITTANCE_REMINDER";
// remittances:send-reminders runs every 5 minutes and the admin's repeat
// interval is at least 5, so checking once a minute shows a reminder
// promptly without a steady stream of requests.
const POLL_MS = 60_000;

/**
 * Remittance reminder popup for the conductor layout. The backend command
 * stores each reminder as a personal REMITTANCE_REMINDER notice; there is no
 * notifications module on the conductor side, so the newest unread one is
 * shown here as a modal. Dismissing marks the reminders read, and the next
 * one appears after the repeat interval set in Admin › Operations Rules.
 * Declaring the shift's cash marks its reminders read on the backend, so a
 * settled shift never pops up.
 */
export default function ConductorRemittanceReminder({ canOpenPopover }: { canOpenPopover: boolean }) {
  const router = useRouter();
  const [reminders, setReminders] = useState<Announcement[]>([]);
  // Hidden locally even if marking them read failed, so a network hiccup
  // can't re-open the same reminder on the next poll.
  const dismissedRef = useRef(new Set<string>());

  const check = useCallback(async (signal?: AbortSignal) => {
    try {
      const page = await list({
        unreadOnly: true,
        notificationsOnly: true,
        types: [REMINDER_TYPE],
        perPage: 10,
        signal,
      });
      setReminders(page.items.filter((item) => !dismissedRef.current.has(item.id)));
    } catch {
      // Polling is best effort; the next tick tries again.
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    const run = () => {
      if (document.visibilityState !== "visible") return;
      controller.abort();
      controller = new AbortController();
      void check(controller.signal);
    };
    run();
    const interval = setInterval(run, POLL_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", run);
      controller.abort();
    };
  }, [check]);

  const dismiss = useCallback(() => {
    reminders.forEach((item) => dismissedRef.current.add(item.id));
    setReminders([]);
    markAllRead({ types: [REMINDER_TYPE] }).catch(() => {});
  }, [reminders]);

  const viewReport = useCallback(() => {
    dismiss();
    // xl:+ opens the End-of-Day popover (see ConductorEndOfDayModal); smaller
    // screens use the full page, the same split ConductorDock follows. The
    // popover isn't mounted on unit verification, so that page navigates.
    if (canOpenPopover && window.matchMedia("(min-width: 1280px)").matches) {
      window.dispatchEvent(new CustomEvent("conductor:open-end-of-day"));
    } else {
      router.push("/conductor-dashboard/end-of-day");
    }
  }, [canOpenPopover, dismiss, router]);

  useEffect(() => {
    if (reminders.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reminders.length, dismiss]);

  if (reminders.length === 0) return null;

  const latest = reminders[0];
  const shiftCount = new Set(reminders.map((item) => item.referenceId ?? item.id)).size;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={dismiss} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remittance-reminder-title"
        aria-describedby="remittance-reminder-message"
        className="relative w-full overflow-hidden rounded-t-2xl border border-[#1E2D45] bg-[#071A2E] pb-safe shadow-2xl animate-fade-in sm:max-w-sm sm:rounded-2xl light:border-gray-200 light:bg-white"
      >
        <div className="p-6 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40 light:text-gray-500">
            Remittance reminder
          </p>
          <h3 id="remittance-reminder-title" className="mt-1.5 text-lg font-bold text-white light:text-gray-900">
            {latest.title}
          </h3>
          <p id="remittance-reminder-message" className="mt-1 text-sm leading-relaxed text-white/55 light:text-gray-500">
            {latest.message} Hand the cash to the office so an admin can record it.
          </p>
          {shiftCount > 1 && (
            <p className="mt-3 text-sm font-medium text-white/80 light:text-gray-700">
              {shiftCount} shifts are awaiting remittance.
            </p>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="h-11 rounded-xl border border-[#1E2D45] bg-[#131C2E] text-sm font-semibold text-white/80 transition-colors hover:bg-[#1A2540] light:border-gray-200 light:bg-gray-100 light:text-gray-700 light:hover:bg-gray-200"
            >
              Got it
            </button>
            <button
              type="button"
              onClick={viewReport}
              autoFocus
              className="h-11 rounded-xl bg-[#1A5FB4] text-sm font-semibold text-white transition-colors hover:bg-[#164A8F]"
            >
              View report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
