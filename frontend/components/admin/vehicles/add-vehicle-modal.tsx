// components/admin/vehicles/add-vehicle-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';

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

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Trigger refresh in parent
}

export function AddVehicleModal({ isOpen, onClose, onSave }: AddVehicleModalProps) {
  const [formData, setFormData] = useState({
    unit_number: '',
    plate_number: '',
    route_id: '',
    driver_id: '',
    conductor_id: '',
    status: 'ACTIVE',
  });
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch routes, unassigned drivers, and conductors when modal opens
  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      fetch('/api/admin/routes').then(r => r.json()),
      fetch('/api/admin/drivers').then(r => r.json()),
      fetch('/api/admin/vehicles').then(r => r.json()),
    ]).then(([routesRes, driversRes, vehiclesRes]) => {
      setRoutes(routesRes.data ?? []);

      const allDrivers = driversRes.data ?? [];
      // Filter to unassigned drivers (no vehicle_id)
      setDrivers(allDrivers.filter((d: Driver) => !d.vehicle_id));

      // Extract unique conductors from existing vehicles
      const allVehicles = vehiclesRes.data ?? [];
      const conductorMap = new Map<string, Conductor>();
      allVehicles.forEach((v: { conductor?: Conductor | null }) => {
        if (v.conductor && !conductorMap.has(v.conductor.id)) {
          conductorMap.set(v.conductor.id, v.conductor);
        }
      });
      setConductors(Array.from(conductorMap.values()));
    }).catch(() => {
      setError('Failed to load form data. Please try again.');
    });
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side guard: route_id is required (mirrors backend validation).
    if (!formData.route_id) {
      setError('Please select a route for this vehicle.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_number: formData.unit_number,
          plate_number: formData.plate_number,
          route_id: formData.route_id, // Always present (required)
          driver_id: formData.driver_id || null,
          conductor_id: formData.conductor_id || null,
          status: formData.status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Laravel validation errors come back as { message, errors: {...} }
        const laravelErrors = data.errors
          ? Object.values(data.errors).flat().join(' ')
          : null;
        throw new Error(laravelErrors ?? data.message ?? 'Failed to create vehicle');
      }

      // Reset form and close
      setFormData({ unit_number: '', plate_number: '', route_id: '', driver_id: '', conductor_id: '', status: 'ACTIVE' });
      onSave(); // Trigger refresh in parent
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Add New Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="unit_number" className="block text-xs font-medium text-slate-300 mb-1.5">
            Unit Number <span className="text-red-400">*</span>
          </label>
          <input type="text" id="unit_number" name="unit_number" value={formData.unit_number} onChange={handleChange} required placeholder="e.g., UNIT-011"
            className={inputClasses} />
        </div>

        <div>
          <label htmlFor="plate_number" className="block text-xs font-medium text-slate-300 mb-1.5">
            Plate Number <span className="text-red-400">*</span>
          </label>
          <input type="text" id="plate_number" name="plate_number" value={formData.plate_number} onChange={handleChange} required placeholder="e.g., NAA 0011"
            className={inputClasses} />
        </div>

        <div>
          <label htmlFor="route_id" className="block text-xs font-medium text-slate-300 mb-1.5">
            Route <span className="text-red-400">*</span>
          </label>
          <select id="route_id" name="route_id" value={formData.route_id} onChange={handleChange} required
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800" disabled>Select Route...</option>
            {routes.map(r => (
              <option key={r.id} value={r.id} className="bg-gray-800">{r.name}</option>
            ))}
          </select>
          {routes.length === 0 && <p className="text-xs text-amber-400 mt-1">No routes available. Create a route first.</p>}
        </div>

        <div>
          <label htmlFor="driver_id" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Driver</label>
          <select id="driver_id" name="driver_id" value={formData.driver_id} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800">Select Unassigned Driver...</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id} className="bg-gray-800">{d.first_name} {d.last_name}</option>
            ))}
          </select>
          {drivers.length === 0 && <p className="text-xs text-amber-400 mt-1">No available drivers</p>}
        </div>

        <div>
          <label htmlFor="conductor_id" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Conductor</label>
          <select id="conductor_id" name="conductor_id" value={formData.conductor_id} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800">Select Conductor...</option>
            {conductors.map(c => (
              <option key={c.id} value={c.id} className="bg-gray-800">{c.first_name} {c.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-xs font-medium text-slate-300 mb-1.5">Status</label>
          <select id="status" name="status" value={formData.status} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="ACTIVE" className="bg-gray-800">Active</option>
            <option value="MAINTENANCE" className="bg-gray-800">Under Maintenance</option>
            <option value="INACTIVE" className="bg-gray-800">Out of Service</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
