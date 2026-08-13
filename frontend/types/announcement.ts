/**
 * Canonical Announcement type for the Chatco application.
 *
 * Architecture notes (Laravel + Supabase):
 * - Announcement maps to the `announcements` Supabase table
 * - AnnouncementType maps to an enum in the database
 *
 * This file is the SINGLE SOURCE OF TRUTH for announcement types.
 * Do NOT re-define Announcement or AnnouncementType elsewhere.
 */

export type AnnouncementType =
  | "SYSTEM"
  | "PROMO"
  | "MAINTENANCE"
  | "SAFETY"
  | "CLAIM_UPDATE"
  // A free-form admin-entered category (via "Other") that doesn't match any
  // of the keyword buckets above — see mapType() in announcements-context.
  // The original text the admin typed is preserved in `rawType` so the UI
  // can display it verbatim instead of collapsing it into a generic label.
  | "CUSTOM";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  /** The admin's original, free-form `type` string from the backend — only
   * meaningful (and shown) when `type` is "CUSTOM". */
  rawType: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}
