// app/(admin)/users/page.tsx
'use client';

import { useState } from 'react';
import { UsersTable } from '@/components/admin/users/users-table';
import { AddUserModal } from '@/components/admin/users/add-user-modal';
import { SearchBar } from '@/components/admin/ui/search-bar';
import { Plus, Filter } from 'lucide-react';

// Mock data for users
const initialUsers = [
  { id: 1, name: 'Juan Dela Cruz', email: 'juan.d@email.com', role: 'Commuter', status: 'Active', languagePreference: 'English' },
  { id: 2, name: 'Pedro Santos', email: 'pedro.s@email.com', role: 'Conductor', status: 'Active', languagePreference: 'Filipino' },
  { id: 3, name: 'Maria Reyes', email: 'maria.r@email.com', role: 'Driver', status: 'Inactive', languagePreference: 'English' },
  { id: 4, name: 'Carlos Cruz', email: 'carlos.c@email.com', role: 'Commuter', status: 'Active', languagePreference: 'Filipino' },
  { id: 5, name: 'Ana Lopez', email: 'ana.l@email.com', role: 'Driver', status: 'Active', languagePreference: 'English' },
];

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(initialUsers);
  const [editingUser, setEditingUser] = useState<typeof initialUsers[0] | null>(null);

  const handleOpenModal = (user?: typeof initialUsers[0]) => {
    setEditingUser(user || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveUser = (userData: any) => {
    if (editingUser) {
      setUsers(prevUsers => prevUsers.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
    } else {
      const newUser = { id: users.length + 1, ...userData };
      setUsers(prevUsers => [...prevUsers, newUser]);
    }
    handleCloseModal();
  };
  
  const handleDeactivateUser = (userId: number) => {
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u));
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <SearchBar
            placeholder="Search users..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="flex-1"
          />
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <Plus size={20} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <UsersTable 
        users={users} 
        searchQuery={searchQuery} 
        onEdit={handleOpenModal} 
        onDeactivate={handleDeactivateUser} 
      />

      <AddUserModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSave={handleSaveUser}
        editingUser={editingUser}
      />
    </>
  );
}