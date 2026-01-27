
// =================================================================
// SCRIPT CONFIGURATION
// =================================================================
const SS = SpreadsheetApp.getActiveSpreadsheet();
const USERS_SHEET = SS.getSheetByName("Users");
const PRODUCTS_SHEET = SS.getSheetByName("Products");
const BUDGETS_SHEET = SS.getSheetByName("BudgetRequests");
const VENDORS_SHEET = SS.getSheetByName("Vendors");
const PURCHASE_ORDERS_SHEET = SS.getSheetByName("PurchaseOrders");
const COMPANY_PROFILES_SHEET = SS.getSheetByName("CompanyProfiles");
const DELIVERY_ADDRESSES_SHEET = SS.getSheetByName("DeliveryAddresses");

const PDF_FOLDER_ID = "1pEq5CdbEXtlA8yYCv3zyp21ZE653-zXT";

// =================================================================
// MAIN ROUTER
// =================================================================
function doPost(e) {
  if (!e || !e.postData) {
    return createJsonResponse({ status: 'error', message: "Invalid POST request." });
  }
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result;
    if (!action) throw new Error("Parameter 'action' is missing.");

    switch (action) {
      case 'getUsers': result = getUsers(); break;
      case 'addUser': result = addUser(payload.data); break;
      case 'updateUser': result = updateUser(payload.data); break;
      case 'deleteUser': result = deleteUser(payload.data.userId); break;
      case 'getProducts': result = getProducts(); break;
      case 'addProduct': result = addProduct(payload.data); break;
      case 'updateProduct': result = updateProduct(payload.data); break;
      case 'deleteProduct': result = deleteProduct(payload.data.productId); break;
      case 'getBudgetRequests': result = getBudgetRequests(payload.data.user); break;
      case 'getPendingApprovals': result = getPendingApprovals(payload.data.user); break;
      case 'getApprovedBudgetsForProcurement': result = getApprovedBudgetsForProcurement(); break;
      case 'submitMultipleBudgets': result = submitMultipleBudgets(payload.data); break;
      case 'approveBudget': result = approveBudget(payload.data.budgetId, payload.data.approver); break;
      case 'rejectBudget': result = rejectBudget(payload.data.budgetId, payload.data.approver, payload.data.reason); break;
      case 'deleteBudgetRequest': result = deleteBudgetRequest(payload.data); break;
      case 'updateProcurementStatus': result = updateProcurementStatus(payload.data.budgetId, payload.data.status); break;
      case 'getVendors': result = getVendors(); break;
      case 'addVendor': result = addVendor(payload.data); break;
      case 'updateVendor': result = updateVendor(payload.data); break;
      case 'deleteVendor': result = deleteVendor(payload.data.vendorId); break;
      case 'getCompanyProfiles': result = getCompanyProfiles(); break;
      case 'addCompanyProfile': result = addCompanyProfile(payload.data); break;
      case 'updateCompanyProfile': result = updateCompanyProfile(payload.data); break;
      case 'deleteCompanyProfile': result = deleteCompanyProfile(payload.data.profileId); break;
      case 'getDeliveryAddresses': result = getDeliveryAddresses(); break;
      case 'addDeliveryAddress': result = addDeliveryAddress(payload.data); break;
      case 'updateDeliveryAddress': result = updateDeliveryAddress(payload.data); break;
      case 'deleteDeliveryAddress': result = deleteDeliveryAddress(payload.data.addressId); break;
      case 'getPurchaseOrders': result = getPurchaseOrders(); break;
      case 'generatePurchaseOrders': result = generatePurchaseOrders(); break;
      case 'createPoPdf': result = createPoPdf(payload.data.poId); break;
      case 'updateBudgetProcurementDetails': result = updateBudgetProcurementDetails(payload.data); break;
      case 'updatePoPaymentDetails': result = updatePoPaymentDetails(payload.data); break;
      default: throw new Error(`Invalid action: ${action}`);
    }
    return createJsonResponse({ status: 'success', data: result });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.message });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// =================================================================
// HELPERS
// =================================================================
function sheetToJSON(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });
}

function findRowById(sheet, id, idColumnIndex = 0) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idColumnIndex]) === String(id)) return i + 1;
    }
    return -1;
}

