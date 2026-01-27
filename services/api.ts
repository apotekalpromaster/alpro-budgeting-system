
import { 
    User, 
    Product, 
    BudgetRequest, 
    ProcurementStatus, 
    Vendor,
    PurchaseOrder,
    CompanyProfile,
    DeliveryAddress,
    BudgetItem,
    BudgetStatus
} from '../types';

// Updated Google Apps Script URL as requested
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwBWNv4uqKx2-LLkv-FR_C3YLo9i7IMjnp1yaX20TtQRfj19xEpGoKG5r_Wi-HPqYUqfw/exec";

interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

// Generic API call function
async function apiCall<T>(action: string, data: Record<string, any> = {}): Promise<T> {
  try {
    const payload = Object.keys(data).length > 0 ? { action, data } : { action };

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (result.status === 'error') {
      console.error(`Backend Error for action "${action}":`, result.message);
      throw new Error(result.message || 'An unknown backend error occurred.');
    }

    return result.data as T;
  } catch (error) {
    console.error(`API call failed for action "${action}":`, error);
    throw error;
  }
}

// --- User Management ---
export const getUsers = (): Promise<User[]> => apiCall('getUsers');
export const addUser = (user: User): Promise<User> => apiCall('addUser', { ...user });
export const updateUser = (user: User): Promise<User> => apiCall('updateUser', { ...user });
export const deleteUser = (userId: string): Promise<{ id: string, status: string }> => apiCall('deleteUser', { userId });

// --- Product Management ---
export const getProducts = (): Promise<Product[]> => apiCall('getProducts');
export const addProduct = (product: Product): Promise<Product> => apiCall('addProduct', { ...product });
export const updateProduct = (product: Product): Promise<Product> => apiCall('updateProduct', { ...product });
export const deleteProduct = (productId: string): Promise<{ id: string, status: string }> => apiCall('deleteProduct', { productId });

// --- Budget Request Management ---
export const getBudgetRequests = (user: User): Promise<BudgetRequest[]> => apiCall('getBudgetRequests', { user });
export const getPendingApprovals = (user: User): Promise<BudgetRequest[]> => apiCall('getPendingApprovals', { user });
export const submitMultipleBudgets = (requestsData: any[]): Promise<BudgetRequest[]> => apiCall('submitMultipleBudgets', requestsData);
export const approveBudget = (budgetId: string, approver: User): Promise<BudgetRequest> => apiCall('approveBudget', { budgetId, approver });
export const rejectBudget = (budgetId: string, approver: User, reason: string): Promise<BudgetRequest> => apiCall('rejectBudget', { budgetId, approver, reason });
export const deleteBudgetRequest = (budgetId: string): Promise<{ id: string, status: string }> => apiCall('deleteBudgetRequest', { budgetId });

// --- Procurement & PO Management ---
export const getApprovedBudgetsForProcurement = (): Promise<BudgetRequest[]> => apiCall('getApprovedBudgetsForProcurement');
export const updateProcurementStatus = (budgetId: string, status: ProcurementStatus): Promise<BudgetRequest> => apiCall('updateProcurementStatus', { budgetId, status });

export const updateBudgetProcurementDetails = (details: { budgetId: string, companyProfileId?: string, deliveryAddress?: string }): Promise<{ success: boolean, budgetId: string }> => {
    return apiCall('updateBudgetProcurementDetails', details);
};

export const generatePurchaseOrders = (): Promise<PurchaseOrder[]> => {
    return apiCall('generatePurchaseOrders');
};

// --- Payment Tracking ---
export const updatePoPaymentDetails = (data: { 
    poId: string, 
    invoiceNumber: string, 
    taxInvoiceNumber: string, 
    actualAmount: number, 
    fileBase64?: string,
    fileName?: string 
}): Promise<PurchaseOrder> => apiCall('updatePoPaymentDetails', data);

// --- Other Master Data ---
export const getVendors = (): Promise<Vendor[]> => apiCall('getVendors');
export const addVendor = (vendor: Vendor): Promise<Vendor> => apiCall('addVendor', { ...vendor });
export const updateVendor = (vendor: Vendor): Promise<Vendor> => apiCall('updateVendor', { ...vendor });
export const deleteVendor = (vendorId: string): Promise<{ id: string, status: string }> => apiCall('deleteVendor', { vendorId });

export const getCompanyProfiles = (): Promise<CompanyProfile[]> => apiCall('getCompanyProfiles');
export const addCompanyProfile = (profile: CompanyProfile): Promise<CompanyProfile> => apiCall('addCompanyProfile', { ...profile });
export const updateCompanyProfile = (profile: CompanyProfile): Promise<CompanyProfile> => apiCall('updateCompanyProfile', { ...profile });
export const deleteCompanyProfile = (profileId: string): Promise<{ id: string, status: string }> => apiCall('deleteCompanyProfile', { profileId });

export const getDeliveryAddresses = (): Promise<DeliveryAddress[]> => apiCall('getDeliveryAddresses');
export const addDeliveryAddress = (address: DeliveryAddress): Promise<DeliveryAddress> => apiCall('addDeliveryAddress', { ...address });
export const updateDeliveryAddress = (address: DeliveryAddress): Promise<DeliveryAddress> => apiCall('updateDeliveryAddress', { ...address });
export const deleteDeliveryAddress = (addressId: string): Promise<{ id: string, status: string }> => apiCall('deleteDeliveryAddress', { addressId });

export const getPurchaseOrders = (): Promise<PurchaseOrder[]> => apiCall('getPurchaseOrders');

// --- PDF Generation ---
export const createPoPdf = (poId: string): Promise<string> => apiCall('createPoPdf', { poId });
