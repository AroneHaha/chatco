// components/admin/dashboard/payment-methods-chart.tsx
import { GlassCard } from '@/components/admin/ui/glass-card';
import { DollarSign, Smartphone } from 'lucide-react';

// Mock data for the chart
const weeklyData = [
  { day: 'Mon', cash: 800, ewallet: 2200 },
  { day: 'Tue', cash: 950, ewallet: 2500 },
  { day: 'Wed', cash: 700, ewallet: 2800 },
  { day: 'Thu', cash: 1100, ewallet: 3100 },
  { day: 'Fri', cash: 1200, ewallet: 3500 },
  { day: 'Sat', cash: 500, ewallet: 1900 },
  { day: 'Sun', cash: 400, ewallet: 1500 },
];

const totalCash = weeklyData.reduce((sum, day) => sum + day.cash, 0);
const totalEwallet = weeklyData.reduce((sum, day) => sum + day.ewallet, 0);

// --- MOBILE VIEW: This is the compact version ---
function CompactPaymentMethods() {
  return (
    <GlassCard className="p-4">
      <h2 className="text-base font-semibold text-white mb-3">Payment Methods</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center space-x-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <DollarSign className="text-green-400 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-green-300">Cash</p>
            <p className="text-sm font-bold text-white">₱{totalCash.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <Smartphone className="text-blue-400 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-blue-300">eWallet</p>
            <p className="text-sm font-bold text-white">₱{totalEwallet.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// --- DESKTOP VIEW: This is the full chart version ---
function FullPaymentMethodsChart() {
  const maxValue = Math.max(...weeklyData.map(d => Math.max(d.cash, d.ewallet)));

  return (
    <GlassCard className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Payment Methods Breakdown</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center space-x-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="p-2 bg-green-500/20 rounded-full">
            <DollarSign className="text-green-400" size={20} />
          </div>
          <div>
            <p className="text-xs text-green-300 font-medium">Total Cash</p>
            <p className="text-lg font-bold text-white">₱{totalCash.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="p-2 bg-blue-500/20 rounded-full">
            <Smartphone className="text-blue-400" size={20} />
          </div>
          <div>
            <p className="text-xs text-blue-300 font-medium">Total eWallet</p>
            <p className="text-lg font-bold text-white">₱{totalEwallet.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {weeklyData.map((day) => (
          <div key={day.day} className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-300 w-10">{day.day}</span>
            <div className="flex-1 flex items-center space-x-1 h-6">
              <div className="bg-green-500 h-full rounded-sm" style={{ width: `${(day.cash / maxValue) * 100}%` }} title={`Cash: ₱${day.cash}`} />
              <div className="bg-blue-500 h-full rounded-sm" style={{ width: `${(day.ewallet / maxValue) * 100}%` }} title={`eWallet: ₱${day.ewallet}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div><span className="text-xs text-gray-300">Cash</span></div>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span className="text-xs text-gray-300">eWallet</span></div>
      </div>
    </GlassCard>
  );
}


// --- MAIN COMPONENT: This decides which view to show ---
export function PaymentMethodsChart() {
  return (
    <>
      {/* 
        This div is ONLY visible on screens SMALLER than 'lg' (1024px).
        It will be hidden on desktop.
      */}
      <div className="block lg:hidden">
        <CompactPaymentMethods />
      </div>

      {/* 
        This div is ONLY visible on screens 'lg' (1024px) and LARGER.
        It will be hidden on mobile.
      */}
      <div className="hidden lg:block">
        <FullPaymentMethodsChart />
      </div>
    </>
  );
}