
import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { 
    getPurchaseOrders, 
    getApprovedBudgetsForProcurement,
    updatePoPaymentDetails 
} from '../../services/api';
import { PurchaseOrder, BudgetRequest, ProcurementStatus } from '../../types';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

// Helper untuk format angka ke string dengan titik (1.000.000)
const formatDisplayNumber = (num: number | string): string => {
    if (num === 0 || num === '0') return '0';
    const str = num.toString().replace(/\D/g, '');
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper untuk parse string berformat titik kembali ke number (1.000.000 -> 1000000)
const parseDisplayNumber = (str: string): number => {
    return Number(str.replace(/\./g, '')) || 0;
};

const AdminPaymentTrackingPage: React.FC = () => {
    usePageTitle('Payment Tracking');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Form Modal State
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null); 
    const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null); // State baru untuk download
    const [formData, setFormData] = useState({
        invoiceNumber: '',
        taxInvoiceNumber: '',
        actualAmount: 0,
        file: null as File | null
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [poData, reqData] = await Promise.all([
                getPurchaseOrders(),
                getApprovedBudgetsForProcurement()
            ]);
            setPurchaseOrders(poData);
            setRequests(reqData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter PO yang sudah PROCURED saja + Enhanced Search
    const procuredPOs = useMemo(() => {
        const procuredBudgetIds = new Set(
            requests.filter(r => r.procurementStatus === ProcurementStatus.PROCURED).map(r => r.id)
        );

        return purchaseOrders.filter(po => {
            const searchLower = searchTerm.toLowerCase();
            
            const matchesSearch = 
                po.poId.toLowerCase().includes(searchLower) || 
                po.vendorName.toLowerCase().includes(searchLower) ||
                (po.invoiceNumber && po.invoiceNumber.toLowerCase().includes(searchLower)) ||
                (po.taxInvoiceNumber && po.taxInvoiceNumber.toLowerCase().includes(searchLower));
            
            let isProcured = false;
            try {
                const relatedIds = typeof po.relatedBudgetIds === 'string' ? JSON.parse(po.relatedBudgetIds) : po.relatedBudgetIds;
                isProcured = Array.isArray(relatedIds) && relatedIds.some(id => procuredBudgetIds.has(id));
            } catch(e) {}
            
            return matchesSearch && isProcured;
        });
    }, [purchaseOrders, requests, searchTerm]);

    const handleOpenModal = (po: PurchaseOrder) => {
        setSelectedPO(po);
        setFormData({
            invoiceNumber: po.invoiceNumber || '',
            taxInvoiceNumber: po.taxInvoiceNumber || '',
            actualAmount: po.actualPaymentAmount || po.totalAmount,
            file: null
        });
    };

    const handleOpenViewer = (url: string) => {
        setOriginalFileUrl(url); // Simpan URL asli untuk tombol download
        let embedUrl = url;
        if (url.includes('drive.google.com') && url.includes('/view')) {
            embedUrl = url.replace('/view', '/preview');
        }
        setViewerUrl(embedUrl);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type !== 'application/pdf') {
                alert('Hanya file PDF yang diperbolehkan.');
                e.target.value = '';
                return;
            }
            setFormData(prev => ({ ...prev, file }));
        }
    };

    const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = error => reject(error);
    });

    const handleSubmitPayment = async () => {
        if (!selectedPO) return;
        if (!formData.invoiceNumber) {
            alert('Nomor Invoice wajib diisi.');
            return;
        }

        setIsLoading(true);
        try {
            let fileBase64 = undefined;
            if (formData.file) {
                fileBase64 = await toBase64(formData.file);
            }

            await updatePoPaymentDetails({
                poId: selectedPO.poId,
                invoiceNumber: formData.invoiceNumber,
                taxInvoiceNumber: formData.taxInvoiceNumber,
                actualAmount: formData.actualAmount,
                fileBase64,
                fileName: formData.file ? `Invoice_${selectedPO.poId}_${Date.now()}.pdf` : undefined
            });

            alert('Data pembayaran berhasil disimpan.');
            setSelectedPO(null);
            fetchData();
        } catch (err) {
            alert('Gagal menyimpan data pembayaran.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadOriginal = () => {
        if (originalFileUrl) {
            window.open(originalFileUrl, '_blank');
        }
    };

    const handleCloseViewer = () => {
        setViewerUrl(null);
        setOriginalFileUrl(null);
    };

    return (
        <Card title="Payment & Invoice Tracking">
            <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl border">
                <div className="flex-1 min-w-[300px]">
                    <input 
                        placeholder="Cari No PO, Vendor, No Invoice, atau No Pajak..." 
                        className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary placeholder-gray-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="text-sm text-gray-500 flex items-center italic">
                    *Mendukung pencarian Nama Vendor, Invoice, dan Faktur.
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">PO No</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">Vendor</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">Nominal PO</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">Invoice Details</th>
                            <th className="p-4 text-left text-xs font-bold text-text-secondary uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {procuredPOs.map(po => (
                            <tr key={po.poId} className="hover:bg-gray-50">
                                <td className="p-4 font-mono font-bold text-secondary">{po.poId}</td>
                                <td className="p-4 text-sm">{po.vendorName}</td>
                                <td className="p-4 text-sm font-bold">{formatCurrency(po.totalAmount)}</td>
                                <td className="p-4">
                                    {po.invoiceNumber ? (
                                        <div className="text-xs space-y-1">
                                            <p><span className="font-semibold">Inv:</span> {po.invoiceNumber}</p>
                                            <p><span className="font-semibold">Faktur:</span> {po.taxInvoiceNumber || '-'}</p>
                                            {po.invoiceFileUrl && (
                                                <button 
                                                    onClick={() => handleOpenViewer(po.invoiceFileUrl!)}
                                                    className="text-primary font-bold hover:underline flex items-center mt-1"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                    Lihat Dokumen
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Belum diinput</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <Button 
                                        variant={po.invoiceNumber ? 'ghost' : 'primary'} 
                                        className="!py-1.5 !px-3 text-xs"
                                        onClick={() => handleOpenModal(po)}
                                    >
                                        {po.invoiceNumber ? 'Edit Payment' : 'Input Payment'}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {procuredPOs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center text-gray-400">Tidak ada data ditemukan untuk kata kunci ini.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Input Payment */}
            <Modal isOpen={!!selectedPO} onClose={() => setSelectedPO(null)} title={`Input Invoice: ${selectedPO?.poId}`} size="lg">
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 col-span-2">
                            <p className="text-xs text-blue-600 font-bold uppercase">Vendor</p>
                            <p className="font-bold text-text-primary">{selectedPO?.vendorName}</p>
                            <p className="text-xs text-gray-500 mt-1 italic">Total PO: {formatCurrency(selectedPO?.totalAmount || 0)}</p>
                        </div>
                        
                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Invoice <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary placeholder-gray-400"
                                placeholder="INV/2025/..."
                                value={formData.invoiceNumber}
                                onChange={e => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                            />
                        </div>

                        <div className="col-span-2 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Faktur Pajak</label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary placeholder-gray-400"
                                placeholder="010.000-25..."
                                value={formData.taxInvoiceNumber}
                                onChange={e => setFormData(prev => ({ ...prev, taxInvoiceNumber: e.target.value }))}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Nominal Bayar (Confirm)</label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary font-bold placeholder-gray-400"
                                value={formatDisplayNumber(formData.actualAmount)}
                                onChange={e => {
                                    const rawValue = e.target.value;
                                    setFormData(prev => ({ ...prev, actualAmount: parseDisplayNumber(rawValue) }));
                                }}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload File PDF (Invoice/Faktur)</label>
                            <input 
                                type="file"
                                accept=".pdf"
                                className="w-full p-1.5 border border-dashed border-gray-600 rounded text-sm bg-gray-700 text-white"
                                onChange={handleFileChange}
                            />
                            {selectedPO?.invoiceFileUrl && !formData.file && (
                                <p className="text-[10px] text-primary mt-1 italic font-bold">Dokumen lama sudah tersimpan.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                        <Button variant="ghost" onClick={() => setSelectedPO(null)}>Batal</Button>
                        <Button variant="primary" onClick={handleSubmitPayment}>Simpan Payment Details</Button>
                    </div>
                </div>
            </Modal>

            {/* Modal Document Viewer (Iframe) */}
            <Modal isOpen={!!viewerUrl} onClose={handleCloseViewer} title="Pratinjau Dokumen" size="4xl">
                {viewerUrl && (
                    <div className="w-full h-[75vh] bg-background rounded-lg border flex flex-col">
                        <iframe 
                            src={viewerUrl} 
                            className="w-full h-full rounded-b-lg" 
                            title="Document Viewer"
                        />
                        <div className="p-3 bg-gray-50 border-t flex justify-between items-center text-xs">
                            <p className="text-gray-500 italic font-medium">Gunakan tombol Download jika pratinjau tidak muncul atau ingin menyimpan file.</p>
                            <div className="flex gap-2">
                                <Button variant="primary" className="!py-1" onClick={handleDownloadOriginal}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download Dokumen
                                </Button>
                                <Button variant="ghost" className="!py-1" onClick={handleCloseViewer}>Tutup</Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default AdminPaymentTrackingPage;
