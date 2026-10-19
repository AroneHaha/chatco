// components/admin/vehicles/add-vehicle-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Car, Info, Loader2, Plus } from 'lucide-react';

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
    brand: '',
    model: '',
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
          brand: formData.brand,
          model: formData.model,
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
      setFormData({ unit_number: '', plate_number: '', brand: '', model: '', status: 'ACTIVE' });
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

  const inputClasses = "block min-h-11 w-full rounded-lg border border-[#2A3A55] bg-[#0E1628]/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#62A0EA]/50 admin-light:border-[#CBD5E1] admin-light:bg-slate-50 admin-light:text-slate-900 admin-light:placeholder:text-slate-400 admin-light:focus:ring-[#1A5FB4]/30";

  return (
    <Modal adminThemed isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" rounded="rounded-2xl">
      <header className="mb-5 flex items-center gap-3 border-b border-[#2A3A55] pb-4 pr-8 admin-light:border-[#E2E8F0]">
        <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#62A0EA]/20 bg-[#62A0EA]/10 text-[#99C1F1] admin-light:border-[#1A5FB4]/15 admin-light:bg-[#1A5FB4]/5 admin-light:text-[#1A5FB4]">
          <Car size={23} strokeWidth={1.5} />
        </div>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#99C1F1] admin-light:text-[#1A5FB4]">Fleet Management</p>
          <h2 className="text-xl font-semibold tracking-tight text-white admin-light:text-slate-900">Add New Vehicle</h2>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 admin-light:text-red-600">{error}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white admin-light:text-slate-900">Vehicle information</h3>
          <p className="text-xs text-slate-400 admin-light:text-slate-500"><span className="text-red-400 admin-light:text-red-600">*</span> Required fields</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="unit_number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
            Unit number <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input type="text" id="unit_number" name="unit_number" value={formData.unit_number} onChange={handleChange} required placeholder="e.g., UNIT-011"
            className={`${inputClasses} ${fieldErrors.unit_number ? 'border-red-500/50' : ''}`} />
          {fieldErrors.unit_number && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.unit_number[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="plate_number" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
            Plate number <span className="text-red-400 admin-light:text-red-600">*</span>
          </label>
          <input type="text" id="plate_number" name="plate_number" value={formData.plate_number} onChange={handleChange} required placeholder="e.g., NAA 0011"
            className={`${inputClasses} ${fieldErrors.plate_number ? 'border-red-500/50' : ''}`} />
          {fieldErrors.plate_number && (
            <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.plate_number[0]}</p>
          )}
        </div>

          <div>
            <label htmlFor="brand" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Brand <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleChange} required placeholder="e.g., Isuzu"
              className={`${inputClasses} ${fieldErrors.brand ? 'border-red-500/50' : ''}`} />
            {fieldErrors.brand && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.brand[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="model" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">
              Model <span className="text-red-400 admin-light:text-red-600">*</span>
            </label>
            <input type="text" id="model" name="model" value={formData.model} onChange={handleChange} required placeholder="e.g., Elf NHR"
              className={`${inputClasses} ${fieldErrors.model ? 'border-red-500/50' : ''}`} />
            {fieldErrors.model && (
              <p className="text-xs text-red-400 admin-light:text-red-600 mt-1">{fieldErrors.model[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-xs font-medium text-slate-300 admin-light:text-slate-700 mb-1.5">Status</label>
          <select id="status" name="status" value={formData.status} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark] admin-light:[color-scheme:light]`}>
            <option value="ACTIVE" className="bg-gray-800 admin-light:bg-white">Active</option>
            <option value="MAINTENANCE" className="bg-gray-800 admin-light:bg-white">Under Maintenance</option>
            <option value="INACTIVE" className="bg-gray-800 admin-light:bg-white">Out of Service</option>
          </select>
          {fieldErrors.status && (
            <p className="mt-1 text-xs text-red-400 admin-light:text-red-600">{fieldErrors.status[0]}</p>
          )}
        </div>

        {/* Information note explaining the new assignment workflow */}
        <div className="flex items-start gap-2.5 rounded-xl bg-[#0E1628]/60 px-3.5 py-3 admin-light:bg-slate-50">
          <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[#99C1F1] admin-light:text-[#1A5FB4]" />
          <p className="text-xs leading-relaxed text-slate-400 admin-light:text-slate-500">
            Driver and conductor assignments are linked automatically when a conductor starts a shift.
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#2A3A55] pt-4 admin-light:border-[#E2E8F0]">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-[#2A3A55] px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#131C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] admin-light:border-slate-300 admin-light:text-slate-700 admin-light:hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#62A0EA] px-4 py-2.5 text-sm font-semibold text-[#0B1120] transition-colors hover:bg-[#85B6F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62A0EA] disabled:cursor-not-allowed disabled:opacity-50 admin-light:bg-[#1A5FB4] admin-light:text-white admin-light:hover:bg-[#164A8F]">
            {isSubmitting ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <Plus size={16} aria-hidden="true" />}
            {isSubmitting ? 'Saving...' : 'Save Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
