// components/admin/vehicles/edit-vehicle-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import type { Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';

interface Route {
  id: string;
  name: string;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  vehicle_id: string | null;
}

interface Conductor {
  id: string;
  first_name: string;
  last_name: string;
}

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful PUT — parent refetches the list. */
  onSaved: () => void;
  /** The full row from the table — must include the Laravel `id`. */
  editingVehicle: Vehicle | null;
}

// Reverse-map frontend status label -> Laravel enum value.
const STATUS_TO_LARAVEL: Record<Vehicle['status'], string> = {
  'Operating': 'ACTIVE',
  'Under Maintenance': 'MAINTENANCE',
  'Out of Service / Damaged': 'INACTIVE',
};
const STATUS_FROM_LARAVEL: Record<string, Vehicle['status']> = {
  'ACTIVE': 'Operating',
  'MAINTENANCE': 'Under Maintenance',
  'INACTIVE': 'Out of Service / Damaged',
};

export function EditVehicleModal({ isOpen, onClose, onSaved, editingVehicle }: EditVehicleModalProps) {
  const [formData, setFormData] = useState({
    unit_number: '',
    plate_number: '',
    route_id: '',
    driver_id: '',
    conductor_id: '',
    status: 'ACTIVE' as string,
  });

  // Hold the raw API record (with nested driver/conductor/route objects) so
  // we can pre-populate driver/conductor dropdowns with the currently-assigned
  // person even if they're already on another vehicle in the broader list.
  const [rawVehicle, setRawVehicle] = useState<Record<string, unknown> | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Fetch all metadata + the raw vehicle record (so we get nested driver/conductor IDs).
  useEffect(() => {
    if (!isOpen || !editingVehicle) return;

    setIsLoadingMeta(true);
    setError(null);

    Promise.all([
      fetch('/api/admin/routes').then(r => r.json()),
      fetch('/api/admin/drivers').then(r => r.json()),
      fetch('/api/admin/vehicles').then(r => r.json()),
    ]).then(([routesRes, driversRes, vehiclesRes]) => {
      setRoutes(routesRes.data ?? []);

      // Drivers: include the currently-assigned one + all unassigned.
      const allDrivers: Driver[] = driversRes.data ?? [];
      const allVehicles: Record<string, unknown>[] = vehiclesRes.data ?? [];
      const currentVehicleRaw = allVehicles.find(v => String(v.id) === editingVehicle.id) ?? null;
      setRawVehicle(currentVehicleRaw);

      const currentDriverId = currentVehicleRaw
        ? String((currentVehicleRaw.driver as Record<string, unknown> | null)?.id ?? '')
        : '';
      setDrivers(allDrivers.filter(d => !d.vehicle_id || d.id === currentDriverId));

      // Conductors: extract unique conductors from existing vehicles (same logic as add modal).
      const conductorMap = new Map<string, Conductor>();
      allVehicles.forEach((v) => {
        const c = v.conductor as Record<string, unknown> | null;
        if (c && !conductorMap.has(String(c.id))) {
          conductorMap.set(String(c.id), {
            id: String(c.id),
            first_name: String(c.first_name ?? ''),
            last_name: String(c.last_name ?? ''),
          });
        }
      });
      setConductors(Array.from(conductorMap.values()));

      // Pre-populate form fields from raw API record (so we get IDs, not display names).
      if (currentVehicleRaw) {
        const drv = currentVehicleRaw.driver as Record<string, unknown> | null;
        const con = currentVehicleRaw.conductor as Record<string, unknown> | null;
        const rte = currentVehicleRaw.route as Record<string, unknown> | null;
        const apiStatus = String(currentVehicleRaw.status ?? 'ACTIVE');

        setFormData({
          unit_number: String(currentVehicleRaw.unit_number ?? ''),
          plate_number: String(currentVehicleRaw.plate_number ?? ''),
          route_id: rte ? String(rte.id) : '',
          driver_id: drv ? String(drv.id) : '',
          conductor_id: con ? String(con.id) : '',
          status: apiStatus,
        });
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

    // Hard guard: never send a PUT if the vehicle ID is missing or literally
    // the string "undefined". This prevents the Laravel 404
    // "No query results for model [App\\Models\\Vehicle] undefined".
    if (!editingVehicle.id || editingVehicle.id === 'undefined') {
      setError('Vehicle ID is missing. Close this modal and try again. If the problem persists, refresh the page.');
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
      const res = await fetch(`/api/admin/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_number: formData.unit_number,
          plate_number: formData.plate_number,
          route_id: formData.route_id,
          driver_id: formData.driver_id || null,
          conductor_id: formData.conductor_id || null,
          status: formData.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Laravel 422: { message, errors: { field: ["msg", ...] } }
        if (res.status === 422 && data.errors) {
          setFieldErrors(data.errors);
          const firstError = Object.values(data.errors)[0]?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? 'Failed to update vehicle');
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
        Unit {rawVehicle ? String((rawVehicle as Record<string, unknown>).unit_number ?? '—') : editingVehicle.plateNumber} • ID: <span className="font-mono">{editingVehicle.id}</span>
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

        <div>
          <label htmlFor="edit-driver_id" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Driver</label>
          <select
            id="edit-driver_id"
            name="driver_id"
            value={formData.driver_id}
            onChange={handleChange}
            disabled={isLoadingMeta || isSubmitting}
            className={`${inputClasses} [color-scheme:dark]`}
          >
            <option value="" className="bg-gray-800">-- Unassign Driver --</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id} className="bg-gray-800">
                {d.first_name} {d.last_name}{d.vehicle_id && d.id !== formData.driver_id ? ' (currently on another vehicle)' : ''}
              </option>
            ))}
          </select>
          {drivers.length === 0 && <p className="text-xs text-amber-400 mt-1">No available drivers</p>}
        </div>

        <div>
          <label htmlFor="edit-conductor_id" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Conductor</label>
          <select
            id="edit-conductor_id"
            name="conductor_id"
            value={formData.conductor_id}
            onChange={handleChange}
            disabled={isLoadingMeta || isSubmitting}
            className={`${inputClasses} [color-scheme:dark]`}
          >
            <option value="" className="bg-gray-800">-- Unassign Conductor --</option>
            {conductors.map(c => (
              <option key={c.id} value={c.id} className="bg-gray-800">{c.first_name} {c.last_name}</option>
            ))}
          </select>
          {conductors.length === 0 && (
            <p className="text-xs text-slate-500 mt-1">
              No conductor profiles exist yet. Create one with the "Conductor Account" button.
            </p>
          )}
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
