// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import BackButton from '@/components/admin/ui/back-button';
import { Save } from 'lucide-react';

export default function FareMatrixPage() {
  const [fareData, setFareData] = useState({
    baseFare: '18',
    baseDistanceKm: '4',
    succeedingRatePerKm: '2',
  });

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
        
        {/* Centered Back Button */}
        <div className="flex justify-center pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Centered Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Fare Matrix Configuration</h1>
        </div>

        <GlassCard className="p-5 sm:p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="baseFare" className="block text-sm font-medium text-gray-300 mb-1.5">Base Fare (₱)</label>
              <input
                type="number"
                id="baseFare"
                name="baseFare"
                value={fareData.baseFare}
                onChange={handleChange}
                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="baseDistanceKm" className="block text-sm font-medium text-gray-300 mb-1.5">Base Distance (km)</label>
              <input
                type="number"
                id="baseDistanceKm"
                name="baseDistanceKm"
                value={fareData.baseDistanceKm}
                onChange={handleChange}
                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="succeedingRatePerKm" className="block text-sm font-medium text-gray-300 mb-1.5">Succeeding Rate per Km (₱)</label>
              <input
                type="number"
                id="succeedingRatePerKm"
                name="succeedingRatePerKm"
                value={fareData.succeedingRatePerKm}
                onChange={handleChange}
                className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Centered Save Button */}
            <div className="flex justify-center pt-2 pb-2">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-95"
              >
                <Save size={18} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}