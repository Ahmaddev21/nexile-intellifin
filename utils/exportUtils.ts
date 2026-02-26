import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense } from '../types';

export const downloadExpenseSummaryPDF = (
    companyName: string,
    dateRange: string,
    generationDate: string,
    summaryData: { category: string; total_amount: number }[],
    grandTotal: number
) => {
    const doc = new jsPDF();

    // Section 1: Report Info
    doc.setFontSize(20);
    doc.text("Expense History Summary", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Company Name: ${companyName}`, 14, 32);
    doc.text(`Selected Date Range: ${dateRange}`, 14, 38);
    doc.text(`Report Generation Date: ${generationDate}`, 14, 44);

    // Section 2: Category Summary Table
    const tableData = summaryData.map(item => [
        item.category.charAt(0).toUpperCase() + item.category.slice(1),
        Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    ]);

    // Apply autoTable
    autoTable(doc, {
        startY: 54,
        head: [['Category', 'Total Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 80, halign: 'right' }
        }
    });

    // Section 3: Grand Total
    const finalY = (doc as any).lastAutoTable.finalY || 54;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 15);

    // Generate Download
    const filename = `Expense_Summary_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
};