function getHeaderIndex(sheet, headerName) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const index = headers.indexOf(headerName);
    if (index === -1) {
        throw new Error(`Header "${headerName}" tidak ditemukan di sheet "${sheet.getName()}". Silakan tambahkan kolom ini di spreadsheet.`);
    }
    return index + 1;
}

function generateMonthlySequentialId(sheet, prefix, idColumnHeader) {
  const allData = sheetToJSON(sheet);
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const currentMonthPrefix = `${prefix}-${year}${month}`;
  const idsThisMonth = allData.map(row => row[idColumnHeader]).filter(id => id && String(id).startsWith(currentMonthPrefix));
  const lastSequence = idsThisMonth.length > 0 ? Math.max(...idsThisMonth.map(id => parseInt(String(id).slice(currentMonthPrefix.length)) || 0)) : 0;
  return `${currentMonthPrefix}${String(lastSequence + 1).padStart(4, '0')}`;
}

function getUserEmailById(userId) { return sheetToJSON(USERS_SHEET).find(u => u.id === userId)?.email || null; }
function getAdminEmails() { return sheetToJSON(USERS_SHEET).filter(u => u.role?.toUpperCase() === 'ADMIN').map(u => u.email); }
function getBudgetById(budgetId) { return sheetToJSON(BUDGETS_SHEET).find(r => r.id === budgetId); }

/**
 * Memeriksa apakah dalam list item terdapat item dengan kategori "Asset"
 */
function hasAssetItems(itemsJson) {
    try {
        const items = JSON.parse(itemsJson);
        return items.some(item => String(item.category || '').toLowerCase() === 'asset');
    } catch (e) {
        return false;
    }
}

// =================================================================
// API IMPLEMENTATIONS
// =================================================================
function getUsers() { 
  const data = USERS_SHEET.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });
}

function getProducts() { return sheetToJSON(PRODUCTS_SHEET); }
function getVendors() { return sheetToJSON(VENDORS_SHEET); }
function getCompanyProfiles() { return sheetToJSON(COMPANY_PROFILES_SHEET); }
function getDeliveryAddresses() { return sheetToJSON(DELIVERY_ADDRESSES_SHEET); }
function getPurchaseOrders() { return sheetToJSON(PURCHASE_ORDERS_SHEET); }

function addUser(user) {
  const headers = USERS_SHEET.getRange(1, 1, 1, USERS_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => user[header] || "");
  USERS_SHEET.appendRow(newRow);
  return user;
}
function updateUser(user) {
    const rowIndex = findRowById(USERS_SHEET, user.id);
    if (rowIndex === -1) throw new Error("User not found");
    const headers = USERS_SHEET.getRange(1, 1, 1, USERS_SHEET.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => user[header] !== undefined ? user[header] : USERS_SHEET.getRange(rowIndex, headers.indexOf(header) + 1).getValue());
    USERS_SHEET.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
    return user;
}
function deleteUser(userId) {
    const rowIndex = findRowById(USERS_SHEET, userId);
    if (rowIndex === -1) throw new Error("User not found");
    USERS_SHEET.deleteRow(rowIndex);
    return { id: userId, status: "deleted" };
}

function addProduct(product) {
  const headers = PRODUCTS_SHEET.getRange(1, 1, 1, PRODUCTS_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => product[header] || "");
  PRODUCTS_SHEET.appendRow(newRow);
  return product;
}
function updateProduct(product) {
    const rowIndex = findRowById(PRODUCTS_SHEET, product.id);
    if (rowIndex === -1) throw new Error("Product not found");
    const headers = PRODUCTS_SHEET.getRange(1, 1, 1, PRODUCTS_SHEET.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => product[header] !== undefined ? product[header] : PRODUCTS_SHEET.getRange(rowIndex, headers.indexOf(header) + 1).getValue());
    PRODUCTS_SHEET.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
    return product;
}
function deleteProduct(productId) {
    const rowIndex = findRowById(PRODUCTS_SHEET, productId);
    if (rowIndex === -1) throw new Error("Product not found");
    PRODUCTS_SHEET.deleteRow(rowIndex);
    return { id: productId, status: "deleted" };
}

