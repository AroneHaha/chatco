// components/admin/analytics/overview-export-modal.tsx
'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Modal } from '@/components/admin/ui/modal';
import { ADMIN_BUTTON } from '@/components/admin/ui/modal-parts';
import { InlineError } from '@/components/admin/ui/inline-error';
import { exportSections, type ExportSection, type ReportFormat } from '@/lib/utils/export-report';
import {
  formatDateRangeLabel,
  formatNumber,
  type AnalyticsData,
} from '@/lib/admin/services/analytics.service';
import { renderDailyRevenueImage } from '@/components/admin/analytics/daily-revenue-image';
import { buildPickupsReport, formatCell } from '@/components/admin/analytics/report-tables';

type ItemId = 'total_fares' | 'cash_total' | 'gcash_total' | 'cash_in_transit' | 'total_passengers' | 'daily_revenue' | 'conductor_revenue' | 'pickup_points';

const ITEMS: { id: ItemId; label: string; hint?: string }[] = [
  { id: 'total_fares', label: 'Total Fares' },
  { id: 'cash_total', label: 'Cash Total' },
  { id: 'gcash_total', label: 'GCash Total' },
  { id: 'cash_in_transit', label: 'Cash in Transit (Awaiting Remittance)' },
  { id: 'total_passengers', label: 'Total Passengers' },
  { id: 'daily_revenue', label: 'Daily Revenue Graph', hint: 'A chart in PDF and Word; the daily figures in Excel.' },
  { id: 'conductor_revenue', label: 'Revenue by Conductor' },
  { id: 'pickup_points', label: 'Pickup Points', hint: 'Boardings per fare point, busiest first.' },
];

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'word', label: 'Word' },
];

const plural = (n: number, word: string) => `${formatNumber(n)} ${word}${n === 1 ? '' : 's'}`;
// jsPDF's built-in fonts have no ₱, so files spell the currency out (like the Detailed Reports exports).
const amount = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const peso = (n: number) => `PHP ${amount(n)}`;

/** The checked items as export sections, in the order they appear on the Overview. */
function buildSections(data: AnalyticsData, selected: Set<ItemId>): ExportSection[] {
  const { totals, payment_split: split, remittances } = data;
  const summaryRows: Record<'total_fares' | 'cash_total' | 'gcash_total' | 'cash_in_transit' | 'total_passengers', string[]> = {
    total_fares: ['Total Fares', peso(totals.total_fares), totals.discount_total > 0 ? `after ${peso(totals.discount_total)} in discounts` : 'no discounts given'],
    cash_total: ['Cash Total', peso(totals.cash_total), plural(split.cash.count, 'ride')],
    gcash_total: ['GCash Total', peso(totals.gcash_total), plural(split.gcash.count, 'ride')],
    cash_in_transit: ['Cash in Transit (Awaiting Remittance)', peso(remittances.awaiting_amount), remittances.awaiting_count > 0 ? `${plural(remittances.awaiting_count, 'shift')} not yet remitted` : 'all shifts remitted'],
    total_passengers: ['Total Passengers', formatNumber(totals.total_passengers), `incl. ${plural(totals.voucher_count, 'voucher ride')}`],
  };

  const sections: ExportSection[] = [];
  const summary = (Object.keys(summaryRows) as (keyof typeof summaryRows)[]).filter((id) => selected.has(id)).map((id) => summaryRows[id]);
  if (summary.length) sections.push({ kind: 'table', title: 'Summary', headers: ['Metric', 'Value', 'Details'], rows: summary });

  if (selected.has('daily_revenue')) {
    const table = {
      headers: ['Date', 'Cash (PHP)', 'GCash (PHP)', 'Total (PHP)', 'Paid rides'],
      rows: data.daily_series.map((day) => [day.date, amount(day.cash), amount(day.gcash), amount(day.total), formatNumber(day.paid_count)]),
    };
    const image = renderDailyRevenueImage(data.daily_series);
    // No fares in the range: nothing to chart, so the (zero) figures stand in.
    sections.push(image ? { kind: 'chart', title: 'Daily Revenue', image, fallback: table } : { kind: 'table', title: 'Daily Revenue', ...table });
  }

  if (selected.has('conductor_revenue')) {
    const conductors = data.performance.conductors;
    sections.push({
      kind: 'table',
      title: 'Revenue by Conductor',
      headers: ['Rank', 'Conductor', 'Shifts', 'Passengers', 'Revenue (PHP)'],
      rows: conductors.length
        ? conductors.map((c, i) => [i + 1, c.name, formatNumber(c.shifts), formatNumber(c.passengers), amount(c.revenue)])
        : [['', 'No shifts in this date range.', '', '', '']],
    });
  }

  if (selected.has('pickup_points')) {
    // Same report as Detailed Reports > Pickup Points, so the two files agree.
    const report = buildPickupsReport(data);
    sections.push({
      kind: 'table',
      title: report.title,
      headers: report.columns.map((column) => column.label),
      rows: report.rows.length
        ? report.rows.map((row) => row.map((value, i) => formatCell(report.columns[i].kind, value, 'doc')))
        : [['', report.emptyMessage ?? 'No boardings in this date range.', '', '']],
    });
  }

  return sections;
}

