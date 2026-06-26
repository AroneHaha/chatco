// components/admin/vehicles/delete-vehicle-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { Vehicle } from '@/app/(admin)/vehicles/data/vehicles-data';
import { VehicleOperationError } from '@/lib/admin/services/vehicle.service';

interface DeleteVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  vehicle: Vehicle | null;
}

/**
 * Delete-confirm modal for admin vehicle management (S5-T11).
 *
 * Shows a clear warning + the vehicle's unit/plate/route so the admin can
 * double-check before the soft-delete. Surfaces API errors inline:
 *  - 409 Conflict (active-shift guard): "Cannot delete a vehicle that is
 *    currently on an active shift. End the shift (via conductor remittance)
 *    before deleting." — surfaced as a persistent error so the admin knows
 *    to end the shift first.
 *  - 422 / 404 / network: surfaced as a generic inline error.
 */
export function DeleteVehicleModal({ isOpen, onClose, onConfirm, vehicle }: DeleteVehicleModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      if (err instanceof VehicleOperationError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to delete vehicle.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // prevent closing mid-request
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0 border-2 border-red-500/25">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Delete Vehicle</h2>
            <p className="text-sm text-slate-400 mt-1">
              This will remove the vehicle from the active fleet. Assigned driver/conductor will be
              unassigned. The vehicle&rsquo;s shift history is preserved.
            </p>
          </div>
        </div>

        {vehicle && (
          <div className="bg-[#0E1628] border border-[#1E2D45] rounded-md p-4 space-y-1">
            <p className="text-white font-medium">
              Unit {vehicle.unitNumber || '—'} &bull; {vehicle.plateNumber}
            </p>
            <p className="text-sm text-slate-400">Route: {vehicle.route}</p>
            <p className="text-sm text-slate-400">
              Driver: {vehicle.driver ?? 'Unassigned'} &bull; Conductor: {vehicle.conductor ?? 'Unassigned'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2D45]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : 'Delete Vehicle'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
