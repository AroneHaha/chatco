// app/(admin)/settings/operations-rules/page.tsx
'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import {
  defaultOperationsRules,
  initialExpenseCategories,
  type OperationsRulesConfig,
} from '@/app/(admin)/settings/data/settings-data';

export default function OperationsRulesPage() {
  const [rules, setRules] = useState<OperationsRulesConfig>({ ...defaultOperationsRules });
  const [expenseCategories, setExpenseCategories] = useState<string[]>([...initialExpenseCategories]);
  const [newCategory, setNewCategory] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRules(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setIsSaved(false);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !expenseCategories.includes(newCategory.trim())) {
      setExpenseCategories(prev => [...prev, newCategory.trim()]);
      setNewCategory('');
      setIsSaved(false);
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setExpenseCategories(prev => prev.filter((cat: string) => cat !== categoryToRemove));
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Operations & Fleet Rules</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Fleet Safety */}
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Safety Thresholds</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Overspeeding Limit (km/h)</label>
                <p className="text-xs text-slate-500 mb-2">Triggers alert on monitoring map if exceeded.</p>
                <input
                  type="number"
                  name="speedLimitKmh"
                  value={rules.speedLimitKmh}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Maximum Shift Duration (Hours)</label>
                <p className="text-xs text-slate-500 mb-2">Flags conductor in remittance if exceeded.</p>
                <input
                  type="number"
                  name="maxShiftHours"
                  value={rules.maxShiftHours}
                  onChange={handleChange}
                  required
                  className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Mobile-Friendly Save Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95"
            >
              <Save size={18} />
              <span>{isSaved ? 'Changes Saved!' : 'Save Rules'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}