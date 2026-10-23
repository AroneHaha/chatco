// components/admin/announcements/announcement-form-modal.tsx
'use client';

import { useState } from 'react';
import { Check, PenLine } from 'lucide-react';
import { Modal } from '@/components/admin/ui/modal';
import type { Announcement } from '@/lib/shared/services/announcement.service';

import { InlineError } from '@/components/admin/ui/inline-error';
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

// ─── Categories ──────────────────────────────────────────────────────
// The backend `type` column is a free-form string (max 20). These are the
// categories the admin picks from, or "Other" to type their own. Values stay
// short to fit the 20-char cap; the commuter app buckets them by keyword
// (lib/shared/announcement-category.ts).
const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'SERVICE', label: 'Service disruption', hint: 'Suspended trips, strikes, no-operation days.' },
  { value: 'WEATHER', label: 'Weather', hint: 'Typhoon and flood advisories along the route.' },
  { value: 'SAFETY', label: 'Safety', hint: 'Safety alerts and reminders for riders.' },
  { value: 'ROUTE', label: 'Route', hint: 'Detours and stop changes.' },
  { value: 'SCHEDULE', label: 'Schedule', hint: 'First and last trips, holiday hours.' },
  { value: 'FARE', label: 'Fare', hint: 'Fare and discount changes.' },
  { value: 'MAINTENANCE', label: 'Maintenance', hint: 'Planned app or system downtime.' },
  { value: 'PROMO', label: 'Promo', hint: 'Vouchers, rewards and offers.' },
  { value: 'HOLIDAY', label: 'Holiday', hint: 'Holiday greetings and notices.' },
  { value: 'SYSTEM', label: 'System', hint: 'General app news.' },
];

