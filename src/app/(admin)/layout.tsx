// app/(admin)/layout.tsx
'use client';

import { ReactNode, Suspense } from 'react';
import { SettingsDrawerProvider } from '@/components/admin/ui/settings-drawer';
import { AdminLayoutInner } from '@/components/admin/layout/admin-layout-inner';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsDrawerProvider>
      <Suspense fallback={<div className="min-h-screen bg-[#0B1120]" />}>
        <AdminLayoutInner>{children}</AdminLayoutInner>
      </Suspense>
    </SettingsDrawerProvider>
  );
}
