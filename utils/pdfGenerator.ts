import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, Vendor, CompanyProfile, BudgetItem } from '../types';

const formatCurrency = (value: number) => {
    // Changed to 0 fraction digits for rounding display
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export const generatePoPdf = (po: PurchaseOrder, vendor: Vendor, company: CompanyProfile) => {
    const doc = new jsPDF();
    
    // --- Header ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("PURCHASE ORDER", 105, 20, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // --- Left Column: Vendor & Delivery ---
    let yPos = 40;
    
    // Purchase From
    doc.setFont('helvetica', 'bold');
    doc.text("PURCHASE FROM :", 15, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(vendor.vendorName, 15, yPos);
    yPos += 5;
    const vendorAddressLines = doc.splitTextToSize(vendor.vendorAddress, 80);
    doc.text(vendorAddressLines, 15, yPos);
    
    // Calculate Y position after vendor address to place Delivery Address
    let leftY = 40 + 10 + (vendorAddressLines.length * 4) + 10;
    
    // Delivery Address
    doc.setFont('helvetica', 'bold');
    doc.text("DELIVERY ADDRESS :", 15, leftY);
    leftY += 5;
    doc.setFont('helvetica', 'normal');
    const deliveryAddressLines = doc.splitTextToSize(po.deliveryAddress, 80);
    doc.text(deliveryAddressLines, 15, leftY);
    
    // Company Profile (Buyer)
    // UPDATE: Reduced spacing from + 15 to + 6 to move Company info up
    leftY += (deliveryAddressLines.length * 4) + 6;
    
    doc.setFont('helvetica', 'bold');
    doc.text(company.companyName, 15, leftY);
    leftY += 5;
    doc.setFont('helvetica', 'normal');
    const companyAddressLines = doc.splitTextToSize(company.companyAddress, 100);
    doc.text(companyAddressLines, 15, leftY);
    leftY += (companyAddressLines.length * 4) + 5;
    doc.text(`NPWP: ${company.npwp}`, 15, leftY);
    
    // --- Right Column: PO Details ---
    yPos = 40;
    const rightColX = 120;
    const labelX = rightColX;
    const valueX = rightColX + 40;
    const lineHeight = 5;
    
    // UPDATE: We use a placeholder for Page value to fill it later with total pages
    const details = [
        { label: "PO NO.", value: `: ${po.poId}` },
        { label: "Date Issued", value: `: ${new Date(po.dateIssued).toLocaleDateString('en-GB')}` },
        { label: "Approved By", value: `: ${po.approvedByName || '-'}` },
        { label: "ETA Date", value: `: -` },
        { label: "Page", value: `PENDING` }, // Special marker
        { label: "Vendor Code", value: `: ${vendor.vendorId}` },
        { label: "Term Of Payment", value: `: ${vendor.termOfPayment}` },
    ];
    
    let pageValueX = 0;
    let pageValueY = 0;

    details.forEach(detail => {
        doc.text(detail.label, labelX, yPos);
        
        if (detail.label === "Page") {
            // Store coordinates to draw the page count later (after table generation)
            pageValueX = valueX;
            pageValueY = yPos;
        } else {
            doc.text(detail.value, valueX, yPos);
        }
        yPos += lineHeight;
    });

    // --- Items Processing & Calculation ---
    // 1. Aggregate items (combine same productId)
    const rawItems = Array.isArray(po.items) ? po.items : JSON.parse(po.items as any);
    const itemMap = new Map<string, BudgetItem>();
    
    rawItems.forEach((item: BudgetItem) => {
        if (itemMap.has(item.productId)) {
            const existing = itemMap.get(item.productId)!;
            // Create a new object to avoid mutating the original reference in a way that affects other renders
            const updated = { 
                ...existing, 
                qty: existing.qty + item.qty, 
                total: existing.total + item.total 
            };
            itemMap.set(item.productId, updated);
        } else {
            itemMap.set(item.productId, { ...item });
        }
    });
    const items = Array.from(itemMap.values());

    // 2. Calculate Totals with ROUNDING
    const totalCostExclDisc = items.reduce((sum, item) => sum + item.total, 0);
    const dpp = Math.round(totalCostExclDisc * (11 / 12));
    const vat = Math.round(dpp * 0.12);
    const totalPo = Math.round(totalCostExclDisc + vat);

    // --- Items Table ---
    // Start table below the lowest point of header info
    const startTableY = Math.max(leftY + 15, yPos + 10, 95);
    
    const tableBody = items.map((item: any, index: number) => [
        index + 1,
        '', // EAN Barcode placeholder
        item.productId,
        item.productName,
        item.qty,
        item.unit,
        formatCurrency(item.price),
        '0%', // Disc placeholder
        formatCurrency(item.total)
    ]);

    autoTable(doc, {
        startY: startTableY,
        head: [['No', 'EAN Barcode', 'Item Code', 'Item Name', 'Qty', 'UoM', 'Unit Cost (IDR)', 'Disc (%)', 'Sub Total (IDR)']],
        body: tableBody,
        // Reduced vertical padding from 2 to 1 (top/bottom) to tighten row spacing
        styles: { fontSize: 8, cellPadding: { top: 1, right: 2, bottom: 1, left: 2 }, overflow: 'linebreak' },
        headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
        theme: 'plain',
        columnStyles: {
            0: { cellWidth: 10 },
            6: { halign: 'right' },
            8: { halign: 'right' }
        }
    });
    
    // --- Footer & Calculations ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Footer Alignment
    // Match Header alignment: Label at 120, Colon at 160 (120+40)
    const footerXLabel = 120;
    const footerXColon = 160; 
    const footerXValue = 195;
    let footerY = finalY;
    
    const footerRows = [
        { label: "Total Cost Excl. Disc", value: formatCurrency(totalCostExclDisc), bold: true },
        { label: "Total Disc", value: "-", bold: true },
        { label: "DPP", value: formatCurrency(dpp), bold: true },
        { label: "VAT 12%", value: formatCurrency(vat), bold: true },
        { label: "Total PO", value: formatCurrency(totalPo), bold: true },
    ];
    
    footerRows.forEach(row => {
        doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
        
        // Print Label
        doc.text(row.label, footerXLabel, footerY);
        
        // Print Colon at fixed position (aligned with header colons)
        doc.text(":", footerXColon, footerY);
        
        // Print Value right-aligned
        doc.text(row.value, footerXValue, footerY, { align: 'right' });
        
        footerY += 5;
    });
    
    // --- Approval Signature ---
    // Position signature box lower down
    const signatureY = finalY + 40;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold'); // Bold
    doc.text("Approved By :", 150, signatureY);
    
    // Name
    doc.setFont('helvetica', 'bold');
    doc.text(po.approvedByName || '', 150, signatureY + 25);
    
    // Job Title - User requested this section to be bold
    doc.setFont('helvetica', 'bold');
    doc.text(po.approvedByTitle || '', 150, signatureY + 30);

    // --- UPDATE: PAGE NUMBER INSERTION ---
    // Now that table is generated, we know total pages.
    // Go back to Page 1 and fill in the "Page" value.
    const totalPages = doc.internal.getNumberOfPages();
    doc.setPage(1);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${totalPages}`, pageValueX, pageValueY);
    
    // Save the PDF
    doc.save(`${po.poId}.pdf`);
};