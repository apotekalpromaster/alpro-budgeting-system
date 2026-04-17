// File: pages/user/UserInputBudgetPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { useLoading } from '../../hooks/useLoading';
import { submitMultipleBudgets, BudgetRequestPayload } from '../../services/supabase';
import { BudgetItem } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const UserInputBudgetPage: React.FC = () => {
    usePageTitle('Input Budget');
    const { user } = useAuth();
    const { products, isDataLoaded } = useData();
    const { setIsLoading } = useLoading();

    const [allProducts, setAllProducts] = useState<BudgetItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Semua Kategori');
    const [error, setError] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    useEffect(() => {
        if (products.length > 0) {
            setAllProducts(products.map(p => ({
                productId:    p.id,
                productName:  p.name,
                productImage: p.imageUrl,
                unit:         p.unit,
                price:        p.price,
                vendorId:     p.vendorId,
                category:     p.category ?? 'Habis Pakai',
                qty:          0,
                total:        0,
            })));
        }
    }, [products]);

    useEffect(() => {
        setIsLoading(!isDataLoaded);
    }, [isDataLoaded, setIsLoading]);

    const handleQuantityChange = (productId: string, newQtyString: string) => {
        const newQty = parseInt(newQtyString, 10);
        setAllProducts(prev => prev.map(item =>
            item.productId === productId
                ? { ...item, qty: isNaN(newQty) || newQty < 0 ? 0 : newQty, total: (isNaN(newQty) || newQty < 0 ? 0 : newQty) * item.price }
                : item
        ));
    };

    const filteredItems = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return allProducts.filter(p => {
            const matchesSearch   = p.productName.toLowerCase().includes(term) || p.productId.toLowerCase().includes(term);
            const matchesCategory = categoryFilter === 'Semua Kategori' || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [allProducts, searchTerm, categoryFilter]);

    const itemsToSubmit = useMemo(() => allProducts.filter(i => i.qty > 0), [allProducts]);
    const grandTotal    = useMemo(() => itemsToSubmit.reduce((sum, i) => sum + i.total, 0), [itemsToSubmit]);

    const handleOpenConfirmModal = () => {
        setError('');
        if (itemsToSubmit.length === 0) {
            setError('Keranjang kosong. Silahkan masukkan qty pada setidaknya satu item.');
            return;
        }
        setIsConfirmModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!user) {
            setError('Sesi berakhir. Silahkan login kembali.');
            setIsConfirmModalOpen(false);
            return;
        }

        // outletId wajib ada di user session (diisi oleh AuthProvider dari tabel public.users)
        const outletId = (user as any).outletId as string | undefined;
        if (!outletId) {
            setError('Akun Anda belum terdaftar di outlet manapun. Hubungi Admin.');
            setIsConfirmModalOpen(false);
            return;
        }

        setIsLoading(true);
        setIsConfirmModalOpen(false);

        try {
            // Kelompokkan item berdasarkan vendorId → satu BudgetRequestPayload per vendor
            const itemsByVendor = new Map<string, BudgetItem[]>();
            itemsToSubmit.forEach(item => {
                const vId = item.vendorId || 'unknown';
                if (!itemsByVendor.has(vId)) itemsByVendor.set(vId, []);
                itemsByVendor.get(vId)!.push(item);
            });

            const requestsPayload: BudgetRequestPayload[] = [];
            for (const [vendorId, items] of itemsByVendor.entries()) {
                requestsPayload.push({
                    userId:             user.id,
                    userName:           user.name,
                    department:         user.department,
                    outletId:           outletId,
                    items:              items,
                    total:              items.reduce((sum, i) => sum + i.total, 0),
                    vendorId:           vendorId === 'unknown' ? null : vendorId,
                    managerApproverId:  user.managerId,
                    bodApproverId:      user.bodId,
                });
            }

            await submitMultipleBudgets(requestsPayload);

            setIsSuccessModalOpen(true);
            setAllProducts(prev => prev.map(item => ({ ...item, qty: 0, total: 0 })));
        } catch (err: any) {
            setError(err?.message ?? 'Gagal submit budgeting. Silahkan coba kembali.');
            console.error('[UserInputBudgetPage] Submit error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full relative pb-24 md:pb-28">
            <Card className="flex flex-col h-full overflow-hidden">
                <div className="flex-shrink-0 flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-text-primary">Product List</h2>
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                        <select
                            className="p-2.5 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary text-sm min-w-[150px]"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="Semua Kategori">Semua Kategori</option>
                            <option value="Asset">Asset</option>
                            <option value="Habis Pakai">Habis Pakai</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Cari nama atau kode..."
                            className="flex-grow sm:w-72 p-2.5 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-primary text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto rounded-lg border border-border-color mb-4">
                    <table className="min-w-full bg-surface">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="py-4 px-4 text-left text-sm font-bold text-text-secondary uppercase w-32">ID</th>
                                <th className="py-4 px-4 text-left text-sm font-bold text-text-secondary uppercase">Item Name</th>
                                <th className="py-4 px-4 text-center text-sm font-bold text-text-secondary uppercase w-24">Cat</th>
                                <th className="py-4 px-4 text-center text-sm font-bold text-text-secondary uppercase w-24">Img</th>
                                <th className="py-4 px-4 text-right text-sm font-bold text-text-secondary uppercase w-32">Price</th>
                                <th className="py-4 px-4 text-center text-sm font-bold text-text-secondary uppercase w-28">Qty</th>
                                <th className="py-4 px-4 text-right text-sm font-bold text-text-secondary uppercase w-36">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {filteredItems.map((item, index) => (
                                <tr key={item.productId} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-50 transition-colors`}>
                                    <td className="py-4 px-4 font-mono text-sm text-gray-500">{item.productId}</td>
                                    <td className="py-4 px-4">
                                        <div className="text-sm font-semibold text-text-primary">{item.productName}</div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">{item.unit}</div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight ${item.category === 'Asset' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {item.category === 'Asset' ? 'ASSET' : 'HB'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setZoomedImage({ src: item.productImage, alt: item.productName })}
                                            className="focus:outline-none focus:ring-2 focus:ring-primary rounded p-0.5 transition-all hover:opacity-80"
                                            aria-label={`Perbesar gambar produk ${item.productName}`}
                                        >
                                            <img src={item.productImage} alt={item.productName} className="w-12 h-12 object-cover rounded shadow-sm" />
                                        </button>
                                    </td>
                                    <td className="py-4 px-4 text-right text-sm text-text-secondary font-medium">{formatCurrency(item.price)}</td>
                                    <td className="py-4 px-4">
                                        <input
                                            type="number"
                                            value={item.qty === 0 ? '' : item.qty}
                                            onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                            className="w-20 p-2 border border-gray-600 bg-gray-700 text-white rounded text-center mx-auto block focus:ring-2 focus:ring-primary text-sm sm:text-base font-bold"
                                            placeholder="0"
                                            min="0"
                                        />
                                    </td>
                                    <td className="py-4 px-4 text-right text-sm font-bold text-primary">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-surface border-t border-border-color p-4 md:p-6 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1),0_-4px_6px_-4px_rgba(0,0,0,0.1)] z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total Pengajuan</span>
                            <span className="font-bold text-2xl md:text-3xl text-primary">{formatCurrency(grandTotal)}</span>
                        </div>
                        <div className="h-10 w-px bg-gray-200 hidden md:block mx-4"></div>
                        <div className="hidden sm:flex flex-col">
                            <span className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Item Terpilih</span>
                            <span className="font-bold text-lg text-text-primary">{itemsToSubmit.length} Produk</span>
                        </div>
                    </div>
                    <div className="w-full md:w-72">
                        {error && <p className="text-danger text-xs text-center mb-2 font-bold bg-danger/10 py-1.5 rounded">{error}</p>}
                        <Button
                            variant="primary"
                            className="w-full py-3 md:py-4 text-base font-bold shadow-lg hover:translate-y-[-2px] transition-all"
                            onClick={handleOpenConfirmModal}
                            disabled={itemsToSubmit.length === 0}
                        >
                            SUBMIT BUDGETING
                        </Button>
                    </div>
                </div>
            </div>

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
                {zoomedImage && <img src={zoomedImage.src} className="max-w-full rounded-lg" alt={zoomedImage.alt} />}
            </Modal>
        </div>
    );
};

export default UserInputBudgetPage;
