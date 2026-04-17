// File: contexts/DataContext.tsx

import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Product, Vendor, CompanyProfile, DeliveryAddress } from '../types';
import { supabase } from '../services/supabase';

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

// --- Supabase fetch helpers ---

async function fetchUsers(): Promise<User[]> {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department, job_title, manager_id, bod_id, outlet_id');
    if (error) throw new Error(error.message);
    return (data ?? []).map((u: any) => ({
        id:         u.id,
        name:       u.name,
        email:      u.email,
        role:       u.role,
        department: u.department ?? '',
        jobTitle:   u.job_title ?? '',
        managerId:  u.manager_id ?? undefined,
        bodId:      u.bod_id ?? undefined,
        outletId:   u.outlet_id ?? undefined,
    }));
}

async function fetchProducts(): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, unit, price, vendor_id, category')
        .eq('is_active', true);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p: any) => ({
        id:       p.id,
        name:     p.name,
        imageUrl: p.image_url ?? '',
        unit:     p.unit,
        price:    Number(p.price),
        vendorId: p.vendor_id ?? '',
        category: p.category ?? 'Habis Pakai',
    }));
}

async function fetchVendors(): Promise<Vendor[]> {
    const { data, error } = await supabase
        .from('vendors')
        .select('id, vendor_name, vendor_address, vendor_contact, term_of_payment');
    if (error) throw new Error(error.message);
    return (data ?? []).map((v: any) => ({
        vendorId:      v.id,
        vendorName:    v.vendor_name,
        vendorAddress: v.vendor_address ?? '',
        vendorContact: v.vendor_contact ?? '',
        termOfPayment: v.term_of_payment ?? '',
    }));
}

async function fetchCompanyProfiles(): Promise<CompanyProfile[]> {
    const { data, error } = await supabase
        .from('company_profiles')
        .select('id, company_name, company_address, npwp');
    if (error) throw new Error(error.message);
    return (data ?? []).map((c: any) => ({
        profileId:      c.id,
        companyName:    c.company_name,
        companyAddress: c.company_address ?? '',
        npwp:           c.npwp ?? '',
    }));
}

async function fetchDeliveryAddresses(): Promise<DeliveryAddress[]> {
    const { data, error } = await supabase
        .from('delivery_addresses')
        .select('id, address_label, full_address');
    if (error) throw new Error(error.message);
    return (data ?? []).map((a: any) => ({
        addressId:    a.id,
        addressLabel: a.address_label,
        fullAddress:  a.full_address,
    }));
}

// --- Provider ---

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers]                     = useState<User[]>([]);
    const [products, setProducts]               = useState<Product[]>([]);
    const [vendors, setVendors]                 = useState<Vendor[]>([]);
    const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
    const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
    const [isDataLoaded, setIsDataLoaded]       = useState(false);

    const fetchAllMasterData = useCallback(async () => {
        try {
            const [usersData, productsData, vendorsData, companiesData, addressesData] =
                await Promise.all([
                    fetchUsers(),
                    fetchProducts(),
                    fetchVendors(),
                    fetchCompanyProfiles(),
                    fetchDeliveryAddresses(),
                ]);
            setUsers(usersData);
            setProducts(productsData);
            setVendors(vendorsData);
            setCompanyProfiles(companiesData);
            setDeliveryAddresses(addressesData);
            setIsDataLoaded(true);
        } catch (error) {
            console.error('[DataContext] Failed to initialize master data:', error);
            setIsDataLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchAllMasterData();
    }, [fetchAllMasterData]);

    const refreshData = async (key: 'users' | 'products' | 'vendors' | 'companies' | 'addresses' | 'all') => {
        try {
            switch (key) {
                case 'users':     setUsers(await fetchUsers());                         break;
                case 'products':  setProducts(await fetchProducts());                   break;
                case 'vendors':   setVendors(await fetchVendors());                     break;
                case 'companies': setCompanyProfiles(await fetchCompanyProfiles());     break;
                case 'addresses': setDeliveryAddresses(await fetchDeliveryAddresses()); break;
                case 'all':       await fetchAllMasterData();                           break;
            }
        } catch (error) {
            console.error(`[DataContext] Failed to refresh data for "${key}":`, error);
        }
    };

    return (
        <DataContext.Provider value={{
            users, products, vendors, companyProfiles, deliveryAddresses,
            isDataLoaded, refreshData,
        }}>
            {children}
        </DataContext.Provider>
    );
};