// app/(admin)/settings/faq-management/page.tsx
'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/admin/ui/glass-card';
import { Plus, Trash2, ChevronUp, ChevronDown, Save, X } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
}

export default function FaqManagementPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([
    { id: '1', question: 'How do I top-up my wallet?', answer: 'Go to the Wallet tab, click "Load Wallet", and enter the amount. You can pay via GCash or over-the-counter.', displayOrder: 1 },
    { id: '2', question: 'I left my item on the jeep. How do I report it?', answer: 'Go to the "Lost & Found" section in the app menu and fill out the item report form with the details of your trip.', displayOrder: 2 },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [isSaved, setIsSaved] = useState(false);

  const handleAdd = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    const newId = Date.now().toString();
    const maxOrder = faqs.length > 0 ? Math.max(...faqs.map(f => f.displayOrder)) : 0;
    
    setFaqs(prev => [...prev, { id: newId, ...newFaq, displayOrder: maxOrder + 1 }]);
    setNewFaq({ question: '', answer: '' });
    setShowAddForm(false);
    setIsSaved(false);
  };

  const handleDelete = (id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id));
    setIsSaved(false);
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    setFaqs(prev => {
      const index = prev.findIndex(f => f.id === id);
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === prev.length - 1)) return prev;
      
      const newFaqs = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newFaqs[index].displayOrder, newFaqs[swapIndex].displayOrder] = 
      [newFaqs[swapIndex].displayOrder, newFaqs[index].displayOrder];
      
      return newFaqs.sort((a, b) => a.displayOrder - b.displayOrder);
    });
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6">FAQ Management</h1>
      
      <form onSubmit={handleSave} className="space-y-4 max-w-4xl">
        
        <div className="flex justify-end">
          <button type="button" onClick={() => setShowAddForm(!showAddForm)} className="flex items-center space-x-2 px-4 py-2 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors">
            {showAddForm ? <X size={18} /> : <Plus size={18} />}
            <span>{showAddForm ? 'Cancel' : 'Add New FAQ'}</span>
          </button>
        </div>

        {showAddForm && (
          <GlassCard className="p-4 border-cyan-500/30 bg-cyan-500/5">
            <div className="space-y-3">
              <input type="text" value={newFaq.question} onChange={(e) => setNewFaq(p => ({...p, question: e.target.value}))} placeholder="Enter the question..." className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-cyan-500" />
              <textarea value={newFaq.answer} onChange={(e) => setNewFaq(p => ({...p, answer: e.target.value}))} placeholder="Enter the answer..." rows={3} className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-cyan-500 resize-none" />
              <button type="button" onClick={handleAdd} className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-md hover:bg-cyan-700">Save FAQ Item</button>
            </div>
          </GlassCard>
        )}

        <div className="space-y-3">
          {faqs.length === 0 ? (
            <GlassCard className="p-8 text-center text-gray-500">No FAQs added yet.</GlassCard>
          ) : (
            faqs.map((faq, index) => (
              <GlassCard key={faq.id} className="p-4 group">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500">Q{faq.displayOrder}</span>
                      <h3 className="text-white font-semibold">{faq.question}</h3>
                    </div>
                    <p className="text-sm text-gray-400 ml-6">{faq.answer}</p>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleMove(faq.id, 'up')} disabled={index === 0} className="p-1 hover:text-white disabled:cursor-not-allowed"><ChevronUp size={16} /></button>
                    <button type="button" onClick={() => handleMove(faq.id, 'down')} disabled={index === faqs.length - 1} className="p-1 hover:text-white disabled:cursor-not-allowed"><ChevronDown size={16} /></button>
                    <button type="button" onClick={() => handleDelete(faq.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {faqs.length > 0 && (
          <button type="submit" className="flex items-center space-x-2 px-6 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors">
            <Save size={18} />
            <span>{isSaved ? 'Order Saved!' : 'Save Display Order'}</span>
          </button>
        )}
      </form>
    </>
  );
}