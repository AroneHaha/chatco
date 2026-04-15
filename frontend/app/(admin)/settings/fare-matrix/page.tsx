// app/(admin)/settings/fare-matrix/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';

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
    <>
      <h1 className="text-3xl font-bold text-white mb-6">Fare Matrix Configuration</h1>
      <GlassCard className="p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="baseFare" className="block text-sm font-medium text-gray-300">Base Fare (₱)</label>
            <input
              type="number"
              id="baseFare"
              name="baseFare"
              value={fareData.baseFare}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="baseDistanceKm" className="block text-sm font-medium text-gray-300">Base Distance (km)</label>
            <input
              type="number"
              id="baseDistanceKm"
              name="baseDistanceKm"
              value={fareData.baseDistanceKm}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="succeedingRatePerKm" className="block text-sm font-medium text-gray-300">Succeeding Rate per Km (₱)</label>
            <input
              type="number"
              id="succeedingRatePerKm"
              name="succeedingRatePerKm"
              value={fareData.succeedingRatePerKm}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </GlassCard>
    </>
  );
}