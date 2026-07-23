// app/(admin)/settings/receipt/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, AlertCircle, Printer } from 'lucide-react';
import { defaultReceiptConfig, type ReceiptConfig } from '@/app/(admin)/settings/data/settings-data';
import { getSettings, updateSetting } from '@/lib/admin/services/setting.service';

// Setting keys persisted under category "receipt". These drive the fare
// receipt that is auto-printed on the conductor's thermal printer after a
// successful cash/GCash transaction.
const KEYS = {
  businessName: 'receipt_business_name',
  addressLine: 'receipt_address_line',
  footerNote: 'receipt_footer_note',
  paperWidth: 'receipt_paper_width',
  autoPrint: 'receipt_auto_print',
  showDateTime: 'receipt_show_datetime',
  showTransactionId: 'receipt_show_transaction_id',
  showRoute: 'receipt_show_route',
  showUnit: 'receipt_show_unit',
  showConductor: 'receipt_show_conductor',
  showPassenger: 'receipt_show_passenger',
  showFareBreakdown: 'receipt_show_fare_breakdown',
} as const;

const bool = (v: string | undefined, fallback: boolean) => (v === undefined ? fallback : v === 'true');

// The toggle rows, so the form + preview stay in sync from one source.
const DETAIL_TOGGLES: { key: keyof ReceiptConfig; label: string; hint: string }[] = [
  { key: 'showDateTime', label: 'Date & time', hint: 'When the ride was paid.' },
  { key: 'showTransactionId', label: 'Transaction / reference no.', hint: 'Unique ID for disputes and lookups.' },
  { key: 'showRoute', label: 'Route (From → To)', hint: 'Pickup and drop-off stops.' },
  { key: 'showUnit', label: 'Unit / plate number', hint: 'Which vehicle issued the receipt.' },
  { key: 'showConductor', label: 'Conductor name', hint: 'Who collected the fare.' },
  { key: 'showPassenger', label: 'Passenger name & type', hint: 'Regular / Student / Senior / PWD.' },
  { key: 'showFareBreakdown', label: 'Fare breakdown', hint: 'Base fare, distance and discount lines.' },
];

