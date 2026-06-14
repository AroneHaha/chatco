// components/admin/users/edit-user-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';
import type { ActiveUser } from '@/app/(admin)/users/data/users-data';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: Partial<ActiveUser>) => void;
  editingUser: ActiveUser | null;
}

export function EditUserModal({ isOpen, onClose, onSave, editingUser }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'Active' as ActiveUser['status'],
    languagePreference: 'English' as ActiveUser['languagePreference'],
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || '',
        email: editingUser.email || '',
        password: '',
        status: editingUser.status || 'Active',
        languagePreference: editingUser.languagePreference || 'English',
      });
    } else {
      setFormData({ name: '', email: '', password: '', status: 'Active', languagePreference: 'English' });
    }
  }, [editingUser, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'email') return; // Don't allow changing email
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave: Partial<ActiveUser> = {
      ...formData,
      ...(formData.password && { password: formData.password }),
      commuterType: editingUser?.commuterType,
      phoneNumber: editingUser?.phoneNumber,
      idImageUrl: editingUser?.idImageUrl,
    };
    onSave(dataToSave);
    onClose();
  };

  const inputClasses = "mt-1 block w-full px-3 py-2 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Edit Commuter</h2>
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
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="edit-email" className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            id="edit-email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled
            className={`${inputClasses} disabled:opacity-50`}
          />
        </div>
        <div>
          <label htmlFor="edit-password" className="block text-xs font-medium text-slate-300 mb-1.5">New Password (leave blank to keep current)</label>
          <input
            type="password"
            id="edit-password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="edit-status" className="block text-xs font-medium text-slate-300 mb-1.5">Status</label>
          <select
            id="edit-status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}
          >
            <option value="Active" className="bg-gray-800">Active</option>
            <option value="Inactive" className="bg-gray-800">Inactive</option>
          </select>
        </div>
        <div>
          <label htmlFor="edit-languagePreference" className="block text-xs font-medium text-slate-300 mb-1.5">Language Preference</label>
          <select
            id="edit-languagePreference"
            name="languagePreference"
            value={formData.languagePreference}
            onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}
          >
            <option value="English" className="bg-gray-800">English</option>
            <option value="Filipino" className="bg-gray-800">Filipino</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors">Cancel</button>
          <button type="submit" className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}