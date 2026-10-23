// components/admin/vehicles/edit-vehicle-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Info, User, UserCheck } from 'lucide-react';
import type { Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';

import { InlineError } from '@/components/admin/ui/inline-error';
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

const STATUS_TO_LARAVEL: Record<Vehicle['status'], string> = {
  'Operating': 'ACTIVE',
  'Under Maintenance': 'MAINTENANCE',
  'Out of Service / Damaged': 'INACTIVE',
};

/**
 * Edit Vehicle modal.
 *
 * Only the vehicle's own attributes (unit number, plate, status) are
 * editable. Driver and conductor are shown as READ-ONLY current-assignment
 * info — they are managed exclusively by the conductor login / EOD workflow
 * to preserve a single source of truth and prevent conflicting manual edits.
 */
export function EditVehicleModal({ isOpen, onClose, onSaved, editingVehicle }: EditVehicleModalProps) {
  const [formData, setFormData] = useState({
    unit_number: '',
    plate_number: '',
    status: 'ACTIVE' as string,
  });

  // Current assignment display values (read-only).
  const [currentDriverName, setCurrentDriverName] = useState<string | null>(null);
  const [currentConductorName, setCurrentConductorName] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // The table row already carries the vehicle fields and read-only
  // assignment names from the paged vehicle API response.
  useEffect(() => {
    if (!isOpen || !editingVehicle) return;

    setError(null);
    setFieldErrors({});
    setFormData({
      unit_number: editingVehicle.unitNumber === '-' ? '' : editingVehicle.unitNumber,
      plate_number: editingVehicle.plateNumber === '-' ? '' : editingVehicle.plateNumber,
      status: STATUS_TO_LARAVEL[editingVehicle.status] ?? 'ACTIVE',
    });
    setCurrentDriverName(editingVehicle.driver);
    setCurrentConductorName(editingVehicle.conductor);
  }, [isOpen, editingVehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingVehicle) return;

    const vehicleId = editingVehicle.id;

    if (!vehicleId || vehicleId === 'undefined') {
      setError(
        `Vehicle ID is missing. editingVehicle.id="${editingVehicle.id}". ` +
        `Close this modal, refresh the page, and try again.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const requestBody = {
        unit_number: formData.unit_number,
        plate_number: formData.plate_number,
        status: formData.status,
        // route_id is intentionally NOT sent, so the vehicle's stored route
        // is left unchanged (the update endpoint is a partial update).
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

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md text-white admin-light:text-slate-900 text-sm placeholder-slate-500 admin-light:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] admin-light:focus:ring-[#1A5FB4] transition-colors";

  const currentStatusLabel = STATUS_FROM_LARAVEL[formData.status] ?? 'Operating';

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white admin-light:text-slate-900 mb-1">Edit Vehicle</h2>
      <p className="text-xs text-slate-400 admin-light:text-slate-500 mb-5">
        Unit {editingVehicle.unitNumber} • ID: <span className="font-mono">{editingVehicle.id || '— MISSING —'}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <InlineError>{error}</InlineError>
        )}

        <div>
          <label htmlFor="edit-unit_number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
            Unit Number <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="text"
            id="edit-unit_number"
            name="unit_number"
            value={formData.unit_number}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="e.g., UNIT-011"
            className={`${inputClasses} ${fieldErrors.unit_number ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.unit_number && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.unit_number[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-plate_number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
            Plate Number <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input
            type="text"
            id="edit-plate_number"
            name="plate_number"
            value={formData.plate_number}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            placeholder="e.g., NAA 0011"
            className={`${inputClasses} ${fieldErrors.plate_number ? 'border-red-500/50' : ''}`}
          />
          {fieldErrors.plate_number && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.plate_number[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="edit-status" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">Vehicle Status</label>
          <select
            id="edit-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isSubmitting}
            className={`${inputClasses} [color-scheme:dark]`}
          >
            <option value="ACTIVE" className="bg-gray-800 admin-light:bg-white">Operating</option>
            <option value="MAINTENANCE" className="bg-gray-800 admin-light:bg-white">Under Maintenance</option>
            <option value="INACTIVE" className="bg-gray-800 admin-light:bg-white">Out of Service / Damaged</option>
          </select>
          {currentStatusLabel !== 'Operating' && (
            <p className="text-xs text-slate-400 admin-light:text-slate-500 mt-1">
              Currently marked as: {currentStatusLabel}
            </p>
          )}
        </div>

        {/* ─── Read-only current assignment ───
            Driver/conductor are managed by the conductor login workflow,
            not by manual admin editing. Shown here for visibility only. */}
        <div className="space-y-2 pt-2">
          <p className="text-[10px] font-semibold text-slate-400 admin-light:text-slate-500 uppercase tracking-wider">Current Assignment</p>

          <div className="flex items-center gap-2.5 bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md px-3.5 py-2.5">
            <User size={16} className="text-slate-400 admin-light:text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Driver</p>
              <p className={`text-sm font-medium truncate ${currentDriverName ? 'text-white admin-light:text-slate-900' : 'text-slate-500 italic'}`}>
                {currentDriverName || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-[#0E1628] admin-light:bg-[#F1F5F9] border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md px-3.5 py-2.5">
            <UserCheck size={16} className="text-slate-400 admin-light:text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Conductor</p>
              <p className={`text-sm font-medium truncate ${currentConductorName ? 'text-white admin-light:text-slate-900' : 'text-slate-500 italic'}`}>
                {currentConductorName || 'Unassigned'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 bg-[#131C2E] admin-light:bg-[#F8FAFC] border border-[#2A3A55] admin-light:border-[#E2E8F0] rounded-md px-3.5 py-2.5">
          <Info size={15} className="text-[#62A0EA] admin-light:text-[#1A5FB4] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-300 admin-light:text-slate-700 leading-relaxed">
            Driver and conductor are assigned automatically when a conductor logs in and starts a
            shift, and cleared after their End-of-Day remittance. They cannot be edited manually.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45] admin-light:border-[#E2E8F0]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-[#1E2D45] admin-light:border-[#E2E8F0] rounded-md text-slate-300 admin-light:text-slate-700 hover:bg-[#131C2E] admin-light:hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[#62A0EA] admin-light:bg-[#1A5FB4] text-white font-medium rounded-md hover:bg-[#4A8BD4] admin-light:hover:bg-[#164A8F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Update Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
