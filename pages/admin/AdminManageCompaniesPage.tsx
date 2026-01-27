import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLoading } from '../../hooks/useLoading';
import { getCompanyProfiles, addCompanyProfile, updateCompanyProfile, deleteCompanyProfile } from '../../services/api';
import { CompanyProfile } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const AdminManageCompaniesPage: React.FC = () => {
    usePageTitle('Manage Company Profiles');
    const { setIsLoading } = useLoading();
    const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Partial<CompanyProfile>>({});
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

    const fetchProfiles = async () => {
        setIsLoading(true);
        try {
            const data = await getCompanyProfiles();
            setProfiles(data);
        } catch (error) {
            console.error("Failed to fetch company profiles", error);
            alert("Could not fetch company profiles. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => 
            p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.profileId.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [profiles, searchTerm]);

    const openModal = (profile: CompanyProfile | null = null) => {
        if (profile) {
            setEditingProfile({ ...profile });
            setIsEditMode(true);
        } else {
            setEditingProfile({ profileId: '', companyName: '', companyAddress: '', npwp: '' });
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProfile({});
        setIsEditMode(false);
    };

    const handleSave = async () => {
        if (!editingProfile || !editingProfile.profileId || !editingProfile.companyName || !editingProfile.companyAddress || !editingProfile.npwp) {
            alert("All fields are required.");
            return;
        }

        setIsLoading(true);
        closeModal();
        try {
            if (isEditMode) {
                await updateCompanyProfile(editingProfile as CompanyProfile);
            } else {
                await addCompanyProfile(editingProfile as CompanyProfile);
            }
            await fetchProfiles();
        } catch (error) {
            console.error("Failed to save company profile", error);
            alert(`Could not save profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const promptDelete = (profileId: string) => {
        setProfileToDelete(profileId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!profileToDelete) return;

        setIsLoading(true);
        try {
            await deleteCompanyProfile(profileToDelete);
            setProfiles(prev => prev.filter(p => p.profileId !== profileToDelete));
            setIsDeleteModalOpen(false);
            setProfileToDelete(null);
        } catch (error) {
            console.error("Failed to delete company profile", error);
            alert("Could not delete profile. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingProfile) return;
        const { name, value } = e.target;
        setEditingProfile({ ...editingProfile, [name]: value });
    };

    return (
        <Card title="Company Profile Management">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-auto flex-grow max-w-md">
                     <input
                        type="text"
                        placeholder="Search by ID or Name..."
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => openModal()} className="w-full sm:w-auto">Add New Company</Button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Profile ID</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Company Name</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Address</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">NPWP</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredProfiles.map(p => (
                            <tr key={p.profileId} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6 text-sm font-mono text-gray-500">{p.profileId}</td>
                                <td className="py-4 px-6 text-sm font-medium text-text-primary">{p.companyName}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{p.companyAddress}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{p.npwp}</td>
                                <td className="py-4 px-6 space-x-2 whitespace-nowrap">
                                    <Button variant="ghost" onClick={() => openModal(p)}>Edit</Button>
                                    <Button variant="danger" onClick={() => promptDelete(p.profileId)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                         {filteredProfiles.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-text-secondary">
                                    No company profiles found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit/Add Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'Edit Company Profile' : 'Add Company Profile'}>
                {editingProfile && (
                    <div className="space-y-4">
                        <input 
                            name="profileId" 
                            value={editingProfile.profileId || ''} 
                            onChange={handleChange} 
                            placeholder="Profile ID" 
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isEditMode}
                        />
                        <input name="companyName" value={editingProfile.companyName || ''} onChange={handleChange} placeholder="Company Name" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
                        <input name="companyAddress" value={editingProfile.companyAddress || ''} onChange={handleChange} placeholder="Company Address" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
                        <input name="npwp" value={editingProfile.npwp || ''} onChange={handleChange} placeholder="NPWP Number" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
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
                        Are you sure you want to delete this company profile? <br/> This action cannot be undone.
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

export default AdminManageCompaniesPage;