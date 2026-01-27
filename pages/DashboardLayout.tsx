import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const DashboardLayout: React.FC = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => !prev);
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
            <main className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 p-6 overflow-y-auto animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;