// components/admin/announcements/announcement-form-modal.tsx
'use client';

import { useState } from 'react';
import { Check, PenLine } from 'lucide-react';
import { Modal } from '@/components/admin/ui/modal';
import type { Announcement } from '@/lib/shared/services/announcement.service';

// ─── Types ───────────────────────────────────────────────────────────

export interface AnnouncementFormData {
  title: string;
  message: string;
  type: string;
}

interface AnnouncementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AnnouncementFormData) => Promise<void>;
  /** When set, the modal is in edit mode (pre-fills the form). */
  initial?: Announcement | null;
  /** Field-level validation errors from the backend (422). */
  fieldErrors?: Record<string, string[]>;
  /** Top-level submit error (e.g. 403 forbidden). */
  submitError?: string | null;
  isSubmitting?: boolean;
}

const emptyForm: AnnouncementFormData = {
  title: '',
  message: '',
  type: '',
};

// ─── Suggested type chips ────────────────────────────────────────────
// The backend `type` column is a free-form string (max 20). These are
// common categories the admin can click to pre-fill, or they can type
// their own. Kept short to fit the 20-char backend cap.
export const TYPE_SUGGESTIONS = ['SYSTEM', 'SAFETY', 'PROMO', 'MAINTENANCE', 'ROUTE', 'HOLIDAY'];

// ─── Component ───────────────────────────────────────────────────────

/**
 * Sprint 6 (S6-T9) — shared create/edit modal for admin announcements.
 *
 *   create() → POST /api/v1/admin/announcements
 *   update() → PUT  /api/v1/admin/announcements/{id}
 *
 * The same form is reused for both flows: pass `initial` to edit an existing
 * announcement, or omit it to create a new one. Validation rules mirror the
 * backend StoreAnnouncementRequest (title ≤ 200, message ≤ 5000, type ≤ 20).
 */
export function AnnouncementFormModal({
  isOpen,
  onClose,
  onSubmit,
  initial,
  fieldErrors,
  submitError,
  isSubmitting = false,
}: AnnouncementFormModalProps) {
  const [formData, setFormData] = useState<AnnouncementFormData>(emptyForm);
  // Whether the free-form "Other" category textbox is showing. Only relevant
  // while the modal is open; derived from the loaded type on open (see below).
  const [isOtherMode, setIsOtherMode] = useState(false);
  // Track the previous open-state + target so we can reset the form whenever
  // the modal opens or switches target. Per the React docs, this "adjust state
  // during render" pattern is preferred over syncing via useEffect (which
  // triggers cascading renders). Setting state during render is safe here
  // because the condition is guarded by a previous-value comparison.
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  const openKey = isOpen ? (initial ? `edit-${initial.id}` : 'new') : 'closed';
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (isOpen) {
      const nextForm = initial
        ? { title: initial.title, message: initial.message, type: initial.type }
        : emptyForm;
      setFormData(nextForm);
      // A saved type that isn't one of the suggested chips (e.g. a custom
      // category typed in a previous edit) means "Other" was in effect.
      setIsOtherMode(!!nextForm.type && !TYPE_SUGGESTIONS.includes(nextForm.type));
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChip = (type: string) => {
    setIsOtherMode(false);
    setFormData((prev) => ({
      ...prev,
      type: prev.type === type ? '' : type,
    }));
  };

  const handleOtherChip = () => {
    setIsOtherMode(true);
    // Clear a previously-selected suggestion chip so the textbox starts blank
    // for a genuinely custom category; keep an already-custom value as-is.
    setFormData((prev) => ({
      ...prev,
      type: TYPE_SUGGESTIONS.includes(prev.type) ? '' : prev.type,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSubmit(formData);
  };

  const inputClasses =
    'mt-1 block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors';

  const titleLen = formData.title.length;
  const messageLen = formData.message.length;
  const typeLen = formData.type.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
        {initial ? 'Edit Announcement' : 'New Announcement'}
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        {initial
          ? 'Update the title, message, or category. Changes are visible to all users immediately.'
          : 'Publish a new announcement. It will appear in the commuter bell within 30s.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-xs font-medium text-slate-300 mb-1.5">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            maxLength={200}
            placeholder="e.g., Route 14 Detour Starting Monday"
            className={inputClasses}
            aria-invalid={!!fieldErrors?.title}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-red-400">
              {fieldErrors?.title?.[0] ?? ''}
            </p>
            <p className="text-[10px] text-slate-600">{titleLen}/200</p>
          </div>
        </div>

        {/* Type (optional) — pick a suggested category chip, or "Other" to type a custom one. */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Category <span className="text-slate-600">(optional)</span>
          </label>
          <p className="text-[11px] text-slate-500 mb-2">
            Pick one, or choose <span className="text-slate-400 font-medium">Other</span> to type your own.
          </p>
          <div className="flex flex-wrap gap-2">
            {TYPE_SUGGESTIONS.map((t) => {
              const selected = !isOtherMode && formData.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChip(t)}
                  aria-pressed={selected}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                    selected
                      ? 'border-[#62A0EA] bg-[#62A0EA] text-white'
                      : 'border-[#1E2D45] bg-[#0E1628] text-slate-400 hover:border-[#62A0EA]/50 hover:bg-[#62A0EA]/10 hover:text-white'
                  }`}
                >
                  {selected && <Check className="h-3 w-3" />}
                  {t}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleOtherChip}
              aria-pressed={isOtherMode}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                isOtherMode
                  ? 'border-[#62A0EA] bg-[#62A0EA] text-white'
                  : 'border-dashed border-[#334155] bg-transparent text-slate-500 hover:border-[#62A0EA]/50 hover:bg-[#62A0EA]/10 hover:text-white'
              }`}
            >
              {isOtherMode ? <Check className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
              Other
            </button>
          </div>
          {isOtherMode && (
            <div className="mt-2 border-l-2 border-[#62A0EA]/40 pl-3">
              <input
                type="text"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                maxLength={20}
                placeholder="Type a custom category"
                className={inputClasses}
                aria-invalid={!!fieldErrors?.type}
                autoFocus
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-red-400">
                  {fieldErrors?.type?.[0] ?? ''}
                </p>
                <p className="text-[10px] text-slate-600">{typeLen}/20</p>
              </div>
            </div>
          )}
          {!isOtherMode && fieldErrors?.type?.[0] && (
            <p className="text-[11px] text-red-400 mt-1">{fieldErrors.type[0]}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-xs font-medium text-slate-300 mb-1.5">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            maxLength={5000}
            rows={6}
            placeholder="Write the full announcement body. Commuters will see this when they click the bell."
            className={`${inputClasses} resize-y min-h-[140px]`}
            aria-invalid={!!fieldErrors?.message}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-red-400">
              {fieldErrors?.message?.[0] ?? ''}
            </p>
            <p className="text-[10px] text-slate-600">{messageLen}/5000</p>
          </div>
        </div>

        {/* Submit error (403, 401, network) */}
        {submitError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <p className="text-red-400 text-xs font-medium">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-md text-xs font-semibold text-slate-400 hover:text-white bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim() || !formData.message.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#62A0EA] text-white text-xs font-semibold rounded-md hover:bg-[#4A8BD4] transition-colors shadow-lg shadow-[#62A0EA]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {initial ? 'Save Changes' : 'Publish'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