function addVendor(vendor) {
  const headers = VENDORS_SHEET.getRange(1, 1, 1, VENDORS_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => vendor[header] || "");
  VENDORS_SHEET.appendRow(newRow);
  return vendor;
}
function updateVendor(vendor) {
  const rowIndex = findRowById(VENDORS_SHEET, vendor.vendorId, getHeaderIndex(VENDORS_SHEET, 'vendorId') - 1);
  if (rowIndex === -1) throw new Error("Vendor not found");
  const headers = VENDORS_SHEET.getRange(1, 1, 1, VENDORS_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => vendor[header] !== undefined ? vendor[header] : VENDORS_SHEET.getRange(rowIndex, headers.indexOf(header) + 1).getValue());
  VENDORS_SHEET.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  return vendor;
}
function deleteVendor(vendorId) {
  const rowIndex = findRowById(VENDORS_SHEET, vendorId, getHeaderIndex(VENDORS_SHEET, 'vendorId') - 1);
  if (rowIndex === -1) throw new Error("Vendor not found");
  VENDORS_SHEET.deleteRow(rowIndex);
  return { id: vendorId, status: "deleted" };
}

function addCompanyProfile(profile) {
  const headers = COMPANY_PROFILES_SHEET.getRange(1, 1, 1, COMPANY_PROFILES_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => profile[header] || "");
  COMPANY_PROFILES_SHEET.appendRow(newRow);
  return profile;
}
function updateCompanyProfile(profile) {
  const rowIndex = findRowById(COMPANY_PROFILES_SHEET, profile.profileId, getHeaderIndex(COMPANY_PROFILES_SHEET, 'profileId') - 1);
  if (rowIndex === -1) throw new Error("Company Profile not found");
  const headers = COMPANY_PROFILES_SHEET.getRange(1, 1, 1, COMPANY_PROFILES_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => profile[header] !== undefined ? profile[header] : COMPANY_PROFILES_SHEET.getRange(rowIndex, headers.indexOf(header) + 1).getValue());
  COMPANY_PROFILES_SHEET.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  return profile;
}
function deleteCompanyProfile(profileId) {
  const rowIndex = findRowById(COMPANY_PROFILES_SHEET, profileId, getHeaderIndex(COMPANY_PROFILES_SHEET, 'profileId') - 1);
  if (rowIndex === -1) throw new Error("Company Profile not found");
  COMPANY_PROFILES_SHEET.deleteRow(rowIndex);
  return { id: profileId, status: "deleted" };
}

function addDeliveryAddress(address) {
  const headers = DELIVERY_ADDRESSES_SHEET.getRange(1, 1, 1, DELIVERY_ADDRESSES_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => address[header] || "");
  DELIVERY_ADDRESSES_SHEET.appendRow(newRow);
  return address;
}
function updateDeliveryAddress(address) {
  const rowIndex = findRowById(DELIVERY_ADDRESSES_SHEET, address.addressId, getHeaderIndex(DELIVERY_ADDRESSES_SHEET, 'addressId') - 1);
  if (rowIndex === -1) throw new Error("Address not found");
  const headers = DELIVERY_ADDRESSES_SHEET.getRange(1, 1, 1, DELIVERY_ADDRESSES_SHEET.getLastColumn()).getValues()[0];
  const newRow = headers.map(header => address[header] !== undefined ? address[header] : DELIVERY_ADDRESSES_SHEET.getRange(rowIndex, headers.indexOf(header) + 1).getValue());
  DELIVERY_ADDRESSES_SHEET.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  return address;
}
function deleteDeliveryAddress(addressId) {
  const rowIndex = findRowById(DELIVERY_ADDRESSES_SHEET, addressId, getHeaderIndex(DELIVERY_ADDRESSES_SHEET, 'addressId') - 1);
  if (rowIndex === -1) throw new Error("Address not found");
  DELIVERY_ADDRESSES_SHEET.deleteRow(rowIndex);
  return { id: addressId, status: "deleted" };
}

function getBudgetRequests(user) {
    const allRequests = sheetToJSON(BUDGETS_SHEET);
    const allUsers = sheetToJSON(USERS_SHEET);
    switch (user.role) {
        case 'USER': return allRequests.filter(r => r.userId === user.id);
        case 'MANAGER': return allRequests.filter(r => r.managerApproverId === user.id);
        case 'BOD': return allRequests.filter(r => { const requestUser = allUsers.find(u => u.id === r.userId); return requestUser && requestUser.bodId === user.id; });
        case 'ADMIN': return allRequests;
        default: return [];
    }
}