/** Category values, also used by the Updates Center category filter. */
export const TYPE_SUGGESTIONS = CATEGORIES.map((category) => category.value);

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
  // Blank-field errors found before anything is sent. Shown in the same slot
  // as the backend's 422 field errors.
  const [localErrors, setLocalErrors] = useState<{ title?: string; message?: string }>({});
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
      setLocalErrors({});
      // A saved type that isn't one of the suggested categories (e.g. a
      // custom category typed in a previous edit) means "Other" was in effect.
      setIsOtherMode(!!nextForm.type && !TYPE_SUGGESTIONS.includes(nextForm.type));
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'title' || name === 'message') {
      setLocalErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCategory = (type: string) => {
    setIsOtherMode(false);
    setFormData((prev) => ({
      ...prev,
      type: prev.type === type ? '' : type,
    }));
  };

  const handleOtherCategory = () => {
    setIsOtherMode(true);
    // Clear a previously-selected category so the textbox starts blank for a
    // genuinely custom one; keep an already-custom value as-is.
    setFormData((prev) => ({
      ...prev,
      type: TYPE_SUGGESTIONS.includes(prev.type) ? '' : prev.type,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = {
      title: formData.title.trim() ? undefined : 'The title is required.',
      message: formData.message.trim() ? undefined : 'The message is required.',
    };
    setLocalErrors(errors);
    if (errors.title || errors.message) return;
    void onSubmit(formData);
  };

  const titleError = localErrors.title ?? fieldErrors?.title?.[0];
  const messageError = localErrors.message ?? fieldErrors?.message?.[0];
  const typeError = fieldErrors?.type?.[0];
  const selectedCategory = isOtherMode ? null : CATEGORIES.find((category) => category.value === formData.type);

  const fieldClasses = (hasError: boolean) =>
    `block w-full rounded-md border bg-[#0E1628] admin-light:bg-white px-3 text-sm text-white admin-light:text-slate-900 placeholder:text-slate-600 admin-light:placeholder:text-slate-400 outline-none transition-colors focus:ring-1 disabled:opacity-60 ${
      hasError
        ? 'border-red-500/50 admin-light:border-red-300 focus:border-red-400/60 focus:ring-red-400/30'
        : 'border-[#1E2D45] admin-light:border-[#CBD5E1] focus:border-[#62A0EA]/50 admin-light:focus:border-[#1A5FB4] focus:ring-[#62A0EA]/30 admin-light:focus:ring-[#1A5FB4]/30'
    }`;

  const categoryButton = (selected: boolean, dashed = false) =>
    `inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#62A0EA] admin-light:focus-visible:ring-[#1A5FB4] ${
      selected
        ? 'border-[#62A0EA] admin-light:border-[#1A5FB4] bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white'
        : `${dashed ? 'border-dashed border-[#334155] admin-light:border-[#CBD5E1] bg-transparent' : 'border-[#1E2D45] admin-light:border-[#E2E8F0] bg-[#0E1628] admin-light:bg-white'} text-slate-300 admin-light:text-slate-700 hover:border-[#62A0EA]/50 admin-light:hover:border-[#1A5FB4]/50 hover:text-white admin-light:hover:text-slate-900`
    }`;

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <header className="pr-10">
          <h2 className="text-lg font-bold text-white admin-light:text-slate-900 sm:text-xl">
            {initial ? 'Edit announcement' : 'New announcement'}
          </h2>
          <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">
            {initial
              ? 'Changes are visible to every commuter immediately.'
              : 'Published to every commuter. It appears in their bell within 30 seconds.'}
          </p>
        </header>

        <div className="mt-6 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-6">
          <div className="min-w-0 space-y-6">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-slate-300 admin-light:text-slate-700">
                Category <span className="font-normal text-slate-500">(optional)</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                  const selected = !isOtherMode && formData.type === category.value;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleCategory(category.value)}
                      aria-pressed={selected}
                      title={category.hint}
                      className={categoryButton(selected)}
                    >
                      {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                      {category.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleOtherCategory}
                  aria-pressed={isOtherMode}
                  className={categoryButton(isOtherMode, true)}
                >
                  {isOtherMode ? <Check className="h-3 w-3" aria-hidden="true" /> : <PenLine className="h-3 w-3" aria-hidden="true" />}
                  Other
                </button>
              </div>

              {/* What the picked category is for, so the choice is deliberate. */}
              <p className="mt-2 min-h-4 text-xs text-slate-500" aria-live="polite">
                {selectedCategory
                  ? selectedCategory.hint
                  : isOtherMode
                    ? 'Type a short category of your own.'
                    : 'No category: commuters see it as a System update.'}
              </p>

              {isOtherMode && (
                <div className="mt-2">
                  <label htmlFor="announcement-type" className="sr-only">Custom category</label>
                  <div className="relative max-w-xs">
                    <input
                      type="text"
                      id="announcement-type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      maxLength={20}
                      placeholder="e.g. Fiesta"
                      className={`${fieldClasses(Boolean(typeError))} h-10 pr-12`}
                      aria-invalid={Boolean(typeError)}
                      aria-describedby={typeError ? 'announcement-type-error' : undefined}
                      autoFocus
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] tabular-nums text-slate-500">{formData.type.length}/20</span>
                  </div>
                </div>
              )}
              {typeError && <p id="announcement-type-error" className="mt-1.5 text-xs text-red-400 admin-light:text-red-600">{typeError}</p>}
            </fieldset>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor="announcement-title" className="text-xs font-semibold text-slate-300 admin-light:text-slate-700">
                  Title <span className="text-red-400 admin-light:text-red-600">*</span>
                </label>
                <span className="text-[10px] tabular-nums text-slate-500">{formData.title.length}/200</span>
              </div>
              <input
                type="text"
                id="announcement-title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                maxLength={200}
                placeholder="e.g. Route 14 detour starting Monday"
                className={`${fieldClasses(Boolean(titleError))} h-11 text-base font-medium md:text-sm`}
                aria-invalid={Boolean(titleError)}
                aria-describedby={titleError ? 'announcement-title-error' : undefined}
              />
              {titleError && <p id="announcement-title-error" className="mt-1.5 text-xs text-red-400 admin-light:text-red-600">{titleError}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor="announcement-message" className="text-xs font-semibold text-slate-300 admin-light:text-slate-700">
                  Message <span className="text-red-400 admin-light:text-red-600">*</span>
                </label>
                <span className="text-[10px] tabular-nums text-slate-500">{formData.message.length}/5000</span>
              </div>
              <textarea
                id="announcement-message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                maxLength={5000}
                rows={7}
                placeholder="What riders need to know: what changes, where, and from when."
                className={`${fieldClasses(Boolean(messageError))} min-h-40 resize-y py-2.5 leading-6`}
                aria-invalid={Boolean(messageError)}
                aria-describedby={messageError ? 'announcement-message-error' : undefined}
              />
              {messageError && <p id="announcement-message-error" className="mt-1.5 text-xs text-red-400 admin-light:text-red-600">{messageError}</p>}
            </div>
          </div>

        </div>

        {/* Submit error (403, 401, network) */}
        {submitError && (
          <InlineError className="mt-6">{submitError}</InlineError>
        )}

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#1E2D45] admin-light:border-[#E2E8F0] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 rounded-md border border-[#1E2D45] admin-light:border-[#E2E8F0] px-4 text-sm font-semibold text-slate-300 admin-light:text-slate-700 transition-colors hover:bg-[#1A2540] admin-light:hover:bg-[#F1F5F9] hover:text-white admin-light:hover:text-slate-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#62A0EA] admin-light:bg-[#1A5FB4] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
            )}
            {initial ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
