// app/(admin)/announcements/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Megaphone, Archive, Edit3, Eye, AlertTriangle } from 'lucide-react';
import {
  listForAdmin,
  create as createAnnouncement,
  update as updateAnnouncement,
  archive as archiveAnnouncement,
  AnnouncementOperationError,
  type Announcement,
} from '@/lib/shared/services/announcement.service';
import { AnnouncementFormModal, type AnnouncementFormData } from '@/components/admin/announcements/announcement-form-modal';
import { AnnouncementDetailModal } from '@/components/shared/announcement-detail-modal';
import { Modal } from '@/components/admin/ui/modal';

/**
 * Sprint 6 (S6-T9) — Admin announcement management, wired to the real backend.
 *
 *   listForAdmin() → GET /api/v1/admin/announcements (all, incl. ARCHIVED)
 *   create()       → POST /api/v1/admin/announcements
 *   update()       → PUT /api/v1/admin/announcements/{id}
 *   archive()      → PATCH /api/v1/admin/announcements/{id}/archive
 *
 * The table shows every announcement (Active + Archived) with title, message
 * preview, category, status badge, author, and timestamp. The status filter
 * (All / Active / Archived) is client-side on the loaded page. Create + Edit
 * share the AnnouncementFormModal. Archive asks for confirmation (archived
 * items disappear from the commuter bell immediately).
 *
 * Role:ADMIN enforced at the Laravel /admin route group.
 */
