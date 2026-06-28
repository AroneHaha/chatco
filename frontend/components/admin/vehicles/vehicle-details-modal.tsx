// components/admin/vehicles/vehicle-details-modal.tsx
'use client';

import { useState, useEffect, useRef, useCallback, type ElementType, type ReactNode } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Badge } from '@/components/admin/ui/badge';
import { QRCodeCanvas } from 'qrcode.react';
import {
  Car,
  User,
  Phone,
  Route as RouteIcon,
  Hash,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  IdCard,
  Users,
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

function CrewRow({
  label,
  person,
}: {
  label: string;
  person: VehiclePerson | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#0E1628] border border-[#1E2D45] p-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#62A0EA]/15 text-[#62A0EA]">
        <User size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        {person ? (
          <>
            <p className="truncate text-sm font-semibold text-white">{person.name}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
              <Phone size={11} className="flex-shrink-0" />
              <span className="truncate">{person.contact || '—'}</span>
            </p>
          </>
        ) : (
          <p className="text-sm italic text-slate-500">Unassigned today</p>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
        <Icon size={14} className="text-slate-500" />
        {label}
      </span>
      <span className="text-right text-sm text-white">{value}</span>
    </div>
  );
}

export function VehicleDetailsModal({ isOpen, vehicleId, onClose }: VehicleDetailsModalProps) {
  const [vehicle, setVehicle] = useState<AdminVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    setVehicle(null);
    try {
      const v = await getVehicle(id);
      setVehicle(v);
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
    const route = vehicle.route?.name ?? '—';
    win.document.write(`<!doctype html><html><head><title>Unit QR — ${unit}</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 32px; text-align: center; color: #0B1120; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .unit { font-size: 30px; font-weight: 800; margin: 8px 0 2px; letter-spacing: 1px; }
        .plate { font-size: 16px; color: #475569; margin: 0 0 4px; }
        .route { font-size: 13px; color: #64748b; margin: 0 0 20px; }
        img { width: 300px; height: 300px; }
        .hint { margin-top: 16px; font-size: 13px; font-weight: 600; color: #1d4ed8; }
        .sub { margin-top: 4px; font-size: 11px; color: #94a3b8; }
        @media print { body { padding: 24px; } }
      </style></head><body>
      <h1>Chatco — Feedback QR</h1>
      <div class="unit">UNIT ${unit}</div>
      <div class="plate">Plate: ${plate}</div>
      <div class="route">Route: ${route}</div>
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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3 pr-8">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#62A0EA]/15 text-[#62A0EA]">
          <Car size={22} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">Vehicle Details</h2>
          <p className="text-xs text-slate-400">Fleet Management · permanent unit record</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <RefreshCw size={28} className="animate-spin text-[#62A0EA]" />
          <p className="text-sm text-slate-400">Loading vehicle details…</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center gap-3 py-10">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          {vehicleId && (
            <button
              onClick={() => load(vehicleId)}
              className="mt-1 flex items-center gap-2 px-4 py-2 bg-[#62A0EA] text-white rounded-md text-sm font-medium hover:bg-[#4A8BD4] transition-colors"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loaded */}
      {!isLoading && !error && vehicle && (
        <div className="space-y-5">
          {/* ── Vehicle info ── */}
          <section className="rounded-lg border border-[#1E2D45] bg-[#0E1628] p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <IdCard size={14} className="text-[#62A0EA]" />
                Vehicle Information
              </h3>
              <Badge
                variant={
                  vehicle.status === 'ACTIVE'
                    ? 'success'
                    : vehicle.status === 'MAINTENANCE'
                      ? 'warning'
                      : 'danger'
                }
              >
                {vehicle.statusLabel}
              </Badge>
            </div>
            <div className="divide-y divide-[#1A2540]">
              <DetailRow icon={Hash} label="Unit Number" value={vehicle.unitNumber || '—'} />
              <DetailRow icon={Car} label="Plate Number" value={vehicle.plateNumber || '—'} />
              <DetailRow
                icon={Car}
                label="Vehicle Type"
                value={vehicle.vehicleType || '—'}
              />
              <DetailRow
                icon={RouteIcon}
                label="Route"
                value={vehicle.route?.name ?? '—'}
              />
            </div>
          </section>

          {/* ── Today's crew ── */}
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Users size={14} className="text-[#62A0EA]" />
              Today&apos;s Assigned Crew
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CrewRow label="Driver" person={vehicle.driver} />
              <CrewRow label="Conductor" person={vehicle.conductor} />
            </div>
          </section>

          {/* ── Permanent Unit QR ── */}
          <section className="rounded-lg border border-[#1E2D45] bg-[#0E1628] p-4">
            <div className="mb-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Hash size={14} className="text-[#62A0EA]" />
                Unit Feedback QR
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Permanent — this QR never changes. Print it and keep it inside the
                unit; commuters scan it to rate today&apos;s driver &amp; conductor.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {/* QR (white quiet-zone wrapper so it scans reliably) */}
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div ref={qrWrapperRef}>
                  <QRCodeCanvas
                    value={qrPayload}
                    size={208}
                    level="M"
                    aria-label={`Permanent feedback QR for unit ${vehicle.unitNumber || vehicle.plateNumber}`}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:pt-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#62A0EA] text-white text-sm font-medium rounded-md hover:bg-[#4A8BD4] transition-colors"
                >
                  <Download size={16} />
                  Download PNG
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[#1E2D45] text-slate-200 text-sm font-medium rounded-md hover:bg-[#131C2E] transition-colors"
                >
                  <Printer size={16} />
                  Print
                </button>
                <p className="mt-1 text-center text-[10px] text-slate-500 sm:text-left">
                  Unit {vehicle.unitNumber || '—'} · {vehicle.plateNumber || '—'}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
