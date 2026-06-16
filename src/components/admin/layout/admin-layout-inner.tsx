// components/admin/layout/admin-layout-inner.tsx
'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useSettingsDrawer } from '@/components/admin/ui/settings-drawer';
import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminBottomNav } from '@/components/admin/layout/admin-bottom-nav';
import { SidebarSkeleton, ContentSkeleton, MobileSkeleton } from '@/components/admin/layout/admin-layout-skeleton';

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { isSettingsOpen, openSettingsDrawer, closeSettingsDrawer } = useSettingsDrawer();
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
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsMoreOpen(false); // eslint-disable-line react-hooks/set-state-in-effect
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Close Settings drawer when route changes
  useEffect(() => {
    closeSettingsDrawer();
  }, [pathname, closeSettingsDrawer]);

  // ── Auth Guard ──
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

  // ── EMBED MODE ──
  // When the page is loaded inside the settings drawer iframe (?embed=1),
  // render ONLY the content area — no sidebar, no bottom nav, no modals.
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

  // --- DESKTOP SIDE NAVIGATION ---
  if (!isMobile) {
    return (
      <AdminSidebar
        pathname={pathname}
        onSignOut={handleSignOut}
        isSignOutOpen={isSignOutOpen}
        setIsSignOutOpen={setIsSignOutOpen}
        isSettingsOpen={isSettingsOpen}
        openSettingsDrawer={openSettingsDrawer}
      >
        {children}
      </AdminSidebar>
    );
  }

  // --- MOBILE BOTTOM NAVIGATION ---
  return (
    <AdminBottomNav
      pathname={pathname}
      isMoreOpen={isMoreOpen}
      setIsMoreOpen={setIsMoreOpen}
      onSignOut={handleSignOut}
      isSignOutOpen={isSignOutOpen}
      setIsSignOutOpen={setIsSignOutOpen}
      openSettingsDrawer={openSettingsDrawer}
    >
      {children}
    </AdminBottomNav>
  );
}

export { AdminLayoutInner };
