// components/admin/vehicles/add-personnel-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddPersonnelModal({ isOpen, onClose }: AddPersonnelModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Dispatcher',
    department: 'Operations',
    status: 'Available',
    contact: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New Personnel Data:', formData);
    alert('Personnel added! (Check console for data)');
    onClose();
    setFormData({ name: '', role: 'Dispatcher', department: 'Operations', status: 'Available', contact: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Add New Personnel</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
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
          <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role</label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Dispatcher" className="bg-gray-800">Dispatcher</option>
            <option value="Support Agent" className="bg-gray-800">Support Agent</option>
            <option value="Fleet Manager" className="bg-gray-800">Fleet Manager</option>
          </select>
        </div>
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-300">Department</label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Available" className="bg-gray-800">Available</option>
            <option value="On Duty" className="bg-gray-800">On Duty</option>
            <option value="In Meeting" className="bg-gray-800">In Meeting</option>
            <option value="Off Duty" className="bg-gray-800">Off Duty</option>
          </select>
        </div>
        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-300">Contact Number</label>
          <input
            type="tel"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Save Personnel
          </button>
        </div>
      </form>
    </Modal>
  );
}