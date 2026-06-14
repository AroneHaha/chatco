// components/conductor/remittance/OfficialReportModal.tsx
import { type RemittanceRecord } from "@/lib/conductor/services/remittance.service";
import { formatTime } from "@/lib/conductor/services/shift.service";
import { fmt, fmtDate, fmtDateTime } from "@/app/(conductor)/conductor-dashboard/end-of-day/helpers";

interface OfficialReportModalProps { show: boolean; onClose: () => void; activeReport: RemittanceRecord; route: string; }

export function buildPrintHTML(report: RemittanceRecord, route: string): string {
  const statusColor = report.remittanceStatus === "Remitted" ? "#16a34a" : "#d97706";
  const statusBg = report.remittanceStatus === "Remitted" ? "#f0fdf4" : "#fffbeb";

  const gcashTotal = report.gcashTotal ?? 0;
  const cashTotal = report.cashTotal ?? 0;
  const grandTotal = gcashTotal + cashTotal + (report.totalCashless ?? 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CHATCO - End of Day Remittance Report</title>
  <style>
    @page { margin: 1.5cm; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #111;
      background: #fff;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #1A5FB4;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #071A2E;
    }
    .header p {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      margin-top: 4px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      margin-bottom: 20px;
    }
    .info-item label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .info-item span {
      font-size: 13px;
      font-weight: 600;
      color: #111;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 8px;
      margin-top: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table th {
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      padding: 8px 12px;
      border-bottom: 2px solid #e2e8f0;
    }
    table th:last-child { text-align: right; }
    table td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    table td:last-child {
      text-align: right;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    table tfoot td {
      border-top: 2px solid #e2e8f0;
      border-bottom: none;
      font-weight: 700;
      padding-top: 10px;
    }
    table tfoot td:last-child { font-size: 15px; }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }
    .summary-row.grand {
      border-top: 2px solid #1A5FB4;
      margin-top: 4px;
      padding-top: 12px;
    }
    .summary-row .label { font-size: 12px; color: #475569; }
    .summary-row .value { font-weight: 700; font-variant-numeric: tabular-nums; }
    .summary-row.grand .label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 11px; }
    .summary-row.grand .value { color: #1A5FB4; font-size: 22px; font-weight: 800; }
    .status-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 16px;
      background: #f8fafc;
    }
    .status-box .status-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .status-box .status-text {
      font-size: 12px;
      font-weight: 600;
      color: #111;
    }
    .status-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 4px 10px;
      border-radius: 999px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusColor}33;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      font-size: 10px;
      color: #94a3b8;
      font-family: monospace;
    }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 16px 0;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
      vertical-align: middle;
    }
    .dot-blue { background: #3b82f6; }
    .dot-green { background: #22c55e; }
    .dot-amber { background: #f59e0b; }
    .dot-purple { background: #a855f7; }
    .dot-pink { background: #ec4899; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CHATCO</h1>
    <p>End of Day Remittance Report</p>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Date</label><span>${fmtDate(report.date)}</span></div>
    <div class="info-item"><label>Shift ID</label><span style="font-family:monospace">${report.shiftId}</span></div>
    <div class="info-item"><label>Conductor</label><span>${report.conductorName}</span></div>
    <div class="info-item"><label>Driver</label><span>${report.driverName}</span></div>
    <div class="info-item"><label>Time In</label><span style="color:#16a34a">${formatTime(report.timeIn)}</span></div>
    <div class="info-item"><label>Time Out</label><span style="color:#dc2626">${formatTime(report.timeOut)}</span></div>
    <div class="info-item"><label>Unit Number</label><span>${report.unitNumber}</span></div>
    <div class="info-item"><label>Route</label><span>${route}</span></div>
  </div>

  <hr class="divider" />

  <p class="section-title">Payment Breakdown</p>
  <table>
    <thead>
      <tr><th>Method</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="dot dot-blue"></span>GCash</td>
        <td style="color:#2563eb">${fmt(gcashTotal)}</td>
      </tr>
      <tr>
        <td><span class="dot dot-green"></span>Cash</td>
        <td style="color:#16a34a">${fmt(cashTotal)}</td>
      </tr>
      ${report.cashlessBreakdown.gcashScanned > 0 ? `<tr><td><span class="dot dot-purple"></span>QR Scanned</td><td style="color:#a855f7">${fmt(report.cashlessBreakdown.gcashScanned)}</td></tr>` : ""}
      ${report.cashlessBreakdown.gcashDirect > 0 ? `<tr><td><span class="dot dot-green"></span>Prepaid</td><td style="color:#22c55e">${fmt(report.cashlessBreakdown.gcashDirect)}</td></tr>` : ""}
      ${report.cashlessBreakdown.voucher > 0 ? `<tr><td><span class="dot dot-amber"></span>Voucher</td><td style="color:#b45309">${fmt(report.cashlessBreakdown.voucher)}</td></tr>` : ""}
    </tbody>
    <tfoot>
      <tr>
        <td>GRAND TOTAL</td>
        <td>${fmt(grandTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <hr class="divider" />

  <div class="summary-row grand">
    <span class="label">Grand Total</span>
    <span class="value">${fmt(grandTotal)}</span>
  </div>

  <hr class="divider" />

  <div class="status-box">
    <div>
      <p class="status-label">Remittance Status</p>
      <p class="status-text">Remitted to Admin</p>
    </div>
    <span class="status-badge">${report.remittanceStatus}</span>
  </div>

  <div class="footer">
    <p>Generated: ${fmtDateTime()}</p>
  </div>
</body>
</html>`;
}

export default function OfficialReportModal({ show, onClose, activeReport, route }: OfficialReportModalProps) {
  if (!show) return null;

  const gcashTotal = activeReport.gcashTotal ?? 0;
  const cashTotal = activeReport.cashTotal ?? 0;
  const grandTotal = gcashTotal + cashTotal + (activeReport.totalCashless ?? 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0F2135] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] flex flex-col mb-16 sm:mb-0">
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/[0.06]"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-[#1A5FB4] flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div><h2 className="text-white font-bold text-sm">Official Report</h2></div><button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button></div></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="text-center space-y-1"><h3 className="text-white font-extrabold text-xl tracking-wide">CHATCO</h3><p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-semibold">End of Day Remittance Report</p></div><div className="h-px bg-white/10" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Date</p><p className="text-xs font-semibold text-white/80 mt-0.5">{fmtDate(activeReport.date)}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Shift ID</p><p className="text-xs font-semibold text-white/80 mt-0.5 font-mono">{activeReport.shiftId}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Conductor</p><p className="text-xs font-semibold text-white/80 mt-0.5">{activeReport.conductorName}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Driver</p><p className="text-xs font-semibold text-white/80 mt-0.5">{activeReport.driverName}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Time In</p><p className="text-xs font-semibold text-emerald-400/80 mt-0.5">{formatTime(activeReport.timeIn)}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Time Out</p><p className="text-xs font-semibold text-red-400/80 mt-0.5">{formatTime(activeReport.timeOut)}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Unit Number</p><p className="text-xs font-semibold text-white/80 mt-0.5">{activeReport.unitNumber}</p></div><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Route</p><p className="text-xs font-semibold text-white/80 mt-0.5">{route}</p></div>
          </div>

          {/* Payment Breakdown table */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Payment Breakdown</p>
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-white/[0.06]"><th className="text-left text-[9px] font-bold text-white/30 uppercase tracking-wider px-3.5 py-2.5">Method</th><th className="text-right text-[9px] font-bold text-white/30 uppercase tracking-wider px-3.5 py-2.5">Amount</th></tr></thead>
                <tbody className="divide-y divide-white/[0.03]">
                  <tr><td className="px-3.5 py-2.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-400" /><span className="text-xs text-white/60">GCash</span></td><td className="px-3.5 py-2.5 text-right text-xs font-bold text-blue-400 tabular-nums">{fmt(gcashTotal)}</td></tr>
                  <tr><td className="px-3.5 py-2.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-white/60">Cash</span></td><td className="px-3.5 py-2.5 text-right text-xs font-bold text-emerald-400 tabular-nums">{fmt(cashTotal)}</td></tr>
                  {activeReport.cashlessBreakdown.gcashScanned > 0 && <tr><td className="px-3.5 py-2.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-400" /><span className="text-xs text-white/60">QR Scanned</span></td><td className="px-3.5 py-2.5 text-right text-xs font-bold text-purple-400 tabular-nums">{fmt(activeReport.cashlessBreakdown.gcashScanned)}</td></tr>}
                  {activeReport.cashlessBreakdown.gcashDirect > 0 && <tr><td className="px-3.5 py-2.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-xs text-white/60">Prepaid</span></td><td className="px-3.5 py-2.5 text-right text-xs font-bold text-emerald-400 tabular-nums">{fmt(activeReport.cashlessBreakdown.gcashDirect)}</td></tr>}
                  {activeReport.cashlessBreakdown.voucher > 0 && <tr><td className="px-3.5 py-2.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /><span className="text-xs text-white/60">Voucher</span></td><td className="px-3.5 py-2.5 text-right text-xs font-bold text-amber-400 tabular-nums">{fmt(activeReport.cashlessBreakdown.voucher)}</td></tr>}
                </tbody>
                <tfoot><tr className="bg-white/[0.03]"><td className="px-3.5 py-2.5 text-[10px] font-bold text-white/50 uppercase tracking-wider">Grand Total</td><td className="px-3.5 py-2.5 text-right text-sm font-extrabold text-white tabular-nums">{fmt(grandTotal)}</td></tr></tfoot>
              </table>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <div><span className="text-xs font-bold text-white/70 uppercase tracking-wider">Grand Total</span></div>
            <span className="text-2xl font-extrabold text-[#62A0EA] tabular-nums">{fmt(grandTotal)}</span>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3"><div><p className="text-[9px] font-bold text-white/25 uppercase tracking-wider">Remittance Status</p><p className="text-xs font-semibold text-white/60 mt-0.5">Remitted to Admin</p></div><span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${activeReport.remittanceStatus === "Remitted" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>{activeReport.remittanceStatus}</span></div>
          <p className="text-[10px] text-white/15 text-center font-mono">Generated: {fmtDateTime()}</p>
        </div>
        <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.06] bg-[#0F2135]"><button onClick={onClose} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:bg-white/10 transition-all">Close</button></div>
      </div>
    </div>
  );
}
