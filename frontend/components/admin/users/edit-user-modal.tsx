'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import type { ActiveUser } from '@/app/(admin)/users/data/users-data';
import type { UpdateUserInput } from '@/lib/admin/services/user.service';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UpdateUserInput) => Promise<void>;
  editingUser: ActiveUser | null;
}

/**
 * Edit modal for admin user management (S5-T10).
 *
 * Role-aware: the title + editable fields adapt to the row's role.
 *
 *   - COMMUTER: name + email (ro) + contact + status (Active/Suspended)
 *   - CONDUCTOR: name + email (ro) + status (no contact — conductors have no
 *     contact_number field in the schema)
 *   - ADMIN: name + email (ro) (no status, no contact — admins have no
 *     commuter_profile, so account_status/contact_number don't apply)
 *   - DRIVER: this modal is NOT used for drivers. The Users page delegates
 *     driver edits to the EditPersonnelModal (drivers live in the drivers
 *     table, not users). If a DRIVER row somehow reaches this modal, we
 *     show a clear message instead of 404'ing on PUT /admin/users/{driverId}.
 *
 * Name handling: the backend AdminService::present() returns a single `name`
 * field (full display name). We send it as firstName + lastName by splitting
 * on the FIRST space. Middle name is NOT editable here (the backend
 * UpdateUserRequest doesn't reliably round-trip it for all profile types).
 * For full name control, admins should use the Fleet → Personnel edit modal.
 *
 * Email is display-only (disabled) — the login email is immutable via the
 * admin endpoint. Password and language_preference are NOT admin-editable.
 */
export function EditUserModal({ isOpen, onClose, onSave, editingUser }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    status: 'Active' as 'Active' | 'Suspended',
    contactNumber: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = editingUser?.role;
  const isDriver = role === 'DRIVER';
  const isAdmin = role === 'ADMIN';
  const isConductor = role === 'CONDUCTOR';

  // Role-aware modal title.
  const modalTitle = isAdmin ? 'Edit Admin'
    : isConductor ? 'Edit Conductor'
    : isDriver ? 'Edit Driver'
    : 'Edit Commuter';

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        status: editingUser.status === 'Suspended' ? 'Suspended' : 'Active',
        contactNumber: editingUser.phoneNumber !== '—' ? editingUser.phoneNumber : '',
      });
    }
    setError(null);
  }, [editingUser, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') return; // email is read-only
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Drivers shouldn't reach this modal — but if they do, bail with a clear
    // message instead of 404'ing on PUT /admin/users/{driverId} (drivers
    // live in the drivers table, not the users table).
    if (isDriver) {
      setError('Drivers are edited from the Fleet → Personnel tab. Close this modal and use the pencil icon there.');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Split the full name into first_name + last_name on the first space.
    // "Jose Mendoza" → first="Jose", last="Mendoza"
    // "Mark Arone Dela Cruz" → first="Mark", last="Arone Dela Cruz"
    // NOTE: middle name is not editable here. For full name control, use
    // the Fleet → Personnel edit modal (which has separate first/middle/last
    // fields + license_number + contact for drivers).
    const trimmed = formData.name.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const firstName = spaceIdx > 0 ? trimmed.substring(0, spaceIdx) : trimmed;
    const lastName = spaceIdx > 0 ? trimmed.substring(spaceIdx + 1) : '';

    const payload: UpdateUserInput = {
      firstName,
      lastName: lastName || undefined,
    };

    // Status + contact are commuter-only fields (admins/conductors don't
    // have a commuter_profile, so account_status + contact_number don't
    // apply — the backend rejects them with a 422 if sent).
    if (!isAdmin && !isConductor) {
      payload.accountStatus = formData.status === 'Suspended' ? 'SUSPENDED' : 'ACTIVE';
      payload.contactNumber = formData.contactNumber || undefined;
    }

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      // UserOperationError carries field-level errors; surface the first one.
      const msg = err instanceof Error ? err.message : 'Failed to update user.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">{modalTitle}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-name" className="block text-xs font-medium text-slate-300 mb-1.5">Name</label>
          <input
            type="text"
            id="edit-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isSaving || isDriver}
            className={`${inputClasses} ${isDriver ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="edit-email" className="block text-xs font-medium text-slate-300 mb-1.5">Email (not editable)</label>
          <input
            type="email"
            id="edit-email"
            name="email"
            value={formData.email}
            disabled
            className={`${inputClasses} disabled:opacity-50`}
          />
        </div>

        {/* Contact Number — commuter-only (admins/conductors have no contact field) */}
        {!isAdmin && !isConductor && (
          <div>
            <label htmlFor="edit-contactNumber" className="block text-xs font-medium text-slate-300 mb-1.5">Contact Number</label>
            <input
              type="text"
              id="edit-contactNumber"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              disabled={isSaving}
              placeholder="0917-123-4567"
              className={inputClasses}
            />
          </div>
        )}

        {/* Status — commuter-only (admins/conductors have no account_status) */}
        {!isAdmin && !isConductor && (
          <div>
            <label htmlFor="edit-status" className="block text-xs font-medium text-slate-300 mb-1.5">Status</label>
            <select
              id="edit-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isSaving}
              className={`${inputClasses} [color-scheme:dark]`}
            >
              <option value="Active" className="bg-gray-800">Active</option>
              <option value="Suspended" className="bg-gray-800">Suspended</option>
            </select>
          </div>
        )}

        {/* Conductor/Admin info note — explains why status + contact are absent */}
        {(isAdmin || isConductor) && !isDriver && (
          <div className="p-3 bg-[#62A0EA]/5 border border-[#62A0EA]/20 rounded-md">
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Admin accounts don\'t have a status or contact number. Only the name is editable here.'
                : 'Conductor profile details (birthday, profile picture) are edited from the Fleet → Personnel tab. Only the name is editable here.'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={isSaving || isDriver} className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
