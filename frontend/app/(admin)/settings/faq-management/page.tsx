// app/(admin)/settings/faq-management/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import BackButton from '@/components/admin/ui/back-button';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, X } from 'lucide-react';
import { initialFaqs, type FaqItem } from '@/app/(admin)/settings/data/settings-data';

export default function FaqManagementPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([...initialFaqs]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [isSaved, setIsSaved] = useState(false);

  const handleAdd = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    const newId = Date.now().toString();
    const maxOrder = faqs.length > 0 ? Math.max(...faqs.map((f: FaqItem) => f.displayOrder)) : 0;
    
    setFaqs(prev => [...prev, { id: newId, ...newFaq, displayOrder: maxOrder + 1 }]);
    setNewFaq({ question: '', answer: '' });
    setShowAddForm(false);
    setIsSaved(false);
  };

  const handleDelete = (id: string) => {
    setFaqs(prev => prev.filter((f: FaqItem) => f.id !== id));
    setIsSaved(false);
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    setFaqs(prev => {
      const index = prev.findIndex((f: FaqItem) => f.id === id);
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === prev.length - 1)) return prev;
      
      const newFaqs = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newFaqs[index].displayOrder, newFaqs[swapIndex].displayOrder] = 
      [newFaqs[swapIndex].displayOrder, newFaqs[index].displayOrder];
      
      return newFaqs.sort((a: FaqItem, b: FaqItem) => a.displayOrder - b.displayOrder);
    });
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        
        {/* Left-aligned Back Button */}
        <div className="pt-2">
          <BackButton href="/settings" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">FAQ Management</h1>
        </div>
        
        <form onSubmit={handleSave} className="space-y-4">
          
          <div className="flex justify-center sm:justify-end">
            <button 
              type="button" 
              onClick={() => setShowAddForm(!showAddForm)} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors active:scale-95"
            >
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showAddForm ? 'Cancel' : 'Add New FAQ'}</span>
            </button>
          </div>

          {showAddForm && (
            <GlassCard className="p-4 sm:p-6 border-cyan-500/30 bg-cyan-500/5">
              <div className="space-y-3">
                <input 
                  type="text" 
                  value={newFaq.question} 
                  onChange={(e) => setNewFaq(p => ({...p, question: e.target.value}))} 
                  placeholder="Enter the question..." 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500" 
                />
                <textarea 
                  value={newFaq.answer} 
                  onChange={(e) => setNewFaq(p => ({...p, answer: e.target.value}))} 
                  placeholder="Enter the answer..." 
                  rows={3} 
                  className="block w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" 
                />
                <button 
                  type="button" 
                  onClick={handleAdd} 
                  className="w-full sm:w-auto px-6 py-2.5 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors active:scale-95"
                >
                  Save FAQ Item
                </button>
              </div>
            </GlassCard>
          )}

          <div className="space-y-3">
            {faqs.length === 0 ? (
              <GlassCard className="p-8 text-center text-gray-500">No FAQs added yet.</GlassCard>
            ) : (
              faqs.map((faq: FaqItem, index: number) => (
                <GlassCard key={faq.id} className="p-4 sm:p-5 group">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500 flex-shrink-0">Q{faq.displayOrder}</span>
                        <h3 className="text-sm sm:text-base text-white font-semibold break-words">{faq.question}</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-400 ml-6 break-words">{faq.answer}</p>
                    </div>
                    
                    <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button 
                        type="button" 
                        onClick={() => handleMove(faq.id, 'up')} 
                        disabled={index === 0} 
                        className="p-2 hover:text-white disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleMove(faq.id, 'down')} 
                        disabled={index === faqs.length - 1} 
                        className="p-2 hover:text-white disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDelete(faq.id)} 
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              ))
            )}
          </div>

          {faqs.length > 0 && (
            <div className="flex justify-center pt-2 pb-8">
              <button 
                type="submit" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors active:scale-95"
              >
                <Save size={18} />
                <span>{isSaved ? 'Order Saved!' : 'Save Display Order'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}