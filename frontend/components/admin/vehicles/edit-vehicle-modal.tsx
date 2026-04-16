// components/admin/vehicles/edit-vehicle-modal.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/admin/ui/modal';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingVehicle: any;
  allPersonnel: { id: number; name: string; role: string }[];
}

export function EditVehicleModal({ isOpen, onClose, onSave, editingVehicle, allPersonnel }: EditVehicleModalProps) {
  const [formData, setFormData] = useState({
    plateNumber: '',
    route: '',
    driver: '',
    conductor: '',
    status: 'Operating',
  });

  // When modal opens or vehicle changes, populate form
  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        plateNumber: editingVehicle.plateNumber || '',
        route: editingVehicle.route || '',
        driver: editingVehicle.driver || '',
        conductor: editingVehicle.conductor || '',
        status: editingVehicle.status || 'Operating',
      });
    }
  }, [editingVehicle]);

  // Calculate available options: Unassigned + Currently assigned to THIS vehicle
  const assignedToOtherVehicles = useMemo(() => {
    if (!editingVehicle) return { drivers: new Set(), conductors: new Set() };
    // In pure UI, we can't easily know who is assigned to what without passing the whole list.
    // To keep it safe and simple: Show ALL personnel, but indicate who is assigned elsewhere if needed, 
    // OR just show everyone for editing flexibility (admin overrides).
    return { drivers: new Set<string>(), conductors: new Set<string>() };
  }, [editingVehicle]);

  const availableDrivers = allPersonnel.filter(p => p.role === 'Driver');
  const availableConductors = allPersonnel.filter(p => p.role === 'Conductor');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert empty strings back to null for unassigned state
    const payload = {
      ...formData,
      driver: formData.driver || null,
      conductor: formData.conductor || null,
    };
    onSave(payload);
  };

  if (!editingVehicle) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-white mb-4">Edit Vehicle: {editingVehicle.plateNumber}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label htmlFor="edit-plateNumber" className="block text-sm font-medium text-gray-300 mb-1">Plate Number</label>
          <input type="text" id="edit-plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>

        <div>
          <label htmlFor="edit-route" className="block text-sm font-medium text-gray-300 mb-1">Route</label>
          <input type="text" id="edit-route" name="route" value={formData.route} onChange={handleChange} required
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>

        {/* Status Dropdown */}
        <div>
          <label htmlFor="edit-status" className="block text-sm font-medium text-gray-300 mb-1">Vehicle Status</label>
          <select id="edit-status" name="status" value={formData.status} onChange={handleChange}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]">
            <option value="Operating" className="bg-gray-800">Operating</option>
            <option value="Under Maintenance" className="bg-gray-800">Under Maintenance</option>
            <option value="Out of Service / Damaged" className="bg-gray-800">Out of Service / Damaged</option>
          </select>
        </div>

        {/* Driver Dropdown (Includes current) */}
        <div>
          <label htmlFor="edit-driver" className="block text-sm font-medium text-gray-300 mb-1">Assign Driver</label>
          <select id="edit-driver" name="driver" value={formData.driver} onChange={handleChange}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]">
            <option value="" className="bg-gray-800">-- Unassign Driver --</option>
            {availableDrivers.map(d => (
              <option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>
            ))}
          </select>
        </div>

        {/* Conductor Dropdown (Includes current) */}
        <div>
          <label htmlFor="edit-conductor" className="block text-sm font-medium text-gray-300 mb-1">Assign Conductor</label>
          <select id="edit-conductor" name="conductor" value={formData.conductor} onChange={handleChange}
            className="block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark]">
            <option value="" className="bg-gray-800">-- Unassign Conductor --</option>
            {availableConductors.map(c => (
              <option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-500 rounded-md text-gray-300 hover:bg-gray-700 transition-colors">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Update Vehicle</button>
        </div>
      </form>
    </Modal>
  );
}