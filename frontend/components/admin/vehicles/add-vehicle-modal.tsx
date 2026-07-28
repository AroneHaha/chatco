// components/admin/vehicles/add-vehicle-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Info } from 'lucide-react';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful POST with the created vehicle's id.
   *  The parent uses it to open the details modal so the new unit's
   *  permanent QR is shown (and printable) right away. */
  onSave: (createdVehicleId: string) => void;
}

/**
 * Add New Vehicle modal.
 *
 * Per the vehicle-assignment refactor, this modal ONLY captures the
 * vehicle's own attributes (unit number, plate number, status). Driver and
 * conductor assignment is intentionally excluded — a newly created vehicle
 * starts with NO current driver or conductor. Assignment happens
 * automatically through the conductor login (shift-start) workflow.
 */
export function AddVehicleModal({ isOpen, onClose, onSave }: AddVehicleModalProps) {
  const [formData, setFormData] = useState({
    unit_number: '',
    plate_number: '',
    status: 'ACTIVE',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_number: formData.unit_number,
          plate_number: formData.plate_number,
          status: formData.status,
          // NOTE: driver_id and conductor_id are intentionally NOT sent.
          // A new vehicle starts unassigned; personnel are linked
          // automatically when a conductor logs in and starts a shift.
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Laravel 422: { message, errors: { field: ["msg", ...] } }
        if (res.status === 422 && data.errors) {
          setFieldErrors(data.errors);
          const firstError = (Object.values(data.errors)[0] as string[] | undefined)?.[0] ?? 'Validation failed.';
          throw new Error(firstError);
        }
        throw new Error(data.message ?? 'Failed to create vehicle');
      }

      // Reset form and close
      setFormData({ unit_number: '', plate_number: '', status: 'ACTIVE' });
      // Pass the created vehicle's id up so the parent can surface the
      // freshly-generated permanent QR (downloadable / printable).
      const createdId = String(data?.data?.id ?? '');
      onSave(createdId);
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
            Unit Number / Unit ID <span className="text-red-400">*</span>
          </label>
          <input type="text" id="unit_number" name="unit_number" value={formData.unit_number} onChange={handleChange} required placeholder="e.g., UNIT-011"
            className={`${inputClasses} ${fieldErrors.unit_number ? 'border-red-500/50' : ''}`} />
          {fieldErrors.unit_number && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.unit_number[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="plate_number" className="block text-xs font-medium text-slate-300 mb-1.5">
            Plate Number <span className="text-red-400">*</span>
          </label>
          <input type="text" id="plate_number" name="plate_number" value={formData.plate_number} onChange={handleChange} required placeholder="e.g., NAA 0011"
            className={`${inputClasses} ${fieldErrors.plate_number ? 'border-red-500/50' : ''}`} />
          {fieldErrors.plate_number && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.plate_number[0]}</p>
          )}
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

        {/* Information note explaining the new assignment workflow */}
        <div className="flex items-start gap-2.5 bg-[#62A0EA]/8 border border-[#62A0EA]/20 rounded-md px-3.5 py-3">
          <Info size={16} className="text-[#62A0EA] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Driver and conductor are <span className="font-semibold text-white">not assigned here</span>.
            A new vehicle starts unassigned. Personnel are linked to this unit automatically when a
            conductor logs in and starts a shift.
          </p>
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
