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

  const inputClasses = "block w-full px-4 py-2.5 bg-[#0E1628] border border-[#1E2D45] rounded-md text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#62A0EA] transition-colors";

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-5">Add New Vehicle</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="plateNumber" className="block text-xs font-medium text-slate-300 mb-1.5">Plate Number</label>
          <input type="text" id="plateNumber" name="plateNumber" value={formData.plateNumber} onChange={handleChange} required
            className={inputClasses} />
        </div>
        <div>
          <label htmlFor="route" className="block text-xs font-medium text-slate-300 mb-1.5">Route</label>
          <input type="text" id="route" name="route" value={formData.route} onChange={handleChange} required
            className={inputClasses} />
        </div>
        
        {/* Driver Dropdown */}
        <div>
          <label htmlFor="driver" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Driver</label>
          <select id="driver" name="driver" value={formData.driver} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800">Select Unassigned Driver...</option>
            {unassignedDrivers.map(d => (
              <option key={d.id} value={d.name} className="bg-gray-800">{d.name}</option>
            ))}
          </select>
          {unassignedDrivers.length === 0 && <p className="text-xs text-amber-400 mt-1">No available drivers</p>}
        </div>

        {/* Conductor Dropdown */}
        <div>
          <label htmlFor="conductor" className="block text-xs font-medium text-slate-300 mb-1.5">Assign Conductor</label>
          <select id="conductor" name="conductor" value={formData.conductor} onChange={handleChange}
            className={`${inputClasses} [color-scheme:dark]`}>
            <option value="" className="bg-gray-800">Select Unassigned Conductor...</option>
            {unassignedConductors.map(c => (
              <option key={c.id} value={c.name} className="bg-gray-800">{c.name}</option>
            ))}
          </select>
          {unassignedConductors.length === 0 && <p className="text-xs text-amber-400 mt-1">No available conductors</p>}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-5 py-2.5 border border-[#1E2D45] rounded-md text-slate-300 hover:bg-[#131C2E] transition-colors">Cancel</button>
          <button type="submit" className="px-5 py-2.5 bg-[#62A0EA] text-white font-medium rounded-md hover:bg-[#4A8BD4] transition-colors">Save Vehicle</button>
        </div>
      </form>
    </Modal>
  );
}