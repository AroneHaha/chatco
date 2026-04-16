// app/(admin)/users/page.tsx
'use client';

import { useState } from 'react';
import { UsersTable } from '@/components/admin/users/users-table';
import { AddUserModal } from '@/components/admin/users/add-user-modal';
import { EditUserModal } from '@/components/admin/users/edit-user-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus } from 'lucide-react';

// Mock data is now ONLY for Commuters
const initialUsers = [
  { id: 1, name: 'Juan Dela Cruz', email: 'juan.d@email.com', status: 'Active', languagePreference: 'English' },
  { id: 4, name: 'Carlos Cruz', email: 'carlos.c@email.com', status: 'Active', languagePreference: 'Filipino' },
  { id: 5, name: 'Ana Lopez', email: 'ana.l@email.com', status: 'Active', languagePreference: 'English' },
];

export default function UsersPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<any>(null);

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);

  const handleOpenEditModal = (user: any) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditingUser(null);
    setIsEditModalOpen(false);
  };

  const handleSaveUser = (userData: any) => {
    if (editingUser) {
      // Edit existing user
      setUsers(prevUsers => prevUsers.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
    } else {
      // Add new user
      const newUser = { id: users.length + 1, ...userData, role: 'Commuter' }; // Role is hardcoded
      setUsers(prevUsers => [...prevUsers, newUser]);
    }
    handleCloseAddModal();
    handleCloseEditModal();
  };

  const handleDeactivateUser = (userId: number) => {
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">Commuter Management</h1>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
        >
          <Plus size={20} />
          <span>Add Commuter</span>
        </button>
      </div>

      <UsersTable
        users={users}
        searchQuery={searchQuery}
        onEdit={handleOpenEditModal}
        onDeactivate={handleDeactivateUser}
      />

      <AddUserModal isOpen={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleSaveUser} />
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveUser}
        editingUser={editingUser}
      />
    </>
  );
}