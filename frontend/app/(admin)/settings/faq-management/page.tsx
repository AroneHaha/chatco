'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  RefreshCw,
  AlertCircle,
  Check,
  Search,
  MessageCircleQuestion,
  Pencil,
  Eye,
  EyeOff,
  Rocket,
  Wallet,
  BusFront,
  ShieldCheck,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import { FAQ_CATEGORIES } from '@/lib/shared/data/faq-data';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

const CATEGORY_META = Object.fromEntries(FAQ_CATEGORIES.map((category) => [category.id, category]));
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'getting-started': Rocket,
  payments: Wallet,
  riding: BusFront,
  safety: ShieldCheck,
  rewards: Gift,
};
const DEFAULT_CATEGORY = FAQ_CATEGORIES[0].id;
const EMPTY_DRAFT = { question: '', answer: '', category: DEFAULT_CATEGORY };
const FIELD =
  'block min-w-0 w-full rounded-lg border border-[#23344F] bg-[#0E1628] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-[#62A0EA] focus:ring-2 focus:ring-[#62A0EA]/20';
const ACTION =
  'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 disabled:cursor-not-allowed disabled:opacity-30';

function CategoryIcon({ category }: { category: string }) {
  const Icon = CATEGORY_ICONS[category] ?? MessageCircleQuestion;
  return <Icon size={16} aria-hidden="true" className="shrink-0 text-[#8CB9F0]" />;
}