function getPendingApprovals(user) {
    const allRequests = sheetToJSON(BUDGETS_SHEET);
    const allUsers = sheetToJSON(USERS_SHEET);
    if (user.role === 'MANAGER') return allRequests.filter(r => r.managerApproverId === user.id && r.status === 'Pending Manager Approval');
    if (user.role === 'BOD') return allRequests.filter(r => { const requestUser = allUsers.find(u => u.id === r.userId); return requestUser && requestUser.bodId === user.id && r.status === 'Pending BOD Approval'; });
    return [];
}

function submitMultipleBudgets(requests) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const results = [];
    const headers = BUDGETS_SHEET.getRange(1, 1, 1, BUDGETS_SHEET.getLastColumn()).getValues()[0];
    for (const request of requests) {
      const newId = generateMonthlySequentialId(BUDGETS_SHEET, 'BU', 'id');
      const status = request.status || 'Pending Admin Review';
      const newRequest = { ...request, id: newId, submittedAt: new Date().toISOString(), status: status, items: JSON.stringify(request.items), poGenerated: false };
      const newRow = headers.map(header => newRequest[header] !== undefined ? newRequest[header] : "");
      BUDGETS_SHEET.appendRow(newRow);
      if (status === 'Pending Admin Review') {
          try {
              const adminEmails = getAdminEmails();
              if (adminEmails.length > 0) MailApp.sendEmail(adminEmails.join(','), `[Budget Review] New Request from ${request.userName}`, `Hello Admin,\n\nA new budget request (#${newId}) has been submitted.\n\nThank you.`);
          } catch (e) {}
      }
      results.push({ ...newRequest, items: request.items });
    }
    return results;
  } finally { lock.releaseLock(); }
}

function deleteBudgetRequest(data) {
    const budgetId = typeof data === 'string' ? data : data.budgetId;
    const rowIndex = findRowById(BUDGETS_SHEET, budgetId);
    if (rowIndex === -1) throw new Error('Budget request not found');
    BUDGETS_SHEET.deleteRow(rowIndex);
    return { id: budgetId, status: 'Deleted' };
}

/**
 * Logika Approval Diperbarui:
 * BOD approval hanya jika (Total > 5jt) DAN (Terdapat item kategori Asset).
 */
function approveBudget(budgetId, approver) {
    const rowIndex = findRowById(BUDGETS_SHEET, budgetId);
    const requestData = getBudgetById(budgetId);
    let nextStatus = 'Approved', procurementStatus = 'Pending Procurement';
    
    // Logika Re-evaluated: Hanya eskalasi ke BOD jika Nilai > 5jt DAN ada kategori Asset
    const isAsset = hasAssetItems(requestData.items);
    const isHighValue = parseFloat(requestData.total) > 5000000;

    if (approver.role === 'MANAGER' && isAsset && isHighValue && requestData.bodApproverId) { 
      nextStatus = 'Pending BOD Approval'; 
      procurementStatus = ''; 
    }

    BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'status')).setValue(nextStatus);
    if (procurementStatus) BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'procurementStatus')).setValue(procurementStatus);
    BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'approvedAt')).setValue(new Date().toISOString());
    return getBudgetById(budgetId);
}

function rejectBudget(budgetId, approver, reason) {
    const rowIndex = findRowById(BUDGETS_SHEET, budgetId);
    const requestData = getBudgetById(budgetId);
    
    // Perbarui status di sheet
    BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'status')).setValue('Rejected');
    BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'rejectedReason')).setValue(reason);
    BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'rejectedAt')).setValue(new Date().toISOString());

    // Kirim Notifikasi Email ke User
    try {
        const userEmail = getUserEmailById(requestData.userId);
        if (userEmail) {
            const subject = `[Budget Rejected] Pengajuan Budgeting Anda Dibatalkan (#${budgetId})`;
            const body = `Hallo ${requestData.userName},\n\n` +
              `Kami menginformasikan bahwa pengajuan budgeting Anda dengan ID #${budgetId} telah dibatalkan oleh ${approver.role}.\n\n` +
              `Alasan Penolakan:\n"${reason}"\n\n` +
              `Silahkan buat pengajuan budgeting ulang jika diperlukan.\n\n` +
              `Terima kasih.\n\n` +
              `*Note Email ini dibuat secara otomatis oleh Budgeting System.`;
            
            MailApp.sendEmail({
                to: userEmail,
                subject: subject,
                body: body
            });
        }
    } catch (e) {
        console.error("Gagal mengirim email notifikasi penolakan: " + e.message);
    }

    return getBudgetById(budgetId);
}

