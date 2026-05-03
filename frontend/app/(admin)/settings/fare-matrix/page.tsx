// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState } from 'react';
import BackButton from '@/components/admin/ui/back-button';
import { Save } from 'lucide-react';
import { defaultFareConfig, type FareConfig } from '@/app/(admin)/settings/data/settings-data';

export default function FareMatrixPage() {
  const [fareData, setFareData] = useState<FareConfig>({ ...defaultFareConfig });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFareData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving Fare Data:', fareData);
    alert('Fare Matrix Updated! (Check console for data)');
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">

        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Fare Matrix Configuration</h1>
        </div>

        <div className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-5 sm:p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="baseFare" className="block text-xs font-medium text-slate-300 mb-1.5">Base Fare (₱)</label>
              <input
                type="number"
                id="baseFare"
                name="baseFare"
                value={fareData.baseFare}
                onChange={handleChange}
                className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="baseDistanceKm" className="block text-xs font-medium text-slate-300 mb-1.5">Base Distance (km)</label>
              <input
                type="number"
                id="baseDistanceKm"
                name="baseDistanceKm"
                value={fareData.baseDistanceKm}
                onChange={handleChange}
                className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] transition-colors"
              />
            </div>

            <div>
              <label htmlFor="succeedingRatePerKm" className="block text-xs font-medium text-slate-300 mb-1.5">Succeeding Rate per Km (₱)</label>
              <input
                type="number"
                id="succeedingRatePerKm"
                name="succeedingRatePerKm"
                value={fareData.succeedingRatePerKm}
                onChange={handleChange}
                className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white placeholder-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] focus:border-[#62A0EA] transition-colors"
              />
            </div>

            {/* Mobile-Friendly Save Button */}
            <div className="flex justify-center pt-2 pb-2">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95"
              >
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}