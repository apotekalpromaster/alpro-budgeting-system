import React, { useState, useRef, useEffect, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData'; // Use Data Hook
import { PageTitleContext } from '../contexts/PageTitleContext';
import { updateUser } from '../services/api';
import { User } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

const Header: React.FC = () => {
    const { user, logout, updateUserSession } = useAuth();
    const { users, refreshData } = useData(); // Get users from cache
    const { title } = useContext(PageTitleContext);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // Settings State
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsError, setSettingsError] = useState('');
    const [currentUserFull, setCurrentUserFull] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        newPassword: '',
        confirmPassword: ''
    });

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOpenSettings = () => {
        setIsDropdownOpen(false);
        setIsSettingsModalOpen(true);
        setSettingsError('');
        setFormData({ email: '', newPassword: '', confirmPassword: '' });
        
        // INSTANT LOAD: Find user in the cached data
        if (users.length > 0 && user) {
            const found = users.find(u => u.id === user.id);
            if (found) {
                setCurrentUserFull(found);
                setFormData(prev => ({ ...prev, email: found.email }));
            } else {
                setSettingsError('User details not found in cache.');
            }
        } else {
            setSettingsError('Data not loaded. Please wait...');
        }
    };

    const handleSaveSettings = async () => {
        setSettingsError('');
        if (!currentUserFull) return;
        
        if (!formData.email) {
            setSettingsError('Email is required.');
            return;
        }

        if (formData.newPassword || formData.confirmPassword) {
            if (formData.newPassword !== formData.confirmPassword) {
                setSettingsError('New passwords do not match.');
                return;
            }
            if (formData.newPassword.length < 4) {
                 setSettingsError('Password is too short (min 4 chars).');
                 return;
            }
        }

        setSettingsLoading(true);
        try {
            const updatedUser: User = {
                ...currentUserFull,
                email: formData.email
            };

            // Only update password if a new one is provided
            if (formData.newPassword) {
                updatedUser.password = formData.newPassword;
            }

            // Save to backend
            await updateUser(updatedUser);

            // Update local session
            updateUserSession(updatedUser);
            
            // Refresh cached users
            refreshData('users');

            setIsSettingsModalOpen(false);
            alert('Settings updated successfully.');
        } catch (error) {
            console.error("Failed to save settings", error);
            setSettingsError('Failed to save changes. Please try again.');
        } finally {
            setSettingsLoading(false);
        }
    };

    return (
        <>
            <header className="bg-surface z-10 border-b border-border-color h-20">
                <div className="w-full h-full px-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
                    {user && (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-3 p-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary-dark shadow-soft"
                            >
                                <div className="text-left">
                                    <div className="font-bold text-white text-sm leading-tight">{user.name}</div>
                                    <div className="text-xs text-blue-200 uppercase tracking-wide">{user.role}</div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-blue-200 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg py-1 z-20 animate-scale-in origin-top-right">
                                    <button
                                        onClick={() => {
                                            setIsProfileModalOpen(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-gray-100 transition-colors flex items-center space-x-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                        <span>My Profile</span>
                                    </button>
                                    <button
                                        onClick={handleOpenSettings}
                                        className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-gray-100 transition-colors flex items-center space-x-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                                        <span>Settings</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            logout();
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-100 transition-colors font-semibold flex items-center space-x-2 border-t border-gray-100"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Profile Modal */}
            <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="My Profile">
                {user && (
                    <div className="space-y-4 text-text-primary p-2">
                        <div className="flex border-b border-border-color pb-2">
                            <div className="w-28 font-semibold text-text-secondary">Name</div>
                            <div className="font-medium">{user.name}</div>
                        </div>
                        <div className="flex border-b border-border-color pb-2">
                            <div className="w-28 font-semibold text-text-secondary">Email</div>
                            <div className="font-medium">{user.email}</div>
                        </div>
                        <div className="flex border-b border-border-color pb-2">
                            <div className="w-28 font-semibold text-text-secondary">Role</div>
                            <div className="font-medium">{user.role}</div>
                        </div>
                        <div className="flex border-b border-border-color pb-2">
                            <div className="w-28 font-semibold text-text-secondary">Job Title</div>
                            <div className="font-medium">{user.jobTitle || '-'}</div>
                        </div>
                        <div className="flex pb-2">
                            <div className="w-28 font-semibold text-text-secondary">Department</div>
                            <div className="font-medium">{user.department}</div>
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Settings Modal */}
            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Account Settings">
                <div className="p-2">
                    {settingsLoading ? (
                        <div className="text-center py-8">
                            <svg className="animate-spin h-8 w-8 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-2 text-sm text-gray-500">Processing changes...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {settingsError && <div className="p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded">{settingsError}</div>}
                            
                            <div>
                                <label className="block text-sm font-semibold text-text-secondary mb-1">Email for Notifications</label>
                                <input 
                                    type="email" 
                                    className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            
                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-bold text-text-primary mb-3">Change Password (Optional)</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                                            value={formData.newPassword}
                                            onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                            placeholder="Leave blank to keep current password"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-text-secondary mb-1">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <Button variant="ghost" onClick={() => setIsSettingsModalOpen(false)}>Cancel</Button>
                                <Button variant="primary" onClick={handleSaveSettings}>Save Changes</Button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default Header;