function getApprovedBudgetsForProcurement() { 
    return sheetToJSON(BUDGETS_SHEET).filter(r => r.status === 'Approved' || (r.status === 'Rejected' && r.procurementStatus)); 
}

function updateProcurementStatus(budgetId, status) {
    const rowIndex = findRowById(BUDGETS_SHEET, budgetId);
    if (rowIndex === -1) throw new Error("Budget ID not found.");
    BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'procurementStatus')).setValue(status);
    if (status === 'Rejected by Manager') {
        BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'status')).setValue('Rejected');
        BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'rejectedAt')).setValue(new Date().toISOString());
        BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'rejectedReason')).setValue('Dibatalkan pada tahap pengadaan oleh Admin (Berdasarkan instruksi Manager/BOD)');
    }
    return getBudgetById(budgetId);
}

function updatePoPaymentDetails(data) {
    const poId = data.poId;
    const poRow = findRowById(PURCHASE_ORDERS_SHEET, poId, getHeaderIndex(PURCHASE_ORDERS_SHEET, 'poId') - 1);
    if (poRow === -1) throw new Error("PO ID tidak ditemukan.");

    PURCHASE_ORDERS_SHEET.getRange(poRow, getHeaderIndex(PURCHASE_ORDERS_SHEET, 'invoiceNumber')).setValue(data.invoiceNumber);
    PURCHASE_ORDERS_SHEET.getRange(poRow, getHeaderIndex(PURCHASE_ORDERS_SHEET, 'taxInvoiceNumber')).setValue(data.taxInvoiceNumber);
    PURCHASE_ORDERS_SHEET.getRange(poRow, getHeaderIndex(PURCHASE_ORDERS_SHEET, 'actualPaymentAmount')).setValue(data.actualAmount);
    PURCHASE_ORDERS_SHEET.getRange(poRow, getHeaderIndex(PURCHASE_ORDERS_SHEET, 'paymentStatus')).setValue('Paid');

    if (data.fileBase64 && data.fileName) {
        try {
            const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
            const blob = Utilities.newBlob(Utilities.base64Decode(data.fileBase64), 'application/pdf', data.fileName);
            const file = folder.createFile(blob);
            PURCHASE_ORDERS_SHEET.getRange(poRow, getHeaderIndex(PURCHASE_ORDERS_SHEET, 'invoiceFileUrl')).setValue(file.getUrl());
        } catch (e) {
            console.error("Gagal upload file: " + e.message);
        }
    }

    return sheetToJSON(PURCHASE_ORDERS_SHEET).find(p => p.poId === poId);
}

function updateBudgetProcurementDetails(data) {
  const rowIndex = findRowById(BUDGETS_SHEET, data.budgetId);
  if (data.companyProfileId) BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'assignedCompanyProfileId')).setValue(data.companyProfileId);
  if (data.deliveryAddress) BUDGETS_SHEET.getRange(rowIndex, getHeaderIndex(BUDGETS_SHEET, 'assignedDeliveryAddress')).setValue(data.deliveryAddress);
  return { success: true, budgetId: data.budgetId };
}

/**
 * Generate PO Diperbarui:
 * Nama Penandatangan otomatis menyesuaikan (BOD vs Manager) berdasarkan kriteria Asset+Nilai.
 */
