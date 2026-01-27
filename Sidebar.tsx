import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Role } from '../types';

interface NavItem {
    path: string;
    label: string;
    // Fix: Changed JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
    icon: React.ReactNode;
}

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
}

const ICONS = {
    HOME: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
    PLUS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
    HISTORY: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    CHECK: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    REPORT: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    PROCUREMENT: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1zM3 10h10" /></svg>,
    DATABASE: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7l8-4 8 4m-8 4v10" /></svg>,
    USERS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    GENERATE_PO: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    VENDOR: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" /></svg>,
    COMPANY: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h6m-6 4h6m-6 4h6" /></svg>,
    ADDRESS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    REVIEW: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
};


const NavItemsConfig: { [key in Role]: NavItem[] } = {
    USER: [
        { path: '/budget/new', label: 'Input Budget', icon: ICONS.PLUS },
        // FIX: Corrected typo from ICONs to ICONS.
        { path: '/history', label: 'History Budget', icon: ICONS.HISTORY },
    ],
    MANAGER: [
        { path: '/approvals', label: 'Approval Budget', icon: ICONS.CHECK },
        { path: '/history', label: 'History Budget', icon: ICONS.HISTORY },
        { path: '/reports', label: 'Report', icon: ICONS.REPORT },
    ],
    BOD: [
        { path: '/approvals', label: 'Approval Budget', icon: ICONS.CHECK },
        { path: '/history', label: 'History Budget', icon: ICONS.HISTORY },
        { path: '/reports', label: 'Report', icon: ICONS.REPORT },
    ],
    ADMIN: [
        { path: '/admin-review', label: 'Review Budget', icon: ICONS.REVIEW }, // New Menu
        { path: '/procurement', label: 'Pengadaan', icon: ICONS.PROCUREMENT },
        { path: '/generate-po', label: 'Generate PO', icon: ICONS.GENERATE_PO },
        { path: '/history', label: 'All History', icon: ICONS.HISTORY },
        { path: '/master-data', label: 'Master Data', icon: ICONS.DATABASE },
        { path: '/manage-vendors', label: 'Manage Vendors', icon: ICONS.VENDOR },
        { path: '/manage-companies', label: 'Manage Companies', icon: ICONS.COMPANY },
        { path: '/manage-addresses', label: 'Manage Addresses', icon: ICONS.ADDRESS },
        { path: '/manage-accounts', label: 'Manage Accounts', icon: ICONS.USERS },
        { path: '/reports', label: 'Report', icon: ICONS.REPORT },
    ],
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
    const { user } = useAuth();

    if (!user) return null;

    const navItems = NavItemsConfig[user.role] || [];

    return (
        <aside className={`bg-sidebar text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div
                className={`h-20 flex items-center border-b border-gray-700 cursor-pointer transition-all duration-300 ${isCollapsed ? 'justify-center' : 'px-6'}`}
                onClick={toggleSidebar}
            >
                <img src="https://cdn.jsdelivr.net/gh/ginting719/Audio/LOGO-01.png" alt="Alpro Logo" className={`h-9 flex-shrink-0 transition-all duration-300 ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && (
                    <h1 className="text-lg font-semibold text-white tracking-tight whitespace-nowrap overflow-hidden">
                        Budgeting System
                    </h1>
                )}
            </div>
            <nav className="flex-1 p-4">
                <ul className="space-y-2">
                    {navItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center p-3 rounded-lg transition-colors duration-200 ${
                                        isCollapsed ? 'justify-center' : 'space-x-4'
                                    } ${
                                        isActive
                                            ? 'bg-primary text-white font-semibold shadow-md'
                                            : 'text-gray-300 hover:bg-sidebar-hover hover:text-white'
                                    }`
                                }
                                title={isCollapsed ? item.label : undefined}
                            >
                                <div className="flex-shrink-0">{item.icon}</div>
                                {!isCollapsed && <span className="font-medium whitespace-nowrap">{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="p-4 mt-auto border-t border-gray-700">
                {isCollapsed ? (
                    <p className="text-center text-sm text-white font-bold tracking-widest">OASIS</p>
                ) : (
                    <p className="text-center text-sm text-white whitespace-nowrap">Authorized by Ginting</p>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;