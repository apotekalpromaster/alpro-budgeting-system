import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { getPendingApprovals, approveBudget, rejectBudget } from '../../services/api';
import { BudgetRequest, BudgetItem } from '../../types';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const ManagerApprovalPage: React.FC = () => {
    usePageTitle('Pending Approvals');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [error, setError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    const fetchApprovals = async () => {
        if (user) {
            try {
                setIsLoading(true);
                const approvalsData = await getPendingApprovals(user);
                setRequests(approvalsData);
            } catch (err) {
                setError('Failed to fetch pending approvals.');
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchApprovals();
    }, [user]);

    const handleApprove = async () => {
        if (!user || !selectedRequest) return;

        setIsConfirmModalOpen(false);
        setIsLoading(true);
        try {
            await approveBudget(selectedRequest.id, user);

            if (selectedRequest.total > 5000000) {
                setSuccessMessage("Terimakasih sudah approve budgeting ini tapi karna nilainya diatas 5jt maka saya akan eskalasikan kepada BOD terkait untuk review dan approval terakhir.");
            } else {
                setSuccessMessage("Terimakasih sudah approval budget ini, saya akan infokan ke bagian pengadaan untuk proses budgeting ini.");
            }
            
            setIsSuccessModalOpen(true);
            setSelectedRequest(null);
            fetchApprovals(); // Refresh list after all operations
        } catch (err) {
            alert('Failed to approve request.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReject = async () => {
        if (!user || !selectedRequest || !rejectionReason) return;
        setIsLoading(true);
        try {
            await rejectBudget(selectedRequest.id, user, rejectionReason);
            setSelectedRequest(null);
            setIsRejecting(false);
            setRejectionReason('');
            fetchApprovals(); // Refresh list
        } catch (err) {
            alert('Failed to reject request.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Card title="Budget Requests for Your Approval">
            {error && <p className="text-center text-danger">{error}</p>}
            {requests.length === 0 && !error && <p className="text-center text-text-secondary">No pending approvals at the moment.</p>}
            <div className="overflow-x-auto">
                <table className="min-w-full bg-surface">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Submitted By</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Department</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                            <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {requests.map((req, index) => (
                            <tr key={req.id} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-100 transition-colors`}>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-text-secondary">{new Date(req.submittedAt).toLocaleDateString()}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-text-primary">{req.userName}</td>
                                <td className="py-4 px-6 whitespace-nowrap text-sm text-text-secondary">{req.department}</td>
                                <td className="py-4 px-6 whitespace-nowrap font-semibold text-sm text-text-primary">{formatCurrency(req.total)}</td>
                                <td className="py-4 px-6 whitespace-nowrap"><Badge status={req.status} /></td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                    <button onClick={() => setSelectedRequest(req)} className="text-primary hover:underline text-sm font-semibold">Review</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!selectedRequest} onClose={() => { setSelectedRequest(null); setIsRejecting(false); setIsConfirmModalOpen(false); }} title="Review Budget Request" size="4xl">
                {selectedRequest && (
                    isRejecting ? (
                        <div>
                            <h4 className="font-bold mb-2 text-text-primary">Reason for Rejection:</h4>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 rounded-md focus:ring-2 focus:ring-primary transition-shadow"
                                rows={3}
                                placeholder="Please provide a clear reason..."
                            ></textarea>
                            <div className="flex justify-end space-x-2 mt-4">
                                <Button variant="ghost" onClick={() => setIsRejecting(false)}>Cancel</Button>
                                <Button variant="danger" onClick={handleReject} disabled={!rejectionReason}>
                                    Confirm Rejection
                                </Button>
                            </div>
                        </div>
                    ) : (
                    <div className="text-text-primary">
                        <p><strong>From:</strong> {selectedRequest.userName} ({selectedRequest.department})</p>
                        <p><strong>Total:</strong> <span className="font-bold text-primary">{formatCurrency(selectedRequest.total)}</span></p>
                        <h4 className="font-bold mt-4 pt-4 border-t border-border-color text-text-primary">Items:</h4>
                        <div className="max-h-[60vh] overflow-y-auto border rounded-lg">
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
                        <div className="flex justify-end space-x-3 mt-6">
                            <Button variant="danger" onClick={() => setIsRejecting(true)}>Reject</Button>
                            <Button variant="primary" onClick={() => setIsConfirmModalOpen(true)}>
                                Approve
                            </Button>
                        </div>
                    </div>
                    )
                )}
            </Modal>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Approval">
                <div>
                    <p className="mb-4 text-text-primary">Are you sure you want to approve this budget request?</p>
                    <div className="flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setIsConfirmModalOpen(false)}>No, Cancel</Button>
                        <Button variant="primary" onClick={handleApprove}>Yes, Approve</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title="Approval Successful">
                <div className="text-center p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-secondary mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-md text-text-primary">
                        {successMessage}
                    </p>
                    <div className="mt-6">
                        <Button variant="primary" onClick={() => setIsSuccessModalOpen(false)}>
                            OK
                        </Button>
                    </div>
                </div>
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

export default ManagerApprovalPage;