function generatePurchaseOrders() {
  const budgetData = sheetToJSON(BUDGETS_SHEET);
  const usersData = sheetToJSON(USERS_SHEET);
  const vendorsData = sheetToJSON(VENDORS_SHEET);
  const requestsToProcess = budgetData.filter(req => String(req.status || '').toLowerCase() === 'approved' && String(req.procurementStatus || '').toLowerCase() === 'in progress' && String(req.poGenerated || '').toLowerCase() !== 'true' && req.assignedCompanyProfileId && req.assignedDeliveryAddress && req.vendorId);
  if (requestsToProcess.length === 0) return [];
  const generatedPOs = [];
  const poHeaders = PURCHASE_ORDERS_SHEET.getRange(1, 1, 1, PURCHASE_ORDERS_SHEET.getLastColumn()).getValues()[0];
  
  for (const req of requestsToProcess) {
    const requestingUser = usersData.find(u => u.id === req.userId);
    let managerName = "Manager";
    let approverDetails = { name: 'Admin Authorized', title: 'Administrator' };
    
    let ccList = ["dahlia.sirait@apotekalpro.id"];

    if (requestingUser) {
      const managerObj = usersData.find(u => u.id === requestingUser.managerId);
      const bodObj = usersData.find(u => u.id === requestingUser.bodId);
      
      if (managerObj) managerName = managerObj.name;
      if (requestingUser.email) ccList.push(requestingUser.email);

      // Logika Penentuan Signer (Sama dengan logika approval)
      const isAsset = hasAssetItems(req.items);
      const isHighValue = parseFloat(req.total) > 5000000;
      
      let finalApprover = managerObj; // Default Manager
      if (isAsset && isHighValue && bodObj) {
          finalApprover = bodObj; // Hanya BOD jika Asset & > 5jt
          if (bodObj.email) ccList.push(bodObj.email);
      }
      
      if (finalApprover) { 
        approverDetails.name = finalApprover.name; 
        approverDetails.title = finalApprover.jobTitle || finalApprover.role; 
      }
    }

    const vendorInfo = vendorsData.find(v => String(v.vendorId) === String(req.vendorId));
    const totalCostExclDisc = req.total, dpp = Math.round(totalCostExclDisc * (11 / 12)), vat = Math.round(dpp * 0.12), finalTotalAmount = Math.round(totalCostExclDisc + vat);
    const newPoId = generateMonthlySequentialId(PURCHASE_ORDERS_SHEET, 'PO', 'poId');
    const newPO = { poId: newPoId, vendorId: req.vendorId, vendorName: vendorInfo ? vendorInfo.vendorName : 'Unknown Vendor', dateIssued: new Date().toISOString(), items: req.items, totalAmount: finalTotalAmount, relatedBudgetIds: JSON.stringify([req.id]), companyProfileId: req.assignedCompanyProfileId, deliveryAddress: req.assignedDeliveryAddress, approvedByName: approverDetails.name, approvedByTitle: approverDetails.title };
    PURCHASE_ORDERS_SHEET.appendRow(poHeaders.map(h => newPO[h] !== undefined ? newPO[h] : ""));
    generatedPOs.push(newPO);
    
    if (requestingUser) {
      try {
         const managerEmail = getUserEmailById(requestingUser.managerId);
         if (managerEmail) {
           const b64Pdf = createPoPdf(newPoId);
           const pdfBlob = Utilities.newBlob(Utilities.base64Decode(b64Pdf), 'application/pdf', `${newPoId}.pdf`);
           
           const formattedTotal = finalTotalAmount.toLocaleString('id-ID');
           
           // Bagian Deskripsi Perubahan (Admin Change Log)
           let changeInfoSection = "";
           if (req.changeLog && String(req.changeLog).trim() !== "") {
             changeInfoSection = `\n--- CATATAN PERUBAHAN ADMIN ---\n` +
               `Admin telah melakukan penyesuaian pada pengajuan asli sebagai berikut:\n` +
               `${req.changeLog}\n` +
               `-------------------------------\n\n`;
           }

           let emailBody = `Hallo ${managerName},\n\n` +
               `Department ${req.department} telah melakukan pengajuan anggaran dengan rincian sebagai berikut:\n\n` +
               `Nomor PO : ${newPoId}\n` +
               `Total PO : Rp ${formattedTotal}\n` +
               `Vendor : ${newPO.vendorName}\n\n` +
               changeInfoSection +
               `Bersama email ini kami lampirkan draft Purchase Order (PO) untuk dapat direview dan ditandatangani. Setelah PO ditandatangani, mohon untuk membalas email ini dengan melampirkan PO dalam format PDF yang telah ditandatangani.\n\n`;

           const isAsset = hasAssetItems(req.items);
           const isHighValue = parseFloat(req.total) > 5000000;

           if (!(isAsset && isHighValue)) {
             emailBody += `Apabila diperlukan koreksi atau penolakan (reject) atas pengajuan anggaran tersebut, silakan reply all dalam email ini\n\n`;
           } else {
             emailBody += `Sehubungan dengan ketentuan yang berlaku, apabila total nilai pengajuan PO barang kategori ASSET melebihi Rp 5.000.000, maka persetujuan dan penandatanganan dilakukan oleh BOD terkait. Mohon bantuan untuk menginformasikan hal ini kepada BOD yang bersangkutan guna proses approval pengajuan anggaran tersebut.\n\n` +
               `Apabila diperlukan koreksi atau penolakan (reject) atas pengajuan anggaran ini, silakan reply all di email ini\n\n`;
           }

           emailBody += `Atas perhatian dan kerja samanya, kami ucapkan terima kasih.\n\n` +
               `*Note Email ini dibuat secara otomatis oleh Budgeting System.`;

           MailApp.sendEmail({ 
             to: managerEmail,
             cc: [...new Set(ccList)].join(','),
             subject: `[Review PO] Purchase Order issued (#${newPoId}) - Dept: ${req.department}`, 
             body: emailBody, 
             attachments: [pdfBlob] 
           });
         }
      } catch (e) {
        console.error("Gagal mengirim email: " + e.message);
      }
    }
  }
  const budgetIdsToUpdate = new Set(requestsToProcess.map(req => req.id));
  if (budgetIdsToUpdate.size > 0) {
    const range = BUDGETS_SHEET.getRange(2, 1, BUDGETS_SHEET.getLastRow() - 1, BUDGETS_SHEET.getLastColumn()), values = range.getValues(), headers = BUDGETS_SHEET.getRange(1, 1, 1, BUDGETS_SHEET.getLastColumn()).getValues()[0], idCol = headers.indexOf('id'), poGenCol = headers.indexOf('poGenerated'), procCol = headers.indexOf('procurementStatus');
    for (let i = 0; i < values.length; i++) { if (budgetIdsToUpdate.has(values[i][idCol])) { values[i][poGenCol] = true; values[i][procCol] = 'Sent to Manager'; } }
    range.setValues(values);
  }
  return generatedPOs;
}

