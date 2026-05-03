// app/(admin)/settings/routes/page.tsx
'use client';

import BackButton from '@/components/admin/ui/back-button';
import { MapPin, Construction } from 'lucide-react';

export default function RoutesPage() {
  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Routes Management</h1>
        </div>

        {/* Future Improvement Notice */}
        <div className="bg-[#131C2E] border border-[#1E2D45] p-8 sm:p-12 text-center rounded-lg">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#62A0EA]/20 border border-[#62A0EA]/30 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-[#62A0EA]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <Construction className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Future Improvement</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Multi-Route Support</h2>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto">
            The system currently operates exclusively on the fixed
            <span className="text-slate-200 font-semibold"> Malolos – Meycauayan – Calumpit </span>
            corridor.
          </p>

          <p className="text-sm text-slate-500 mt-4 leading-relaxed max-w-md mx-auto">
            This page is reserved for future updates where administrators can define, edit, and manage multiple e-jeepney routes across different areas.
          </p>
        </div>
      </div>
    </div>
  );
}
