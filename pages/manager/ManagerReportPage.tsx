import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { getBudgetRequests } from '../../services/api';
import { BudgetRequest, BudgetStatus } from '../../types';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const ReportStatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="flex items-center p-4">
        <div className="p-3 rounded-full bg-primary/20 text-primary mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </Card>
);

const ManagerReportPage: React.FC = () => {
    usePageTitle('Department Reports');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [error, setError] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');

    useEffect(() => {
        if (user) {
            const fetchRequests = async () => {
                try {
                    setIsLoading(true);
                    const data = await getBudgetRequests(user);
                    setRequests(data);
                } catch (err) {
                    setError('Failed to load report data.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchRequests();
        }
    }, [user, setIsLoading]);

    const { years, monthOptions } = useMemo(() => {
        const yearSet = new Set<string>();
        requests.forEach(r => yearSet.add(new Date(r.submittedAt).getFullYear().toString()));
        const years = Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
        const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return { years, monthOptions };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const date = new Date(req.submittedAt);
            const monthMatch = selectedMonth === 'all' || date.getMonth() === parseInt(selectedMonth);
            const yearMatch = selectedYear === 'all' || date.getFullYear() === parseInt(selectedYear);
            return monthMatch && yearMatch;
        });
    }, [requests, selectedMonth, selectedYear]);

    const reportStats = useMemo(() => {
        const totalRequests = filteredRequests.length;
        const pending = filteredRequests.filter(r => r.status === BudgetStatus.PENDING_MANAGER_APPROVAL || r.status === BudgetStatus.PENDING_BOD_APPROVAL).length;
        const approved = filteredRequests.filter(r => r.status === BudgetStatus.APPROVED).length;
        const rejected = filteredRequests.filter(r => r.status === BudgetStatus.REJECTED).length;
        const totalApprovedAmount = filteredRequests
            .filter(r => r.status === BudgetStatus.APPROVED)
            .reduce((sum, r) => sum + r.total, 0);

        return { totalRequests, pending, approved, rejected, totalApprovedAmount };
    }, [filteredRequests]);

    if (error) return <p className="text-center text-danger">{error}</p>;

    return (
        <div className="space-y-6">
            <Card title={`Report for ${user?.department} Department`}>
                <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg border items-center">
                    <h3 className="text-md font-semibold text-text-primary mr-4">Filters:</h3>
                    <div className="flex-1 min-w-[150px]">
                         <label htmlFor="month-filter" className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select
                            id="month-filter"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary transition-shadow"
                        >
                            <option value="all">All Months</option>
                            {monthOptions.map((month, index) => (
                                <option key={index} value={index}>{month}</option>
                            ))}
                        </select>
                    </div>
                     <div className="flex-1 min-w-[150px]">
                         <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select
                            id="year-filter"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary transition-shadow"
                        >
                            <option value="all">All Years</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ReportStatCard title="Total Requests" value={reportStats.totalRequests} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
                    <ReportStatCard title="Approved Requests" value={reportStats.approved} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <ReportStatCard title="Total Approved Budget" value={formatCurrency(reportStats.totalApprovedAmount)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                    <ReportStatCard title="Pending Requests" value={reportStats.pending} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                    <ReportStatCard title="Rejected Requests" value={reportStats.rejected} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>} />
                 </div>
            </Card>
            <Card title="Filtered Requests">
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-surface">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Date</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Submitted By</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {filteredRequests.length > 0 ? (
                                filteredRequests.slice(0, 10).map((req, index) => (
                                    <tr key={req.id} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-100 transition-colors`}>
                                        <td className="py-4 px-6 text-sm text-text-secondary">{new Date(req.submittedAt).toLocaleDateString()}</td>
                                        <td className="py-4 px-6 text-sm font-medium text-text-primary">{req.userName}</td>
                                        <td className="py-4 px-6 font-semibold text-sm text-text-primary">{formatCurrency(req.total)}</td>
                                        <td className="py-4 px-6">
                                            <Badge status={req.status} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-text-secondary">
                                        No requests found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ManagerReportPage;