import React, { useState, useMemo, createContext, ReactNode } from 'react';
import LoadingOverlay from '../components/common/LoadingOverlay';

interface LoadingContextType {
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
}

export const LoadingContext = createContext<LoadingContextType>({
    isLoading: false,
    setIsLoading: () => {},
});

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const value = useMemo(() => ({ isLoading, setIsLoading }), [isLoading]);

    // Fix: Replaced JSX with React.createElement to resolve parsing errors in a .ts file.
    return React.createElement(
        LoadingContext.Provider,
        { value },
        children,
        isLoading && React.createElement(LoadingOverlay)
    );
};