/**
 * Overview export: the admin ticks what goes into the file and picks a format.
 * Built from the analytics already loaded on screen, so the file matches it.
 */
export function OverviewExportModal({ data, onClose }: { data: AnalyticsData | null; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<ItemId>>(() => new Set(ITEMS.map((item) => item.id)));
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) return null;
  const allSelected = selected.size === ITEMS.length;

  const toggle = (id: ItemId) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const close = () => { if (!isExporting) onClose(); };

  const runExport = async () => {
    if (isExporting || selected.size === 0) return;
    setIsExporting(true);
    setError(null);
    try {
      const { from, to } = data.date_range;
      await exportSections({
        title: 'CHATCO Financial & Operations Overview',
        subtitle: formatDateRangeLabel(from, to),
        fileName: `chatco-overview-${from}-to-${to}`,
        format,
        sections: buildSections(data, selected),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The file could not be created. Try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal adminThemed isOpen onClose={close}>
      <header className="border-b border-[#2A3A55] pb-5 pr-8 admin-light:border-[#E2E8F0]">
        <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Export Overview</h2>
        <p className="mt-1 text-sm text-slate-400 admin-light:text-slate-500">
          {formatDateRangeLabel(data.date_range.from, data.date_range.to)}. Choose what to include.
        </p>
      </header>

      <fieldset className="mt-4" disabled={isExporting} aria-labelledby="overview-export-include">
        <div className="flex items-center justify-between">
          <p id="overview-export-include" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500">Include</p>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(ITEMS.map((item) => item.id)))}
            className="text-xs font-medium text-[#62A0EA] admin-light:text-[#1A5FB4] hover:underline"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
        <ul className="mt-2 divide-y divide-[#2A3A55] border-y border-[#2A3A55] admin-light:divide-[#E2E8F0] admin-light:border-[#E2E8F0]">
          {ITEMS.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#62A0EA] admin-light:accent-[#1A5FB4]"
                />
                <span className="min-w-0">
                  <span className="block text-sm text-white admin-light:text-slate-900">{item.label}</span>
                  {item.hint && <span className="block text-xs text-slate-500">{item.hint}</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="mt-5">
        <p id="overview-export-format" className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 admin-light:text-slate-500">Format</p>
        <div role="radiogroup" aria-labelledby="overview-export-format" className="mt-2 grid grid-cols-3 gap-2">
          {FORMATS.map((option) => {
            const active = format === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isExporting}
                onClick={() => setFormat(option.value)}
                className={`min-h-10 rounded-md border text-sm font-semibold transition-colors disabled:opacity-50 ${
                  active
                    ? 'border-[#62A0EA] bg-[#62A0EA] text-[#0B1120] admin-light:border-[#1A5FB4] admin-light:bg-[#1A5FB4] admin-light:text-white'
                    : 'border-[#2A3A55] bg-[#131C2E] text-slate-200 hover:bg-[#0E1628] admin-light:border-[#CBD5E1] admin-light:bg-white admin-light:text-slate-700 admin-light:hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error && <InlineError className="mt-4">{error}</InlineError>}

      <div className="mt-6 flex justify-end gap-2 border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
        <button type="button" onClick={close} disabled={isExporting} className={ADMIN_BUTTON.secondary}>Cancel</button>
        <button type="button" onClick={() => void runExport()} disabled={isExporting || selected.size === 0} className={ADMIN_BUTTON.primary}>
          <Download size={16} aria-hidden="true" />
          {isExporting ? 'Exporting…' : selected.size === 0 ? 'Choose at least one' : 'Export'}
        </button>
      </div>
    </Modal>
  );
}
