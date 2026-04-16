// components/admin/vehicles/add-vehicle-modal.tsx
'use client';

import { useState } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  unassignedDrivers: { id: number; name: string; role: string }[];
  unassignedConductors: { id: number; name: string; role: string }[];
}

export function AddVehicleModal({ isOpen, onClose, onSave, unassignedDrivers, unassignedConductors }: AddVehicleModalProps) {
  const [formData, setFormData] = useState({
    plateNumber: '',
    route: '',
    driver: '',
    conductor: '',
    status: 'Operating',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ plateNumber: '', route: '', driver: '', conductor: '', status: 'Operating' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Add New Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-300 mb-1">Plate Number</label>
          <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="route" className="block text-sm font-medium text-gray-300 mb-1">Route</label>
          <input type="text" id="route" name="route" value={formData.route} onChange={handleChange} required
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        {/* Driver Dropdown */}
        <div>
          <label htmlFor="driver" className="block text-sm font-medium text-gray-300 mb-1">Assign Driver</label>
          <select id="driver" name="driver" value={formData.driver} onChange={handleChange}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]">
            <option value="" className="bg-gray-800">Select Unassigned Driver...</option>
            {unassignedDrivers.map(d => (
              <option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>
            ))}
          </select>
          {unassignedDrivers.length === 0 && <p className="text-xs text-yellow-400 mt-1">No available drivers</p>}
        </div>

        {/* Conductor Dropdown */}
        <div>
          <label htmlFor="conductor" className="block text-sm font-medium text-gray-300 mb-1">Assign Conductor</label>
          <select id="conductor" name="conductor" value={formData.conductor} onChange={handleChange}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]">
            <option value="" className="bg-gray-800">Select Unassigned Conductor...</option>
            {unassignedConductors.map(c => (
              <option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>
            ))}
          </select>
          {unassignedConductors.length === 0 && <p className="text-xs text-yellow-400 mt-1">No available conductors</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Save Vehicle</button>
        </div>
      </form>
    </Modal>
  );
}