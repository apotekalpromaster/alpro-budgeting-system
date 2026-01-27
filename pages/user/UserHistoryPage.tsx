import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { getBudgetRequests } from '../../services/api';
import { BudgetRequest, BudgetItem, BudgetStatus, ProcurementStatus } from '../../types';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const UserHistoryPage: React.FC = () => {
    usePageTitle('My Budget History');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [error, setError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    useEffect(() => {
        if (user) {
            const fetchHistory = async () => {
                try {
                    setIsLoading(true);
                    const data = await getBudgetRequests(user);
                    setRequests(data.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
                } catch (err) {
                    setError('Failed to fetch history.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchHistory();
        }
    }, [user, setIsLoading]);

    return (
        <Card title="My Submitted Requests">
            {error && <p className="text-center text-danger">{error}</p>}
            {requests.length === 0 && !error && <p className="text-center text-text-secondary">You have not submitted any budget requests.</p>}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Date Submitted</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Request ID</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Procurement Status</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {requests.map((req, index) => (
                            <tr key={req.id} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-100 transition-colors`}>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-text-secondary">{new Date(req.submittedAt).toLocaleDateString()}</td>
                                <td className="py-4 px-6 whitespace-nowrap font-mono text-sm text-text-secondary">{req.id.substring(0, 8)}...</td>
                                <td className="py-4 px-6 whitespace-nowrap font-semibold text-sm text-text-primary">{formatCurrency(req.total)}</td>
                                <td className="py-4 px-6 whitespace-nowrap"><Badge status={req.status} /></td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    {req.status === BudgetStatus.APPROVED ? (
                                        <Badge status={req.procurementStatus || ProcurementStatus.PENDING} />
                                    ) : (
                                        <span className="text-text-secondary text-sm">—</span>
                                    )}
                                </td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    <button onClick={() => setSelectedRequest(req)} className="text-primary hover:underline text-sm font-semibold">View Details</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title={`Details for Request ${selectedRequest?.id.substring(0, 8)}...`} size="4xl">
                {selectedRequest && (
                    <div className="space-y-4 text-text-primary">
                        <div><strong>Status:</strong> <Badge status={selectedRequest.status} /></div>
                         {selectedRequest.status === BudgetStatus.APPROVED && (
                            <div>
                                <strong>Procurement Status:</strong>{' '}
                                <Badge status={selectedRequest.procurementStatus || ProcurementStatus.PENDING} />
                            </div>
                        )}
                        <div><strong>Total:</strong> <span className="font-bold text-primary">{formatCurrency(selectedRequest.total)}</span></div>
                        {selectedRequest.rejectedReason && <div><strong className="text-danger">Rejection Reason:</strong> {selectedRequest.rejectedReason}</div>}
                        <h4 className="font-bold mt-4 pt-4 border-t border-border-color text-text-primary">Items Requested:</h4>
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                           <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-2 px-3 text-left font-semibold text-text-secondary w-16">Image</th>
                                        <th className="py-2 px-3 text-left font-semibold text-text-secondary">Nama Item</th>
                                        <th className="py-2 px-3 text-left font-semibold text-text-secondary">Satuan</th>
                                        <th className="py-2 px-3 text-right font-semibold text-text-secondary">Harga</th>
                                        <th className="py-2 px-3 text-center font-semibold text-text-secondary">Qty</th>
                                        <th className="py-2 px-3 text-right font-semibold text-text-secondary">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                    {(Array.isArray(selectedRequest.items) ? selectedRequest.items : JSON.parse(selectedRequest.items as any)).map((item: BudgetItem) => (
                                        <tr key={item.productId}>
                                            <td className="py-2 px-3">
                                                 {item.productImage && (
                                                    <img 
                                                        src={item.productImage} 
                                                        alt={item.productName} 
                                                        className="w-10 h-10 object-cover rounded cursor-pointer hover:scale-150 transition-transform origin-left"
                                                        onClick={() => setZoomedImage({ src: item.productImage, alt: item.productName })}
                                                    />
                                                )}
                                            </td>
                                            <td className="py-2 px-3 whitespace-normal text-text-primary font-medium">{item.productName}</td>
                                            <td className="py-2 px-3 text-text-secondary">{item.unit}</td>
                                            <td className="py-2 px-3 text-right text-text-secondary">{formatCurrency(item.price)}</td>
                                            <td className="py-2 px-3 text-center text-text-secondary">{item.qty}</td>
                                            <td className="py-2 px-3 text-right text-text-primary font-semibold">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!zoomedImage} onClose={() => setZoomedImage(null)} title={zoomedImage?.alt || 'Product Image'}>
                {zoomedImage && (
                    <div className="flex justify-center items-center">
                        <img src={zoomedImage.src} alt={zoomedImage.alt} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
                    </div>
                )}
            </Modal>
        </Card>
    );
};

export default UserHistoryPage;