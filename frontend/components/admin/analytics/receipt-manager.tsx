// components/admin/analytics/receipt-manager.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';

export function ReceiptManager() {
    return (
        <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Digital Receipt Management</h2>
            <div className="space-y-4">
                <div className="flex space-x-4">
                    <input 
                        type="text" 
                        placeholder="Search by Transaction ID or Commuter Email" 
                        className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <button className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">Search</button>
                </div>
                 <div className="h-64 flex items-center justify-center bg-white/5 rounded-lg border-2 border-dashed border-white/20">
                    <p className="text-gray-400">Search results and receipt list will appear here.</p>
                </div>
            </div>
        </GlassCard>
    );
}