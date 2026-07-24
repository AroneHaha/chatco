// app/(admin)/settings/faq-management/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, X, RefreshCw, AlertCircle } from 'lucide-react';
import { FAQ_CATEGORIES } from '@/lib/shared/data/faq-data';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

/** slug → { label, emoji } lookup for rendering category badges. */
const CATEGORY_META = Object.fromEntries(
  FAQ_CATEGORIES.map((c) => [c.id, c])
);

const DEFAULT_CATEGORY = FAQ_CATEGORIES[0].id;

export default function FaqManagementPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: DEFAULT_CATEGORY });

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/faqs', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Failed to load FAQs');
      const json = await res.json();
      setFaqs(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFaqs(); }, [fetchFaqs]);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

  const handleAdd = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newFaq.question.trim(), answer: newFaq.answer.trim(), category: newFaq.category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create FAQ');
      showSuccess('FAQ added successfully.');
      setNewFaq({ question: '', answer: '', category: DEFAULT_CATEGORY });
      setShowAddForm(false);
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this FAQ item?')) return;
    try {
      const res = await fetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete FAQ');
      showSuccess('FAQ deleted.');
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete FAQ');
    }
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const index = faqs.findIndex(f => f.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const current = faqs[index];
    const target = faqs[targetIndex];

    // Swap display_order via PUT
    try {
      await Promise.all([
        fetch(`/api/admin/faqs/${current.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_order: target.display_order }) }),
        fetch(`/api/admin/faqs/${target.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_order: current.display_order }) }),
      ]);
      await fetchFaqs();
    } catch (err) {
      setError('Failed to reorder FAQs');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="h-8 w-48 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">FAQ Management</h1>
          <div className="flex items-center gap-2">
            <button onClick={fetchFaqs} title="Refresh" className="p-2.5 text-slate-400 hover:text-white bg-[#131C2E] border border-[#1E2D45] rounded-lg transition-colors"><RefreshCw size={18} /></button>
            <button onClick={() => setShowAddForm(!showAddForm)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95">
              {showAddForm ? <X size={18} /> : <Plus size={18} />}
              <span>{showAddForm ? 'Cancel' : 'Add FAQ'}</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400"><X size={16} /></button>
          </div>
        )}

        {/* Success */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-emerald-400">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400"><X size={16} /></button>
          </div>
        )}

        {/* Add Form */}
        {showAddForm && (
          <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg space-y-4">
            <h3 className="text-sm font-bold text-white">New FAQ Item</h3>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Category *</label>
              <select
                value={newFaq.category}
                onChange={e => setNewFaq(prev => ({ ...prev, category: e.target.value }))}
                className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] [color-scheme:dark]"
              >
                {FAQ_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id} className="bg-[#0E1628]">
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">Groups this question under a section in the landing-page FAQ chat.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Question *</label>
              <input type="text" value={newFaq.question} onChange={e => setNewFaq(prev => ({ ...prev, question: e.target.value }))} placeholder="e.g., How do I pay with GCash?" className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Answer *</label>
              <textarea value={newFaq.answer} onChange={e => setNewFaq(prev => ({ ...prev, answer: e.target.value }))} rows={3} placeholder="Enter the answer..." className="block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] resize-none" />
            </div>
            <button onClick={handleAdd} disabled={isSaving} className="px-6 py-2.5 bg-[#62A0EA] text-white text-sm font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50">
              {isSaving ? 'Adding...' : 'Add FAQ'}
            </button>
          </div>
        )}

        {/* FAQ List */}
        <div className="space-y-3">
          {faqs.length === 0 ? (
            <div className="py-12 text-center text-slate-600 text-sm bg-[#131C2E] border border-[#1E2D45] rounded-lg">No FAQ items yet. Click "Add FAQ" to create one.</div>
          ) : faqs.map((faq, index) => (
            <div key={faq.id} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded-full text-[10px] font-semibold bg-[#62A0EA]/10 border border-[#62A0EA]/20 text-[#62A0EA]">
                    {CATEGORY_META[faq.category]
                      ? `${CATEGORY_META[faq.category].emoji} ${CATEGORY_META[faq.category].label}`
                      : faq.category}
                  </span>
                  <p className="text-sm font-semibold text-white">{faq.question}</p>
                  <p className="text-sm text-slate-400 mt-1">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleMove(faq.id, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronUp size={16} /></button>
                  <button onClick={() => handleMove(faq.id, 'down')} disabled={index === faqs.length - 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"><ChevronDown size={16} /></button>
                  <button onClick={() => handleDelete(faq.id)} className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
