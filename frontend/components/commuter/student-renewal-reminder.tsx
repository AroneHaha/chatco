"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Bell } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { useAuth } from "@/contexts/auth-context";
import { getRenewalState, setRenewalReminder, type RenewalState } from "@/lib/shared/services/student-renewal.service";

const HOUR = 3_600_000;

const formatDay = (value: string | number) => new Date(value).toLocaleDateString("en-PH", {
  month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
});
const formatDateTime = (value: string) => new Date(value).toLocaleString("en-PH", {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila",
});

// Rounds down, so the reminder never promises more time than is left.
function timeLeft(ms: number) {
  const hours = Math.floor(ms / HOUR);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return hours >= 1 ? `${hours} hour${hours === 1 ? "" : "s"}` : "under an hour";
}

/**
 * Pops up for a student whose renewal still needs action. Whether it is due is
 * decided by the backend (`reminder_due`), which also stores "remind me
 * tomorrow" and "never remind me" on the commuter's profile, so the choice
 * follows the account across logouts and devices.
 */
export default function StudentRenewalReminder() {
  const { commuterProfile } = useAuth();
  const pathname = usePathname();
  // `at` is when the state was read; the countdown is measured from it.
  const [loaded, setLoaded] = useState<{ renewal: RenewalState; at: number } | null>(null);
  const [closed, setClosed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isStudent = commuterProfile?.commuterType === "STUDENT";

  // One read per app load, and only for students: nobody else can be due.
  useEffect(() => {
    if (!isStudent) return;
    const controller = new AbortController();
    getRenewalState(controller.signal)
      .then(renewal => { if (!controller.signal.aborted) setLoaded({ renewal, at: Date.now() }); })
      .catch(() => {});
    return () => controller.abort();
  }, [isStudent]);

  // Reaching the renewal page counts as having seen the reminder. Without this
  // the copy fetched at load would pop up again right after proof is submitted.
  if (pathname === "/student-renewal" && !closed) setClosed(true);

  const open = isStudent && !closed && loaded?.renewal.reminder_due === true;

  useEffect(() => {
    if (!open) return;
    const controls = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") ?? []);
    dialogRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setClosed(true);
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open || !loaded) return null;
  const { renewal, at } = loaded;

  // Saved in the background: the modal closes at once, and if the request
  // fails the reminder simply shows again on the next visit.
  const choose = (action: "snooze" | "dismiss") => {
    setClosed(true);
    setRenewalReminder(action).catch(() => {});
  };

  const opensAt = new Date(renewal.opens_at).getTime();
  const deadline = new Date(renewal.deadline).getTime();
  // The deadline is midnight after the last day, so step back into that day.
  const lastDay = formatDay(deadline - 1);
  const correctionDue = renewal.status === "NEEDS_CORRECTION" ? renewal.application?.correction_due_at : null;
  const notOpenYet = !correctionDue && at < opensAt;

  // Counts down to whichever date the student has to act on next.
  const remaining = (correctionDue ? new Date(correctionDue).getTime() : notOpenYet ? opensAt : deadline) - at;
  const passed = remaining <= 0;
  const urgent = !notOpenYet && (passed || remaining <= 72 * HOUR);
  const countdown = passed ? "Deadline passed" : notOpenYet ? `Opens in ${timeLeft(remaining)}` : `${timeLeft(remaining)} left`;
  const countdownNote = correctionDue ? `Correction due ${formatDateTime(correctionDue)}`
    : notOpenYet ? `Renewal opens ${formatDay(opensAt)}`
      : `Renewal ${passed ? "closed" : "closes"} ${lastDay}`;
  const message = correctionDue
    ? "Check the reviewer’s note and send your corrected proof before the correction deadline."
    : notOpenYet
      ? "Have your current school ID or enrollment proof ready for when submissions open."
      : !renewal.discount_eligible
        ? "Regular fares apply until your renewal is approved. Submit your current school ID or enrollment proof to restore your student discount."
        : `Submit your current school ID or enrollment proof by ${lastDay} to keep your student discount.`;

  return (
    <div ref={dialogRef} className="relative z-100">
      <Modal isOpen onClose={() => setClosed(true)} maxWidth="max-w-sm">
        <div className="flex flex-col items-center pt-2 text-center">
          <span aria-hidden="true" className={`flex h-14 w-14 items-center justify-center rounded-2xl ${urgent ? "bg-amber-200/10 text-amber-200" : "bg-[#62A0EA]/10 text-[#99C1F1]"}`}>
            <Bell size={26} />
          </span>
          <h2 className="mt-5 text-lg font-bold text-white">{correctionDue ? "Enrollment proof needs a correction" : "Student renewal reminder"}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{message}</p>
          <div className="mt-5 w-full rounded-lg bg-white/5 px-4 py-3">
            <p className={`text-xl font-bold tabular-nums first-letter:uppercase ${urgent ? "text-amber-200" : "text-white"}`}>{countdown}</p>
            <p className="mt-0.5 text-xs text-white/60">{countdownNote}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link href="/student-renewal" onClick={() => setClosed(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1A5FB4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#164A8F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99C1F1]">
            {renewal.can_submit ? (correctionDue ? "Submit corrected proof" : "Renew student status") : "View renewal status"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => choose("snooze")} className="min-h-11 w-full cursor-pointer rounded-lg border border-white/20 px-4 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99C1F1]">
            Remind me tomorrow
          </button>
          <button type="button" onClick={() => choose("dismiss")} className="min-h-10 w-full cursor-pointer rounded-lg px-4 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#99C1F1]">
            Never remind me
          </button>
        </div>
      </Modal>
    </div>
  );
}
