import { DemandHeatmap } from '@/components/admin/analytics/demand-heatmap';
import { ReceiptManager } from '@/components/admin/analytics/receipt-manager';

export default function AnalyticsPage() {
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Analytics & Reports</h1>
            <div className="space-y-6">
                <DemandHeatmap />
                <ReceiptManager />
            </div>
        </div>
    );
}