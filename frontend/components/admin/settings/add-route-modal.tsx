// components/admin/settings/add-route-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddRouteModal({ isOpen, onClose }: AddRouteModalProps) {
  const [formData, setFormData] = useState({ name: '', waypoints: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('New Route Data:', formData);
    alert('Route added! (Check console for data)');
    onClose();
    setFormData({ name: '', waypoints: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Add New Route</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Route Name</label>
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
          <label htmlFor="waypoints" className="block text-sm font-medium text-gray-300">Waypoints (comma-separated)</label>
          <textarea
            id="waypoints"
            name="waypoints"
            rows={3}
            value={formData.waypoints}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">Save Route</button>
        </div>
      </form>
    </Modal>
  );
}