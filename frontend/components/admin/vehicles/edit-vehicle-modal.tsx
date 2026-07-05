// components/admin/vehicles/edit-vehicle-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Info, User, UserCheck } from 'lucide-react';
import type { Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';

interface Route {
  id: string;
  name: string;
}

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful PUT — parent refetches the list. */
  onSaved: () => void;
  /** The full row from the table — must include the Laravel `id`. */
  editingVehicle: Vehicle | null;
}

// Reverse-map Laravel enum value -> frontend status label.
const STATUS_FROM_LARAVEL: Record<string, Vehicle['status']> = {
  'ACTIVE': 'Operating',
  'MAINTENANCE': 'Under Maintenance',
  'INACTIVE': 'Out of Service / Damaged',
};

/**
 * Edit Vehicle modal.
 *
 * Only the vehicle's own attributes (unit number, plate, route, status) are
 * editable. Driver and conductor are shown as READ-ONLY current-assignment
 * info — they are managed exclusively by the conductor login / EOD workflow
 * to preserve a single source of truth and prevent conflicting manual edits.
 */
export function EditVehicleModal({ isOpen, onClose, onSaved, editingVehicle }: EditVehicleModalProps) {
  const [formData, setFormData] = useState({
    unit_number: '',
    plate_number: '',
    route_id: '',
    status: 'ACTIVE' as string,
  });

  // Hold the raw API record (with nested driver/conductor/route objects) so
  // we can display the current assignment read-only and source the canonical
  // UUID for the PUT.
  const [rawVehicle, setRawVehicle] = useState<Record<string, unknown> | null>(null);
  const [canonicalId, setCanonicalId] = useState<string>('');

  // Current assignment display values (read-only).
  const [currentDriverName, setCurrentDriverName] = useState<string | null>(null);
  const [currentConductorName, setCurrentConductorName] = useState<string | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Fetch routes + the raw vehicle record (for canonical ID + current
  // assignment display). Drivers/conductors are no longer fetched —
  // assignment is read-only and managed by the conductor workflow.
  useEffect(() => {
    if (!isOpen || !editingVehicle) return;

    setIsLoadingMeta(true);
    setError(null);

    Promise.all([
      fetch('/api/admin/routes').then(r => r.json()),
      fetch('/api/admin/vehicles').then(r => r.json()),
    ]).then(([routesRes, vehiclesRes]) => {
      setRoutes(routesRes.data ?? []);

      const allVehicles: Record<string, unknown>[] = (vehiclesRes.data?.data ?? vehiclesRes.data ?? []) as Record<string, unknown>[];

      // Find the matching raw vehicle. Try by ID first, then fall back to
      // plate_number (which is also unique).
      let currentVehicleRaw = allVehicles.find(
        v => String(v.id) === editingVehicle.id
      ) ?? null;

      if (!currentVehicleRaw && editingVehicle.plateNumber) {
        currentVehicleRaw = allVehicles.find(
          v => String(v.plate_number) === editingVehicle.plateNumber
        ) ?? null;
      }

      setRawVehicle(currentVehicleRaw);

      const rawId = currentVehicleRaw ? String(currentVehicleRaw.id ?? '') : '';
      setCanonicalId(rawId);

      // Extract current assignment names (read-only display).
      const drv = currentVehicleRaw?.driver as Record<string, unknown> | null | undefined;
      const con = currentVehicleRaw?.conductor as Record<string, unknown> | null | undefined;
      setCurrentDriverName(
        drv ? `${drv.first_name ?? ''} ${drv.last_name ?? ''}`.trim() || null : null
      );
      setCurrentConductorName(
        con ? `${con.first_name ?? ''} ${con.last_name ?? ''}`.trim() || null : null
      );

      // Pre-populate editable form fields from raw API record.
      if (currentVehicleRaw) {
        const rte = currentVehicleRaw.route as Record<string, unknown> | null;
        setFormData({
          unit_number: String(currentVehicleRaw.unit_number ?? ''),
          plate_number: String(currentVehicleRaw.plate_number ?? ''),
          route_id: rte ? String(rte.id) : '',
          status: String(currentVehicleRaw.status ?? 'ACTIVE'),
        });
      } else {
        setError(
          `Could not find this vehicle in the database. ` +
          `editingVehicle.id="${editingVehicle.id}", ` +
          `plateNumber="${editingVehicle.plateNumber}". ` +
          `Please refresh the page and try again.`
        );
      }
    }).catch(() => {
      setError('Failed to load form data. Please try again.');
    }).finally(() => {
      setIsLoadingMeta(false);
    });
  }, [isOpen, editingVehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingVehicle) return;

    const vehicleId = canonicalId || editingVehicle.id;

    if (!vehicleId || vehicleId === 'undefined') {
      setError(
        `Vehicle ID is missing. canonicalId="${canonicalId}", ` +
        `editingVehicle.id="${editingVehicle.id}". ` +
        `Close this modal, refresh the page, and try again.`
      );
      return;
    }

    // Client-side guard: route_id is required.
    if (!formData.route_id) {
      setError('Please select a route for this vehicle.');
      setFieldErrors({ route_id: ['Please select a route.'] });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const requestBody = {
        unit_number: formData.unit_number,
        plate_number: formData.plate_number,
        route_id: formData.route_id,
        status: formData.status,
        // NOTE: driver_id and conductor_id are intentionally NOT sent.
        // Assignment is managed exclusively by the conductor login / EOD
        // workflow — manual admin editing is disabled to preserve a single
        // source of truth and prevent conflicting assignments.
      };

      const res = await fetch(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.errors) {
          setFieldErrors(data.errors);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        const msg = data.message ?? `Failed to update vehicle (HTTP ${res.status})`;
        throw new Error(msg);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!editingVehicle) return null;

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  const currentStatusLabel = STATUS_FROM_LARAVEL[formData.status] ?? 'Operating';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Edit Vehicle</h2>
      <p className="text-xs text-slate-400 mb-5">
        Unit {rawVehicle ? String((rawVehicle as Record<string, unknown>).unit_number ?? '—') : editingVehicle.plateNumber} • ID: <span className="font-mono">{canonicalId || editingVehicle.id || '— MISSING —'}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="edit-unit_number" className="block text-xs font-medium text-slate-300 mb-1.5">
            Unit Number <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="edit-unit_number"
            name="unit_number"
            value={formData.unit_number}
            onChange={handleChange}
            required
            disabled={isLoadingMeta || isSubmitting}
            placeholder="e.g., UNIT-011"
            className={`${inputClasses} ${fieldErrors.unit_number ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.unit_number && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.unit_number[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-plate_number" className="block text-xs font-medium text-slate-300 mb-1.5">
            Plate Number <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="edit-plate_number"
            name="plate_number"
            value={formData.plate_number}
            onChange={handleChange}
            required
            disabled={isLoadingMeta || isSubmitting}
            placeholder="e.g., NAA 0011"
            className={`${inputClasses} ${fieldErrors.plate_number ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.plate_number && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.plate_number[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-route_id" className="block text-xs font-medium text-slate-300 mb-1.5">
            Route <span className="text-red-400">*</span>
          </label>
          <select
            id="edit-route_id"
            name="route_id"
            value={formData.route_id}
            onChange={handleChange}
            required
            disabled={isLoadingMeta || isSubmitting}
            className={`${inputClasses} [color-scheme:dark] ${fieldErrors.route_id ? 'border-red-500/50' : ''}`}
          >
            <option value="" disabled className="bg-gray-800">Select Route...</option>
            {routes.map(r => (
              <option key={r.id} value={r.id} className="bg-gray-800">{r.name}</option>
            ))}
          </select>
          {fieldErrors.route_id && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.route_id[0]}</p>
          )}
          {routes.length === 0 && <p className="text-xs text-amber-400 mt-1">No routes available. Create a route first.</p>}
        </div>

        <div>
          <label htmlFor="edit-status" className="block text-xs font-medium text-slate-300 mb-1.5">Vehicle Status</label>
          <select
            id="edit-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isLoadingMeta || isSubmitting}
            className={`${inputClasses} [color-scheme:dark]`}
          >
            <option value="ACTIVE" className="bg-gray-800">Operating</option>
            <option value="MAINTENANCE" className="bg-gray-800">Under Maintenance</option>
            <option value="INACTIVE" className="bg-gray-800">Out of Service / Damaged</option>
          </select>
          {currentStatusLabel !== 'Operating' && (
            <p className="text-xs text-amber-400 mt-1">
              Currently marked as: {currentStatusLabel}
            </p>
          )}
        </div>

        {/* ─── Read-only current assignment ───
            Driver/conductor are managed by the conductor login workflow,
            not by manual admin editing. Shown here for visibility only. */}
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Assignment</p>

          <div className="flex items-center gap-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md px-3.5 py-2.5">
            <User size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Driver</p>
              <p className={`text-sm font-medium truncate ${currentDriverName ? 'text-white' : 'text-slate-500 italic'}`}>
                {currentDriverName || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md px-3.5 py-2.5">
            <UserCheck size={16} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Conductor</p>
              <p className={`text-sm font-medium truncate ${currentConductorName ? 'text-white' : 'text-slate-500 italic'}`}>
                {currentConductorName || 'Unassigned'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-[#62A0EA]/8 border border-[#62A0EA]/20 rounded-md px-3.5 py-2.5">
          <Info size={15} className="text-[#62A0EA] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Driver and conductor are assigned automatically when a conductor logs in and starts a
            shift, and cleared after their End-of-Day remittance. They cannot be edited manually.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoadingMeta}
            className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isLoadingMeta ? 'Loading...' : 'Update Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
