import React, { useState, useMemo } from 'react';

interface PageTitleContextType {
    title: string;
    setTitle: (title: string) => void;
}

export const PageTitleContext = React.createContext<PageTitleContextType>({
    title: 'Dashboard',
    setTitle: () => console.warn('setTitle called outside of PageTitleProvider'),
});

export const PageTitleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [title, setTitle] = useState('Dashboard');

    const value = useMemo(() => ({ title, setTitle }), [title]);

    // Fix: Replaced JSX with React.createElement to resolve parsing errors in a .ts file.
    return React.createElement(PageTitleContext.Provider, { value }, children);
};
