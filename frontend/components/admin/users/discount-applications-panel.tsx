'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DataTable } from '@/components/admin/ui/data-table';
import { TablePagination } from '@/components/admin/ui/table-pagination';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { ReviewRequestModal } from '@/components/admin/users/review-request-modal';
import type { PendingRequest } from '@/app/(admin)/users/data/users-data';
import { educationSummary, renewalRequest, RENEWAL_LABELS, schoolYearSummary, type DiscountApplication } from '@/lib/shared/services/student-renewal.service';

interface ApplicationsPage {
  data: DiscountApplication[]; current_page: number; last_page: number;
  total: number; from: number | null; to: number | null;
}

function reviewRequest(application: DiscountApplication): PendingRequest | null {
  const profile = application.commuter;
  if (!profile) return null;
  return {
    id: application.id, name: `${profile.first_name} ${profile.middle_name ?? ''} ${profile.surname}`.replace(/\s+/g, ' ').trim(),
    firstName: profile.first_name, middleName: profile.middle_name, surname: profile.surname, email: profile.email,
    phoneNumber: profile.contact_number, commuterType: 'Student', languagePreference: 'English',
    idImageUrl: application.document_url ?? '', status: 'Pending Verification', birthdate: profile.birthdate,
    gender: profile.gender, username: profile.username, appliedType: 'STUDENT', rejectionCount: 0,
    rejectionHistory: [], blockedUntil: null, createdAt: application.submitted_at,
  };
}

export function DiscountApplicationsPanel({ initialId }: { initialId?: string }) {
  const [result, setResult] = useState<ApplicationsPage | null>(null);
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<DiscountApplication | null>(null);
  const listSequence = useRef(0);
  const reviewSequence = useRef(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++listSequence.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '10', status, search: query });
      const data = await renewalRequest<ApplicationsPage>(`/api/admin/discount-applications?${params}`, { signal });
      if (!signal?.aborted && sequence === listSequence.current) { setResult(data); setError(''); }
    } catch (err) { if (!signal?.aborted && sequence === listSequence.current) setError(err instanceof Error ? err.message : 'Unable to load applications.'); }
    finally { if (!signal?.aborted && sequence === listSequence.current) setLoading(false); }
  }, [page, status, query]);
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 600);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController(); void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const open = useCallback(async (id: string, signal?: AbortSignal) => {
    const sequence = ++reviewSequence.current;
    try {
      const data = await renewalRequest<ApplicationsPage>(`/api/admin/discount-applications?id=${encodeURIComponent(id)}`, { signal });
      if (!signal?.aborted && sequence === reviewSequence.current && data.data[0]) setSelected(data.data[0]);
    } catch (err) { if (!signal?.aborted && sequence === reviewSequence.current) setError(err instanceof Error ? err.message : 'Unable to open application.'); }
  }, []);
  useEffect(() => {
    if (!initialId) return;
    const controller = new AbortController(); void open(initialId, controller.signal);
    return () => controller.abort();
  }, [initialId, open]);
  const review = async (decision: string, reason?: string) => {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      await renewalRequest(`/api/admin/discount-applications/${encodeURIComponent(selected.id)}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, reason, revision: selected.revision }) });
      setSelected(null); setMessage(decision === 'APPROVED' ? 'Student renewal approved.' : decision === 'NEEDS_CORRECTION' ? 'Corrections requested. The commuter has seven days to respond.' : 'Renewal rejected. The commuter is now Regular.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to review application.'); void open(selected.id); }
    finally { setBusy(false); }
  };
  const columns = [
    { key: 'commuter', label: 'Commuter', render: (_: never, item: DiscountApplication) => <div><p className="font-medium text-white">{item.commuter?.first_name} {item.commuter?.surname}</p><p className="text-xs text-slate-400">{item.commuter?.email}</p></div> },
    { key: 'request_type', label: 'Request', render: () => <span className="rounded-full border border-[#62A0EA]/30 bg-[#62A0EA]/10 px-2 py-1 text-xs text-[#99C1F1]">Renewal</span> },
    { key: 'school_name', label: 'School', render: (_: never, item: DiscountApplication) => <div><p>{item.school_name}</p><p className="text-xs text-slate-400">{educationSummary(item)}</p></div> },
    { key: 'school_year', label: 'School Year / Term', render: (_: never, item: DiscountApplication) => schoolYearSummary(item) },
    { key: 'cycle_year', label: 'Cycle' },
    { key: 'submitted_at', label: 'Submitted', render: (_: never, item: DiscountApplication) => new Date(item.submitted_at).toLocaleDateString('en-PH') },
    { key: 'status', label: 'Status', render: (_: never, item: DiscountApplication) => RENEWAL_LABELS[item.status] },
    { key: 'actions', label: 'Action', render: (_: never, item: DiscountApplication) => <button onClick={() => void open(item.id)} className="min-h-11 px-3 text-sm text-[#99C1F1]">{item.status === 'PENDING' ? 'Review' : 'View'}</button> },
  ];

  return <div className="flex min-h-0 flex-1 flex-col gap-3">
    <div className="flex flex-wrap items-center gap-3"><SearchBar value={search} onChange={setSearch} placeholder="Search discount applications..." /><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Application status" className="min-h-11 rounded-md border border-[#1E2D45] bg-[#0E1628] px-3 text-sm text-white scheme-dark"><option value="">All Statuses</option>{(['PENDING', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const).map(value => <option key={value} value={value}>{RENEWAL_LABELS[value]}</option>)}</select><button onClick={() => void load()} className="min-h-11 px-3 text-sm text-[#99C1F1]">Refresh</button></div>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
    {loading && <p role="status" className="text-sm text-slate-400">Loading applications...</p>}
    <DataTable data={result?.data ?? []} columns={columns} searchQuery="" emptyMessage="No discount applications match this status." onRowDoubleClick={item => void open(item.id)} height="100%" mobileCards />
    {result && <TablePagination currentPage={result.current_page} totalPages={result.last_page} total={result.total} from={result.from ?? 0} to={result.to ?? 0} onPageChange={setPage} label="applications" />}
    <ReviewRequestModal key={selected ? `${selected.id}:${selected.revision}` : 'closed'} renewal errorMessage={error} renewalDetails={selected ? `Request: Renewal · Cycle: ${selected.cycle_year}\nSchool: ${selected.school_name}\nLevel: ${educationSummary(selected)}\nSchool year / term: ${schoolYearSummary(selected)}\nStatus: ${RENEWAL_LABELS[selected.status]}${selected.reason ? `\nReview note: ${selected.reason}` : ''}` : undefined} documentIsPdf={selected?.document_mime === 'application/pdf'} readOnly={selected?.status !== 'PENDING'} isOpen={selected !== null} request={selected ? reviewRequest(selected) : null} onClose={() => { if (!busy) setSelected(null); }} isProcessing={busy} onApprove={() => void review('APPROVED')} onReject={(reason, final) => void review(final ? 'REJECTED' : 'NEEDS_CORRECTION', reason)} />
  </div>;
}
