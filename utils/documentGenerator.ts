import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Invoice, Expense, PayableInvoice, CreditNote, Company } from '../types';

// Extend jsPDF type to include autoTable
interface jsPDFCustom extends jsPDF {
    lastAutoTable: { finalY: number };
}

type RecordType = 'invoice' | 'expense' | 'payable' | 'credit_note';

export const generatePDF = (record: any, type: RecordType, company: Company) => {
    const doc = new jsPDF() as jsPDFCustom;
    const currency = company.currency || '$';

    // --- Header ---
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(company.name.toUpperCase(), 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Logo placeholder (optional, if we have base64 logo)
    // doc.addImage(logoBase64, 'PNG', 160, 10, 30, 30);

    // --- Title & Status ---
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const titleMap = {
        invoice: 'INVOICE',
        expense: 'EXPENSE VOUCHER',
        payable: 'BILL / PAYABLE',
        credit_note: 'CREDIT NOTE'
    };
    doc.text(titleMap[type], 14, 45);

    const status = record.status?.toUpperCase() || 'DRAFT';
    doc.setFontSize(10);
    doc.setTextColor(
        status === 'PAID' ? 0 : 100,
        status === 'PAID' ? 128 : 100,
        status === 'PAID' ? 0 : 100
    );
    doc.text(`STATUS: ${status}`, 14, 52);

    // --- Details Grid ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    const rightColX = 120;
    let currentY = 65;

    const addDetailRow = (label: string, value: string | number, x: number = 14) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, x, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`${value}`, x + 40, currentY);
    };

    if (type === 'invoice') {
        // Row 1
        addDetailRow('Invoice ID', record.customId || record.id.substring(0, 8));
        addDetailRow('Client', record.clientName, rightColX);
        currentY += 8; // Increased spacing

        // Row 2
        addDetailRow('Date', record.date);
        addDetailRow('Project', record.projectName, rightColX);
    } else if (type === 'expense') {
        // Row 1
        addDetailRow('Expense ID', record.id.substring(0, 8));
        addDetailRow('Category', record.category, rightColX);
        currentY += 8;

        // Row 2
        addDetailRow('Date', record.date);
        addDetailRow('Project', record.projectName, rightColX);
    } else if (type === 'payable') {
        // Row 1
        addDetailRow('Bill ID', record.id.substring(0, 8));
        addDetailRow('Vendor', record.vendorName, rightColX);
        currentY += 8;

        // Row 2
        addDetailRow('Date', record.date);
        addDetailRow('Due Date', record.dueDate, rightColX);
    } else if (type === 'credit_note') {
        // Row 1
        addDetailRow('Credit Note ID', record.id.substring(0, 8));
        addDetailRow('Invoice Ref', record.invoiceId?.substring(0, 8) || 'N/A', rightColX);
        currentY += 8;

        // Row 2
        addDetailRow('Date', new Date(record.createdAt).toLocaleDateString());
        addDetailRow('Reason', record.reason || 'N/A', rightColX);
    }

    currentY += 15;

    // --- Table Content ---
    let tableHead = [['Description', 'Details', 'Amount']];
    let tableBody: any[] = [];

    if (type === 'invoice') {
        tableHead = [['Item / Description', 'Project', 'Amount']];
        tableBody = [
            [record.projectName + ' Services', 'Consulting / Services', `${currency}${record.amount.toLocaleString()}`]
        ];
    } else if (type === 'expense') {
        tableHead = [['Category', 'Type', 'Amount']];
        tableBody = [
            [record.category, record.type?.toUpperCase() || 'EXPENSE', `${currency}${record.amount.toLocaleString()}`]
        ];
    } else if (type === 'payable') {
        tableHead = [['Description', 'Vendor', 'Amount']];
        tableBody = [
            [record.description || 'Vendor Bill', record.vendorName, `${currency}${record.amount.toLocaleString()}`]
        ];
    } else if (type === 'credit_note') {
        tableHead = [['Reason', 'Related Project', 'Credit Amount']];
        tableBody = [
            [record.reason || 'General Credit', record.projectId || 'N/A', `-${currency}${record.amount.toLocaleString()}`]
        ];
    }

    autoTable(doc, {
        startY: currentY,
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [63, 81, 181], textColor: 255 }, // Indigo
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // --- Totals ---
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`TOTAL: ${currency}${record.amount.toLocaleString()}`, 140, finalY);

    // --- Footer ---
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Keep business halal. Generated by Intellifin.", 14, 280);

    doc.save(`${type}_${record.id.substring(0, 8)}.pdf`);
};

export const generateExcel = (record: any, type: RecordType) => {
    const data = [
        ['Company', 'Intellifin'], // Placeholder for company name context
        ['Document Type', type.toUpperCase()],
        ['ID', record.id],
        ['Date', record.date || record.createdAt],
        ['Status', record.status],
        [], // Empty row
        ['Description', 'Details', 'Amount'], // Headers
    ];

    // Add row based on type
    if (type === 'invoice') {
        data.push([`Project: ${record.projectName}`, record.clientName, record.amount]);
    } else if (type === 'expense') {
        data.push([`Category: ${record.category}`, record.projectName, record.amount]);
    } else if (type === 'payable') {
        data.push([`Vendor: ${record.vendorName}`, record.description || 'Bill', record.amount]);
    } else if (type === 'credit_note') {
        data.push([`Reason: ${record.reason}`, `Invoice: ${record.invoiceId}`, -record.amount]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${type}_${record.id.substring(0, 8)}.xlsx`);
};