export default function ReceiptSettingsPage() {
  const [config, setConfig] = useState<ReceiptConfig>({ ...defaultReceiptConfig });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const d = await getSettings('receipt');
      setConfig({
        businessName: d[KEYS.businessName] ?? defaultReceiptConfig.businessName,
        addressLine: d[KEYS.addressLine] ?? defaultReceiptConfig.addressLine,
        footerNote: d[KEYS.footerNote] ?? defaultReceiptConfig.footerNote,
        paperWidth: (d[KEYS.paperWidth] as ReceiptConfig['paperWidth']) ?? defaultReceiptConfig.paperWidth,
        autoPrint: bool(d[KEYS.autoPrint], defaultReceiptConfig.autoPrint),
        showDateTime: bool(d[KEYS.showDateTime], defaultReceiptConfig.showDateTime),
        showTransactionId: bool(d[KEYS.showTransactionId], defaultReceiptConfig.showTransactionId),
        showRoute: bool(d[KEYS.showRoute], defaultReceiptConfig.showRoute),
        showUnit: bool(d[KEYS.showUnit], defaultReceiptConfig.showUnit),
        showConductor: bool(d[KEYS.showConductor], defaultReceiptConfig.showConductor),
        showPassenger: bool(d[KEYS.showPassenger], defaultReceiptConfig.showPassenger),
        showFareBreakdown: bool(d[KEYS.showFareBreakdown], defaultReceiptConfig.showFareBreakdown),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load receipt settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const set = <K extends keyof ReceiptConfig>(field: K, value: ReceiptConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await Promise.all([
        updateSetting(KEYS.businessName, config.businessName, 'receipt'),
        updateSetting(KEYS.addressLine, config.addressLine, 'receipt'),
        updateSetting(KEYS.footerNote, config.footerNote, 'receipt'),
        updateSetting(KEYS.paperWidth, config.paperWidth, 'receipt'),
        updateSetting(KEYS.autoPrint, String(config.autoPrint), 'receipt'),
        updateSetting(KEYS.showDateTime, String(config.showDateTime), 'receipt'),
        updateSetting(KEYS.showTransactionId, String(config.showTransactionId), 'receipt'),
        updateSetting(KEYS.showRoute, String(config.showRoute), 'receipt'),
        updateSetting(KEYS.showUnit, String(config.showUnit), 'receipt'),
        updateSetting(KEYS.showConductor, String(config.showConductor), 'receipt'),
        updateSetting(KEYS.showPassenger, String(config.showPassenger), 'receipt'),
        updateSetting(KEYS.showFareBreakdown, String(config.showFareBreakdown), 'receipt'),
      ]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save receipt settings');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = 'block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors';
  const labelClasses = 'block text-xs font-medium text-slate-300 mb-1.5';

  if (isLoading) {
    return (
      <div className="min-h-screen pb-12 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="h-8 w-56 rounded bg-gray-700 animate-pulse mx-auto" />
          <div className="h-96 bg-[#131C2E] border border-[#1E2D45] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Receipt</h1>
          <p className="text-sm text-slate-400 mt-1">Controls the fare receipt printed on the thermal printer after each successful transaction.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
          {/* ── Settings column ── */}
          <div className="space-y-6 min-w-0">
            {/* Branding */}
            <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg space-y-4">
              <h2 className="text-lg font-semibold text-white">Branding</h2>
              <div>
                <label className={labelClasses}>Business / Header Name</label>
                <input type="text" value={config.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="CHATCO" className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Address / Contact Line <span className="text-slate-500 font-normal">(optional)</span></label>
                <input type="text" value={config.addressLine} onChange={(e) => set('addressLine', e.target.value)} placeholder="e.g. Malolos, Bulacan · 0917 000 0000" className={inputClasses} />
              </div>
              <div>
                <label className={labelClasses}>Footer Note</label>
                <input type="text" value={config.footerNote} onChange={(e) => set('footerNote', e.target.value)} placeholder="Thank you for riding with Chatco!" className={inputClasses} />
              </div>
            </div>

            {/* Printer */}
            <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg space-y-4">
              <h2 className="text-lg font-semibold text-white">Printer</h2>
              <div>
                <label className={labelClasses}>Paper Width</label>
                <div className="flex gap-2">
                  {(['58', '80'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => set('paperWidth', w)}
                      className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${config.paperWidth === w ? 'bg-[#62A0EA] text-white border-[#62A0EA]' : 'bg-[#0E1628] text-slate-300 border-[#1E2D45] hover:border-[#62A0EA]/50'}`}
                    >
                      {w} mm
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                label="Auto-print after each transaction"
                hint="Print the receipt automatically once a cash/GCash payment succeeds. Off = conductor prints manually."
                checked={config.autoPrint}
                onChange={(v) => set('autoPrint', v)}
              />
            </div>

            {/* Details on the receipt */}
            <div className="bg-[#131C2E] border border-[#1E2D45] p-4 sm:p-6 rounded-lg space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Details to Print</h2>
                <p className="text-sm text-slate-400 mt-1">Choose which transaction details appear on the receipt.</p>
              </div>
              <div className="space-y-4">
                {DETAIL_TOGGLES.map((t, i) => (
                  <div key={t.key}>
                    {i > 0 && <hr className="border-[#1E2D45] mb-4" />}
                    <ToggleRow
                      label={t.label}
                      hint={t.hint}
                      checked={config[t.key] as boolean}
                      onChange={(v) => set(t.key, v as ReceiptConfig[typeof t.key])}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Live preview column ── */}
          <div className="lg:sticky lg:top-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Printer size={14} /> Preview
            </p>
            <ReceiptPreview config={config} />
          </div>

          {/* Save (spans full width under both columns) */}
          <div className="lg:col-span-2 flex justify-center pt-2 pb-8">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#62A0EA] text-white font-medium rounded-lg hover:bg-[#4A8BD4] transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSaving ? 'Saving...' : isSaved ? 'Receipt Settings Saved!' : 'Save Receipt Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex-1">
        <p className="text-white font-medium text-sm">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-14 h-7 bg-[#1E2D45] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#62A0EA]" />
      </label>
    </div>
  );
}

// A representative thermal receipt rendered from sample transaction data +
// the current config, so the admin sees exactly what the toggles produce.
function ReceiptPreview({ config }: { config: ReceiptConfig }) {
  const widthPx = config.paperWidth === '80' ? 300 : 230;
  const Line = () => <div className="border-t border-dashed border-black/40 my-1.5" />;

  return (
    <div
      className="bg-white text-black font-mono rounded-md shadow-lg mx-auto px-3 py-4 text-[11px] leading-snug"
      style={{ width: widthPx, maxWidth: '100%' }}
    >
      <div className="text-center">
        <p className="font-bold text-[13px] tracking-wide">{config.businessName || 'CHATCO'}</p>
        {config.addressLine && <p className="text-[10px] mt-0.5">{config.addressLine}</p>}
        <p className="text-[10px] mt-0.5">FARE RECEIPT</p>
      </div>
      <Line />

      {config.showDateTime && <Row k="Date" v="2026-07-23 14:05" />}
      {config.showTransactionId && <Row k="Ref" v="TXN-8K2P4Q" />}
      {config.showUnit && <Row k="Unit" v="UNIT-005 · ABC 1234" />}
      {config.showConductor && <Row k="Conductor" v="Juan Dela Cruz" />}
      {config.showPassenger && <Row k="Passenger" v="M. Santos (Student)" />}
      {config.showRoute && (
        <>
          <Line />
          <Row k="From" v="Malolos" />
          <Row k="To" v="Calumpit" />
        </>
      )}

      {config.showFareBreakdown && (
        <>
          <Line />
          <Row k="Base fare" v="₱13.00" />
          <Row k="Distance" v="6 km" />
          <Row k="Discount" v="-₱5.20" />
        </>
      )}

      <Line />
      <div className="flex justify-between font-bold text-[13px]">
        <span>TOTAL</span>
        <span>₱20.80</span>
      </div>
      <Row k="Paid via" v="GCash" />
      <Line />

      {config.footerNote && <p className="text-center text-[10px] mt-1">{config.footerNote}</p>}
      <p className="text-center text-[9px] mt-1 text-black/50">This serves as your official receipt.</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-black/60">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
