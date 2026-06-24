'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────

interface AdminNotification {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ─── Mock data removed — wire to API when backend notifications are ready ─

// ─── Helper: format relative time ──────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Helper: get icon + color by type ──────────────────────────────────

function getNotificationStyle(type: AdminNotification['type']) {
  switch (type) {
    case 'success':
      return { Icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
    case 'warning':
      return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    case 'info':
      return { Icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' };
  }
}

// ─── Component ─────────────────────────────────────────────────────────

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Clear a single notification
  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-all active:scale-95"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-[#0D1424] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-[#62A0EA] hover:text-[#7AB8F4] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell size={32} className="mx-auto text-white/10 mb-2" />
                <p className="text-sm text-white/30">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const { Icon, color, bg } = getNotificationStyle(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`group px-4 py-3 hover:bg-white/[0.02] transition-colors relative ${
                      !notification.read ? 'bg-white/[0.015]' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    {!notification.read && (
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#62A0EA]" />
                    )}

                    <div className="flex items-start gap-3 pl-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={16} className={color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-white/90 truncate">
                            {notification.title}
                          </p>
                          <span className="text-[10px] text-white/30 flex-shrink-0">
                            {formatRelativeTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>

                      {/* Dismiss button (shows on hover) */}
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-white/70 flex-shrink-0 mt-0.5"
                        aria-label="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-white/5">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-xs font-medium text-white/40 hover:text-white/70 transition-colors py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
