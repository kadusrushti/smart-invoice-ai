import * as XLSX from 'xlsx';
import type { ExtractedInvoice } from '@/types/invoice';

export interface ExportableData {
  vendorName: string;
  vendorAddress: string;
  cin: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  gstin: string;
  pan: string;
  recipientName: string;
  recipientAddress: string;
  recipientGstin: string;
  placeOfSupply: string;
  stateCode: string;
  poNumber: string;
  poDate: string;
  orderNumber: string;
  orderQuantity: string;
  invoiceReference: string;
  reverseCharge: string;
  currency: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  tcs: number;
  roundOff: number;
  grandTotal: number;
  taxAmountInWords: string;
  totalAmountInWords: string;
  lineItems: Array<{
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    lineTotal: number;
  }>;
  detailSections: Array<{
    title: string;
    fields: Array<{ label: string; value: string }>;
  }>;
}

export function toExportable(invoice: ExtractedInvoice): ExportableData {
  return {
    vendorName: invoice.vendorName.value,
    vendorAddress: invoice.vendorAddress.value,
    cin: invoice.cin.value,
    invoiceNumber: invoice.invoiceNumber.value,
    invoiceDate: invoice.invoiceDate.value,
    dueDate: invoice.dueDate.value,
    gstin: invoice.gstin.value,
    pan: invoice.pan.value,
    recipientName: invoice.recipientName.value,
    recipientAddress: invoice.recipientAddress.value,
    recipientGstin: invoice.recipientGstin.value,
    placeOfSupply: invoice.placeOfSupply.value,
    stateCode: invoice.stateCode.value,
    poNumber: invoice.poNumber.value,
    poDate: invoice.poDate.value,
    orderNumber: invoice.orderNumber.value,
    orderQuantity: invoice.orderQuantity.value,
    invoiceReference: invoice.invoiceReference.value,
    reverseCharge: invoice.reverseCharge.value,
    currency: invoice.currency.value,
    subtotal: parseFloat(invoice.subtotal.value || '0'),
    cgst: parseFloat(invoice.cgst.value || '0'),
    sgst: parseFloat(invoice.sgst.value || '0'),
    igst: parseFloat(invoice.igst.value || '0'),
    totalTax: parseFloat(invoice.totalTax.value || '0'),
    tcs: parseFloat(invoice.tcs.value || '0'),
    roundOff: parseFloat(invoice.roundOff.value || '0'),
    grandTotal: parseFloat(invoice.grandTotal.value || '0'),
    taxAmountInWords: invoice.taxAmountInWords.value,
    totalAmountInWords: invoice.totalAmountInWords.value,
    lineItems: invoice.lineItems.map((i) => ({
      description: i.description,
      hsnCode: i.hsnCode,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice,
      discount: i.discount,
      lineTotal: i.lineTotal,
    })),
    detailSections: invoice.detailSections.map((s) => ({
      title: s.title,
      fields: s.fields.map((f) => ({ label: f.label, value: f.value })),
    })),
  };
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJSON(invoice: ExtractedInvoice, fileName: string) {
  const data = toExportable(invoice);
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, fileName.replace(/\.[^.]+$/, '') + '.json', 'application/json');
}

