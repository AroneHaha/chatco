// app/(admin)/analytics/page.tsx
'use client';

import { ReceiptManager } from '@/components/admin/analytics/receipt-manager';
import dynamic from 'next/dynamic';

const AdminCommuterMap = dynamic(() => import('@/components/admin/admin-commuter-map'), { 
  ssr: false,
  loading: () => <p className="text-white text-center">Loading map...</p> 
});

export default function AnalyticsPage() {
    return (
        <>
            <h1 className="text-3xl font-bold text-white mb-6">Analytics & Reports</h1>
            <div className="space-y-6">
                <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-2xl border border-white/10">
                    <AdminCommuterMap isDesktop={true} />
                </div>
                <ReceiptManager />
            </div>
        </>
    );
}