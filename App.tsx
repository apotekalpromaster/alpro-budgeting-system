
import React, { useState, useMemo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthContext } from './contexts/AuthContext';
import { PageTitleProvider } from './contexts/PageTitleContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { DataProvider } from './contexts/DataContext';
import { User, Role } from './types';
import { getUsers } from './services/api';
import { useAuth } from './hooks/useAuth';

import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
// User Pages
import UserInputBudgetPage from './pages/user/UserInputBudgetPage';
import UserHistoryPage from './pages/user/UserHistoryPage';
// Manager Pages
import ManagerHistoryPage from './pages/manager/ManagerHistoryPage';
import ManagerReportPage from './pages/manager/ManagerReportPage';
// BOD Pages
import BodHistoryPage from './pages/bod/BodHistoryPage';
import BodReportPage from './pages/bod/BodReportPage';
// Admin Pages
import AdminProcurementPage from './pages/admin/AdminProcurementPage';
import AdminAllHistoryPage from './pages/admin/AdminAllHistoryPage';
import AdminMasterDataPage from './pages/admin/AdminMasterDataPage';
import AdminManageAccountsPage from './pages/admin/AdminManageAccountsPage';
import AdminReportPage from './pages/admin/AdminReportPage';
import AdminGeneratePOPage from './pages/admin/AdminGeneratePOPage';
import AdminManageVendorsPage from './pages/admin/AdminManageVendorsPage';
import AdminManageCompaniesPage from './pages/admin/AdminManageCompaniesPage';
import AdminManageAddressesPage from './pages/admin/AdminManageAddressesPage';
import AdminBudgetReviewPage from './pages/admin/AdminBudgetReviewPage';
import AdminPaymentTrackingPage from './pages/admin/AdminPaymentTrackingPage';

// --- Auth Provider ---
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            return null;
        }
    });

    const login = async (username: string, password?: string): Promise<User | null> => {
        try {
            const liveUsers = await getUsers();
            const foundUser = liveUsers.find(
                u => u.name.toLowerCase() === username.toLowerCase().trim()
            );

            if (foundUser && foundUser.password === password) {
                const userWithNormalizedRole = {
                    ...foundUser,
                    role: foundUser.role.toUpperCase() as Role,
                };

                const userToStore = { ...userWithNormalizedRole };
                delete userToStore.password;
                setUser(userToStore);
                localStorage.setItem('user', JSON.stringify(userToStore));
                return userToStore;
            }
            return null;
        } catch (error) {
            console.error("Login failed:", error);
            return null;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateUserSession = (updatedUser: User) => {
        const userToStore = { ...updatedUser };
        delete userToStore.password;
        setUser(userToStore);
        localStorage.setItem('user', JSON.stringify(userToStore));
    };

    const value = useMemo(() => ({ user, login, logout, updateUserSession }), [user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


// --- Role-Specific Route Guard ---
const RoleSpecificRoute: React.FC<{ roles: Role[], children: React.ReactElement }> = ({ roles, children }) => {
    const { user } = useAuth();
    if (!user || !roles.includes(user.role)) {
        return <Navigate to="/" replace />; 
    }
    return children;
};

// --- Page Selectors based on Role ---
const HistoryPageSelector = () => {
    const { user } = useAuth();
    switch (user?.role) {
        case 'USER': return <UserHistoryPage />;
        case 'MANAGER': return <ManagerHistoryPage />;
        case 'BOD': return <BodHistoryPage />;
        case 'ADMIN': return <AdminAllHistoryPage />;
        default: return <Navigate to="/" replace />;
    }
};

const ReportPageSelector = () => {
    const { user } = useAuth();
    if (user?.role === 'MANAGER') return <ManagerReportPage />;
    if (user?.role === 'BOD') return <BodReportPage />;
    if (user?.role === 'ADMIN') return <AdminReportPage />;
    return <Navigate to="/" replace />;
};

// --- Default Page Redirect based on Role ---
const DefaultPage = () => {
    const { user } = useAuth();
    switch (user?.role) {
        case 'USER': return <Navigate to="/budget/new" replace />;
        case 'MANAGER': return <Navigate to="/history" replace />;
        case 'BOD': return <Navigate to="/history" replace />;
        case 'ADMIN': return <Navigate to="/admin-review" replace />;
        default: return <Navigate to="/login" replace />;
    }
};

// --- AppRoutes: Main routing logic based on auth state ---
const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Routes>
            {user ? (
                // --- Logged In Routes ---
                <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<DefaultPage />} />

                    {/* User */}
                    <Route path="budget/new" element={<RoleSpecificRoute roles={['USER']}><UserInputBudgetPage /></RoleSpecificRoute>} />
                    
                    {/* Admin */}
                    <Route path="admin-review" element={<RoleSpecificRoute roles={['ADMIN']}><AdminBudgetReviewPage /></RoleSpecificRoute>} />
                    <Route path="procurement" element={<RoleSpecificRoute roles={['ADMIN']}><AdminProcurementPage /></RoleSpecificRoute>} />
                    <Route path="payment-tracking" element={<RoleSpecificRoute roles={['ADMIN']}><AdminPaymentTrackingPage /></RoleSpecificRoute>} />
                    <Route path="generate-po" element={<RoleSpecificRoute roles={['ADMIN']}><AdminGeneratePOPage /></RoleSpecificRoute>} />
                    <Route path="master-data" element={<RoleSpecificRoute roles={['ADMIN']}><AdminMasterDataPage /></RoleSpecificRoute>} />
                    <Route path="manage-vendors" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageVendorsPage /></RoleSpecificRoute>} />
                    <Route path="manage-companies" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageCompaniesPage /></RoleSpecificRoute>} />
                    <Route path="manage-addresses" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageAddressesPage /></RoleSpecificRoute>} />
                    <Route path="manage-accounts" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageAccountsPage /></RoleSpecificRoute>} />

                    {/* Shared paths */}
                    <Route path="history" element={<HistoryPageSelector />} />
                    <Route path="reports" element={<RoleSpecificRoute roles={['MANAGER', 'BOD', 'ADMIN']}><ReportPageSelector /></RoleSpecificRoute>} />

                    {/* Redirect any other path to the default page for logged-in users */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            ) : (
                // --- Logged Out Routes ---
                <>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            )}
        </Routes>
    );
};

// --- Main App Component ---
function App() {
    return (
        <AuthProvider>
            <DataProvider>
                <PageTitleProvider>
                    <LoadingProvider>
                        <HashRouter>
                            <AppRoutes />
                        </HashRouter>
                    </LoadingProvider>
                </PageTitleProvider>
            </DataProvider>
        </AuthProvider>
    );
}

export default App;
