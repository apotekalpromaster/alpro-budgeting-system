import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLoading } from '../../hooks/useLoading';
import { getDeliveryAddresses, addDeliveryAddress, updateDeliveryAddress, deleteDeliveryAddress } from '../../services/api';
import { DeliveryAddress } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const AdminManageAddressesPage: React.FC = () => {
    usePageTitle('Manage Delivery Addresses');
    const { setIsLoading } = useLoading();
    const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Partial<DeliveryAddress>>({});
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

    const fetchAddresses = async () => {
        setIsLoading(true);
        try {
            const data = await getDeliveryAddresses();
            setAddresses(data);
        } catch (error) {
            console.error("Failed to fetch delivery addresses", error);
            alert("Could not fetch delivery addresses. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    const filteredAddresses = useMemo(() => {
        return addresses.filter(a => 
            a.addressId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.addressLabel.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [addresses, searchTerm]);

    const openModal = (address: DeliveryAddress | null = null) => {
        if (address) {
            setEditingAddress({ ...address });
            setIsEditMode(true);
        } else {
            setEditingAddress({ addressId: '', addressLabel: '', fullAddress: '' });
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingAddress({});
        setIsEditMode(false);
    };

    const handleSave = async () => {
        if (!editingAddress || !editingAddress.addressId || !editingAddress.addressLabel || !editingAddress.fullAddress) {
            alert("All fields including Address ID are required.");
            return;
        }

        setIsLoading(true);
        closeModal();
        try {
            if (isEditMode) {
                await updateDeliveryAddress(editingAddress as DeliveryAddress);
            } else {
                await addDeliveryAddress(editingAddress as DeliveryAddress);
            }
            await fetchAddresses();
        } catch (error) {
            console.error("Failed to save delivery address", error);
            alert(`Could not save address: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const promptDelete = (addressId: string) => {
        setAddressToDelete(addressId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!addressToDelete) return;

        setIsLoading(true);
        try {
            await deleteDeliveryAddress(addressToDelete);
            setAddresses(prev => prev.filter(a => a.addressId !== addressToDelete));
            setIsDeleteModalOpen(false);
            setAddressToDelete(null);
        } catch (error) {
            console.error("Failed to delete delivery address", error);
            alert("Could not delete address. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingAddress) return;
        const { name, value } = e.target;
        setEditingAddress({ ...editingAddress, [name]: value });
    };

    return (
        <Card title="Delivery Address Management">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-auto flex-grow max-w-md">
                     <input
                        type="text"
                        placeholder="Search by Address ID or Label..."
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => openModal()} className="w-full sm:w-auto">Add New Address</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Address ID</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Label</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Full Address</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredAddresses.map(a => (
                            <tr key={a.addressId} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6 text-sm font-mono text-gray-500">{a.addressId}</td>
                                <td className="py-4 px-6 text-sm font-medium text-text-primary">{a.addressLabel}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{a.fullAddress}</td>
                                <td className="py-4 px-6 space-x-2 whitespace-nowrap">
                                    <Button variant="ghost" onClick={() => openModal(a)}>Edit</Button>
                                    <Button variant="danger" onClick={() => promptDelete(a.addressId)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                         {filteredAddresses.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-text-secondary">
                                    No addresses found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit/Add Modal */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'Edit Address' : 'Add Address'}>
                {editingAddress && (
                    <div className="space-y-4">
                        <input 
                            name="addressId" 
                            value={editingAddress.addressId || ''} 
                            onChange={handleChange} 
                            placeholder="Address ID (e.g., ADDR-HO)" 
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            disabled={isEditMode}
                        />
                        <input name="addressLabel" value={editingAddress.addressLabel || ''} onChange={handleChange} placeholder="Address Label (e.g., Head Office)" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
                        <input name="fullAddress" value={editingAddress.fullAddress || ''} onChange={handleChange} placeholder="Full Address" className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary" />
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
                        Are you sure you want to delete this address? <br/> This action cannot be undone.
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

export default AdminManageAddressesPage;