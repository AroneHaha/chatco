// app/(commuter)/rewards/use-announcements.ts
import { useState, useEffect } from "react";
import { Announcement } from "./types";

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: "a_1", type: "PROMO", title: "Double Raffle Entries Weekend! 🎉", message: "Ride this Saturday and Sunday to get double raffle entries per trip.", createdAt: new Date().toISOString(), isRead: false },
  { id: "a_2", type: "SAFETY", title: "New 'Share My Ride' Feature", message: "You can now generate a live tracking link to share with family and friends while you ride.", createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: false },
  { id: "a_3", type: "SYSTEM", title: "Scheduled Maintenance", message: "CHATCO will undergo brief maintenance on Sunday at 2:00 AM. Offline payments will still work.", createdAt: new Date(Date.now() - 172800000).toISOString(), isRead: false },
  { id: "a_4", type: "MAINTENANCE", title: "Route 14 Detour", message: "Due to road construction, Route 14 will take a temporary detour via MacArthur Highway starting Monday.", createdAt: new Date(Date.now() - 259200000).toISOString(), isRead: true },
];

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 400));
      setAnnouncements(MOCK_ANNOUNCEMENTS);
      setIsLoading(false);
    };
    fetchAnnouncements();
  }, []);

  const markAsRead = (id: string) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const markAllAsRead = () => {
    setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })));
  };

  const unreadCount = announcements.filter(a => !a.isRead).length;

  return { announcements, isLoading, markAsRead, markAllAsRead, unreadCount };
}