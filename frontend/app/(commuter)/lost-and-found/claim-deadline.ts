/**
 * Claim-by countdown for unclaimed items. `claimableUntil` comes from the
 * backend (LostItem::getClaimableUntilAttribute: listing date + 30 days);
 * lost-items:expire archives the item in its 01:00 run after that moment.
 * Counted in whole calendar days so "today" never shows as "0 days left".
 */
export interface ClaimDeadline {
  /** e.g. "12 days left", "Last day to claim". */
  label: string;
  /** e.g. "Oct 30, 2026" for the full date line. */
  dateLabel: string;
  /** True inside the final 3 days, the same window as the saved-item reminder. */
  isUrgent: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const URGENT_DAYS = 3;

export function getClaimDeadline(claimableUntil: string | null | undefined, now = new Date()): ClaimDeadline | null {
  if (!claimableUntil) return null;
  const until = new Date(claimableUntil);
  if (Number.isNaN(until.getTime())) return null;

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysLeft = Math.max(0, Math.round((startOfDay(until) - startOfDay(now)) / DAY_MS));

  return {
    label: daysLeft === 0 ? "Last day to claim" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    dateLabel: until.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    isUrgent: daysLeft <= URGENT_DAYS,
  };
}
