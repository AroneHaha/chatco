// components/admin/users/edit-user-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => void;
  editingUser: any;
}

export function EditUserModal({ isOpen, onClose, onSave, editingUser }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    status: 'Active',
    languagePreference: 'English',
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
    const dataToSave = {
      ...formData,
      ...(formData.password && { password: formData.password }),
      role: 'Commuter', // Hardcode role on save
    };
    onSave(dataToSave);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Edit Commuter</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">New Password (leave blank to keep current)</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* REMOVED: Role selection dropdown */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Active" className="bg-gray-800">Active</option>
            <option value="Inactive" className="bg-gray-800">Inactive</option>
          </select>
        </div>
        <div>
          <label htmlFor="languagePreference" className="block text-sm font-medium text-gray-300">Language Preference</label>
          <select
            id="languagePreference"
            name="languagePreference"
            value={formData.languagePreference}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="English" className="bg-gray-800">English</option>
            <option value="Filipino" className="bg-gray-800">Filipino</option>
          </select>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Changes</button>
        </div>
      </form>
    </Modal>
  );
}