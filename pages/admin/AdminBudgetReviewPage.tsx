
import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useLoading } from '../../hooks/useLoading';
import { 
    getBudgetRequests, 
    submitMultipleBudgets, 
    deleteBudgetRequest, 
    generatePurchaseOrders,
    rejectBudget 
} from '../../services/api';
import { BudgetRequest, BudgetItem, BudgetStatus, ProcurementStatus } from '../../types';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const AdminBudgetReviewPage: React.FC = () => {
    usePageTitle('Review Budget Requests');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const { vendors, companyProfiles, deliveryAddresses } = useData();
    
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
    const [editingItems, setEditingItems] = useState<BudgetItem[]>([]);
    
    const [assignedCompanyId, setAssignedCompanyId] = useState('');
    const [assignedAddress, setAssignedAddress] = useState('');

    const [error, setError] = useState('');
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    // Delete Item States
    const [itemToDeleteIndex, setItemToDeleteIndex] = useState<number | null>(null);
    const [itemDeleteReason, setItemDeleteReason] = useState('');
    const [deletedItemsReasons, setDeletedItemsReasons] = useState<Record<string, string>>({});

    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [adminRejectReason, setAdminRejectReason] = useState('');

    useEffect(() => {
        if (user) {
            fetchRequests();
        }
    }, [user]);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const allRequests = await getBudgetRequests(user!);
            const reviewRequests = allRequests.filter(req => req.status === BudgetStatus.PENDING_ADMIN_REVIEW);
            setRequests(reviewRequests.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()));
        } catch (err) {
            setError('Failed to fetch requests.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDetail = (req: BudgetRequest) => {
        setSelectedRequest(req);
        const items = Array.isArray(req.items) ? req.items : JSON.parse(req.items as any);
        setEditingItems(JSON.parse(JSON.stringify(items)));
        setAssignedCompanyId(req.assignedCompanyProfileId || '');
        setAssignedAddress(req.assignedDeliveryAddress || '');
        setAdminRejectReason('');
        setDeletedItemsReasons({}); // Reset reasons for new session
    };

    const handleItemChange = (index: number, field: keyof BudgetItem, value: any) => {
        const newItems = [...editingItems];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'price' || field === 'qty') {
            newItems[index].total = (newItems[index].price || 0) * (newItems[index].qty || 0);
        }
        setEditingItems(newItems);
    };

    const confirmDeleteItem = () => {
        if (itemToDeleteIndex === null || !itemDeleteReason.trim()) return;
        
        const item = editingItems[itemToDeleteIndex];
        // Simpan alasan penghapusan berdasarkan Product ID
        setDeletedItemsReasons(prev => ({
            ...prev,
            [item.productId]: itemDeleteReason.trim()
        }));

        const newItems = [...editingItems];
        newItems.splice(itemToDeleteIndex, 1);
        setEditingItems(newItems);
        
        // Reset temp states
        setItemToDeleteIndex(null);
        setItemDeleteReason('');
    };

    const handleConfirmReject = async () => {
        if (!selectedRequest || !user || !adminRejectReason) {
            alert("Mohon isi alasan penolakan.");
            return;
        }

        setIsLoading(true);
        try {
            await rejectBudget(selectedRequest.id, user, `[Admin Review]: ${adminRejectReason}`);
            setIsRejectModalOpen(false);
            setSelectedRequest(null);
            setAdminRejectReason('');
            fetchRequests();
            alert("Request berhasil ditolak dan status telah diperbarui.");
        } catch (err) {
            alert('Gagal menolak request.');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTotal = (items: BudgetItem[]) => {
        return items.reduce((sum, item) => sum + item.total, 0);
    };

    const generateChangeLog = (originalReq: BudgetRequest, modifiedItems: BudgetItem[]): string => {
        const originalItems: BudgetItem[] = Array.isArray(originalReq.items) ? originalReq.items : JSON.parse(originalReq.items as any);
        const logs: string[] = [];

        // 1. Cek item yang dihapus dengan alasan
        originalItems.forEach(orig => {
            const stillExists = modifiedItems.find(mod => mod.productId === orig.productId);
            if (!stillExists) {
                const reason = deletedItemsReasons[orig.productId];
                logs.push(`- [HAPUS]: Item "${orig.productName}" dihapus Admin. Alasan: ${reason || 'Tidak disebutkan'}`);
            }
        });

        // 2. Cek perubahan di item yang masih ada
        modifiedItems.forEach(mod => {
            const orig = originalItems.find(o => o.productId === mod.productId);
            if (orig) {
                const itemChanges: string[] = [];
                if (mod.qty !== orig.qty) {
                    itemChanges.push(`QTY: ${orig.qty} -> ${mod.qty}`);
                }
                if (mod.price !== orig.price) {
                    itemChanges.push(`Harga: ${formatCurrency(orig.price)} -> ${formatCurrency(mod.price)}`);
                }
                if (mod.vendorId !== orig.vendorId) {
                    const origVendor = vendors.find(v => v.vendorId === orig.vendorId)?.vendorName || orig.vendorId;
                    const modVendor = vendors.find(v => v.vendorId === mod.vendorId)?.vendorName || mod.vendorId;
                    itemChanges.push(`Vendor: ${origVendor} -> ${modVendor}`);
                }

                if (itemChanges.length > 0) {
                    logs.push(`- [EDIT]: Item "${mod.productName}" disesuaikan (${itemChanges.join(', ')}).`);
                }
            }
        });

        return logs.join('\n');
    };

    const handleApproveAndGeneratePO = async () => {
        if (!selectedRequest || !user) return;
        if (editingItems.length === 0) {
            alert("Tidak ada item tersisa di request. Jika ingin membatalkan semua, gunakan tombol Reject Budget.");
            return;
        }
        if (!assignedCompanyId || !assignedAddress) {
            alert("Please select both a Company Profile and a Delivery Address.");
            return;
        }

        const hasMissingVendor = editingItems.some(item => !item.vendorId);
        if (hasMissingVendor) {
            alert("Please ensure ALL items have a selected Vendor.");
            return;
        }

        setIsLoading(true);
        try {
            const changeLog = generateChangeLog(selectedRequest, editingItems);

            const itemsByVendor = new Map<string, BudgetItem[]>();
            editingItems.forEach(item => {
                const vendorId = item.vendorId || 'unknown';
                if (!itemsByVendor.has(vendorId)) itemsByVendor.set(vendorId, []);
                itemsByVendor.get(vendorId)!.push(item);
            });

            const newRequests = [];
            for (const [vendorId, vendorItems] of itemsByVendor.entries()) {
                const vendorTotal = vendorItems.reduce((sum, item) => sum + item.total, 0);
                newRequests.push({
                    userId: selectedRequest.userId,
                    userName: selectedRequest.userName,
                    department: selectedRequest.department,
                    items: vendorItems,
                    total: vendorTotal,
                    status: BudgetStatus.APPROVED,
                    procurementStatus: ProcurementStatus.IN_PROGRESS,
                    managerApproverId: selectedRequest.managerApproverId,
                    bodApproverId: selectedRequest.bodApproverId,
                    vendorId: vendorId,
                    assignedCompanyProfileId: assignedCompanyId,
                    assignedDeliveryAddress: assignedAddress,
                    submittedAt: new Date().toISOString(),
                    approvedAt: new Date().toISOString(),
                    changeLog: changeLog 
                });
            }

            await submitMultipleBudgets(newRequests);
            await deleteBudgetRequest(selectedRequest.id);
            await generatePurchaseOrders();

            setIsSuccessModalOpen(true);
            setSelectedRequest(null);
            fetchRequests();
        } catch (err) {
            console.error(err);
            alert('Failed to process request.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Admin Review & Approval">
            {error && <p className="text-center text-danger">{error}</p>}
            {requests.length === 0 && !error && <p className="text-center text-text-secondary">No requests pending review.</p>}
            
            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">User</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Dept</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-100 transition-colors">
                                <td className="py-4 px-6 text-sm text-text-secondary">{new Date(req.submittedAt).toLocaleDateString()}</td>
                                <td className="py-4 px-6 text-sm font-medium text-text-primary">{req.userName}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{req.department}</td>
                                <td className="py-4 px-6 text-sm font-semibold text-text-primary">{formatCurrency(req.total)}</td>
                                <td className="py-4 px-6">
                                    <Button variant="primary" onClick={() => handleOpenDetail(req)}>Review & Edit</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Finalize Details & Send to Manager" size="4xl">
                {selectedRequest && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <h3 className="font-bold text-text-primary">Request Details</h3>
                                <p className="text-sm text-text-secondary">From: <strong>{selectedRequest.userName}</strong> ({selectedRequest.department})</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-text-secondary font-medium">New Grand Total:</p>
                                <p className="text-3xl font-bold text-primary">{formatCurrency(calculateTotal(editingItems))}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-1">Select Company Profile (PT)</label>
                                <select 
                                    value={assignedCompanyId}
                                    onChange={(e) => setAssignedCompanyId(e.target.value)}
                                    className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary"
                                >
                                    <option value="" className="bg-white text-black">-- Select Company --</option>
                                    {companyProfiles.map(cp => (
                                        <option key={cp.profileId} value={cp.profileId} className="bg-white text-black">{cp.companyName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-1">Select Delivery Address</label>
                                <select 
                                    value={assignedAddress}
                                    onChange={(e) => setAssignedAddress(e.target.value)}
                                    className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary"
                                >
                                    <option value="" className="bg-white text-black">-- Select Address --</option>
                                    {deliveryAddresses.map(addr => (
                                        <option key={addr.addressId} value={addr.fullAddress} className="bg-white text-black">{addr.addressLabel}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto border rounded-lg max-h-[40vh]">
                            <table className="min-w-full bg-white text-sm">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-2 px-3 text-left">Item Name</th>
                                        <th className="py-2 px-3 text-center w-20">Qty</th>
                                        <th className="py-2 px-3 text-left w-32">Price (IDR)</th>
                                        <th className="py-2 px-3 text-left w-44">Vendor</th>
                                        <th className="py-2 px-3 text-right w-32">Total</th>
                                        <th className="py-2 px-3 text-center w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {editingItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2 px-3 font-medium text-text-primary">{item.productName}</td>
                                            <td className="py-2 px-3">
                                                 <input 
                                                    type="number" 
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))}
                                                    className="w-full p-1 border border-gray-600 bg-gray-700 text-white rounded text-center focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <input 
                                                    type="number" 
                                                    value={item.price}
                                                    onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                                                    className="w-full p-1 border border-gray-600 bg-gray-700 text-white rounded text-right focus:ring-1 focus:ring-primary"
                                                />
                                            </td>
                                            <td className="py-2 px-3">
                                                <select
                                                    value={item.vendorId}
                                                    onChange={(e) => handleItemChange(idx, 'vendorId', e.target.value)}
                                                    className="w-full p-1 border border-gray-600 bg-gray-700 text-white rounded text-xs focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="" className="bg-white text-black">-- Select Vendor --</option>
                                                    {vendors.map(v => (
                                                        <option key={v.vendorId} value={v.vendorId} className="bg-white text-black">{v.vendorName}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-3 text-right font-semibold text-text-primary">
                                                {formatCurrency(item.total)}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <button onClick={() => setItemToDeleteIndex(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                            <Button variant="danger" onClick={() => setIsRejectModalOpen(true)}>Reject Budget</Button>
                            <div className="flex space-x-3">
                                <Button variant="ghost" onClick={() => setSelectedRequest(null)}>Cancel</Button>
                                <Button 
                                    variant="primary" 
                                    onClick={handleApproveAndGeneratePO}
                                    disabled={editingItems.length === 0}
                                    className="!bg-secondary hover:!bg-emerald-600"
                                >
                                    Generate PO & Send to Manager
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Rejection Reason (Admin - Full Request Reject) */}
            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject Budget Request" size="md">
                <div className="space-y-4">
                    <p className="text-sm text-text-secondary">Mohon berikan alasan mengapa Anda menolak pengajuan ini agar dapat dilihat oleh user di menu History.</p>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Remark / Alasan Penolakan <span className="text-red-500">*</span></label>
                        <textarea 
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary min-h-[100px]"
                            placeholder="Contoh: Stok barang masih tersedia di gudang..."
                            value={adminRejectReason}
                            onChange={(e) => setAdminRejectReason(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Batal</Button>
                        <Button variant="danger" onClick={handleConfirmReject} disabled={!adminRejectReason}>Ya, Tolak Request</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="PO Draft Terkirim">
                <div className="text-center p-4">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-secondary mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium text-text-primary">PO Draft berhasil dikirim!</p>
                    <p className="text-sm text-text-secondary mt-2">
                        PDF Purchase Order telah dikirimkan sebagai lampiran email ke Manager terkait. 
                        Tracking status selanjutnya dapat dilihat di menu <strong>"Pengadaan"</strong>.
                    </p>
                    <div className="mt-6"><Button onClick={() => setIsSuccessModalOpen(false)}>Selesai</Button></div>
                </div>
            </Modal>

            {/* Modal Hapus Item Tunggal dengan Alasan */}
            <Modal isOpen={itemToDeleteIndex !== null} onClose={() => { setItemToDeleteIndex(null); setItemDeleteReason(''); }} title="Hapus Item" size="md">
                 <div className="space-y-4">
                    <p className="text-sm text-text-secondary font-medium">Hapus item ini dari request?</p>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alasan Penghapusan <span className="text-red-500">*</span></label>
                        <textarea 
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary min-h-[80px]"
                            placeholder="Contoh: Barang ini sudah dibeli secara manual / stok masih ada..."
                            value={itemDeleteReason}
                            onChange={(e) => setItemDeleteReason(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="ghost" onClick={() => { setItemToDeleteIndex(null); setItemDeleteReason(''); }}>Batal</Button>
                        <Button variant="danger" onClick={confirmDeleteItem} disabled={!itemDeleteReason.trim()}>Hapus Item</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!zoomedImage} onClose={() => setZoomedImage(null)} title={zoomedImage?.alt || 'Product'}>
                {zoomedImage && <img src={zoomedImage.src} className="max-w-full rounded-lg" />}
            </Modal>
        </Card>
    );
};

export default AdminBudgetReviewPage;
