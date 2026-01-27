import React from 'react';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    login: (username: string, password?: string) => Promise<User | null>;
    logout: () => void;
    updateUserSession: (user: User) => void;
}

export const AuthContext = React.createContext<AuthContextType>({
    user: null,
    login: async () => null,
    logout: () => {},
    updateUserSession: () => {},
});