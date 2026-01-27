
import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useLoading } from '../../hooks/useLoading';
import { 
    getApprovedBudgetsForProcurement, 
    updateProcurementStatus, 
    getPurchaseOrders,
    createPoPdf
} from '../../services/api';
import { BudgetRequest, ProcurementStatus, BudgetItem, PurchaseOrder, BudgetStatus } from '../../types';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const AdminProcurementPage: React.FC = () => {
    usePageTitle('Pengadaan (Tracking)');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const { companyProfiles } = useData();
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>(ProcurementStatus.SENT_TO_MANAGER);

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, budgetId: '', newStatus: null as ProcurementStatus | null, message: '', title: '' });

    const fetchAllData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [reqData, poData] = await Promise.all([ getApprovedBudgetsForProcurement(), getPurchaseOrders() ]);
            setRequests(reqData);
            setPurchaseOrders(poData);
        } catch (err) {} finally { setIsLoading(false); }
    };

    useEffect(() => { fetchAllData(); }, [user]);

    const findPoForBudget = (budgetId: string) => {
        return purchaseOrders.find(p => {
            const relatedIds = typeof p.relatedBudgetIds === 'string' ? JSON.parse(p.relatedBudgetIds) : p.relatedBudgetIds;
            return Array.isArray(relatedIds) && relatedIds.includes(budgetId);
        });
    };

    const handleOpenConfirm = (budgetId: string, status: ProcurementStatus, title: string, message: string) => {
        setConfirmModal({
            isOpen: true,
            budgetId,
            newStatus: status,
            title,
            message
        });
    };

    const handleExecuteStatusUpdate = async () => {
        const { budgetId, newStatus } = confirmModal;
        if (!budgetId || !newStatus) return;
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setIsLoading(true);
        try {
            await updateProcurementStatus(budgetId, newStatus);
            // Refresh local state to reflect changes
            setRequests(prev => prev.map(r => {
                if (r.id === budgetId) {
                    const updated: BudgetRequest = { ...r, procurementStatus: newStatus };
                    // Sinkronisasi status budgeting utama jika direject
                    if (newStatus === ProcurementStatus.REJECTED) {
                        updated.status = BudgetStatus.REJECTED;
                    }
                    return updated;
                }
                return r;
            }));
        } catch (err) { alert('Gagal update status.'); } finally { setIsLoading(false); }
    };

    const handleDownloadPO = async (po: PurchaseOrder) => {
        setIsLoading(true);
        try {
            const b64Data = await createPoPdf(po.poId);
            const byteCharacters = atob(b64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
            const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `${po.poId}.pdf`;
            link.click();
        } catch (err) { alert('Gagal mendownload PDF.'); } finally { setIsLoading(false); }
    };

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const poObj = findPoForBudget(req.id);
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = searchLower === '' || req.id.toLowerCase().includes(searchLower) || (poObj?.poId.toLowerCase().includes(searchLower));
            const matchesStatus = filterStatus === 'all' || (req.procurementStatus || ProcurementStatus.PENDING) === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [requests, filterStatus, searchTerm, purchaseOrders]);

    const selectedPoItems = useMemo(() => {
        if (!selectedPO?.items) return [];
        const itemsArray: BudgetItem[] = Array.isArray(selectedPO.items) ? selectedPO.items : JSON.parse(selectedPO.items as any);
        const itemMap = new Map<string, BudgetItem>();
        itemsArray.forEach((item) => {
            if (itemMap.has(item.productId)) {
                const existing = itemMap.get(item.productId)!;
                existing.qty += item.qty;
                existing.total += item.total;
            } else { itemMap.set(item.productId, { ...item }); }
        });
        return Array.from(itemMap.values());
    }, [selectedPO]);

    const totals = useMemo(() => {
        const totalCostExclDisc = selectedPoItems.reduce((sum, item) => sum + item.total, 0);
        const dpp = Math.round(totalCostExclDisc * (11 / 12));
        const vat = Math.round(dpp * 0.12);
        const grandTotal = Math.round(totalCostExclDisc + vat);
        return { dpp, vat, grandTotal };
    }, [selectedPoItems]);

    return (
        <Card title="Tracking Pengadaan & PO">
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl border">
                <input placeholder="Cari ID / No PO..." className="p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary">
                    <option value="all">Semua Status</option>
                    <option value={ProcurementStatus.SENT_TO_MANAGER}>Menunggu Feedback Manager</option>
                    <option value={ProcurementStatus.IN_PROGRESS}>Dalam Pemesanan</option>
                    <option value={ProcurementStatus.PROCURED}>Selesai (Procured)</option>
                    <option value={ProcurementStatus.REJECTED}>Ditolak Manager</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">PO No</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">User</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">Total</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">Status</th>
                            <th className="p-4 text-center text-xs font-bold text-text-secondary uppercase">Aksi Pengadaan</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                        {filteredRequests.map(req => {
                            const po = findPoForBudget(req.id);
                            const currentStatus = req.procurementStatus || ProcurementStatus.PENDING;

                            return (
                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-mono font-bold text-secondary">{po?.poId || '-'}</td>
                                    <td className="p-4 text-sm">{req.userName}</td>
                                    <td className="p-4 font-bold text-sm">{formatCurrency(req.total)}</td>
                                    <td className="p-4"><Badge status={currentStatus} /></td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            {currentStatus === ProcurementStatus.SENT_TO_MANAGER && (
                                                <>
                                                    <Button 
                                                        variant="primary" 
                                                        className="!py-1 !px-3 text-xs"
                                                        onClick={() => handleOpenConfirm(req.id, ProcurementStatus.IN_PROGRESS, 'Konfirmasi Pemesanan', 'Apakah PO sudah OK dan ingin dilanjut ke proses pemesanan ke Vendor?')}
                                                    >
                                                        Proses Pemesanan
                                                    </Button>
                                                    <Button 
                                                        variant="danger" 
                                                        className="!py-1 !px-3 text-xs"
                                                        onClick={() => handleOpenConfirm(req.id, ProcurementStatus.REJECTED, 'Tolak PO', 'Apakah Anda yakin ingin menolak PO ini sesuai instruksi Manager/BOD?')}
                                                    >
                                                        Tolak PO
                                                    </Button>
                                                </>
                                            )}
                                            {currentStatus === ProcurementStatus.IN_PROGRESS && (
                                                <>
                                                    <Button 
                                                        className="!py-1 !px-3 text-xs !bg-secondary hover:!bg-emerald-600"
                                                        onClick={() => handleOpenConfirm(req.id, ProcurementStatus.PROCURED, 'Konfirmasi Selesai', 'Konfirmasi bahwa barang sudah sampai/diterima dan transaksi selesai?')}
                                                    >
                                                        Update: Barang Sampai
                                                    </Button>
                                                    <Button 
                                                        variant="danger" 
                                                        className="!py-1 !px-3 text-xs"
                                                        onClick={() => handleOpenConfirm(req.id, ProcurementStatus.REJECTED, 'Batalkan PO', 'Apakah Anda yakin ingin membatalkan proses pemesanan PO ini?')}
                                                    >
                                                        Tolak PO
                                                    </Button>
                                                </>
                                            )}
                                            {currentStatus === ProcurementStatus.PROCURED && (
                                                <span className="text-xs text-gray-400 italic">Transaksi Selesai</span>
                                            )}
                                            {currentStatus === ProcurementStatus.REJECTED && (
                                                <span className="text-xs text-danger italic font-semibold uppercase">PO Dibatalkan</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => po && setSelectedPO(po)} className="text-primary font-bold hover:underline text-sm">Details PO</button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredRequests.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-10 text-center text-gray-400">Tidak ada data pengadaan ditemukan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!selectedPO} onClose={() => setSelectedPO(null)} title={`Purchase Order: ${selectedPO?.poId}`} size="4xl">
                {selectedPO && (
                    <div className="space-y-4 p-1 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                            <div>
                                <h3 className="text-xl font-bold text-secondary">{selectedPO.poId}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Issued Date: {new Date(selectedPO.dateIssued).toLocaleDateString('en-GB')}</p>
                                <p className="text-sm font-semibold mt-1">Vendor: {selectedPO.vendorName}</p>
                            </div>
                            <Button variant="secondary" className="!py-1.5 !px-3 text-xs" onClick={() => handleDownloadPO(selectedPO)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download PDF PO
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 text-[11px] px-1">
                            <div>
                                <p className="font-bold text-gray-400 uppercase mb-1">Delivery To:</p>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedPO.deliveryAddress}</p>
                            </div>
                            <div>
                                <p className="font-bold text-gray-400 uppercase mb-1">Billing Information:</p>
                                <p className="font-bold text-gray-800">{companyProfiles.find(c => c.profileId === selectedPO.companyProfileId)?.companyName || '-'}</p>
                                <p className="text-gray-600 mt-1">{companyProfiles.find(c => c.profileId === selectedPO.companyProfileId)?.companyAddress || '-'}</p>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                            <table className="min-w-full text-[12px]">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="py-2 px-3 text-left font-bold uppercase">Item Name</th>
                                        <th className="py-2 px-3 text-center font-bold uppercase">Qty</th>
                                        <th className="py-2 px-3 text-right font-bold uppercase">Price</th>
                                        <th className="py-2 px-3 text-right font-bold uppercase">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedPoItems.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="py-3 px-3 font-medium">{item.productName}</td>
                                            <td className="py-3 px-3 text-center">
                                                <div className="font-bold">{item.qty}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">{item.unit}</div>
                                            </td>
                                            <td className="py-3 px-3 text-right text-gray-600">{formatCurrency(item.price)}</td>
                                            <td className="py-3 px-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-end space-y-1 px-4 text-sm">
                            <div className="flex w-64 justify-between text-gray-500">
                                <span>Total DPP:</span>
                                <span>{formatCurrency(totals.dpp)}</span>
                            </div>
                            <div className="flex w-64 justify-between text-gray-500">
                                <span>PPN (12%):</span>
                                <span>{formatCurrency(totals.vat)}</span>
                            </div>
                            <div className="flex w-64 justify-between items-center pt-2 border-t mt-1">
                                <span className="text-lg font-bold text-primary uppercase">Total PO:</span>
                                <span className="text-xl font-black text-primary">{formatCurrency(totals.grandTotal)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t"><Button variant="ghost" onClick={() => setSelectedPO(null)} className="text-xs">Tutup</Button></div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(p => ({...p, isOpen: false}))} title={confirmModal.title}>
                <div className="p-2 text-center">
                    <p className="mb-6 text-text-primary text-lg">{confirmModal.message}</p>
                    <div className="flex justify-center gap-3">
                        <Button variant="ghost" onClick={() => setConfirmModal(p => ({...p, isOpen: false}))}>Batal</Button>
                        <Button 
                            variant={confirmModal.newStatus === ProcurementStatus.REJECTED ? 'danger' : 'primary'}
                            onClick={handleExecuteStatusUpdate}
                        >
                            Ya, Eksekusi
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};

export default AdminProcurementPage;
