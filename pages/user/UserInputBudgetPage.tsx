
import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useLoading } from '../../hooks/useLoading';
import { submitMultipleBudgets } from '../../services/api';
import { BudgetItem, BudgetStatus } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const UserInputBudgetPage: React.FC = () => {
    usePageTitle('Input Budget');
    const { user } = useAuth();
    const { products, isDataLoaded } = useData();
    const { setIsLoading } = useLoading();

    const [allProducts, setAllProducts] = useState<BudgetItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    useEffect(() => {
        if (products.length > 0) {
            const budgetItems = products.map(p => ({
                productId: p.id,
                productName: p.name,
                productImage: p.imageUrl,
                unit: p.unit,
                price: p.price,
                vendorId: p.vendorId,
                category: p.category || 'Habis Pakai',
                qty: 0,
                total: 0
            }));
            setAllProducts(budgetItems);
        }
    }, [products]);

    useEffect(() => {
        if (!isDataLoaded) {
            setIsLoading(true);
        } else {
            setIsLoading(false);
        }
    }, [isDataLoaded, setIsLoading]);

    const handleQuantityChange = (productId: string, newQtyString: string) => {
        const newQty = parseInt(newQtyString, 10);

        if (isNaN(newQty)) {
             setAllProducts(prev => prev.map(item =>
                item.productId === productId
                    ? { ...item, qty: 0, total: 0 }
                    : item
            ));
            return;
        }

        if (newQty < 0) return;

        setAllProducts(prev => prev.map(item =>
            item.productId === productId
                ? { ...item, qty: newQty, total: newQty * item.price }
                : item
        ));
    };

    const filteredItems = useMemo(() => {
        const lowercasedTerm = searchTerm.toLowerCase();
        return allProducts.filter(p => 
            String(p.productName).toLowerCase().includes(lowercasedTerm) ||
            String(p.productId).toLowerCase().includes(lowercasedTerm)
        );
    }, [allProducts, searchTerm]);

    const itemsToSubmit = useMemo(() => {
        return allProducts.filter(item => item.qty > 0);
    }, [allProducts]);

    const grandTotal = useMemo(() => {
        return itemsToSubmit.reduce((sum, item) => sum + item.total, 0);
    }, [itemsToSubmit]);

    const handleOpenConfirmModal = () => {
        setError('');
        if (itemsToSubmit.length === 0) {
            setError("Keranjang kosong. Silahkan masukkan qty pada setidaknya satu item.");
            return;
        }
        setIsConfirmModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!user) {
            setError("Sesi berakhir. Silahkan login kembali.");
            setIsConfirmModalOpen(false);
            return;
        }
        
        setIsLoading(true);
        setIsConfirmModalOpen(false);

        try {
            const itemsByVendor = new Map<string, BudgetItem[]>();

            itemsToSubmit.forEach(item => {
                const vId = item.vendorId || 'unknown';
                if (!itemsByVendor.has(vId)) {
                    itemsByVendor.set(vId, []);
                }
                itemsByVendor.get(vId)!.push(item);
            });

            const requestsPayload = [];

            for (const [vendorId, items] of itemsByVendor.entries()) {
                const total = items.reduce((sum, i) => sum + i.total, 0);
                
                requestsPayload.push({
                    userId: user.id,
                    userName: user.name,
                    department: user.department,
                    items: items,
                    total: total,
                    status: BudgetStatus.PENDING_ADMIN_REVIEW, 
                    managerApproverId: user.managerId,
                    bodApproverId: user.bodId,
                    vendorId: vendorId === 'unknown' ? null : vendorId
                });
            }

            await submitMultipleBudgets(requestsPayload);

            setIsSuccessModalOpen(true);
            setAllProducts(prev => prev.map(item => ({ ...item, qty: 0, total: 0 })));

        } catch (err) {
            setError('Gagal submit budgeting. Silahkan coba kembali.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full">
            <Card className="flex flex-col h-full">
                 <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-bold text-text-primary flex items-center">
                        Product List
                    </h2>
                    <input
                        type="text"
                        placeholder="Cari nama atau kode..."
                        className="w-full sm:w-72 p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-grow overflow-y-auto rounded-lg border border-border-color">
                    <table className="min-w-full bg-surface">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase w-32">ID</th>
                                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase">Item Name</th>
                                <th className="py-3 px-4 text-center text-xs font-bold text-text-secondary uppercase w-24">Cat</th>
                                <th className="py-3 px-4 text-left text-xs font-bold text-text-secondary uppercase w-24">Img</th>
                                <th className="py-3 px-4 text-right text-xs font-bold text-text-secondary uppercase w-32">Price</th>
                                <th className="py-3 px-4 text-center text-xs font-bold text-text-secondary uppercase w-28">Qty</th>
                                <th className="py-3 px-4 text-right text-xs font-bold text-text-secondary uppercase w-36">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {filteredItems.map((item, index) => (
                                <tr key={item.productId} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-100 transition-colors`}>
                                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{item.productId}</td>
                                    <td className="py-3 px-4">
                                        <div className="text-sm font-medium text-text-primary">{item.productName}</div>
                                        <div className="text-[10px] text-gray-400 uppercase">{item.unit}</div>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                         <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${item.category === 'Asset' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {item.category === 'Asset' ? 'AST' : 'HB'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <img 
                                            src={item.productImage} 
                                            alt={item.productName} 
                                            className="w-10 h-10 object-cover rounded cursor-pointer"
                                            onClick={() => setZoomedImage({ src: item.productImage, alt: item.productName })}
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm text-text-secondary">{formatCurrency(item.price)}</td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="number"
                                            value={item.qty === 0 ? '' : item.qty}
                                            onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                            className="w-16 p-1 border border-gray-600 bg-gray-700 text-white rounded text-center mx-auto block focus:ring-2 focus:ring-primary"
                                            placeholder="0"
                                            min="0"
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm font-semibold text-primary">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="flex-shrink-0 border-t border-border-color mt-auto pt-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center">
                        <div className="text-lg">
                            <span className="font-medium text-text-secondary">Grand Total: </span>
                            <span className="font-bold text-2xl text-primary">{formatCurrency(grandTotal)}</span>
                        </div>
                        <div className="w-full sm:w-auto mt-4 sm:mt-0">
                             {error && <p className="text-danger text-sm text-center mb-2">{error}</p>}
                            <Button 
                                variant="primary"
                                className="w-full" 
                                onClick={handleOpenConfirmModal} 
                                disabled={itemsToSubmit.length === 0}
                            >
                                Submit Budgeting
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Submission">
                <div className="text-center p-2">
                    <p className="mb-6 text-text-primary text-lg">Konfirmasi pengajuan budgeting sebesar:</p>
                    <p className="text-4xl font-black text-primary mb-8">{formatCurrency(grandTotal)}</p>
                    <div className="flex justify-center space-x-3">
                        <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>Batal</Button>
                        <Button variant="primary" onClick={handleSubmit}>Ya, Submit Sekarang</Button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Success">
                <div className="text-center p-4">
                    <div className="mb-4 text-secondary">
                        <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-md text-text-primary">Budgeting anda berhasil disubmit.</p>
                    <div className="mt-6"><Button onClick={() => setIsSuccessModalOpen(false)}>Selesai</Button></div>
                </div>
            </Modal>

            <Modal isOpen={!!zoomedImage} onClose={() => setZoomedImage(null)} title={zoomedImage?.alt || 'Product'}>
                {zoomedImage && <img src={zoomedImage.src} className="max-w-full rounded-lg" />}
            </Modal>
        </div>
    );
};

export default UserInputBudgetPage;
