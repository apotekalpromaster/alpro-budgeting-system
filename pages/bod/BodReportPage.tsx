import React, { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useAuth } from '../../hooks/useAuth';
import { useLoading } from '../../hooks/useLoading';
import { getBudgetRequests } from '../../services/api';
import { BudgetRequest, BudgetStatus } from '../../types';
import Card from '../../components/common/Card';
import FilterDropdown from '../../components/common/FilterDropdown';

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

const BodReportPage: React.FC = () => {
    usePageTitle('Company-Wide Reports');
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
                    const data = await getBudgetRequests(user); // For BOD, this fetches all requests
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

    const departmentReports = useMemo((): DepartmentReport[] => {
        const reports: { [key: string]: DepartmentReport } = {};

        filteredRequests.forEach(req => {
            const date = new Date(req.submittedAt);
            const year = date.getFullYear().toString();
            const month = monthOptions[date.getMonth()];
            const key = `${req.department}-${year}-${month}`;

            if (!reports[key]) {
                reports[key] = {
                    department: req.department,
                    year,
                    month,
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

        return Object.values(reports).sort((a, b) => b.totalApprovedAmount - a.totalApprovedAmount);
    }, [filteredRequests, monthOptions]);
    
    const companyTotal = useMemo(() => {
        return filteredRequests
            .filter(r => r.status === BudgetStatus.APPROVED)
            .reduce((sum, r) => sum + r.total, 0);
    }, [filteredRequests]);

    if (error) return <p className="text-center text-danger">{error}</p>;

    return (
        <div className="space-y-6">
            <Card>
                 <div className="flex flex-col sm:flex-row gap-6 mb-6 p-4 bg-gray-50 rounded-xl border border-border-color items-end">
                    <h3 className="text-md font-semibold text-text-primary mr-2 mb-2.5 self-center sm:self-end whitespace-nowrap">Filters:</h3>
                    <div className="w-full flex-1 min-w-[150px]">
                        <FilterDropdown
                            id="month-filter"
                            label="Month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Months' },
                                ...monthOptions.map((month, index) => ({ value: String(index), label: month }))
                            ]}
                        />
                    </div>
                    <div className="w-full flex-1 min-w-[150px]">
                        <FilterDropdown
                            id="year-filter"
                            label="Year"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Years' },
                                ...years.map(year => ({ value: year, label: year }))
                            ]}
                        />
                    </div>
                    <div className="w-full flex-1 min-w-[150px]">
                        <FilterDropdown
                            id="dept-filter"
                            label="Department"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Departments' },
                                ...departments.map(dept => ({ value: dept, label: dept }))
                            ]}
                        />
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-lg font-medium text-text-secondary">Total Approved Budget (Filtered)</p>
                    <p className="text-5xl font-bold text-primary mt-2">{formatCurrency(companyTotal)}</p>
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

export default BodReportPage;