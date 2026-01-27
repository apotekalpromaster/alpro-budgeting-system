import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLoading } from '../hooks/useLoading';
import { getUsers, updateUser } from '../services/api';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const { setIsLoading } = useLoading();
    
    // Login State
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // Forgot Password State
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [resetUsername, setResetUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetError, setResetError] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!username || !password) {
            setError('Please enter both username and password.');
            return;
        }
        
        setIsLoading(true);
        try {
            const loggedInUser = await login(username, password);
            
            if (!loggedInUser) {
                setError('Invalid credentials. Please check the username and try again.');
            }
        } catch (err) {
            console.error("Login submission failed:", err);
            setError('An error occurred during login. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setResetError('');
        if (!resetUsername || !newPassword) {
            setResetError('Please fill in all fields.');
            return;
        }

        if (newPassword.length < 4) {
            setResetError('Password is too short (min 4 characters).');
            return;
        }

        setIsLoading(true);
        try {
            // 1. Fetch all users to find the target
            const allUsers = await getUsers();
            const targetUser = allUsers.find(u => u.name.toLowerCase() === resetUsername.toLowerCase().trim());

            if (!targetUser) {
                setResetError('Username not found.');
                setIsLoading(false);
                return;
            }

            // 2. Update the user object with the new password
            const updatedUser = { ...targetUser, password: newPassword };
            
            // 3. Send update to backend
            await updateUser(updatedUser);

            alert(`Password for "${targetUser.name}" has been reset successfully. Please login with the new password.`);
            setIsForgotModalOpen(false);
            setResetUsername('');
            setNewPassword('');

        } catch (err) {
            console.error("Reset password failed:", err);
            setResetError('Failed to reset password. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const imageUrl = "https://cdn.jsdelivr.net/gh/ginting719/Audio/web.png";

    return (
        <div className="min-h-screen bg-background flex">
            {/* Left Panel - Form */}
            <div className="w-full lg:w-2/5 xl:w-1/3 bg-sidebar flex flex-col justify-center items-center p-8 md:p-12 text-gray-300">
                <div className="w-full max-w-sm">
                    {/* Logo and Title */}
                    <div className="flex flex-col items-center justify-center mb-12 w-full">
                        <img src="https://cdn.jsdelivr.net/gh/ginting719/Audio/LOGO-01.png" alt="Budgeting System Logo" className="w-24 h-24 mb-4" />
                        <h1 className="text-3xl font-bold text-white">Budgeting System</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                                Username <span className="text-red-400">*</span>
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center">
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                                    Password <span className="text-red-400">*</span>
                                </label>
                            </div>
                            <div className="relative mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-200" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" /><path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.303 6.546A10.005 10.005 0 00.458 10c1.274 4.057 5.064 7 9.542 7 1.655 0 3.22-.392 4.6-1.054l-1.646-1.647z" /></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sidebar focus:ring-primary transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                                Sign In
                            </button>
                        </div>
                    </form>

                    <div className="mt-4 text-center">
                        <button 
                            type="button"
                            onClick={() => setIsForgotModalOpen(true)}
                            className="text-sm text-primary hover:text-primary-light transition-colors hover:underline"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    
                    <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-700 pt-4">
                        <p className="italic">Powered by OSS dept</p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Image */}
            <div
                className="hidden lg:flex lg:w-3/5 xl:w-2/3 bg-cover bg-no-repeat bg-center relative"
                style={{ backgroundImage: `url(${imageUrl})` }}
                aria-hidden="true"
            >
                <div className="absolute inset-0 bg-black opacity-10"></div>
            </div>

            {/* Forgot Password Modal */}
            <Modal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} title="Reset Password" size="sm">
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-text-secondary mb-4">Enter your username and a new password.</p>
                    
                    {resetError && <div className="p-2 bg-red-100 border border-red-300 text-red-700 text-sm rounded">{resetError}</div>}
                    
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
                        <input
                            type="text"
                            value={resetUsername}
                            onChange={(e) => setResetUsername(e.target.value)}
                            placeholder="Your Username"
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New Password"
                            className="w-full p-2 border border-gray-600 bg-gray-700 text-white rounded focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsForgotModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleResetPassword}>Reset Password</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LoginPage;