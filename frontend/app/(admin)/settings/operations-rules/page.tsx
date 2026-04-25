// app/(admin)/settings/operations-rules/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import BackButton from '@/components/admin/ui/back-button';
import { Save, Plus, X } from 'lucide-react';

export default function OperationsRulesPage() {
  const [rules, setRules] = useState({
    speedLimitKmh: '60',
    maxShiftHours: '12',
  });

  const [expenseCategories, setExpenseCategories] = useState<string[]>([
    'Gas / Fuel',
    'Boundary / Remittance',
    'Vehicle Washing',
    'Tire Change / Repair',
  ]);

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
    setExpenseCategories(prev => prev.filter(cat => cat !== categoryToRemove));
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
        
        {/* Centered Back Button */}
        <div className="flex justify-center pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Centered Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Operations & Fleet Rules</h1>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Fleet Safety */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Safety Thresholds</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Overspeeding Limit (km/h)</label>
                <p className="text-xs text-gray-500 mb-2">Triggers alert on monitoring map if exceeded.</p>
                <input 
                  type="number" 
                  name="speedLimitKmh" 
                  value={rules.speedLimitKmh} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Maximum Shift Duration (Hours)</label>
                <p className="text-xs text-gray-500 mb-2">Flags conductor in remittance if exceeded.</p>
                <input 
                  type="number" 
                  name="maxShiftHours" 
                  value={rules.maxShiftHours} 
                  onChange={handleChange} 
                  required 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" 
                />
              </div>
            </div>
          </GlassCard>

          {/* Expense Categories */}
          <GlassCard className="p-4 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white">Conductor Expense Categories</h2>
              <p className="text-xs text-gray-500 mt-1">These will appear in the conductor&apos;s expense logger dropdown.</p>
            </div>
            
            <div className="space-y-2 mb-4">
              {expenseCategories.map((category) => (
                <div key={category} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-sm text-gray-200 break-words mr-4">{category}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveCategory(category)} 
                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                    title="Remove category"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Category Input */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input 
                type="text" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' ? (e.preventDefault(), handleAddCategory()) : null}
                placeholder="e.g. Toll Fee, Oil Change"
                className="flex-1 block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <button 
                type="button" 
                onClick={handleAddCategory} 
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-3 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors active:scale-95 font-medium text-sm"
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </GlassCard>

          {/* Centered Save Button */}
          <div className="flex justify-center pt-2 pb-8">
            <button 
              type="submit" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-95"
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