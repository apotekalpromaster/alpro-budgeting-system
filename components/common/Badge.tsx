
import React from 'react';
import { BudgetStatus, ProcurementStatus } from '../../types';

interface BadgeProps {
    status: BudgetStatus | ProcurementStatus;
}

const Badge: React.FC<BadgeProps> = ({ status }) => {
    const statusColors: { [key: string]: string } = {
        [BudgetStatus.PENDING_MANAGER_APPROVAL]: 'bg-amber-100 text-amber-800',
        [BudgetStatus.PENDING_BOD_APPROVAL]: 'bg-amber-100 text-amber-800',
        [BudgetStatus.APPROVED]: 'bg-green-100 text-green-800',
        [BudgetStatus.REJECTED]: 'bg-red-100 text-red-800',
        [ProcurementStatus.PENDING]: 'bg-sky-100 text-sky-800',
        [ProcurementStatus.SENT_TO_MANAGER]: 'bg-purple-100 text-purple-800',
        [ProcurementStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
        [ProcurementStatus.PROCURED]: 'bg-blue-100 text-blue-800',
        [ProcurementStatus.REJECTED]: 'bg-red-100 text-red-800',
    };

    // Pemetaan status internal ke label Bahasa Indonesia untuk User
    const displayLabels: { [key: string]: string } = {
        [ProcurementStatus.IN_PROGRESS]: 'Dalam pemesanan',
        [ProcurementStatus.PROCURED]: 'Selesai (Procured)',
        [ProcurementStatus.SENT_TO_MANAGER]: 'Menunggu Feedback Manager',
        [ProcurementStatus.PENDING]: 'Menunggu Pengadaan',
        [ProcurementStatus.REJECTED]: 'Ditolak Manager',
    };

    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {displayLabels[status] || status}
        </span>
    );
};

export default Badge;
