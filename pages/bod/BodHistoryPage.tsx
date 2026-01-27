import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { getBudgetRequests } from '../../services/api';
import { BudgetRequest, BudgetItem, BudgetStatus } from '../../types';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import FilterDropdown from '../../components/common/FilterDropdown';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const BodHistoryPage: React.FC = () => {
    usePageTitle('Budget History (BOD)');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [error, setError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);
    const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

    // Filter states
    const [filterSubmittedBy, setFilterSubmittedBy] = useState<string>('all');
    const [filterDepartment, setFilterDepartment] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

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

    const { uniqueSubmitters, uniqueDepartments } = useMemo(() => {
        const submitters = new Set<string>();
        const departments = new Set<string>();
        requests.forEach(req => {
            submitters.add(req.userName);
            departments.add(req.department);
        });
        return {
            uniqueSubmitters: Array.from(submitters).sort(),
            uniqueDepartments: Array.from(departments).sort(),
        };
    }, [requests]);

    const statusOptions = Object.values(BudgetStatus);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const submittedByMatch = filterSubmittedBy === 'all' || req.userName === filterSubmittedBy;
            const departmentMatch = filterDepartment === 'all' || req.department === filterDepartment;
            const statusMatch = filterStatus === 'all' || req.status === filterStatus;
            return submittedByMatch && departmentMatch && statusMatch;
        });
    }, [requests, filterSubmittedBy, filterDepartment, filterStatus]);


    return (
        <Card title="All Company Budget Requests">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 rounded-xl border border-border-color">
                <FilterDropdown
                    id="submittedByFilter"
                    label="Submitted By"
                    value={filterSubmittedBy}
                    onChange={(e) => setFilterSubmittedBy(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Users' },
                        ...uniqueSubmitters.map(name => ({ value: name, label: name }))
                    ]}
                />
                <FilterDropdown
                    id="departmentFilter"
                    label="Department"
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Departments' },
                        ...uniqueDepartments.map(dept => ({ value: dept, label: dept }))
                    ]}
                />
                <FilterDropdown
                    id="statusFilter"
                    label="Status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Statuses' },
                        ...statusOptions.map(status => ({ value: status, label: status }))
                    ]}
                />
            </div>

            {error && <p className="text-center text-danger">{error}</p>}
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
                        {filteredRequests.length > 0 ? (
                            filteredRequests.map((req, index) => (
                                <tr key={req.id} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-100 transition-colors`}>
                                    <td className="py-4 px-6 text-sm text-text-secondary">{new Date(req.submittedAt).toLocaleDateString()}</td>
                                    <td className="py-4 px-6 text-sm font-medium text-text-primary">{req.userName}</td>
                                    <td className="py-4 px-6 text-sm text-text-secondary">{req.department}</td>
                                    <td className="py-4 px-6 font-semibold text-sm text-text-primary">{formatCurrency(req.total)}</td>
                                    <td className="py-4 px-6"><Badge status={req.status} /></td>
                                    <td className="py-4 px-6">
                                        <button onClick={() => setSelectedRequest(req)} className="text-primary hover:underline text-sm font-semibold">View Details</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                             <tr>
                                <td colSpan={6} className="text-center py-10 text-text-secondary">
                                    {requests.length === 0 ? 'No budget requests found.' : 'No requests match the current filters.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!selectedRequest} onClose={() => setSelectedRequest(null)} title="Request Details" size="4xl">
                {selectedRequest && (
                     <div className="space-y-4 text-text-primary">
                        <p><strong>Submitted By:</strong> {selectedRequest.userName} ({selectedRequest.department})</p>
                        <p><strong>Status:</strong> <Badge status={selectedRequest.status} /></p>
                        <p><strong>Total:</strong> <span className="font-bold text-primary">{formatCurrency(selectedRequest.total)}</span></p>
                        {selectedRequest.rejectedReason && <p><strong>Rejection Reason:</strong> {selectedRequest.rejectedReason}</p>}
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

export default BodHistoryPage;