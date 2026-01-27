import React, { useState, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLoading } from '../../hooks/useLoading';
import { useData } from '../../hooks/useData';
import { addUser, updateUser, deleteUser } from '../../services/api';
import { User, Role } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const AdminManageAccountsPage: React.FC = () => {
    usePageTitle('Manage Accounts');
    const { setIsLoading } = useLoading();
    const { users, refreshData } = useData(); // Use cached users
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const filteredUsers = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return users.filter(u => 
            u.name.toLowerCase().includes(lowerTerm) ||
            u.email.toLowerCase().includes(lowerTerm) ||
            u.role.toLowerCase().includes(lowerTerm) ||
            u.department.toLowerCase().includes(lowerTerm) ||
            (u.jobTitle && u.jobTitle.toLowerCase().includes(lowerTerm))
        );
    }, [users, searchTerm]);

    const openModal = (user: User | null = null) => {
        if (user) {
            setEditingUser({ ...user });
            setIsEditMode(true);
        } else {
            // Initialize jobTitle as empty string
            setEditingUser({ id: '', name: '', email: '', role: 'USER', department: '', password: '', managerId: '', bodId: '', jobTitle: '' });
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser({});
        setIsEditMode(false);
    };

    const handleSave = async () => {
        if (!editingUser) return;
        
        if (!editingUser.id || !editingUser.name || !editingUser.email || !editingUser.role) {
            alert("ID, Name, email, and role are required.");
            return;
        }
        
        setIsLoading(true);
        closeModal();
        try {
            if (isEditMode) {
                await updateUser(editingUser as User);
            } else {
                await addUser(editingUser as User);
            }
            await refreshData('users'); // Refresh cache
        } catch(error) {
             console.error("Failed to save user", error);
             alert("Failed to save user. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const promptDelete = (userId: string) => {
        setUserToDelete(userId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setIsLoading(true);
        try {
            await deleteUser(userToDelete);
            await refreshData('users'); // Refresh cache
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } catch(error) {
            console.error("Failed to delete user", error);
            alert("Failed to delete user. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingUser) return;
        const { name, value } = e.target;
        setEditingUser({ ...editingUser, [name]: value });
    };
    
    return (
        <Card title="User Account Management">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-auto flex-grow max-w-md">
                     <input
                        type="text"
                        placeholder="Search Name, Email, Role, Dept, Job Title..."
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => openModal()} className="w-full sm:w-auto">Add New User</Button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Name</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Email</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Role</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Job Title</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Department</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6 text-sm font-medium text-text-primary">{u.name}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{u.email}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{u.role}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary italic">{u.jobTitle || '-'}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{u.department}</td>
                                <td className="py-4 px-6 space-x-2">
                                    <Button variant="ghost" onClick={() => openModal(u)}>Edit</Button>
                                    <Button variant="danger" onClick={() => promptDelete(u.id)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                         {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-text-secondary">
                                    No users found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit/Add Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'Edit User' : 'Add User'}>
                {editingUser && (
                    <div className="space-y-4">
                        <input 
                            name="id" 
                            value={editingUser.id || ''} 
                            onChange={handleChange} 
                            placeholder="User ID (e.g., manager-marketing)" 
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isEditMode}
                        />
                        <input name="name" value={editingUser.name || ''} onChange={handleChange} placeholder="Full Name" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
                        <input name="email" type="email" value={editingUser.email || ''} onChange={handleChange} placeholder="Email Address" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
                        <input name="password" type="password" value={editingUser.password || ''} onChange={handleChange} placeholder="Password (leave blank if unchanged)" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
                        
                        {/* New Job Title Field */}
                        <input 
                            name="jobTitle" 
                            value={editingUser.jobTitle || ''} 
                            onChange={handleChange} 
                            placeholder="Job Title (e.g., Operational Director)" 
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" 
                        />
                        
                        <select name="role" value={editingUser.role || 'USER'} onChange={handleChange} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary">
                            {(['USER', 'MANAGER', 'BOD', 'ADMIN'] as Role[]).map(r => <option key={r} value={r} className="text-black bg-white">{r}</option>)}
                        </select>
                        <input name="department" value={editingUser.department || ''} onChange={handleChange} placeholder="Department" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />

                        {editingUser.role === 'USER' && (
                          <>
                            <input 
                                type="text"
                                name="managerId" 
                                value={editingUser.managerId || ''} 
                                onChange={handleChange} 
                                placeholder="Enter Manager ID" 
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" 
                            />
                             <input 
                                type="text"
                                name="bodId" 
                                value={editingUser.bodId || ''} 
                                onChange={handleChange} 
                                placeholder="Enter BOD ID" 
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" 
                            />
                          </>
                        )}

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <div>
                    <p className="mb-6 text-text-primary text-center">
                        Are you sure you want to delete this user? <br/> This action cannot be undone.
                    </p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete}>Yes, Delete</Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

export default AdminManageAccountsPage;