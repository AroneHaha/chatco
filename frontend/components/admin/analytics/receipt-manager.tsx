// components/admin/analytics/receipt-manager.tsx
export function ReceiptManager() {
    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Digital Receipt Management</h2>
            <div className="space-y-4">
                <div className="flex space-x-4">
                    <input type="text" placeholder="Search by Transaction ID or Commuter Email" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">Search</button>
                </div>
                 <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">Search results and receipt list will appear here.</p>
                </div>
            </div>
        </div>
    );
}