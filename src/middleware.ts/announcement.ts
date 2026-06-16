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

export type AnnouncementType = "SYSTEM" | "PROMO" | "MAINTENANCE" | "SAFETY";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}