export function exportCSV(invoice: ExtractedInvoice, fileName: string) {
  const data = toExportable(invoice);
  const rows: string[] = [];

  rows.push('Field,Value');
  rows.push(`Vendor Name,${data.vendorName}`);
  rows.push(`Vendor Address,${data.vendorAddress}`);
  rows.push(`CIN,${data.cin}`);
  rows.push(`Invoice Number,${data.invoiceNumber}`);
  rows.push(`Invoice Date,${data.invoiceDate}`);
  rows.push(`Due Date,${data.dueDate}`);
  rows.push(`GSTIN,${data.gstin}`);
  rows.push(`PAN,${data.pan}`);
  rows.push(`Recipient Name,${data.recipientName}`);
  rows.push(`Recipient Address,${data.recipientAddress}`);
  rows.push(`Recipient GSTIN,${data.recipientGstin}`);
  rows.push(`Place of Supply,${data.placeOfSupply}`);
  rows.push(`State Code,${data.stateCode}`);
  rows.push(`PO Number,${data.poNumber}`);
  rows.push(`PO Date,${data.poDate}`);
  rows.push(`Order Number,${data.orderNumber}`);
  rows.push(`Order Quantity,${data.orderQuantity}`);
  rows.push(`Invoice Reference,${data.invoiceReference}`);
  rows.push(`Reverse Charge,${data.reverseCharge}`);
  rows.push(`Currency,${data.currency}`);
  rows.push(`Subtotal,${data.subtotal}`);
  rows.push(`CGST,${data.cgst}`);
  rows.push(`SGST,${data.sgst}`);
  rows.push(`IGST,${data.igst}`);
  rows.push(`Total Tax,${data.totalTax}`);
  rows.push(`TCS,${data.tcs}`);
  rows.push(`Round Off,${data.roundOff}`);
  rows.push(`Grand Total,${data.grandTotal}`);
  rows.push(`Tax Amount in Words,${data.taxAmountInWords}`);
  rows.push(`Total Amount in Words,${data.totalAmountInWords}`);
  rows.push('');
  rows.push('Line Items');
  rows.push('Description,HSN Code,Quantity,Unit,Unit Price,Discount,Line Total');
  data.lineItems.forEach((item) => {
    rows.push(`"${item.description.replace(/"/g, '""')}",${item.hsnCode},${item.quantity},${item.unit},${item.unitPrice},${item.discount},${item.lineTotal}`);
  });

  data.detailSections.forEach((section) => {
    rows.push('');
    rows.push(section.title);
    section.fields.forEach((f) => {
      rows.push(`${f.label},"${f.value.replace(/"/g, '""')}"`);
    });
  });

  downloadFile(rows.join('\n'), fileName.replace(/\.[^.]+$/, '') + '.csv', 'text/csv');
}

export function exportXLSX(invoice: ExtractedInvoice, fileName: string) {
  const data = toExportable(invoice);
  const wb = XLSX.utils.book_new();

  const summary: Array<[string, string | number]> = [
    ['Field', 'Value'],
    ['Vendor Name', data.vendorName],
    ['Vendor Address', data.vendorAddress],
    ['CIN', data.cin],
    ['Invoice Number', data.invoiceNumber],
    ['Invoice Date', data.invoiceDate],
    ['Due Date', data.dueDate],
    ['GSTIN', data.gstin],
    ['PAN', data.pan],
    ['Recipient Name', data.recipientName],
    ['Recipient Address', data.recipientAddress],
    ['Recipient GSTIN', data.recipientGstin],
    ['Place of Supply', data.placeOfSupply],
    ['State Code', data.stateCode],
    ['PO Number', data.poNumber],
    ['PO Date', data.poDate],
    ['Order Number', data.orderNumber],
    ['Order Quantity', data.orderQuantity],
    ['Invoice Reference', data.invoiceReference],
    ['Reverse Charge', data.reverseCharge],
    ['Currency', data.currency],
    ['Subtotal', data.subtotal],
    ['CGST', data.cgst],
    ['SGST', data.sgst],
    ['IGST', data.igst],
    ['Total Tax', data.totalTax],
    ['TCS', data.tcs],
    ['Round Off', data.roundOff],
    ['Grand Total', data.grandTotal],
    ['Tax Amount in Words', data.taxAmountInWords],
    ['Total Amount in Words', data.totalAmountInWords],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 22 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  const lineItemsData = [
    ['Description', 'HSN Code', 'Quantity', 'Unit', 'Unit Price', 'Discount', 'Line Total'],
    ...data.lineItems.map((i) => [i.description, i.hsnCode, i.quantity, i.unit, i.unitPrice, i.discount, i.lineTotal]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(lineItemsData);
  ws2['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Line Items');

  data.detailSections.forEach((section) => {
    const sheetName = section.title.substring(0, 31);
    const sheetData: (string)[][] = [['Field', 'Value'], ...section.fields.map((f) => [f.label, f.value])];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 22 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, fileName.replace(/\.[^.]+$/, '') + '.xlsx');
}

export function copyJSONToClipboard(invoice: ExtractedInvoice): Promise<void> {
  const data = toExportable(invoice);
  const json = JSON.stringify(data, null, 2);
  return navigator.clipboard.writeText(json);
}
