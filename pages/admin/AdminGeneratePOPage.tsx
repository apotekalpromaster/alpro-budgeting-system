
import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLoading } from '../../hooks/useLoading';
import { 
    generatePurchaseOrders, 
    getPurchaseOrders, 
    getVendors, 
    getCompanyProfiles,
    createPoPdf
} from '../../services/api';
import { PurchaseOrder, BudgetItem, Vendor, CompanyProfile } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const SuccessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-secondary mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const InfoIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const AdminGeneratePOPage: React.FC = () => {
    usePageTitle('Generate Purchase Order');
    const { setIsLoading } = useLoading();
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
    const [error, setError] = useState('');
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
    const [isConfirmGenerateOpen, setIsConfirmGenerateOpen] = useState(false);
    const [isResultModalOpen, setIsResultModalOpen] = useState(false);
    const [resultModalContent, setResultModalContent] = useState({ title: '', message: '', type: 'info' as 'success' | 'info' | 'error' });

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [poData, vendorData, companyData] = await Promise.all([ getPurchaseOrders(), getVendors(), getCompanyProfiles() ]);
            setPurchaseOrders(poData.sort((a, b) => new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime()));
            setVendors(vendorData);
            setCompanyProfiles(companyData);
        } catch (err) { setError('Failed to fetch page data.'); } finally { setIsLoading(false); }
    };
    
    useEffect(() => { fetchAllData(); }, []);
    
    const aggregatedItems = useMemo(() => {
        if (!selectedPO?.items) return [];
        const itemsArray: BudgetItem[] = Array.isArray(selectedPO.items) ? selectedPO.items : JSON.parse(selectedPO.items as any);
        const itemMap = new Map<string, BudgetItem>();
        itemsArray.forEach((item) => {
            if (itemMap.has(item.productId)) {
                const existingItem = itemMap.get(item.productId)!;
                existingItem.qty += item.qty;
                existingItem.total += item.total;
            } else { itemMap.set(item.productId, { ...item }); }
        });
        return Array.from(itemMap.values());
    }, [selectedPO]);

    const totals = useMemo(() => {
        const totalCostExclDisc = aggregatedItems.reduce((sum, item) => sum + item.total, 0);
        const dpp = Math.round(totalCostExclDisc * (11 / 12));
        const vat = Math.round(dpp * 0.12);
        const grandTotal = Math.round(totalCostExclDisc + vat);
        return { dpp, vat, grandTotal };
    }, [aggregatedItems]);

    const handleGeneratePOs = async () => {
        setIsConfirmGenerateOpen(false);
        setIsLoading(true);
        try {
            const newPOs = await generatePurchaseOrders();
            if (newPOs && newPOs.length > 0) {
                setResultModalContent({ title: 'Generation Successful', message: `${newPOs.length} new PO(s) generated.`, type: 'success' });
                await fetchAllData();
            } else {
                 setResultModalContent({ title: 'Status', message: 'No new POs generated. Ensure requests are "In Progress" with Company/Address.', type: 'info' });
            }
        } catch (err) { setError('Failed to generate POs.'); } finally { setIsLoading(false); setIsResultModalOpen(true); }
    };

    const handleDownloadPdf = async (po: PurchaseOrder) => {
        setIsLoading(true);
        try {
            const b64Data = await createPoPdf(po.poId);
            const byteCharacters = atob(b64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `${po.poId}.pdf`;
            link.click();
        } catch (err) {
            alert('Gagal mendownload PDF dari server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Purchase Order Management">
            <div className="flex justify-end mb-6">
                <Button onClick={() => setIsConfirmGenerateOpen(true)}>Generate New POs</Button>
            </div>
            {error && <p className="text-center text-danger mb-4">{error}</p>}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold uppercase">PO ID</th>
                            <th className="py-3 px-6 text-left text-xs font-bold uppercase">Date</th>
                            <th className="py-3 px-6 text-left text-xs font-bold uppercase">Vendor</th>
                            <th className="py-3 px-6 text-left text-xs font-bold uppercase">Total</th>
                            <th className="py-3 px-6 text-left text-xs font-bold uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {purchaseOrders.map((po) => (
                            <tr key={po.poId} className="hover:bg-gray-50">
                                <td className="py-4 px-6 text-sm font-mono font-bold text-secondary">{po.poId}</td>
                                <td className="py-4 px-6 text-sm">{new Date(po.dateIssued).toLocaleDateString('en-GB')}</td>
                                <td className="py-4 px-6 text-sm">{po.vendorName}</td>
                                <td className="py-4 px-6 text-sm font-bold">{formatCurrency(po.totalAmount)}</td>
                                <td className="py-4 px-6 space-x-2">
                                    <Button variant="ghost" className="text-xs" onClick={() => setSelectedPO(po)}>View</Button>
                                    <Button variant="secondary" className="text-xs" onClick={() => handleDownloadPdf(po)}>Download PDF</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!selectedPO} onClose={() => setSelectedPO(null)} title={`Review Purchase Order`} size="4xl">
                {selectedPO && (
                    <div className="space-y-4 p-1 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                            <div>
                                <h3 className="text-xl font-bold text-primary">{selectedPO.poId}</h3>
                                <p className="text-xs text-gray-500">Issued: {new Date(selectedPO.dateIssued).toLocaleDateString('en-GB')}</p>
                                <p className="text-sm font-semibold mt-1">Vendor: {selectedPO.vendorName}</p>
                            </div>
                            <Button className="!py-1.5 !px-3 text-xs" onClick={() => handleDownloadPdf(selectedPO)}>
                                Download Official PDF
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[11px] px-1 border-b pb-4">
                            <div>
                                <p className="font-bold text-text-secondary uppercase mb-1">Purchase From:</p>
                                <p className="text-gray-700">{selectedPO.vendorName}</p>
                            </div>
                            <div>
                                <p className="font-bold text-text-secondary uppercase mb-1">Delivery Address:</p>
                                <p className="text-gray-700 whitespace-pre-wrap">{selectedPO.deliveryAddress}</p>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full text-[12px]">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="py-2 px-3 text-left font-bold text-gray-500">Item Name</th>
                                        <th className="py-2 px-3 text-center font-bold text-gray-500">Qty</th>
                                        <th className="py-2 px-3 text-right font-bold text-gray-500">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {aggregatedItems.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-3">
                                                <div className="font-medium">{item.productName}</div>
                                                <div className="text-[10px] text-gray-400">ID: {item.productId}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="font-bold">{item.qty}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">{item.unit}</div>
                                            </td>
                                            <td className="p-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-end space-y-1 px-4">
                            <div className="flex w-64 justify-between text-xs text-gray-500">
                                <span>Total DPP:</span>
                                <span>{formatCurrency(totals.dpp)}</span>
                            </div>
                            <div className="flex w-64 justify-between text-xs text-gray-500">
                                <span>PPN (12%):</span>
                                <span>{formatCurrency(totals.vat)}</span>
                            </div>
                            <div className="flex w-64 justify-between items-center pt-2 border-t mt-1">
                                <span className="text-lg font-bold text-primary">TOTAL PO:</span>
                                <span className="text-xl font-black text-primary">{formatCurrency(totals.grandTotal)}</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setSelectedPO(null)} className="text-xs">Close</Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isConfirmGenerateOpen} onClose={() => setIsConfirmGenerateOpen(false)} title="Confirm">
                <div className="text-center"><p className="mb-6">Generate POs for all "In Progress" items?</p>
                <div className="flex justify-center gap-3"><Button variant="ghost" onClick={() => setIsConfirmGenerateOpen(false)}>Cancel</Button><Button onClick={handleGeneratePOs}>Yes, Generate</Button></div></div>
            </Modal>

            <Modal isOpen={isResultModalOpen} onClose={() => setIsResultModalOpen(false)} title={resultModalContent.title}>
                <div className="text-center p-4">
                    {resultModalContent.type === 'success' ? <SuccessIcon /> : <InfoIcon />}
                    <p className="mt-2 text-text-primary whitespace-pre-wrap">{resultModalContent.message}</p>
                    <div className="mt-6"><Button onClick={() => setIsResultModalOpen(false)}>OK</Button></div>
                </div>
            </Modal>
        </Card>
    );
};

export default AdminGeneratePOPage;