export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Status filter (client-side on the loaded page).
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [detailItem, setDetailItem] = useState<Announcement | null>(null);
  const [archivingItem, setArchivingItem] = useState<Announcement | null>(null);

  // Form submit state.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isArchiving, setIsArchiving] = useState(false);

  // ─── Fetch the admin list (all announcements incl. ARCHIVED) ────────
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const result = await listForAdmin({ perPage: 50 });
      setItems(result.items);
    } catch (err) {
      setListError(
        err instanceof AnnouncementOperationError
          ? err.message
          : 'Unable to load announcements.'
      );
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ─── Client-side filter + search ────────────────────────────────────
  const filteredItems = items.filter((item) => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !item.title.toLowerCase().includes(q) &&
        !item.message.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const activeCount = items.filter((i) => i.status === 'ACTIVE').length;
  const archivedCount = items.filter((i) => i.status === 'ARCHIVED').length;

  // ─── Open create / edit ─────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFieldErrors(undefined);
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingItem(item);
    setFieldErrors(undefined);
    setSubmitError(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingItem(null);
    setFieldErrors(undefined);
    setSubmitError(null);
  };

  // ─── Submit create / edit ───────────────────────────────────────────
  const handleSubmitForm = async (data: AnnouncementFormData) => {
    setIsSubmitting(true);
    setFieldErrors(undefined);
    setSubmitError(null);
    try {
      if (editingItem) {
        await updateAnnouncement(editingItem.id, {
          title: data.title,
          message: data.message,
          type: data.type || null,
        });
      } else {
        await createAnnouncement({
          title: data.title,
          message: data.message,
          ...(data.type ? { type: data.type } : {}),
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
      void refresh();
    } catch (err) {
      if (err instanceof AnnouncementOperationError) {
        if (err.code === 'validation') {
          setFieldErrors(err.fieldErrors);
          setSubmitError(err.message);
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('Unable to save this announcement.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Archive flow (with confirm) ────────────────────────────────────
  const handleConfirmArchive = async () => {
    if (!archivingItem) return;
    setIsArchiving(true);
    setActionError(null);
    try {
      await archiveAnnouncement(archivingItem.id);
      setArchivingItem(null);
      void refresh();
    } catch (err) {
      setActionError(
        err instanceof AnnouncementOperationError
          ? err.message
          : 'Unable to archive this announcement.'
      );
    } finally {
      setIsArchiving(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────
  const formatRelativeTime = (iso: string): string => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const searchInputClasses =
    'w-full bg-[#0E1628] border border-[#1E2D45] rounded-md pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#131C2E] border border-[#1E2D45] p-4 lg:px-8 lg:py-6 z-10 rounded-lg mb-6">
        <div className="flex flex-col sm:flex-row lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-white font-bold text-xl lg:text-2xl flex items-center gap-2">
              <Megaphone size={22} className="text-[#62A0EA]" />
              Announcements
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              {items.length} total • {activeCount} active • {archivedCount} archived
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#62A0EA] text-white text-xs font-semibold rounded-md hover:bg-[#4A8BD4] transition-colors shadow-lg shadow-[#62A0EA]/30 flex-shrink-0"
          >
            <Plus size={16} />
            <span>New Announcement</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search title or message…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={searchInputClasses}
            />
          </div>
          {/* Status filter */}
          <div className="flex bg-[#0E1628] rounded-md p-1 border border-[#1E2D45]">
            {([['ALL', 'All'], ['ACTIVE', 'Active'], ['ARCHIVED', 'Archived']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === key
                    ? 'bg-[#62A0EA] text-white shadow-lg shadow-[#62A0EA]/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-[#1A2540]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="mx-4 lg:mx-8 mb-4 bg-red-500/10 border border-red-500/30 rounded-md p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs font-medium">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto pb-28 lg:pb-8 px-4 lg:px-8">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#1E2D45] border-t-[#62A0EA] rounded-full animate-spin" />
            <p className="text-slate-500 text-sm mt-4">Loading announcements…</p>
          </div>
        ) : listError ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <AlertTriangle size={32} className="text-red-400/60 mb-3" />
            <p className="text-red-400 font-medium text-sm mb-3">{listError}</p>
            <button
              onClick={() => void refresh()}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-[#62A0EA] text-white"
            >
              Try again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <Megaphone size={40} className="text-slate-600 mb-3" />
            <h3 className="text-slate-300 font-semibold mb-1">No announcements found</h3>
            <p className="text-slate-500 text-sm">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Click "New Announcement" to publish your first one.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-[#131C2E] border border-[#1E2D45] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1E2D45] bg-[#0E1628]">
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Title</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-32">Category</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-24">Status</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-40">Author</th>
                    <th className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-32">Posted</th>
                    <th className="text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D45]">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1A2540] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-white truncate max-w-xs">{item.title}</p>
                        <p className="text-xs text-slate-500 truncate max-w-xs mt-0.5">
                          {item.message.slice(0, 80)}
                          {item.message.length > 80 ? '…' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {item.type ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#62A0EA]/10 border border-[#62A0EA]/20 text-[#62A0EA]">
                            {item.type}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            item.status === 'ARCHIVED'
                              ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {item.displayStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[10rem]">
                        {item.createdBy ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailItem(item)}
                            title="View"
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit"
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10 transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setArchivingItem(item)}
                            title="Archive"
                            disabled={item.status === 'ARCHIVED'}
                            className="p-1.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Archive size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="bg-[#131C2E] border border-[#1E2D45] rounded-lg p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-white flex-1">{item.title}</p>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === 'ARCHIVED'
                          ? 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      }`}
                    >
                      {item.displayStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {item.message.slice(0, 120)}
                    {item.message.length > 120 ? '…' : ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                      {item.type && (
                        <span className="px-1.5 py-0.5 rounded bg-[#62A0EA]/10 text-[#62A0EA] font-bold uppercase">
                          {item.type}
                        </span>
                      )}
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetailItem(item)} className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => handleOpenEdit(item)} className="p-1.5 rounded-md text-slate-500 hover:text-[#62A0EA] hover:bg-[#62A0EA]/10">
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setArchivingItem(item)}
                        disabled={item.status === 'ARCHIVED'}
                        className="p-1.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 disabled:opacity-30"
                      >
                        <Archive size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit modal */}
      <AnnouncementFormModal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        initial={editingItem}
        fieldErrors={fieldErrors}
        submitError={submitError}
        isSubmitting={isSubmitting}
      />

      {/* Detail modal */}
      <AnnouncementDetailModal
        announcement={detailItem}
        isOpen={detailItem !== null}
        onClose={() => setDetailItem(null)}
      />

      {/* Archive confirm modal */}
      <Modal isOpen={archivingItem !== null} onClose={() => !isArchiving && setArchivingItem(null)} maxWidth="max-w-sm">
        {archivingItem && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Archive size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Archive this announcement?</h3>
                <p className="text-xs text-slate-400 mt-1">
                  It will immediately disappear from the commuter bell and the user-facing feed. You can still see it by filtering to Archived.
                </p>
              </div>
            </div>
            <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-3">
              <p className="text-sm font-semibold text-white">{archivingItem.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{archivingItem.message}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setArchivingItem(null)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-400 hover:text-white bg-[#0E1628] border border-[#1E2D45] hover:bg-[#1A2540] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {isArchiving && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Archive
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
