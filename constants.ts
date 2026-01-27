import { User, Product, Role } from './types';

export const MOCK_USERS: User[] = [
    { id: 'user-1', name: 'Budi Hartono', email: 'user@budget.com', role: 'USER', department: 'Marketing', managerId: 'manager-1', bodId: 'bod-1' },
    { id: 'manager-1', name: 'Citra Kirana', email: 'manager@budget.com', role: 'MANAGER', department: 'Marketing', bodId: 'bod-1' },
    { id: 'bod-1', name: 'Dewi Lestari', email: 'bod@budget.com', role: 'BOD', department: 'Head Office' },
    { id: 'admin-1', name: 'Admin Utama', email: 'admin@budget.com', role: 'ADMIN', department: 'IT' },
    { id: 'user-2', name: 'Eko Widodo', email: 'user2@budget.com', role: 'USER', department: 'Sales', managerId: 'manager-2', bodId: 'bod-1' },
    { id: 'manager-2', name: 'Fajar Nugroho', email: 'manager2@budget.com', role: 'MANAGER', department: 'Sales', bodId: 'bod-1' },
];

export const MOCK_PRODUCTS: Product[] = [
    // FIX: Added 'vendorId' and 'category' to each product to satisfy the 'Product' interface.
    { id: 'prod-001', name: 'Kertas HVS A4 70gr', imageUrl: 'https://picsum.photos/id/1/200/200', unit: 'Rim', price: 45000, vendorId: 'vendor-1', category: 'Habis Pakai' },
    { id: 'prod-002', name: 'Pulpen Standard AE7', imageUrl: 'https://picsum.photos/id/10/200/200', unit: 'Lusin', price: 25000, vendorId: 'vendor-1', category: 'Habis Pakai' },
    { id: 'prod-003', name: 'Tinta Printer Epson 003 Black', imageUrl: 'https://picsum.photos/id/20/200/200', unit: 'Botol', price: 80000, vendorId: 'vendor-2', category: 'Habis Pakai' },
    { id: 'prod-004', name: 'Stapler Max HD-10', imageUrl: 'https://picsum.photos/id/30/200/200', unit: 'Pcs', price: 30000, vendorId: 'vendor-1', category: 'Habis Pakai' },
    { id: 'prod-005', name: 'Isi Staples No. 10', imageUrl: 'https://picsum.photos/id/40/200/200', unit: 'Box', price: 5000, vendorId: 'vendor-1', category: 'Habis Pakai' },
    { id: 'prod-006', name: 'Ordner Bindex 717', imageUrl: 'https://picsum.photos/id/50/200/200', unit: 'Pcs', price: 22000, vendorId: 'vendor-2', category: 'Habis Pakai' },
    { id: 'prod-007', name: 'Sticky Notes 3M Post-it', imageUrl: 'https://picsum.photos/id/60/200/200', unit: 'Pad', price: 15000, vendorId: 'vendor-1', category: 'Habis Pakai' },
    { id: 'prod-008', name: 'Baterai AA Alkaline', imageUrl: 'https://picsum.photos/id/70/200/200', unit: 'Pack (4pcs)', price: 20000, vendorId: 'vendor-3', category: 'Habis Pakai' },
    { id: 'prod-009', name: 'Spidol Whiteboard Snowman', imageUrl: 'https://picsum.photos/id/80/200/200', unit: 'Set (3 warna)', price: 28000, vendorId: 'vendor-2', category: 'Habis Pakai' },
    { id: 'prod-010', name: 'Gunting Kertas Joyko', imageUrl: 'https://picsum.photos/id/90/200/200', unit: 'Pcs', price: 12000, vendorId: 'vendor-1', category: 'Habis Pakai' },
];
