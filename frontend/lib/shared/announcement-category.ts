/**
 * How an announcement's free-form backend `type` reads to a commuter: the
 * keyword bucket it falls into, and the label + colour the commuter's
 * Updates list shows for it. Shared by the commuter app (announcements
 * context, Rewards & Updates) and the admin New Announcement preview, so the
 * preview can't drift from what riders actually see.
 */

import type { Announcement, AnnouncementType } from "@/types";

/**
 * Backend `type` values a Lost & Found claim status-change announcement can
 * carry (set by LostItemService::notifyUser at approve/reject/release). The
 * single source of truth for what counts as a "claim update" — used both to
 * bucket a row into the canonical CLAIM_UPDATE type below and to scope the
 * Lost & Found Claims tab's dedicated unread count / mark-all-read call.
 */
export const CLAIM_UPDATE_TYPES = ["claim_approved", "claim_rejected", "claim_released"];

/**
 * Map the backend's free-form `type` string (max 20, e.g. 'holiday', 'route',
 * 'system', 'safety', 'promo', 'maintenance', 'claim_approved') to a canonical
 * AnnouncementType values the rewards panel's announcementConfig expects.
 * An empty/blank type, or one that explicitly says "system", is SYSTEM; a
 * non-empty type that doesn't match any known bucket (e.g. a custom category
 * typed via the admin's "Other" option) falls to CUSTOM, which the UI shows
 * using the original raw text rather than a generic label.
 */
export function mapAnnouncementType(rawType: string): AnnouncementType {
  const t = (rawType ?? "").toLowerCase().trim();
  if ((t.startsWith('student_renewal') || t.startsWith('discount_application'))) return 'SYSTEM';
  if (t === "voucher_received") return "VOUCHER";
  if (!t || t.includes("system")) {
    return "SYSTEM";
  }
  if (CLAIM_UPDATE_TYPES.some((type) => t.includes(type))) {
    return "CLAIM_UPDATE";
  }
  // Watchlist notices (LostItemService::notifyWatchers / remindExpiringWatchedItems).
  if (t.startsWith("saved_item")) {
    return "SAVED_ITEM";
  }
  if (["safety", "alert", "sos", "warning"].some((k) => t.includes(k))) {
    return "SAFETY";
  }
  if (["promo", "holiday", "reward", "deal"].some((k) => t.includes(k))) {
    return "PROMO";
  }
  // "service" (service disruption) and "weather" are admin categories too;
  // both are trip-affecting notices, the same "Advisory" read as a detour.
  if (
    ["maintenance", "route", "schedule", "construction", "detour", "advisory", "service", "weather"].some(
      (k) => t.includes(k)
    )
  ) {
    return "MAINTENANCE";
  }
  return "CUSTOM";
}

export const ANNOUNCEMENT_CATEGORY_CONFIG: Record<AnnouncementType, { label: string; color: string }> = {
  PROMO: { label: "Promo", color: "text-amber-300 light:text-amber-700" },
  SAFETY: { label: "Safety", color: "text-emerald-300 light:text-emerald-700" },
  SYSTEM: { label: "System", color: "text-[#62A0EA] light:text-[#1A5FB4]" },
  MAINTENANCE: { label: "Advisory", color: "text-red-300 light:text-red-700" },
  CLAIM_UPDATE: { label: "Claim update", color: "text-[#99C1F1] light:text-[#1A5FB4]" },
  SAVED_ITEM: { label: "Saved item", color: "text-[#99C1F1] light:text-[#1A5FB4]" },
  VOUCHER: { label: "Voucher", color: "text-[#99C1F1] light:text-[#1A5FB4]" },
  CUSTOM: { label: "Announcement", color: "text-white/60 light:text-gray-500" },
};

/** The label + colour the commuter's Updates list shows for an item. */
export function announcementCategory(item: Pick<Announcement, "type" | "rawType">) {
  if (item.rawType?.toUpperCase().startsWith("DISCOUNT_APPLICATION")) return { label: "Discount application", color: "text-[#99C1F1] light:text-[#1A5FB4]" };
  if (item.rawType?.toUpperCase().startsWith("STUDENT_RENEWAL")) {
    return { label: "Student renewal", color: "text-[#99C1F1] light:text-[#1A5FB4]" };
  }
  const config = ANNOUNCEMENT_CATEGORY_CONFIG[item.type] ?? ANNOUNCEMENT_CATEGORY_CONFIG.CUSTOM;
  return { ...config, label: item.type === "CUSTOM" && item.rawType ? item.rawType : config.label };
}
