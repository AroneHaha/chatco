"use client";

import { useEffect, useState } from "react";
import { CommuterAvatar } from "@/components/commuter/commuter-avatar";

/**
 * Time-of-day greeting from the device clock:
 *   00:00–11:59 morning · 12:00–17:59 afternoon · 18:00–23:59 evening.
 */
function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Milliseconds until the greeting next changes (12:00, 18:00 or midnight). */
function msUntilNextGreeting(now: Date): number {
  const next = new Date(now);
  const hour = now.getHours();
  next.setHours(hour < 12 ? 12 : hour < 18 ? 18 : 24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/**
 * The current greeting, updated exactly when it changes rather than polled.
 * Timers are throttled while a tab or phone sleeps, so it also re-checks when
 * the page becomes visible again.
 */
function useGreeting(): string {
  const [greeting, setGreeting] = useState(() => greetingFor(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = () => {
      clearTimeout(timer);
      const now = new Date();
      setGreeting(greetingFor(now));
      // +1s so the timer lands just past the boundary, never just before it.
      timer = setTimeout(sync, msUntilNextGreeting(now) + 1000);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    document.addEventListener("visibilitychange", syncWhenVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", syncWhenVisible);
    };
  }, []);

  return greeting;
}

const COMMUTER_TYPE_LABELS: Record<string, string> = {
  REGULAR: "Regular",
  STUDENT: "Student",
  SENIOR_CITIZEN: "Senior Citizen",
  PWD: "PWD",
};

const VARIANTS = {
  // Phones: the strip across the top of the map.
  mobile: {
    avatar: { className: "w-9 h-9", iconClassName: "w-[18px] h-[18px]", sizes: "36px" },
    text: "text-sm",
  },
  // 1024–1279px: the side panel's header.
  panel: {
    avatar: { className: "w-10 h-10", iconClassName: "w-5 h-5", sizes: "40px" },
    text: "text-base",
  },
  // xl+: the identity cell of the top bar.
  bar: {
    avatar: { className: "w-9 h-9", iconClassName: "w-[18px] h-[18px]", sizes: "36px" },
    text: "text-sm",
  },
} as const;

/**
 * The commuter's identity strip on the dashboard: avatar, "Good afternoon,
 * Kathryn" on one line, then the fare type at the far end behind a divider.
 * One component for the phone strip, the side panel and the top bar, so the
 * three can't drift apart. The fare type is plain coloured text, not a
 * capsule. A long name truncates; the fare type always stays visible.
 */
export function CommuterGreeting({
  variant,
  name,
  commuterType,
  photoUrl,
}: {
  variant: keyof typeof VARIANTS;
  name: string;
  commuterType: string;
  photoUrl: string | null | undefined;
}) {
  const greeting = useGreeting();
  const styles = VARIANTS[variant];
  const typeLabel = COMMUTER_TYPE_LABELS[commuterType] ?? commuterType;

  return (
    <div className="flex w-full min-w-0 items-center gap-3">
      <CommuterAvatar src={photoUrl} {...styles.avatar} />
      <h1 className={`${styles.text} min-w-0 flex-1 truncate leading-tight text-white light:text-gray-900`}>
        <span className="font-medium text-white/60 light:text-gray-500">{greeting},</span>{" "}
        <span className="font-bold">{name}</span>
      </h1>
      <span className="flex shrink-0 items-center self-stretch border-l border-white/10 pl-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#62A0EA] light:border-gray-200 light:text-[#1A5FB4]">
        {typeLabel}
      </span>
    </div>
  );
}
