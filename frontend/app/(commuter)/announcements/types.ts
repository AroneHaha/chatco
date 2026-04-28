// app/(commuter)/announcements/types.ts
export type AnnouncementType = "SYSTEM" | "PROMO" | "MAINTENANCE" | "SAFETY";

export interface Announcement {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}