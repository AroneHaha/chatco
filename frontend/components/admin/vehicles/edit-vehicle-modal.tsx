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

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Edit Vehicle: {editingVehicle.plateNumber}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label htmlFor="edit-plateNumber" className="block text-xs font-medium text-slate-300 mb-1.5">Plate Number</label>
          <input type="text" id="edit-plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required
            className={inputClasses} />
        </div>

        <div>
          <label htmlFor="edit-route" className="block text-xs font-medium text-slate-300 mb-1.5">Route</label>
          <input type="text" id="edit-route" name="route" value={formData.route} onChange={handleChange} required
            className={inputClasses} />
        </div>

        {/* Status Dropdown */}
        <div>
          <label htmlFor="edit-status" className="block text-xs font-medium text-slate-300 mb-1.5">Vehicle Status</label>
          <select id="edit-status" name="status" value={formData.status} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="Operating" className="bg-gray-800">Operating</option>
            <option value="Under Maintenance" className="bg-gray-800">Under Maintenance</option>
            <option value="Out of Service / Damaged" className="bg-gray-800">Out of Service / Damaged</option>
          </select>
        </div>

        {/* Driver Dropdown (Includes current) */}
        <div>
          <label htmlFor="edit-driver" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Driver</label>
          <select id="edit-driver" name="driver" value={formData.driver} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800">-- Unassign Driver --</option>
            {availableDrivers.map(d => (
              <option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>
            ))}
          </select>
        </div>

        {/* Conductor Dropdown (Includes current) */}
        <div>
          <label htmlFor="edit-conductor" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Conductor</label>
          <select id="edit-conductor" name="conductor" value={formData.conductor} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800">-- Unassign Conductor --</option>
            {availableConductors.map(c => (
              <option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors">Cancel</button>
          <button type="submit" className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors">Update Vehicle</button>
        </div>
      </form>
    </Modal>
  );
}