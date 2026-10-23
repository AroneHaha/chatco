// components/admin/vehicles/delete-vehicle-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { Trash2 } from 'lucide-react';
import { ADMIN_BUTTON, DetailRows, ModalKickerHeader } from '@/components/admin/ui/modal-parts';
import { InlineError } from '@/components/admin/ui/inline-error';
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
    <Modal adminThemed isOpen={isOpen} onClose={handleClose}>
      <ModalKickerHeader
        kicker="Permanent action"
        destructive
        title="Delete vehicle"
        description="This removes the vehicle from the active fleet and unassigns its driver and conductor. Its shift history is kept."
      />

      {vehicle && (
        <DetailRows
          className="mt-4"
          rows={[
            { label: 'Unit', value: `${vehicle.unitNumber} · ${vehicle.plateNumber}` },
            { label: 'Route', value: vehicle.route },
            { label: 'Driver', value: vehicle.driver ?? 'Unassigned' },
            { label: 'Conductor', value: vehicle.conductor ?? 'Unassigned' },
          ]}
        />
      )}

      {error && <InlineError className="mt-3">{error}</InlineError>}

      <div className="mt-5 flex flex-col-reverse gap-2 min-[380px]:flex-row">
        <button type="button" onClick={handleClose} disabled={isDeleting} className={`flex-1 ${ADMIN_BUTTON.secondary}`}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirm} disabled={isDeleting} className={`flex-1 ${ADMIN_BUTTON.danger}`}>
          <Trash2 size={16} aria-hidden="true" />
          {isDeleting ? 'Deleting…' : 'Delete vehicle'}
        </button>
      </div>
    </Modal>
  );
}
