// components/admin/dashboard/payment-methods-chart.tsx
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

export function PaymentMethodsChart() {
  const maxValue = Math.max(...weeklyData.map(d => Math.max(d.cash, d.ewallet)));

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods Breakdown</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
          <div className="p-2 bg-green-200 rounded-full">
            <DollarSign className="text-green-700" size={20} />
          </div>
          <div>
            <p className="text-xs text-green-600 font-medium">Total Cash</p>
            <p className="text-lg font-bold text-green-800">₱{totalCash.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-200 rounded-full">
            <Smartphone className="text-blue-700" size={20} />
          </div>
          <div>
            <p className="text-xs text-blue-600 font-medium">Total eWallet</p>
            <p className="text-lg font-bold text-blue-800">₱{totalEwallet.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="space-y-2">
        {weeklyData.map((day) => (
          <div key={day.day} className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-600 w-10">{day.day}</span>
            <div className="flex-1 flex items-center space-x-1 h-6">
              <div
                className="bg-green-500 h-full rounded-sm transition-all duration-300"
                style={{ width: `${(day.cash / maxValue) * 100}%` }}
                title={`Cash: ₱${day.cash}`}
              />
              <div
                className="bg-blue-500 h-full rounded-sm transition-all duration-300"
                style={{ width: `${(day.ewallet / maxValue) * 100}%` }}
                title={`eWallet: ₱${day.ewallet}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
          <span className="text-xs text-gray-600">Cash</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <span className="text-xs text-gray-600">eWallet</span>
        </div>
      </div>
    </div>
  );
}