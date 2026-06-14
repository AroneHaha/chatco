// app/(admin)/layout.tsx
'use client';

import { ReactNode, useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SignOutModal } from '@/components/admin/ui/sign-out-modal';
import { SettingsDrawerProvider, SettingsDrawer, useSettingsDrawer } from '@/components/admin/ui/settings-drawer';
import { AdminSidebar } from '@/components/admin/layout/admin-sidebar';
import { AdminBottomNav } from '@/components/admin/layout/admin-bottom-nav';
import { SidebarSkeleton, ContentSkeleton, MobileSkeleton } from '@/components/admin/layout/admin-layout-skeleton';
import { useAuth } from '@/contexts/auth-context';

// ─── Inner Layout (uses context) ───

function AdminLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { closeSettingsDrawer } = useSettingsDrawer();
  const [isMobile, setIsMobile] = useState(false);
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
  // When the page is loaded inside the settings drawer (?embed=1),
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
      <div className="flex h-screen bg-[#0B1120]">
        <AdminSidebar onSignOutClick={() => setIsSignOutOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 text-white">
          {children}
        </main>

        {/* Desktop Sign Out Modal */}
        <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={handleSignOut} />

        {/* Desktop Settings Drawer */}
        <SettingsDrawer />
      </div>
    );
  }

  // --- MOBILE BOTTOM NAVIGATION ---
  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col">
      <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 overflow-y-auto">
        {children}
      </main>

      <AdminBottomNav onSignOutClick={() => setIsSignOutOpen(true)} />

      {/* Mobile Sign Out Modal */}
      <SignOutModal isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} onConfirm={handleSignOut} />

      {/* Mobile Settings Drawer */}
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
