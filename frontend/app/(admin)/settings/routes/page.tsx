// app/(admin)/settings/routes/page.tsx
'use client';

import BackButton from '@/components/admin/ui/back-button';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { MapPin, Construction } from 'lucide-react';

export default function RoutesPage() {
  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        
        {/* Centered Back Button */}
        <div className="flex justify-center pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Centered Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Routes Management</h1>
        </div>

        {/* Future Improvement Notice */}
        <GlassCard className="p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-[#1A5FB4]/20 border border-[#1A5FB4]/30 flex items-center justify-center">
              <MapPin className="w-10 h-10 text-[#62A0EA]" />
            </div>
          </div>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
            <Construction className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Future Improvement</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Multi-Route Support</h2>
          
          <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-md mx-auto">
            The system currently operates exclusively on the fixed 
            <span className="text-white/80 font-semibold"> Malolos – Meycauayan – Calumpit </span> 
            corridor. 
          </p>
          
          <p className="text-sm text-white/30 mt-4 leading-relaxed max-w-md mx-auto">
            This page is reserved for future updates where administrators can define, edit, and manage multiple e-jeepney routes across different areas.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}