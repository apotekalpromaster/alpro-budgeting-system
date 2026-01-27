import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Product, Vendor, CompanyProfile, DeliveryAddress } from '../types';
import { getUsers, getProducts, getVendors, getCompanyProfiles, getDeliveryAddresses } from '../services/api';

interface DataContextType {
    users: User[];
    products: Product[];
    vendors: Vendor[];
    companyProfiles: CompanyProfile[];
    deliveryAddresses: DeliveryAddress[];
    isDataLoaded: boolean;
    refreshData: (key: 'users' | 'products' | 'vendors' | 'companies' | 'addresses' | 'all') => Promise<void>;
}

export const DataContext = createContext<DataContextType>({
    users: [],
    products: [],
    vendors: [],
    companyProfiles: [],
    deliveryAddresses: [],
    isDataLoaded: false,
    refreshData: async () => {},
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
    const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Initial Fetch for all master data
    const fetchAllMasterData = useCallback(async () => {
        try {
            // We fetch everything in parallel for speed
            const [
                usersData, 
                productsData, 
                vendorsData, 
                companiesData, 
                addressesData
            ] = await Promise.all([
                getUsers(),
                getProducts(),
                getVendors(),
                getCompanyProfiles(),
                getDeliveryAddresses()
            ]);

            setUsers(usersData);
            setProducts(productsData);
            setVendors(vendorsData);
            setCompanyProfiles(companiesData);
            setDeliveryAddresses(addressesData);
            setIsDataLoaded(true);
        } catch (error) {
            console.error("Failed to initialize master data cache:", error);
            // Even if fail, we mark loaded so app doesn't hang, pages will handle empty states or retry
            setIsDataLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchAllMasterData();
    }, [fetchAllMasterData]);

    const refreshData = async (key: 'users' | 'products' | 'vendors' | 'companies' | 'addresses' | 'all') => {
        try {
            switch (key) {
                case 'users':
                    setUsers(await getUsers());
                    break;
                case 'products':
                    setProducts(await getProducts());
                    break;
                case 'vendors':
                    setVendors(await getVendors());
                    break;
                case 'companies':
                    setCompanyProfiles(await getCompanyProfiles());
                    break;
                case 'addresses':
                    setDeliveryAddresses(await getDeliveryAddresses());
                    break;
                case 'all':
                    await fetchAllMasterData();
                    break;
            }
        } catch (error) {
            console.error(`Failed to refresh data for ${key}:`, error);
        }
    };

    return (
        <DataContext.Provider value={{ 
            users, 
            products, 
            vendors, 
            companyProfiles, 
            deliveryAddresses, 
            isDataLoaded, 
            refreshData 
        }}>
            {children}
        </DataContext.Provider>
    );
};