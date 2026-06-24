// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SignOutModal } from '@/components/admin/ui/sign-out-modal';
import { SettingsDrawerProvider, SettingsDrawer, useSettingsDrawer } from '@/components/admin/ui/settings-drawer';
import { useAuth } from '@/contexts/auth-context';
import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminBottomNav } from '@/components/admin/layout/admin-bottom-nav';
import { NotificationBell } from '@/components/admin/layout/notification-bell';
import { SidebarSkeleton, ContentSkeleton, MobileSkeleton } from '@/components/admin/layout/admin-layout-skeleton';

// ─── Inner Layout (uses context) ───

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { closeSettingsDrawer } = useSettingsDrawer();
  const [isMobile, setIsMobile] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close "More" menu when route changes
  useEffect(() => {
    setIsMoreOpen(false);
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
      <div className="flex h-screen bg-[#0B1120]">
        <SidebarSkeleton />
        <ContentSkeleton />
      </div>
    );
  }

  // Not authenticated — redirect will happen via useEffect
  if (!isAuthenticated) {
    return null;
  }

  // Sign Out Handler
  const handleSignOut = () => {
    console.log("User signed out");
    setIsSignOutOpen(false);
    window.location.href = '/login';
  };

  // EMBED MODE
  const isEmbed = searchParams.get('embed') === '1';
  if (isEmbed) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white">
        <main className="p-5 lg:p-6 overflow-y-auto h-screen">
          {children}
        </main>
      </div>
    );
  }

  // DESKTOP
  if (!isMobile) {
    return (
      <div className="flex h-screen bg-[#0B1120]">
        <AdminSidebar onSignOut={() => setIsSignOutOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-white">
          {/* Notification Bell — fixed top-right */}
          <div className="fixed top-4 right-6 z-50">
            <NotificationBell />
          </div>
          {children}
        </main>
        <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={handleSignOut} />
        <SettingsDrawer />
      </div>
    );
  }

  // MOBILE
  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col">
      {/* Notification Bell — fixed top-right for mobile */}
      <div className="fixed top-3 right-3 z-50">
        <NotificationBell />
      </div>
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
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
    <SettingsDrawerProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#0B1120]" />}>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </Suspense>
    </SettingsDrawerProvider>
  );
}
