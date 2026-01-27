import React, { useState, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLoading } from '../../hooks/useLoading';
import { useData } from '../../hooks/useData';
import { addProduct, updateProduct, deleteProduct } from '../../services/api';
import { Product, ProductCategory } from '../../types';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const AdminMasterDataPage: React.FC = () => {
    usePageTitle('Manage Products');
    const { setIsLoading } = useLoading();
    const { products, vendors, refreshData } = useData(); 
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

    const [searchTerm, setSearchTerm] = useState('');
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);

    const filteredProducts = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            String(p.name || '').toLowerCase().includes(lowerSearchTerm) ||
            String(p.id || '').toLowerCase().includes(lowerSearchTerm)
        );
    }, [products, searchTerm]);

    const openModal = (product: Product | null = null) => {
        if (product) {
            // CRITICAL FIX: Ensure category and other potential missing fields are initialized 
            // so the validation check in handleSave doesn't fail on undefined/null values.
            setEditingProduct({ 
                ...product, 
                category: product.category || 'Habis Pakai',
                vendorId: product.vendorId || '',
                price: product.price || 0
            });
            setIsEditMode(true);
        } else {
            setEditingProduct({ id: '', name: '', imageUrl: '', unit: '', price: 0, vendorId: '', category: 'Habis Pakai' });
            setIsEditMode(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct({});
        setIsEditMode(false);
    };

    const handleSave = async () => {
        if (!editingProduct) return;
        
        // Detailed validation to help debugging
        const missingFields = [];
        if (!editingProduct.id) missingFields.push("Product ID");
        if (!editingProduct.name) missingFields.push("Product Name");
        if (!editingProduct.unit) missingFields.push("Unit");
        if (editingProduct.price === undefined || editingProduct.price < 0) missingFields.push("Valid Price");
        if (!editingProduct.vendorId) missingFields.push("Vendor");
        if (!editingProduct.category) missingFields.push("Category");

        if (missingFields.length > 0) {
            alert(`Mohon isi semua field: ${missingFields.join(", ")}`);
            return;
        }

        setIsLoading(true);
        try {
            if (isEditMode) {
                await updateProduct(editingProduct as Product);
            } else {
                await addProduct(editingProduct as Product);
            }
            await refreshData('products'); 
            closeModal();
        } catch (error) {
            console.error("Failed to save product", error);
            alert(`Gagal menyimpan produk: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
             setIsLoading(false);
        }
    };
    
    const promptDelete = (productId: string) => {
        setProductToDelete(productId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        setIsLoading(true);
        try {
            await deleteProduct(productToDelete);
            await refreshData('products'); 
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        } catch(error) {
            console.error("Failed to delete product", error);
            alert("Gagal menghapus produk.");
        } finally {
             setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingProduct) return;
        const { name, value } = e.target;
        setEditingProduct(prev => ({ 
            ...prev, 
            [name]: name === 'price' ? Number(value) : value 
        }));
    };

    return (
        <Card className="flex flex-col h-[calc(100vh-8rem)] !p-0 overflow-hidden">
            <div className="p-6 pb-4 border-b border-border-color bg-surface z-20 shrink-0">
                <h2 className="text-2xl font-bold text-text-primary mb-6">Manage Products</h2>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="w-full sm:w-auto flex-grow max-w-md">
                         <input
                            type="text"
                            placeholder="Cari ID atau Nama..."
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded focus:ring-2 focus:ring-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => openModal()} className="w-full sm:w-auto">Add New Product</Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-auto bg-surface p-6 pt-0">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Image</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Name</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Category</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Unit</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Price</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Vendor</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider bg-gray-50">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6">
                                    <img 
                                        src={p.imageUrl} 
                                        alt={p.name} 
                                        className="w-12 h-12 rounded-md object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setZoomedImage({ src: p.imageUrl, alt: p.name })}
                                    />
                                </td>
                                <td className="py-4 px-6">
                                    <div className="text-sm font-medium text-text-primary">{p.name}</div>
                                    <div className="text-[10px] font-mono text-gray-400">{p.id}</div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.category === 'Asset' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {p.category || 'Habis Pakai'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{p.unit}</td>
                                <td className="py-4 px-6 text-sm text-text-secondary">{formatCurrency(p.price)}</td>
                                <td className="py-4 px-6 text-sm font-mono text-gray-500">{p.vendorId}</td>
                                <td className="py-4 px-6 space-x-2 whitespace-nowrap">
                                    <Button variant="ghost" className="!py-1" onClick={() => openModal(p)}>Edit</Button>
                                    <Button variant="danger" className="!py-1" onClick={() => promptDelete(p.id)}>Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={isEditMode ? 'Edit Product' : 'Add Product'}>
                {editingProduct && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product ID</label>
                                <input 
                                    name="id" 
                                    value={editingProduct.id || ''} 
                                    onChange={handleChange} 
                                    placeholder="e.g., prod-011" 
                                    className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    disabled={isEditMode}
                                />
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <select 
                                    name="category" 
                                    value={editingProduct.category || 'Habis Pakai'} 
                                    onChange={handleChange} 
                                    className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                                >
                                    <option value="Habis Pakai" className="bg-white text-black">Habis Pakai (Consumables)</option>
                                    <option value="Asset" className="bg-white text-black">Asset (Hardware/Furniture)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                            <input name="name" value={editingProduct.name || ''} onChange={handleChange} placeholder="Product Name" className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unit</label>
                                <input name="unit" value={editingProduct.unit || ''} onChange={handleChange} placeholder="e.g., Pcs, Rim" className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label>
                                <input name="price" type="number" value={editingProduct.price || 0} onChange={handleChange} placeholder="Price" className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                            <input name="imageUrl" value={editingProduct.imageUrl || ''} onChange={handleChange} placeholder="https://..." className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary" />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vendor</label>
                            <select 
                                name="vendorId" 
                                value={editingProduct.vendorId || ''} 
                                onChange={handleChange} 
                                className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                            >
                                <option value="" className="bg-white text-black">-- Select Vendor --</option>
                                {vendors.map(v => (
                                    <option key={v.vendorId} value={v.vendorId} className="bg-white text-black">
                                        {v.vendorName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                            <Button onClick={handleSave}>Save Product</Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center p-2">
                    <p className="mb-6 text-text-primary">Apakah Anda yakin ingin menghapus produk ini?</p>
                    <div className="flex justify-center space-x-3">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Batal</Button>
                        <Button variant="danger" onClick={confirmDelete}>Ya, Hapus</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!zoomedImage} onClose={() => setZoomedImage(null)} title={zoomedImage?.alt || 'Product Image'}>
                {zoomedImage && (
                    <div className="flex justify-center items-center">
                        <img src={zoomedImage.src} alt={zoomedImage.alt} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default AdminMasterDataPage;