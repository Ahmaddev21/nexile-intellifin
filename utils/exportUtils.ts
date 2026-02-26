export const downloadExpenseSummaryCSV = (
    companyName: string,
    dateRange: string,
    generationDate: string,
    summaryData: { category: string; total_amount: number }[],
    grandTotal: number
) => {
    let csvContent = "data:text/csv;charset=utf-8,";

    // Section 1: Report Info
    csvContent += "REPORT INFO\n";
    csvContent += `Company Name,${companyName}\n`;
    csvContent += `Selected Date Range,${dateRange}\n`;
    csvContent += `Report Generation Date,${generationDate}\n\n`;

    // Section 2: Category Summary Table
    csvContent += "CATEGORY SUMMARY\n";
    csvContent += "Category,Total Amount\n";
    summaryData.forEach(item => {
        // Enclose in quotes in case a category has commas
        csvContent += `"${item.category}",${item.total_amount}\n`;
    });
    csvContent += "\n";

    // Section 3: Grand Total
    csvContent += "GRAND TOTAL\n";
    csvContent += `Total of all filtered expenses,${grandTotal}\n`;

    // Generate Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Expense_Summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); // Required for Firefox

    link.click();
    document.body.removeChild(link);
};
