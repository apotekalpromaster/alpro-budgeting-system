// File: App.tsx

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthContext } from './contexts/AuthContext';
import { PageTitleProvider } from './contexts/PageTitleContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { DataProvider } from './contexts/DataContext';
import { User, Role } from './types';
import { signIn, signOut, getCurrentUserProfile, supabase } from './services/supabase';
import { useAuth } from './hooks/useAuth';

import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import UserInputBudgetPage from './pages/user/UserInputBudgetPage';
import UserHistoryPage from './pages/user/UserHistoryPage';
import ManagerHistoryPage from './pages/manager/ManagerHistoryPage';
import ManagerReportPage from './pages/manager/ManagerReportPage';
import BodHistoryPage from './pages/bod/BodHistoryPage';
import BodReportPage from './pages/bod/BodReportPage';
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
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    // On mount: Restore session from Supabase (replaces localStorage.getItem)
    useEffect(() => {
        const restoreSession = async () => {
            const profile = await getCurrentUserProfile();
            if (profile) {
                setUser(mapProfileToUser(profile));
            }
            setIsAuthLoading(false);
        };

        restoreSession();

        // Listen for auth state changes (token refresh, sign-out from another tab, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
            if (event === 'SIGNED_OUT') {
                setUser(null);
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                const profile = await getCurrentUserProfile();
                if (profile) setUser(mapProfileToUser(profile));
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Map snake_case Supabase profile → camelCase User type used by UI
    const mapProfileToUser = (profile: Record<string, any>): User => ({
        id:         profile.id,
        name:       profile.name,
        email:      profile.email,
        role:       (profile.role as string).toUpperCase() as Role,
        department: profile.department ?? '',
        jobTitle:   profile.job_title ?? '',
        managerId:  profile.manager_id ?? undefined,
        bodId:      profile.bod_id ?? undefined,
        // outletId exposed on user object for UserInputBudgetPage
        outletId:   profile.outlet_id ?? undefined,
    });

    const login = async (usernameOrEmail: string, password?: string): Promise<User | null> => {
        try {
            const loginEmail = usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@alpro.com`;
            await signIn(loginEmail, password ?? '');
            const profile = await getCurrentUserProfile();
            if (!profile) return null;
            const mappedUser = mapProfileToUser(profile);
            setUser(mappedUser);
            return mappedUser;
        } catch (error) {
            console.error('[AuthProvider] Login failed:', error);
            return null;
        }
    };

    const logout = async () => {
        await signOut();
        setUser(null);
    };

    const updateUserSession = (updatedUser: User) => {
        setUser(updatedUser);
    };

    const value = useMemo(
        () => ({ user, login, logout, updateUserSession }),
        [user]
    );

    // Prevent flash of login page while restoring session
    if (isAuthLoading) return null;

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
        case 'USER':    return <UserHistoryPage />;
        case 'MANAGER': return <ManagerHistoryPage />;
        case 'BOD':     return <BodHistoryPage />;
        case 'ADMIN':   return <AdminAllHistoryPage />;
        default:        return <Navigate to="/" replace />;
    }
};

const ReportPageSelector = () => {
    const { user } = useAuth();
    if (user?.role === 'MANAGER') return <ManagerReportPage />;
    if (user?.role === 'BOD')     return <BodReportPage />;
    if (user?.role === 'ADMIN')   return <AdminReportPage />;
    return <Navigate to="/" replace />;
};

// --- Default Page Redirect based on Role ---
const DefaultPage = () => {
    const { user } = useAuth();
    switch (user?.role) {
        case 'USER':    return <Navigate to="/budget/new" replace />;
        case 'MANAGER': return <Navigate to="/history" replace />;
        case 'BOD':     return <Navigate to="/history" replace />;
        case 'ADMIN':   return <Navigate to="/admin-review" replace />;
        default:        return <Navigate to="/login" replace />;
    }
};

// --- AppRoutes ---
const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Routes>
            {user ? (
                <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<DefaultPage />} />
                    <Route path="budget/new"      element={<RoleSpecificRoute roles={['USER']}><UserInputBudgetPage /></RoleSpecificRoute>} />
                    <Route path="admin-review"    element={<RoleSpecificRoute roles={['ADMIN']}><AdminBudgetReviewPage /></RoleSpecificRoute>} />
                    <Route path="procurement"     element={<RoleSpecificRoute roles={['ADMIN']}><AdminProcurementPage /></RoleSpecificRoute>} />
                    <Route path="payment-tracking" element={<RoleSpecificRoute roles={['ADMIN']}><AdminPaymentTrackingPage /></RoleSpecificRoute>} />
                    <Route path="generate-po"     element={<RoleSpecificRoute roles={['ADMIN']}><AdminGeneratePOPage /></RoleSpecificRoute>} />
                    <Route path="master-data"     element={<RoleSpecificRoute roles={['ADMIN']}><AdminMasterDataPage /></RoleSpecificRoute>} />
                    <Route path="manage-vendors"  element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageVendorsPage /></RoleSpecificRoute>} />
                    <Route path="manage-companies" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageCompaniesPage /></RoleSpecificRoute>} />
                    <Route path="manage-addresses" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageAddressesPage /></RoleSpecificRoute>} />
                    <Route path="manage-accounts" element={<RoleSpecificRoute roles={['ADMIN']}><AdminManageAccountsPage /></RoleSpecificRoute>} />
                    <Route path="history"         element={<HistoryPageSelector />} />
                    <Route path="reports"         element={<RoleSpecificRoute roles={['MANAGER', 'BOD', 'ADMIN']}><ReportPageSelector /></RoleSpecificRoute>} />
                    <Route path="*"               element={<Navigate to="/" replace />} />
                </Route>
            ) : (
                <>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="*"     element={<Navigate to="/login" replace />} />
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
