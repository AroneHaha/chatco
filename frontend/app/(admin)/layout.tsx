// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useEffect, Suspense, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SignOutModal } from '@/components/admin/ui/sign-out-modal';
import { SettingsDrawerProvider, SettingsDrawer, useSettingsDrawer } from '@/components/admin/ui/settings-drawer';
import { useAuth } from '@/contexts/auth-context';
import { AdminNotificationsProvider } from '@/contexts/admin-notifications-context';
import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminBottomNav } from '@/components/admin/layout/admin-bottom-nav';
import { NotificationBell } from '@/components/admin/layout/notification-bell';
import { SidebarSkeleton, ContentSkeleton, MobileSkeleton } from '@/components/admin/layout/admin-layout-skeleton';

// ─── Inner Layout (uses context) ───

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const { closeSettingsDrawer } = useSettingsDrawer();
  const [isMobile, setIsMobile] = useState(false);
  const [moreOpenPathname, setMoreOpenPathname] = useState<string | null>(null);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const isMoreOpen = moreOpenPathname === pathname;
  const setIsMoreOpen = useCallback((open: boolean) => {
    setMoreOpenPathname(open ? pathname : null);
  }, [pathname]);

  // Close Settings drawer when route changes
  useEffect(() => {
    closeSettingsDrawer();
  }, [pathname, closeSettingsDrawer]);

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [authLoading, isAuthenticated]);

  // Show skeleton while auth is checking
  if (authLoading) {
    if (isMobile) {
      return <MobileSkeleton />;
    }
    return (
      <div className="admin-shell flex h-screen bg-[#0B1120]">
        <SidebarSkeleton />
        <ContentSkeleton />
      </div>
    );
  }

  // Not authenticated — redirect will happen via useEffect
  if (!isAuthenticated) {
    return null;
  }

  // Sign Out Handler.
  // This used to just set window.location to /login without ending the
  // session — no logout request, no cleared auth state, no cleared
  // localStorage. The cookie stayed valid, so the admin was never actually
  // signed out and simply navigating back into the dashboard let them
  // straight in. Delegating to the auth context's logout() revokes the
  // session server-side first, then hard-redirects.
  const handleSignOut = async () => {
    if (isSigningOut) return; // guard against a double-tap firing two requests
    setIsSigningOut(true);
    try {
      await logout();
    } catch {
      // logout() already redirects in its finally block; if it somehow
      // throws, don't leave the modal stuck in a pending state.
      setIsSigningOut(false);
      setIsSignOutOpen(false);
    }
  };

  // EMBED MODE
  const isEmbed = searchParams.get('embed') === '1';
  if (isEmbed) {
    return (
      <div className="admin-shell min-h-screen bg-[#0B1120] text-white">
        <main className="p-5 lg:p-6 overflow-y-auto h-screen">
          {children}
        </main>
      </div>
    );
  }

  // DESKTOP
  if (!isMobile) {
    return (
      <div className="admin-shell flex h-screen bg-[#0B1120]">
        <AdminSidebar onSignOut={() => setIsSignOutOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-white">
          {children}
        </main>
        <SignOutModal
          isOpen={isSignOutOpen}
          onClose={() => setIsSignOutOpen(false)}
          onConfirm={handleSignOut}
          isPending={isSigningOut}
        />
        <SettingsDrawer />
      </div>
    );
  }

  // MOBILE
  return (
    // h-dvh + overflow-hidden, NOT min-h-screen. With a min-height the column
    // grew to fit its content, so <main> was never height-constrained and its
    // overflow-y-auto never actually scrolled — the document scrolled instead.
    // That still made <main> the scroll container for sticky descendants, so
    // page headers using `sticky top-0` had nothing to stick to and rode up
    // with the content. Pinning the height makes <main> the real scroller.
    // dvh rather than vh so the mobile browser's collapsing toolbar doesn't
    // leave the bottom nav hanging off-screen.
    <div className="admin-shell h-dvh bg-[#0B1120] text-white flex flex-col overflow-hidden">
      {/* Notification Bell — fixed top-right for mobile */}
      <div className="fixed top-3 right-3 z-50">
        <NotificationBell />
      </div>
      {/* min-h-0 is required: a flex item defaults to min-height:auto, which
          refuses to shrink below its content and would re-break the scroll. */}
      <main className="flex-1 min-h-0 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
        {children}
      </main>
      <AdminBottomNav
        isMoreOpen={isMoreOpen}
        setIsMoreOpen={setIsMoreOpen}
        onSignOut={() => setIsSignOutOpen(true)}
      />
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={handleSignOut} />
      <SettingsDrawer />
    </div>
  );
}

// ─── Outer Layout  ───

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminNotificationsProvider>
      <SettingsDrawerProvider>
        <Suspense fallback={<div className="admin-shell min-h-screen bg-[#0B1120]" />}>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </Suspense>
      </SettingsDrawerProvider>
    </AdminNotificationsProvider>
  );
}
