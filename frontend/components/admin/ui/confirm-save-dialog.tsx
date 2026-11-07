// components/admin/ui/confirm-save-dialog.tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import { ADMIN_BUTTON, DetailRows, ModalKickerHeader } from '@/components/admin/ui/modal-parts';
import { InlineError } from '@/components/admin/ui/inline-error';

/**
 * "Save changes?" dialog for Settings pages: lists what changes, then saves
 * only on confirm. Same shell as App Configuration's confirm dialog.
 */
export function ConfirmSaveDialog({
  title,
  description,
  rows,
  notes,
  isSaving,
  error,
  onCancel,
  onConfirm,
  theme,
}: {
  title: string;
  description: ReactNode;
  rows: { label: string; value: ReactNode }[];
  /** Side effects worth knowing before confirming, one per line. */
  notes?: string[];
  isSaving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  /** The `data-admin-theme` scope the form sits in; the portal leaves it. */
  theme?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      data-admin-theme={theme}
      role="alertdialog"
      aria-labelledby="confirm-save-title"
      aria-describedby="confirm-save-description"
      aria-busy={isSaving}
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onCancel();
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-[#23344F] admin-light:border-[#CBD5E1] bg-[#111A2B] admin-light:bg-white p-5 text-white admin-light:text-slate-900 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <ModalKickerHeader
        kicker="Confirm action"
        title={title}
        titleId="confirm-save-title"
        description={<span id="confirm-save-description">{description}</span>}
      />
      <DetailRows className="mt-4" rows={rows} />
      {notes && notes.length > 0 && (
        <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-slate-300 admin-light:text-slate-600">
          {notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}
      {error && <InlineError className="mt-4">{error}</InlineError>}
      <div className="mt-5 flex flex-col-reverse gap-2 min-[380px]:flex-row">
        <button type="button" autoFocus disabled={isSaving} onClick={onCancel} className={`flex-1 ${ADMIN_BUTTON.secondary}`}>
          Cancel
        </button>
        <button type="button" disabled={isSaving} onClick={onConfirm} className={`flex-1 ${ADMIN_BUTTON.primary}`}>
          {isSaving && <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />}
          {isSaving ? 'Saving...' : 'Confirm and save'}
        </button>
      </div>
    </dialog>,
    document.body
  );
}