export default function FaqManagementPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const editorRef = useRef<HTMLFormElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFaqs = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/faqs', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Failed to load FAQs. Try refreshing.');
      const body = await response.json();
      setFaqs(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQs');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchFaqs();
  }, [fetchFaqs]);
  useEffect(() => {
    if (!showForm) return;
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    questionRef.current?.focus({ preventScroll: true });
  }, [showForm, editingId]);
  useEffect(
    () => () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    },
    []
  );

  const showSuccess = (message: string) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccessMsg(message);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 4000);
  };

  const openEditor = (faq?: FaqItem) => {
    setEditingId(faq?.id ?? null);
    setDraft(
      faq
        ? { question: faq.question, answer: faq.answer, category: faq.category }
        : { ...EMPTY_DRAFT, category: categoryFilter === 'all' ? DEFAULT_CATEGORY : categoryFilter }
    );
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.question.trim() || !draft.answer.trim()) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(editingId ? `/api/admin/faqs/${editingId}` : '/api/admin/faqs', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          question: draft.question.trim(),
          answer: draft.answer.trim(),
          category: draft.category,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'Failed to save FAQ');
      setShowForm(false);
      showSuccess(editingId ? 'Question updated.' : 'Question added.');
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (faq: FaqItem) => {
    if (!window.confirm(`Delete "${faq.question}"?`)) return;
    setPendingId(faq.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/faqs/${faq.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete FAQ');
      if (editingId === faq.id) setShowForm(false);
      showSuccess('Question deleted.');
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete FAQ');
    } finally {
      setPendingId(null);
    }
  };

  const handleVisibility = async (faq: FaqItem) => {
    setPendingId(faq.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/faqs/${faq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !faq.is_active }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'Failed to update visibility');
      showSuccess(faq.is_active ? 'Question hidden from commuters.' : 'Question visible to commuters.');
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update visibility');
    } finally {
      setPendingId(null);
    }
  };

  const handleMove = async (faq: FaqItem, direction: 'up' | 'down') => {
    const siblings = faqs
      .filter((item) => item.category === faq.category)
      .sort((a, b) => a.display_order - b.display_order);
    const index = siblings.findIndex((item) => item.id === faq.id);
    const target = siblings[index + (direction === 'up' ? -1 : 1)];
    if (index === -1 || !target) return;
    setPendingId(faq.id);
    setError(null);
    try {
      const responses = await Promise.all([
        fetch(`/api/admin/faqs/${faq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: target.display_order }),
        }),
        fetch(`/api/admin/faqs/${target.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_order: faq.display_order }),
        }),
      ]);
      if (responses.some((response) => !response.ok))
        throw new Error('Failed to reorder questions. Refresh to check their order.');
      await fetchFaqs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder FAQs');
    } finally {
      setPendingId(null);
    }
  };

  const busy = isSaving || isRefreshing || pendingId !== null;
  const query = search.trim().toLowerCase();
  const filteredFaqs = faqs.filter(
    (faq) =>
      (categoryFilter === 'all' || faq.category === categoryFilter) &&
      (!query || `${faq.question} ${faq.answer}`.toLowerCase().includes(query))
  );
  const categoryIds = [
    ...new Set([...FAQ_CATEGORIES.map((category) => category.id), ...faqs.map((faq) => faq.category)]),
  ];
  const groups = categoryIds
    .map((category) => ({
      category,
      items: filteredFaqs
        .filter((faq) => faq.category === category)
        .sort((a, b) => a.display_order - b.display_order),
    }))
    .filter((group) => group.items.length > 0);
  const visibleCount = faqs.filter((faq) => faq.is_active).length;

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading FAQ management" className="px-4 pb-12 sm:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#1E2D45] motion-safe:animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-44 rounded bg-[#1E2D45] motion-safe:animate-pulse" />
              <div className="h-3 w-48 rounded bg-[#1E2D45] motion-safe:animate-pulse" />
            </div>
          </div>
          <div className="h-32 rounded-xl border border-[#1E2D45] bg-[#111A2B] motion-safe:animate-pulse" />
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-36 rounded-xl border border-[#1E2D45] bg-[#111A2B] motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-12 sm:px-6">
      <div className="@container/faq mx-auto min-w-0 w-full max-w-3xl space-y-5">
        <header className="flex flex-col gap-4 @[36rem]/faq:flex-row @[36rem]/faq:items-center @[36rem]/faq:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#62A0EA]">
              <MessageCircleQuestion size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white">FAQ Management</h1>
              <p className="mt-1 text-sm text-slate-400">Manage the questions commuters see.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchFaqs()}
              disabled={busy}
              aria-label="Refresh FAQs"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#23344F] bg-[#111A2B] text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 disabled:opacity-40"
            >
              <RefreshCw size={17} aria-hidden="true" className={isRefreshing ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => openEditor()}
              disabled={busy}
              aria-expanded={showForm}
              aria-controls="faq-editor"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 disabled:opacity-40"
            >
              <Plus size={17} aria-hidden="true" /> Add question
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className={ACTION}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {successMsg && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"
          >
            <Check size={17} className="shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">{successMsg}</p>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              aria-label="Dismiss success"
              className={ACTION}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {showForm && (
          <form
            id="faq-editor"
            ref={editorRef}
            onSubmit={handleSave}
            aria-labelledby="faq-editor-title"
            className="scroll-mt-6 space-y-4 rounded-xl border border-[#62A0EA]/30 bg-[#111A2B] p-4 @[32rem]/faq:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="faq-editor-title" className="text-base font-semibold text-white">
                  {editingId ? 'Edit question' : 'Add a question'}
                </h2>
                <p className="mt-1 text-xs text-slate-400">Keep answers clear and helpful.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
                aria-label="Close question editor"
                className={ACTION}
              >
                <X size={17} />
              </button>
            </div>
            <div>
              <label htmlFor="faq-category" className="mb-1.5 block text-xs font-medium text-slate-300">
                Category
              </label>
              <select
                id="faq-category"
                value={draft.category}
                onChange={(event) => setDraft((previous) => ({ ...previous, category: event.target.value }))}
                disabled={isSaving}
                required
                className={`${FIELD} [color-scheme:dark]`}
              >
                {FAQ_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="faq-question" className="mb-1.5 block text-xs font-medium text-slate-300">
                Question
              </label>
              <input
                id="faq-question"
                ref={questionRef}
                value={draft.question}
                onChange={(event) => setDraft((previous) => ({ ...previous, question: event.target.value }))}
                disabled={isSaving}
                required
                maxLength={500}
                placeholder="e.g. How do I claim a free ride?"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="faq-answer" className="mb-1.5 block text-xs font-medium text-slate-300">
                Answer
              </label>
              <textarea
                id="faq-answer"
                value={draft.answer}
                onChange={(event) => setDraft((previous) => ({ ...previous, answer: event.target.value }))}
                disabled={isSaving}
                required
                rows={5}
                placeholder="Write the answer commuters will see…"
                className={`${FIELD} resize-y`}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-[#1E2D45] pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
                className={`${ACTION} min-h-11 px-4`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !draft.question.trim() || !draft.answer.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 text-sm font-semibold text-white hover:bg-[#4A8BD4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 disabled:opacity-40"
              >
                {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Add question'}
              </button>
            </div>
          </form>
        )}

        <section
          aria-label="Find questions"
          className="space-y-4 rounded-xl border border-[#1E2D45] bg-[#111A2B] p-4"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{faqs.length} questions</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {visibleCount} visible
            </span>
            <span>{faqs.length - visibleCount} hidden</span>
          </div>
          <div className="grid min-w-0 gap-3 @[32rem]/faq:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="relative min-w-0">
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                aria-label="Search questions and answers"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search questions or answers"
                className={`${FIELD} h-11 pl-9 pr-10`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className={`${FIELD} h-11 [color-scheme:dark]`}
            >
              <option value="all">All categories</option>
              {categoryIds.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_META[category]?.label ?? category}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            {filteredFaqs.length} {filteredFaqs.length === 1 ? 'question' : 'questions'} shown
          </p>
          <p>{query ? 'Clear search to reorder.' : 'Order applies within each category.'}</p>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#23344F] bg-[#111A2B]/60 px-5 py-10 text-center">
            <MessageCircleQuestion size={28} className="mx-auto mb-3 text-slate-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-200">
              {faqs.length === 0 ? 'No questions yet' : 'No matching questions'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {faqs.length === 0
                ? 'Add your first answer to help commuters get started.'
                : 'Try another search or category.'}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => (faqs.length === 0 ? openEditor() : (setSearch(''), setCategoryFilter('all')))}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg px-4 text-sm font-medium text-[#8CB9F0] hover:bg-[#62A0EA]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 disabled:opacity-40"
            >
              {faqs.length === 0 ? 'Add question' : 'Clear filters'}
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <section
              key={group.category}
              aria-labelledby={`faq-group-${group.category}`}
              className="min-w-0 overflow-hidden rounded-xl border border-[#1E2D45] bg-[#111A2B]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[#1E2D45] bg-[#0E1628]/50 px-4 py-3">
                <h2
                  id={`faq-group-${group.category}`}
                  className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-200"
                >
                  <CategoryIcon category={group.category} />
                  {CATEGORY_META[group.category]?.label ?? group.category}
                </h2>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs tabular-nums text-slate-400">
                  {group.items.length}
                </span>
              </div>
              <div className="divide-y divide-[#1E2D45]">
                {group.items.map((faq) => {
                  const siblings = faqs
                    .filter((item) => item.category === faq.category)
                    .sort((a, b) => a.display_order - b.display_order);
                  const index = siblings.findIndex((item) => item.id === faq.id);
                  return (
                    <article key={faq.id} className="min-w-0 p-4">
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA]/50 [&::-webkit-details-marker]:hidden">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#23344F] text-[10px] tabular-nums text-slate-500">
                            {index + 1}
                          </span>
                          <h3 className="min-w-0 flex-1 break-words text-sm font-semibold leading-relaxed text-white">
                            {faq.question}
                          </h3>
                          <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className="mt-1 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <p className="mt-3 whitespace-pre-wrap break-words border-l-2 border-[#62A0EA]/20 pl-3 text-sm leading-relaxed text-slate-300">
                          {faq.answer}
                        </p>
                      </details>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${faq.is_active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-slate-500'}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${faq.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`}
                          />
                          {faq.is_active ? 'Visible' : 'Hidden'}
                        </span>
                        <div className="flex max-w-full flex-wrap items-center gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openEditor(faq)}
                            aria-label={`Edit question: ${faq.question}`}
                            className={ACTION}
                          >
                            <Pencil size={13} aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleVisibility(faq)}
                            aria-label={`${faq.is_active ? 'Hide' : 'Show'} question: ${faq.question}`}
                            title={faq.is_active ? 'Hide from commuters' : 'Show to commuters'}
                            className={ACTION}
                          >
                            {faq.is_active ? (
                              <EyeOff size={13} aria-hidden="true" />
                            ) : (
                              <Eye size={13} aria-hidden="true" />
                            )}
                            {faq.is_active ? 'Hide' : 'Show'}
                          </button>
                          <button
                            type="button"
                            disabled={busy || !!query || index === 0}
                            onClick={() => void handleMove(faq, 'up')}
                            aria-label={`Move up: ${faq.question}`}
                            title="Move up"
                            className={ACTION}
                          >
                            <ChevronUp size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={busy || !!query || index === siblings.length - 1}
                            onClick={() => void handleMove(faq, 'down')}
                            aria-label={`Move down: ${faq.question}`}
                            title="Move down"
                            className={ACTION}
                          >
                            <ChevronDown size={15} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleDelete(faq)}
                            aria-label={`Delete question: ${faq.question}`}
                            title="Delete question"
                            className={`${ACTION} hover:bg-red-500/10 hover:text-red-300`}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
