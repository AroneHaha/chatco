'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Printer, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import type { GeneratedQr } from '@/lib/admin/services/feedback-qr.service';

interface QrDisplayProps {
  /** The freshly-generated QR token + metadata. */
  qr: GeneratedQr;
  /** Optional: the unit/plate label to render on the printable card. */
  vehicleLabel: string;
  /** Clicked when the user wants to issue a fresh token for the same vehicle. */
  onRegenerate: () => void;
}

/**
 * Sprint 6 — Admin Feedback-QR display card.
 *
 * Renders the signed token as a QR image (canvas, so we can offer a PNG
 * download), shows the expiry date with a live countdown, and offers
 * Download + Print buttons.
 *
 * The QR encodes ONLY the raw token string (`base64url(payload) + '.' + hex(HMAC)`)
 * — the commuter scanner reads the QR, extracts the token, and POSTs it
 * to /qr/validate + /qr/scan for server-side verification. We never embed
 * driver/conductor/shift info in the QR itself (those rotate per shift).
 */
export function QrDisplay({ qr, vehicleLabel, onRegenerate }: QrDisplayProps) {
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  // Live countdown — ticks every second until expiry.
  useEffect(() => {
    const expiresAtMs = new Date(qr.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, expiresAtMs - Date.now());
      setSecondsLeft(Math.floor(remaining / 1000));
      if (remaining <= 0) setIsExpired(true);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [qr.expiresAt]);

  // ─── Download handler ──────────────────────────────────────────
  const handleDownload = () => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatco-feedback-qr-${qr.vehicleId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Print handler ─────────────────────────────────────────────
  // Opens a fresh window with just the QR + label, formatted for printing.
  // We don't use window.print() directly because the admin chrome (sidebar,
  // header) would be included — we want a clean printable card.
  const handlePrint = () => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) {
      alert('Please allow pop-ups to print the QR code.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ChatCo Feedback QR — ${escapeHtml(vehicleLabel)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 40px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #fff;
              color: #0B1120;
            }
            .card {
              text-align: center;
              padding: 32px 40px;
              border: 2px dashed #cbd5e1;
              border-radius: 16px;
              max-width: 360px;
            }
            .title { font-size: 20px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.01em; }
            .subtitle { font-size: 12px; color: #64748b; margin: 0 0 24px; }
            .qr { margin: 0 auto 20px; display: block; }
            .label { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
            .unit { font-size: 13px; color: #475569; margin: 0 0 12px; }
            .instructions {
              font-size: 11px;
              color: #64748b;
              line-height: 1.5;
              margin: 12px 0 0;
              padding-top: 12px;
              border-top: 1px solid #e2e8f0;
            }
            @media print {
              body { padding: 0; }
              .card { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <p class="title">ChatCo Feedback QR</p>
            <p class="subtitle">Scan to rate your ride</p>
            <img class="qr" src="${dataUrl}" width="256" height="256" alt="Feedback QR code" />
            <p class="label">${escapeHtml(vehicleLabel)}</p>
            <p class="unit">Expires: ${formatExpiry(qr.expiresAt)}</p>
            <p class="instructions">
              Place this QR inside the jeepney unit. Commuters scan it after
              their ride to leave a 1–5 star rating for the driver and
              conductor on duty.
            </p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    // Give the image a moment to render before opening the print dialog.
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  // ─── Countdown formatting ──────────────────────────────────────
  const countdownLabel = formatCountdown(secondsLeft);

  return (
    <div className="bg-[#0F1A2E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-white font-bold text-lg mb-1">Feedback QR Ready</h3>
        <p className="text-white/40 text-xs mb-6">
          Place this inside the jeepney unit. Commuters scan it after their ride.
        </p>

        {/* QR canvas — wrapped so we can find the canvas element for download/print */}
        <div
          ref={canvasWrapperRef}
          className="bg-white p-4 rounded-xl shadow-lg mb-4"
        >
          <QRCodeCanvas
            value={qr.token}
            size={256}
            level="M"
            marginSize={0}
          />
        </div>

        {/* Vehicle label */}
        <p className="text-white font-semibold text-sm">{vehicleLabel}</p>

        {/* Expiry countdown */}
        <div className={`mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          isExpired
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : secondsLeft < 24 * 60 * 60
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
          {isExpired ? (
            <>
              <AlertTriangle size={12} />
              Expired — regenerate to continue accepting feedback
            </>
          ) : (
            <>
              <Clock size={12} />
              {secondsLeft < 24 * 60 * 60
                ? `Expires in ${countdownLabel}`
                : `Valid until ${formatExpiry(qr.expiresAt)}`}
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={isExpired}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A5FB4] hover:bg-[#164A8F] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#1A5FB4]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Download PNG
          </button>
          <button
            onClick={handlePrint}
            disabled={isExpired}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={onRegenerate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw size={16} />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Format helpers (kept local — not reused elsewhere) ───────────

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'expired';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
