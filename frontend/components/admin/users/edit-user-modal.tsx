'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import { AdminDatePicker } from '@/components/admin/ui/admin-date-picker';
import type { ActiveUser } from '@/app/(admin)/users/data/users-data';
import type { UpdateUserInput } from '@/lib/admin/services/user.service';
import {
  CONTACT_NUMBER_PATTERN as CONTACT_PATTERN,
  CONTACT_NUMBER_ERROR as CONTACT_ERROR,
  formatContactNumberInput as formatContactNumber,
} from '@/lib/utils/format';

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
 *   - COMMUTER: first/middle(optional)/last name + email (ro) + contact
 *     (09XXXXXXXXX format) + date of birth. No status control here — status
 *     is toggled from the Suspend/Reactivate button on the Details modal.
 *   - CONDUCTOR: name + email (ro) (no contact, no DOB — conductor profile
 *     details are edited from the Fleet → Personnel tab)
 *   - ADMIN: name + email (ro) (no status, no contact — admins have no
 *     commuter_profile, so account_status/contact_number don't apply)
 *   - DRIVER: this modal is NOT used for drivers. The Users page delegates
 *     driver edits to the EditPersonnelModal (drivers live in the drivers
 *     table, not users). If a DRIVER row somehow reaches this modal, we
 *     show a clear message instead of 404'ing on PUT /admin/users/{driverId}.
 *
 * Name handling: CONDUCTOR/ADMIN send a single `name` field split into
 * firstName + lastName on the FIRST space (middle name not editable there —
 * use the Fleet → Personnel edit modal for full name control). COMMUTER
 * sends separate firstName/middleName/lastName fields directly.
 *
 * Email is display-only (disabled) — the login email is immutable via the
 * admin endpoint. Password and language_preference are NOT admin-editable.
 */
export function EditUserModal({ isOpen, onClose, onSave, editingUser }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    contactNumber: '',
    dateOfBirth: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = editingUser?.role;
  const isDriver = role === 'DRIVER';
  const isAdmin = role === 'ADMIN';
  const isConductor = role === 'CONDUCTOR';
  const isCommuter = role === 'COMMUTER';

  // Role-aware modal title.
  const modalTitle = isAdmin ? 'Edit Admin'
    : isConductor ? 'Edit Conductor'
    : isDriver ? 'Edit Driver'
    : 'Edit Commuter';

  useEffect(() => {
    if (editingUser) {
      const raw = editingUser._raw;
      // Fallback if _raw is missing the split name (e.g. a stale list
      // fetched before this field existed) — derive first/last from the
      // display name on the first space, same as the admin/conductor path,
      // so the form is never blank when a name is clearly available.
      const trimmedName = (editingUser.name || '').trim();
      const spaceIdx = trimmedName.indexOf(' ');
      const fallbackFirst = spaceIdx > 0 ? trimmedName.substring(0, spaceIdx) : trimmedName;
      const fallbackLast = spaceIdx > 0 ? trimmedName.substring(spaceIdx + 1) : '';

      setFormData({
        name: editingUser.name || '',
        firstName: raw?.firstName || fallbackFirst,
        middleName: raw?.middleName || '',
        lastName: raw?.lastName || fallbackLast,
        email: editingUser.email || '',
        contactNumber: editingUser.phoneNumber !== '—' ? editingUser.phoneNumber : '',
        dateOfBirth: raw?.dateOfBirth || '',
      });
    }
    setError(null);
  }, [editingUser, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email') return; // email is read-only
    setFormData(prev => ({
      ...prev,
      [name]: name === 'contactNumber' ? formatContactNumber(value) : value,
    }));
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

    if (isCommuter) {
      if (!CONTACT_PATTERN.test(formData.contactNumber)) {
        setError(CONTACT_ERROR);
        return;
      }
      if (!formData.dateOfBirth) {
        setError('Date of birth is required.');
        return;
      }
    }

    setIsSaving(true);
    setError(null);

    let payload: UpdateUserInput;

    if (isCommuter) {
      payload = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || null,
        lastName: formData.lastName.trim(),
        contactNumber: formData.contactNumber,
        dateOfBirth: formData.dateOfBirth,
      };
    } else {
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

      payload = {
        firstName,
        lastName: lastName || undefined,
      };
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
        {isCommuter ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-firstName" className="block text-xs font-medium text-slate-300 mb-1.5">First Name</label>
                <input
                  type="text"
                  id="edit-firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isSaving}
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor="edit-lastName" className="block text-xs font-medium text-slate-300 mb-1.5">Last Name</label>
                <input
                  type="text"
                  id="edit-lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isSaving}
                  className={inputClasses}
                />
              </div>
            </div>
            <div>
              <label htmlFor="edit-middleName" className="block text-xs font-medium text-slate-300 mb-1.5">Middle Name</label>
              <input
                type="text"
                id="edit-middleName"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                disabled={isSaving}
                placeholder="Optional"
                className={inputClasses}
              />
            </div>
          </>
        ) : (
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
        )}

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

        {/* Contact Number + Date of Birth — commuter-only */}
        {isCommuter && (
          <>
            <div>
              <label htmlFor="edit-contactNumber" className="block text-xs font-medium text-slate-300 mb-1.5">Contact Number</label>
              <input
                type="tel"
                id="edit-contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
                disabled={isSaving}
                placeholder="09171234567"
                maxLength={11}
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Date of Birth</label>
              <AdminDatePicker
                value={formData.dateOfBirth}
                onChange={(value) => setFormData(prev => ({ ...prev, dateOfBirth: value }))}
                ariaLabel="Date of Birth"
                className="w-full"
                triggerClassName="w-full py-2.5"
              />
            </div>
          </>
        )}

        {/* Conductor/Admin info note — explains why contact/DOB are absent */}
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