function createPoPdf(poId) {
  const poData = sheetToJSON(PURCHASE_ORDERS_SHEET).find(p => p.poId === poId);
  if (!poData) throw new Error("PO Not Found");
  const vendor = sheetToJSON(VENDORS_SHEET).find(v => String(v.vendorId) === String(poData.vendorId));
  const company = sheetToJSON(COMPANY_PROFILES_SHEET).find(c => String(c.profileId) === String(poData.companyProfileId));
  const rawItems = typeof poData.items === 'string' ? JSON.parse(poData.items) : (poData.items || []);
  const itemMap = {};
  rawItems.forEach(item => { if (itemMap[item.productId]) { itemMap[item.productId].qty += item.qty; itemMap[item.productId].total += item.total; } else { itemMap[item.productId] = { ...item }; } });
  const items = Object.values(itemMap);
  const totalCostExclDisc = items.reduce((sum, item) => sum + item.total, 0), dpp = Math.round(totalCostExclDisc * (11 / 12)), vat = Math.round(dpp * 0.12), totalPo = Math.round(totalCostExclDisc + vat);
  const formatIDR = (num) => "Rp " + num.toLocaleString('id-ID');

  const html = `
    <!DOCTYPE html><html><head><style>
      body { font-family: Helvetica, Arial, sans-serif; font-size: 9pt; color: #333; margin: 0; padding: 1.5cm 1cm; }
      .container { width: 100%; } .header { text-align: center; margin-bottom: 30px; } .header h1 { font-size: 16pt; font-weight: bold; margin: 0; text-transform: uppercase; }
      .info-section { display: flex; width: 100%; margin-bottom: 20px; } .left-info { width: 60%; } .right-info { width: 40%; font-size: 8.5pt; line-height: 1.4; }
      .info-block { margin-bottom: 12px; } .label { font-weight: bold; color: #000; font-size: 8pt; text-transform: uppercase; margin-bottom: 2px; }
      .value { font-weight: normal; margin: 0; word-wrap: break-word; max-width: 320px; } .value-bold { font-weight: bold; margin: 0; }
      .po-details-row { display: table; width: 100%; margin-bottom: 2px; } .po-details-label { display: table-cell; width: 100px; font-weight: bold; }
      .company-block { margin-top: 10px; } .company-name { font-weight: bold; font-size: 9pt; margin: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 0.5pt solid #ccc; }
      th { background-color: #dcdcdc; font-weight: bold; font-size: 8pt; text-align: left; padding: 4px 6px; border: 0.5pt solid #ccc; }
      td { padding: 4px 6px; font-size: 8pt; border: 0.5pt solid #eee; } .text-right { text-align: right; } .text-center { text-align: center; }
      .footer-section { width: 100%; display: flex; justify-content: flex-end; margin-top: 15px; } .totals-table { width: 250px; margin-left: auto; }
      .totals-row { display: table; width: 100%; margin-bottom: 4px; } .totals-label { display: table-cell; width: 140px; font-weight: bold; }
      .totals-value { display: table-cell; text-align: right; font-weight: bold; } .grand-total { border-top: 1pt solid #444; padding-top: 5px; font-size: 10pt; color: #000; font-weight: bold; }
      .signature-box { margin-top: 40px; text-align: center; float: right; width: 200px; } .signature-label { font-weight: bold; margin-bottom: 110px; display: block; }
      .signature-name { font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 0; } .signature-title { font-weight: bold; margin: 0; }
    </style></head><body><div class="container"><div class="header"><h1>Purchase Order</h1></div>
    <div class="info-section"><div class="left-info">
      <div class="info-block"><div class="label">Purchase From :</div><p class="value-bold">${vendor.vendorName}</p><p class="value">${vendor.vendorAddress}</p></div>
      <div class="info-block"><div class="label">Delivery Address :</div><p class="value">${poData.deliveryAddress}</p></div>
      <div class="company-block"><div class="label">Nama PT :</div><p class="company-name">${company.companyName}</p><p class="value">${company.companyAddress}</p><p class="value">NPWP: ${company.npwp}</p></div>
    </div><div class="right-info">
      <div class="po-details-row"><span class="po-details-label">PO NO.</span><span>: ${poData.poId}</span></div>
      <div class="po-details-row"><span class="po-details-label">Date Issued</span><span>: ${new Date(poData.dateIssued).toLocaleDateString('en-GB')}</span></div>
      <div class="po-details-row"><span class="po-details-label">Approved By</span><span>: <b>${poData.approvedByName || '-'}</b></span></div>
      <div class="po-details-row"><span class="po-details-label">ETA Date</span><span>: -</span></div>
      <div class="po-details-row"><span class="po-details-label">Page</span><span>: 1</span></div>
      <div class="po-details-row"><span class="po-details-label">Vendor Code</span><span>: ${vendor.vendorId}</span></div>
      <div class="po-details-row"><span class="po-details-label">Term Of Payment</span><span>: ${vendor.termOfPayment}</span></div>
    </div></div>
    <table><thead><tr><th style="width: 30px">No</th><th>Item Code</th><th>Item Name</th><th style="width: 40px" class="text-center">Qty</th><th style="width: 40px">UoM</th><th class="text-right">Unit Cost</th><th class="text-right">Sub Total</th></tr></thead>
    <tbody>${items.map((item, i) => `<tr><td class="text-center">${i + 1}</td><td>${item.productId}</td><td>${item.productName}</td><td class="text-center">${item.qty}</td><td>${item.unit}</td><td class="text-right">${formatIDR(item.price)}</td><td class="text-right">${formatIDR(item.total)}</td></tr>`).join('')}</tbody></table>
    <div class="footer-section"><div class="totals-table">
      <div class="totals-row"><span class="totals-label">Total Cost Excl. Disc :</span><span class="totals-value">${formatIDR(totalCostExclDisc)}</span></div>
      <div class="totals-row"><span class="totals-label">Total Disc :</span><span class="totals-value">-</span></div>
      <div class="totals-row"><span class="totals-label">DPP :</span><span class="totals-value">${formatIDR(dpp)}</span></div>
      <div class="totals-row"><span class="totals-label">VAT 12% :</span><span class="totals-value">${formatIDR(vat)}</span></div>
      <div class="totals-row grand-total"><span class="totals-label">TOTAL PO :</span><span class="totals-value">${formatIDR(totalPo)}</span></div>
    </div></div><div class="signature-box"><span class="signature-label">Approved By :</span><p class="signature-name">${poData.approvedByName || '-'}</p><p class="signature-title">${poData.approvedByTitle || ''}</p></div></div></body></html>
  `;
  return Utilities.base64Encode(HtmlService.createHtmlOutput(html).getAs('application/pdf').getBytes());
}
