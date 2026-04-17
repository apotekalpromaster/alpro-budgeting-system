
export type Role = 'USER' | 'MANAGER' | 'BOD' | 'ADMIN';
export type ProductCategory = 'Asset' | 'Habis Pakai';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  managerId?: string;
  bodId?: string;
  password?: string;
  jobTitle?: string;
  outletId?: string;
}

export interface CompanyProfile {
  profileId: string;
  companyName: string;
  companyAddress: string;
  npwp: string;
}

export interface DeliveryAddress {
  addressId: string;
  addressLabel: string;
  fullAddress: string;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  unit: string;
  price: number;
  vendorId: string;
  category: ProductCategory;
}

export interface BudgetItem {
  productId: string;
  productName: string;
  productImage: string;
  unit: string;
  price: number;
  qty: number;
  total: number;
  vendorId: string;
  category: ProductCategory;
}

export enum BudgetStatus {
  DRAFT = 'DRAFT',
  PENDING_ADMIN_REVIEW = 'Pending Admin Review',
  PENDING_MANAGER_APPROVAL = 'Pending Manager Approval',
  PENDING_BOD_APPROVAL = 'Pending BOD Approval',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum ProcurementStatus {
  PENDING = 'Pending Procurement',
  SENT_TO_MANAGER = 'Sent to Manager', 
  IN_PROGRESS = 'In Progress',
  PROCURED = 'Procured',
  REJECTED = 'Rejected by Manager',
}

export interface BudgetRequest {
  id: string;
  userId: string;
  userName: string;
  department: string;
  items: BudgetItem[] | string;
  total: number;
  status: BudgetStatus;
  procurementStatus?: ProcurementStatus;
  submittedAt: string;
  managerApproverId?: string;
  bodApproverId?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  changeLog?: string;
  poGenerated?: boolean;
  assignedCompanyProfileId?: string;
  assignedDeliveryAddress?: string;
  vendorId?: string;
}

export interface Vendor {
    vendorId: string;
    vendorName: string;
    vendorAddress: string;
    vendorContact: string;
    termOfPayment: string;
}

export interface PurchaseOrder {
  poId: string;
  vendorId: string;
  vendorName: string;
  dateIssued: string;
  items: BudgetItem[] | string;
  totalAmount: number;
  relatedBudgetIds: string[] | string;
  companyProfileId: string;
  deliveryAddress: string;
  approvedByName?: string;
  approvedByTitle?: string;
  invoiceNumber?: string;
  taxInvoiceNumber?: string;
  actualPaymentAmount?: number;
  invoiceFileUrl?: string;
  paymentStatus?: 'Pending' | 'Paid';
}
