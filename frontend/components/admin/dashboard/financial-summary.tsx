export function FinancialSummary() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Profit & Loss Summary</h2>
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