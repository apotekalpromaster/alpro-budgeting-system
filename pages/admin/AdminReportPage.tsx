import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { getBudgetRequests } from '../../services/api';
import { BudgetRequest, BudgetStatus, ProcurementStatus } from '../../types';
import Card from '../../components/common/Card';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

interface DepartmentReport {
    department: string;
    month: string;
    year: string;
    totalRequests: number;
    totalApprovedAmount: number;
    totalRejected: number;
    totalRejectedAmount: number;
}

const ReportStatCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <Card className="p-4 text-center">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
    </Card>
);

const AdminReportPage: React.FC = () => {
    usePageTitle('System-Wide Reports');
    const { user } = useAuth();
    const { setIsLoading } = useLoading();
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [error, setError] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

    useEffect(() => {
        if (user) {
            const fetchRequests = async () => {
                try {
                    setIsLoading(true);
                    const data = await getBudgetRequests(user); // For Admin, this fetches all requests
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

    const { departments, years, monthOptions } = useMemo(() => {
        const yearSet = new Set<string>();
        const departmentSet = new Set<string>();
        requests.forEach(r => {
            yearSet.add(new Date(r.submittedAt).getFullYear().toString());
            departmentSet.add(r.department);
        });
        const years = Array.from(yearSet).sort((a, b) => parseInt(b) - parseInt(a));
        const departments = Array.from(departmentSet).sort();
        const monthOptions = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return { departments, years, monthOptions };
    }, [requests]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const date = new Date(req.submittedAt);
            const monthMatch = selectedMonth === 'all' || date.getMonth() === parseInt(selectedMonth);
            const yearMatch = selectedYear === 'all' || date.getFullYear() === parseInt(selectedYear);
            const departmentMatch = selectedDepartment === 'all' || req.department === selectedDepartment;
            return monthMatch && yearMatch && departmentMatch;
        });
    }, [requests, selectedMonth, selectedYear, selectedDepartment]);


    const { departmentReports, procurementStats } = useMemo(() => {
        // Department Aggregation
        const reports: { [key: string]: DepartmentReport } = {};
        filteredRequests.forEach(req => {
            const date = new Date(req.submittedAt);
            const year = date.getFullYear().toString();
            const month = monthOptions[date.getMonth()];
            const key = `${req.department}-${year}-${month}`;

            if (!reports[key]) {
                 reports[key] = { 
                     department: req.department, 
                     month, 
                     year, 
                     totalRequests: 0, 
                     totalApprovedAmount: 0,
                     totalRejected: 0,
                     totalRejectedAmount: 0
                 };
            }
            reports[key].totalRequests++;
            if (req.status === BudgetStatus.APPROVED) {
                reports[key].totalApprovedAmount += req.total;
            }
            if (req.status === BudgetStatus.REJECTED) {
                reports[key].totalRejected++;
                reports[key].totalRejectedAmount += req.total;
            }
        });
        const departmentReports = Object.values(reports).sort((a, b) => b.totalApprovedAmount - a.totalApprovedAmount);

        // Procurement Aggregation
        const approvedRequests = filteredRequests.filter(r => r.status === BudgetStatus.APPROVED);
        const procurementStats = {
            pending: approvedRequests.filter(r => !r.procurementStatus || r.procurementStatus === ProcurementStatus.PENDING).length,
            inProgress: approvedRequests.filter(r => r.procurementStatus === ProcurementStatus.IN_PROGRESS).length,
            procured: approvedRequests.filter(r => r.procurementStatus === ProcurementStatus.PROCURED).length,
        };

        return { departmentReports, procurementStats };
    }, [filteredRequests, monthOptions]);
    
    if (error) return <p className="text-center text-danger">{error}</p>;

    return (
        <div className="space-y-6">
            <Card title="Report Filters">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 min-w-[150px]">
                        <label htmlFor="month-filter" className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <select id="month-filter" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary transition-shadow">
                            <option value="all">All Months</option>
                            {monthOptions.map((month, index) => <option key={index} value={index}>{month}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label htmlFor="year-filter" className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <select id="year-filter" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary transition-shadow">
                            <option value="all">All Years</option>
                            {years.map(year => <option key={year} value={year}>{year}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label htmlFor="dept-filter" className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select id="dept-filter" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-primary transition-shadow">
                            <option value="all">All Departments</option>
                            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <Card title="Procurement Pipeline Summary">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ReportStatCard title="Pending Procurement" value={procurementStats.pending} />
                    <ReportStatCard title="In Progress" value={procurementStats.inProgress} />
                    <ReportStatCard title="Procured" value={procurementStats.procured} />
                </div>
            </Card>

            <Card title="Budget Summary by Department">
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-surface">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Department</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Month</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Year</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total Requests</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total Approved</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Total Cancelled (Rejected)</th>
                                <th className="py-3 px-6 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Cancelled Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                           {departmentReports.length > 0 ? (
                                departmentReports.map((report, index) => (
                                    <tr key={`${report.department}-${report.year}-${report.month}`} className={`${index % 2 === 0 ? 'bg-surface' : 'bg-background'} hover:bg-gray-100 transition-colors`}>
                                        <td className="py-4 px-6 text-sm font-medium text-text-primary">{report.department}</td>
                                        <td className="py-4 px-6 text-sm text-text-secondary">{report.month}</td>
                                        <td className="py-4 px-6 text-sm text-text-secondary">{report.year}</td>
                                        <td className="py-4 px-6 text-sm text-text-secondary">{report.totalRequests}</td>
                                        <td className="py-4 px-6 font-semibold text-sm text-green-600">{formatCurrency(report.totalApprovedAmount)}</td>
                                        <td className="py-4 px-6 text-sm text-text-secondary">{report.totalRejected}</td>
                                        <td className="py-4 px-6 font-semibold text-sm text-red-600">{formatCurrency(report.totalRejectedAmount)}</td>
                                    </tr>
                                ))
                             ) : (
                                <tr>
                                    <td colSpan={7} className="text-center py-10 text-text-secondary">
                                        No data found for the selected filters.
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

export default AdminReportPage;