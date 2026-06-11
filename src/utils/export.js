/**
 * export.js — Exportación de datos a Excel, CSV y PDF.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatDateTime, formatCurrency } from './format';

/**
 * Exporta un array de ventas a Excel (.xlsx).
 * @param {Array} ventas
 * @param {string} filename
 */
export function exportVentasExcel(ventas, filename = 'ventas') {
  const rows = ventas.flatMap(v =>
    v.items.map(i => ({
      'Nº Venta': v.numero,
      'Fecha': formatDateTime(v.fecha),
      'Dependienta': v.dependienta,
      'Producto': i.nombre,
      'SKU': i.sku,
      'Cantidad': i.cantidad,
      'Precio Unitario': i.precio_unitario,
      'Descuento (%)': i.descuento,
      'Subtotal': i.subtotal,
      'Total Venta': v.total,
      'Método Pago': v.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo',
    }))
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

  // Ajustar anchos de columna automáticamente
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2,
  }));
  ws['!cols'] = colWidths;

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta ventas a CSV.
 * @param {Array} ventas
 * @param {string} filename
 */
export function exportVentasCSV(ventas, filename = 'ventas') {
  const rows = ventas.map(v => [
    v.numero,
    formatDateTime(v.fecha),
    v.dependienta,
    v.items.map(i => i.nombre).join(' | '),
    v.total,
    v.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo',
  ]);

  const headers = ['Nº Venta', 'Fecha', 'Dependienta', 'Productos', 'Total', 'Método Pago'];
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Exporta ventas a PDF.
 * @param {Array} ventas
 * @param {string} filename
 * @param {string} titulo
 */
export function exportVentasPDF(ventas, filename = 'ventas', titulo = 'Informe de Ventas') {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(titulo, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, 14, 28);

  const rows = ventas.map(v => [
    v.numero,
    formatDateTime(v.fecha),
    v.dependienta,
    formatCurrency(v.total),
    v.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo',
  ]);

  doc.autoTable({
    head: [['Nº Venta', 'Fecha', 'Dependienta', 'Total', 'Método']],
    body: rows,
    startY: 34,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [17, 24, 39] },
  });

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
