// components/admin/dashboard/financial-summary.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';
import { DollarSign, Smartphone } from 'lucide-react';

interface FinancialData {
  todayGCash: number;
  todayCash: number;
  totalRevenue: string;
  totalExpenses: string;
  totalBoundary: string;
  netProfit: string;
}

interface FinancialSummaryProps {
  data: FinancialData;
}

export function FinancialSummary({ data }: FinancialSummaryProps) {
  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Profit & Loss Summary</h2>
      
      <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Today's Revenue Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Smartphone className="text-blue-400" size={16} />
              <span className="text-sm text-gray-300">GCash Payments</span>
            </div>
            <span className="font-medium text-white">₱{data.todayGCash.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <DollarSign className="text-green-400" size={16} />
              <span className="text-sm text-gray-300">Cash Payments</span>
            </div>
            <span className="font-medium text-white">₱{data.todayCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between"><span className="text-gray-300">Total Revenue</span><span className="font-medium text-white">{data.totalRevenue}</span></div>
        <div className="flex justify-between"><span className="text-gray-300">Total Expenses</span><span className="font-medium text-white">{data.totalExpenses}</span></div>
        <div className="flex justify-between"><span className="text-gray-300">Total Boundary</span><span className="font-medium text-white">{data.totalBoundary}</span></div>
        <div className="border-t border-white/20 pt-3 flex justify-between">
          <span className="text-lg font-semibold text-white">Net Profit</span>
          <span className="text-lg font-bold text-green-400">{data.netProfit}</span>
        </div>
      </div>
    </GlassCard>
  );
}