// components/admin/vehicles/vehicle-details-modal.tsx
'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { UserAvatar } from '@/components/admin/ui/user-avatar';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Car,
  Phone,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  Users,
  QrCode,
} from 'lucide-react';
import {
  get as getVehicle,
  type AdminVehicle,
  type VehiclePerson,
} from '@/lib/admin/services/vehicle.service';

interface VehicleDetailsModalProps {
  isOpen: boolean;
  /** UUID of the vehicle to show. When null + closed, nothing is fetched. */
  vehicleId: string | null;
  onClose: () => void;
}

/**
 * Build the PERMANENT unit-QR payload for a vehicle.
 *
 * The QR encodes a stable, self-describing JSON derived from the vehicle's
 * IMMUTABLE identifiers (id / unit number / plate). Because these never
 * change for a given unit, the QR never changes either — print it once,
 * stick it inside the jeepney, and it's good for the life of the unit.
 *
 * `vehicleId` is the canonical key the backend uses to resolve a unit to
 * today's driver + conductor, so a commuter scan of this QR can resolve
 * today's crew without any per-day regeneration.
 */
function buildUnitQrPayload(v: AdminVehicle): string {
  return JSON.stringify({
    chatco: 'unit-qr',
    v: 1,
    vehicleId: v.id,
    unitNumber: v.unitNumber,
    plateNumber: v.plateNumber,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

function CrewRow({
  label,
  person,
}: {
  label: 'Driver' | 'Conductor';
  person: VehiclePerson | null;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {/* Photo from R2 (resized by next/image), or the same default icon the
          user lists use when there is none or it fails to load. */}
      <UserAvatar src={person?.photoUrl} alt={person ? `Profile photo of ${person.name}` : ''} className="h-11 w-11" iconClassName="h-5 w-5" sizes="44px" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 admin-light:text-slate-500">{label}</p>
        {person ? (
          <>
            <p className="mt-0.5 break-words text-sm font-semibold text-white admin-light:text-slate-900">{person.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400 admin-light:text-slate-500">
              <Phone size={12} aria-hidden="true" className="shrink-0" />
              <span className="break-all">{person.contact || 'No contact number'}</span>
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-slate-400 admin-light:text-slate-500">Unassigned today</p>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400 admin-light:text-slate-500">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-white admin-light:text-slate-900">{value}</dd>
    </div>
  );
}

export function VehicleDetailsModal({ isOpen, vehicleId, onClose }: VehicleDetailsModalProps) {
  const [vehicle, setVehicle] = useState<AdminVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  // Fetch the single vehicle record so details scale with fleet size.
  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setVehicle(null);
    try {
      setVehicle(await getVehicle(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicle details.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !vehicleId) return;
    load(vehicleId);
  }, [isOpen, vehicleId, load]);

  // Reset stale state when the modal closes so the next open starts fresh.
  useEffect(() => {
    if (!isOpen) {
      setVehicle(null);
      setError(null);
    }
  }, [isOpen]);

  const qrPayload = vehicle ? buildUnitQrPayload(vehicle) : '';

  const handleDownload = useCallback(() => {
    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const stub = vehicle?.unitNumber || vehicle?.plateNumber || vehicle?.id || 'unit';
      a.download = `chatco-unit-qr-${stub}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // toDataURL can throw if the canvas is tainted — not expected here
      // since the QR is rendered client-side with no cross-origin images.
    }
  }, [vehicle]);

  const handlePrint = useCallback(() => {
    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas || !vehicle) return;
    const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png');
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) return;
    const unit = vehicle.unitNumber || '—';
    const plate = vehicle.plateNumber || '—';
    win.document.write(`<!doctype html><html><head><title>Unit QR — ${unit}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 32px; text-align: center; color: #0B1120; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .unit { font-size: 30px; font-weight: 800; margin: 8px 0 2px; letter-spacing: 1px; }
        .plate { font-size: 16px; color: #475569; margin: 0 0 20px; }
        img { width: 300px; height: 300px; }
        .hint { margin-top: 16px; font-size: 13px; font-weight: 600; color: #1d4ed8; }
        .sub { margin-top: 4px; font-size: 11px; color: #94a3b8; }
        @media print { body { padding: 24px; } }
      </style></head><body>
      <h1>Chatco — Feedback QR</h1>
      <div class="unit">UNIT ${unit}</div>
      <div class="plate">Plate: ${plate}</div>
      <img src="${dataUrl}" alt="Unit QR code" />
      <div class="hint">Scan to rate today&apos;s driver &amp; conductor</div>
      <div class="sub">This QR is permanent — keep it inside the unit.</div>
      ${'</body></html>'}`);
    win.document.close();
    win.focus();
    // Defer print so the image has a tick to lay out.
    setTimeout(() => {
      win.print();
    }, 250);
  }, [vehicle]);

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" rounded="rounded-2xl">
      {/* Header */}
      <div className="mb-4 border-b border-[#2A3A55] pb-3 pr-8 admin-light:border-[#E2E8F0]">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99C1F1] admin-light:text-[#1A5FB4]">Fleet Management</p>
        <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Vehicle Details</h2>
      </div>

      {/* Loading */}
      {isLoading && (
        <div role="status" className="flex min-h-80 flex-col items-center justify-center gap-3 py-12">
          <RefreshCw size={28} className="animate-spin text-[#62A0EA] admin-light:text-[#1A5FB4]" />
          <p className="text-sm text-slate-400 admin-light:text-slate-500">Loading vehicle details…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div role="alert" className="flex min-h-80 flex-col items-center justify-center gap-3 py-10 text-center">
          <AlertCircle size={32} className="text-red-400 admin-light:text-red-600" />
          <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          {vehicleId && (
            <button
              type="button"
              onClick={() => load(vehicleId)}
              className="mt-1 flex items-center gap-2 rounded-lg bg-[#62A0EA] px-4 py-2.5 text-sm font-medium text-[#0B1120] transition-colors hover:bg-[#85B6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loaded */}
      {!isLoading && !error && vehicle && (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_224px] sm:gap-6">
          <div className="min-w-0">
          <section aria-label="Vehicle overview" className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#99C1F1] admin-light:border-[#1A5FB4]/15 admin-light:bg-[#1A5FB4]/5 admin-light:text-[#1A5FB4]">
                <Car size={28} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 admin-light:text-slate-500">Unit number</p>
                <h3 className="mt-0.5 break-words text-3xl font-semibold tracking-tight text-white admin-light:text-slate-900">{vehicle.unitNumber || '—'}</h3>
                <p className="mt-1 text-xs text-slate-400 admin-light:text-slate-500">Plate <span className="ml-1 break-all font-mono font-medium tracking-wide text-slate-200 admin-light:text-slate-700">{vehicle.plateNumber || '—'}</span></p>
              </div>
            </div>
          </section>

              <section aria-labelledby="vehicle-information-heading">
                <h3 id="vehicle-information-heading" className="text-sm font-semibold text-white admin-light:text-slate-900">Vehicle information</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
                  <DetailRow label="Brand" value={vehicle.brand || '—'} />
                  <DetailRow label="Model" value={vehicle.model || '—'} />
                  <DetailRow
                    label="Status"
                    value={
                      <span className={
                        vehicle.status === 'ACTIVE'
                          ? 'text-green-400 admin-light:text-green-700'
                          : vehicle.status === 'MAINTENANCE'
                            ? 'text-yellow-400 admin-light:text-yellow-700'
                            : 'text-red-400 admin-light:text-red-600'
                      }>
                        {vehicle.statusLabel}
                      </span>
                    }
                  />
                  <DetailRow label="Date added" value={formatDate(vehicle.createdAt)} />
                </dl>
              </section>

              <section aria-labelledby="vehicle-crew-heading" className="mt-4 border-t border-[#2A3A55] pt-3 admin-light:border-[#E2E8F0]">
                <h3 id="vehicle-crew-heading" className="flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
                  <Users size={16} aria-hidden="true" className="text-slate-400 admin-light:text-slate-500" />
                  Today&apos;s assigned crew
                </h3>
                <div className="mt-1 divide-y divide-[#2A3A55] admin-light:divide-[#E2E8F0]">
                  <CrewRow label="Driver" person={vehicle.driver} />
                  <CrewRow label="Conductor" person={vehicle.conductor} />
                </div>
              </section>
            </div>

            <section aria-labelledby="vehicle-qr-heading" className="min-w-0 self-stretch rounded-2xl border border-[#2A3A55] bg-[#0E1628]/60 p-4 admin-light:border-[#E2E8F0] admin-light:bg-slate-50">
              <div className="mb-3">
                <h3 id="vehicle-qr-heading" className="flex items-center gap-2 text-sm font-semibold text-white admin-light:text-slate-900">
                  <QrCode size={16} aria-hidden="true" className="text-[#99C1F1] admin-light:text-[#1A5FB4]" />
                  Passenger feedback
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                  Scan to rate today&apos;s driver and conductor.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                {/* QR (white quiet-zone wrapper so it scans reliably) */}
                <div className="shrink-0 rounded-xl bg-white p-3">
                  <div ref={qrWrapperRef}>
                    <QRCodeCanvas
                      value={qrPayload}
                      size={288}
                      style={{ display: 'block', width: 144, height: 144 }}
                      level="M"
                      aria-label={`Permanent feedback QR for unit ${vehicle.unitNumber || vehicle.plateNumber}`}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full max-w-xs space-y-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-3 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]"
                  >
                    <Download size={16} aria-hidden="true" />
                    Download PNG
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#2A3A55] px-3 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-[#1A2540] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:border-slate-300 admin-light:text-slate-700 admin-light:hover:bg-white"
                  >
                    <Printer size={16} aria-hidden="true" />
                    Print QR code
                  </button>
                </div>
                <p className="text-center text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
                  This QR stays with the vehicle.<br />
                  Print once and display inside the unit.
                </p>
              </div>
            </section>
        </div>
      )}
    </Modal>
  );
}
