// components/admin/dashboard/financial-summary.tsx
import { DollarSign, Smartphone, TrendingUp, TrendingDown } from 'lucide-react';

export function FinancialSummary() {
  const todayRevenue = 15450.50;
  const todayEwallet = 11500.00;
  const todayCash = todayRevenue - todayEwallet;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Profit & Loss Summary</h2>
      
      {/* Payment Breakdown for Today */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Today's Revenue Breakdown</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Smartphone className="text-blue-600" size={16} />
              <span className="text-sm text-gray-600">eWallet Payments</span>
            </div>
            <span className="font-medium text-gray-900">₱{todayEwallet.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <DollarSign className="text-green-600" size={16} />
              <span className="text-sm text-gray-600">Cash Payments</span>
            </div>
            <span className="font-medium text-gray-900">₱{todayCash.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Overall P&L */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Total Revenue</span>
          <span className="font-medium text-gray-900">₱25,000.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Expenses</span>
          <span className="font-medium text-gray-900">₱8,500.00</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total Boundary</span>
          <span className="font-medium text-gray-900">₱10,000.00</span>
        </div>
        <div className="border-t pt-3 flex justify-between">
          <span className="text-lg font-semibold text-gray-800">Net Profit</span>
          <span className="text-lg font-bold text-green-600">₱6,500.00</span>
        </div>
      </div>
    </div>
  );
}