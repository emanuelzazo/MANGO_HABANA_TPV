/**
 * print.js — Impresión de comprobantes de venta y etiquetas.
 *
 * Imprime mediante un iframe oculto (no pop-up): evita el bloqueo de ventanas
 * emergentes y envía el trabajo directo al diálogo/cola del sistema, así que
 * funciona con cualquier impresora configurada (Epson, Zebra, PDF…).
 */
import { formatDateTime, formatCurrency, formatCup, formatEur } from './format';

const usd = (n) => formatCurrency(n || 0, 'USD'); // "$55.00"
const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', mixto: 'Desglosado' };
const fmtMoneda = (monto, moneda) => moneda === 'CUP'
  ? `${Math.round(monto).toLocaleString('es-ES')} CUP`
  : moneda === 'EUR' ? `€${(monto || 0).toFixed(2)}` : `$${(monto || 0).toFixed(2)}`;

function getBusinessConfig() {
  try {
    const stored = localStorage.getItem('tpv_config');
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

/**
 * Envía HTML a la impresora. En la app de escritorio (Electron) imprime de
 * forma nativa y silenciosa a la impresora configurada; en navegador usa un
 * iframe oculto. Devuelve true si se lanzó.
 * @param {string} fullHTML - documento HTML completo
 */
function sendToPrinter(fullHTML) {
  // App de escritorio (Electron): impresión nativa directa.
  if (typeof window !== 'undefined' && window.electronAPI?.printHTML) {
    const cfg = getBusinessConfig();
    window.electronAPI.printHTML({
      html: fullHTML,
      deviceName: cfg.impresora || '',
      copies: 1, // las copias ya van repetidas en el HTML
      silent: cfg.impresion_directa !== false,
    }).catch(() => {});
    return true;
  }
  try {
    const prev = document.getElementById('tpv-print-frame');
    if (prev) prev.remove();
    const iframe = document.createElement('iframe');
    iframe.id = 'tpv-print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(fullHTML);
    doc.close();
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print(); } catch { /* */ }
      setTimeout(() => iframe.remove(), 2000);
    }, 350);
    return true;
  } catch {
    return false;
  }
}

// ── Comprobante de venta ──────────────────────────────────────────
const RECEIPT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
  .receipt { width: 280px; margin: 0 auto; padding: 12px 6px; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .muted { color: #444; }
  .biz { font-size: 17px; font-weight: bold; letter-spacing: 1px; }
  .divider { border-top: 1px dashed #000; margin: 7px 0; }
  .divider-strong { border-top: 2px solid #000; margin: 7px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 3px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }
  td { padding: 2px 0; font-size: 12px; vertical-align: top; }
  .total-row { font-weight: bold; font-size: 16px; }
  .footer { margin-top: 8px; text-align: center; font-size: 11px; white-space: pre-line; }
  .sectlabel { font-size: 10px; text-transform: uppercase; letter-spacing: 0.6px; color: #555; margin-bottom: 2px; }
`;

/** Cuerpo del comprobante (sin <html>), reutilizable para varias copias. */
function receiptBody(venta) {
  const config = getBusinessConfig();
  const negocio = config.nombre_negocio || 'Mango Habana';
  const pie = config.pie_comprobante || 'Gracias por su compra';

  const items = venta.items.map(i => `
    <tr>
      <td style="width:54%">${i.nombre}</td>
      <td style="text-align:center;width:12%">${i.cantidad}</td>
      <td style="text-align:right;width:34%">${usd(i.subtotal)}</td>
    </tr>
    <tr><td colspan="3" class="muted" style="font-size:10px;padding-bottom:3px">
      ${i.sku || i.codigo_barras ? `[${i.sku || i.codigo_barras}] · ` : ''}${usd(i.precio_unitario)} c/u${i.descuento > 0 ? ` · dto. ${i.descuento}%` : ''}
    </td></tr>
  `).join('');

  // Desglose de pago (si la venta lo trae)
  const pagosHtml = (venta.pagos && venta.pagos.length)
    ? `<div class="divider"></div><div class="sectlabel">Pago</div>${venta.pagos.map(p => `
        <div class="row"><span>${METODO_LABEL[p.metodo] || p.metodo}${p.recargoPct ? ` (+${p.recargoPct}%)` : ''}</span><span>${fmtMoneda(p.monto, p.moneda)}</span></div>
      `).join('')}`
    : `<div class="divider"></div><div class="row"><span>Método de pago</span><span class="bold">${METODO_LABEL[venta.metodo_pago] || venta.metodo_pago || '—'}</span></div>`;

  // Tasas del día usadas
  const tasasHtml = venta.tasas
    ? `<div class="row muted" style="font-size:10px"><span></span><span>1 USD = ${Math.round(venta.tasas.usd)} CUP · 1 EUR = ${Math.round(venta.tasas.eur)} CUP</span></div>`
    : '';

  return `
    <div class="receipt">
      <div class="center biz" style="white-space:pre-line">${negocio}</div>
      <div class="center muted" style="font-size:11px;margin-top:4px">${formatDateTime(venta.fecha)}</div>

      <div class="divider"></div>
      <div class="row"><span>Ticket</span><span class="bold">${venta.numero}</span></div>
      <div class="row"><span>Dependienta</span><span>${venta.dependienta}</span></div>

      <div class="divider"></div>
      <div class="sectlabel">Artículos</div>
      <table>
        <thead><tr><th>Producto</th><th style="text-align:center">Ud.</th><th style="text-align:right">Importe</th></tr></thead>
        <tbody>${items}</tbody>
      </table>

      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${usd(venta.subtotal)}</span></div>
      ${venta.descuento > 0 ? `<div class="row"><span>Descuento</span><span>- ${usd(venta.descuento)}</span></div>` : ''}
      ${venta.recargo > 0 ? `<div class="row"><span>Transferencia ${venta.recargo_pct || ''}%</span><span>+ ${usd(venta.recargo)}</span></div>` : ''}

      <div class="divider-strong"></div>
      <div class="row total-row"><span>TOTAL</span><span>${usd(venta.total)}</span></div>
      <div class="row muted" style="font-size:11px"><span></span><span>${formatCup(venta.total)} · ${formatEur(venta.total)}</span></div>
      ${tasasHtml}

      ${pagosHtml}

      <div class="divider"></div>
      <div class="footer">${pie}</div>
    </div>
  `;
}

/**
 * Genera el HTML completo del comprobante (1 copia). Se mantiene exportado
 * por compatibilidad / pruebas.
 */
export function generateReceiptHTML(venta) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${RECEIPT_STYLES}</style></head><body>${receiptBody(venta)}</body></html>`;
}

/**
 * Imprime el comprobante respetando el nº de copias configurado (1-3).
 * Cada copia va en una página separada dentro del mismo trabajo de impresión.
 * @param {object} venta
 * @returns {number} copias enviadas (0 si falló)
 */
export function printReceipt(venta) {
  const config = getBusinessConfig();
  const copias = Math.min(3, Math.max(1, parseInt(config.copias, 10) || 1));
  const body = receiptBody(venta);
  const pages = Array.from({ length: copias })
    .map((_, i) => `<div${i < copias - 1 ? ' style="page-break-after:always"' : ''}>${body}</div>`)
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${RECEIPT_STYLES}</style></head><body>${pages}</body></html>`;
  return sendToPrinter(html) ? copias : 0;
}

// ── Etiquetas de producto ─────────────────────────────────────────
/**
 * Genera HTML de etiqueta de producto (62mm × 29mm) con nombre, precio,
 * SKU y código de barras visual.
 */
export function generateLabelHTML(product) {
  const config = getBusinessConfig();
  const negocio = config.nombre_negocio || 'Mango Habana';
  const barcode = product.codigo_barras || product.sku || '';

  const barcodeDisplay = barcode ? `
    <div style="margin-top:4px;text-align:center">
      <div style="display:inline-flex;gap:0;align-items:flex-end;height:30px">
        ${Array.from(barcode).map((_, i) => {
          const w = (i * 7 + 3) % 3 === 0 ? 2 : 1;
          const h = (i * 11) % 5 === 0 ? 30 : 20;
          return `<div style="width:${w}px;height:${h}px;background:black;margin:0 0.3px"></div>`;
        }).join('')}
      </div>
      <div style="font-family:monospace;font-size:8px;letter-spacing:1px;margin-top:2px">${barcode}</div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { margin: 0; size: 62mm 29mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 62mm; height: 29mm;
    font-family: Arial, sans-serif;
    padding: 2mm 3mm;
    display: flex; flex-direction: column; justify-content: space-between;
    overflow: hidden;
  }
  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .name { font-size: 9pt; font-weight: bold; max-width: 38mm; line-height: 1.2; }
  .price { font-size: 14pt; font-weight: bold; white-space: nowrap; }
  .sku { font-size: 7pt; color: #555; font-family: monospace; }
  .brand { font-size: 7pt; color: #888; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">${negocio}</div>
      <div class="name">${product.nombre}</div>
      <div class="sku">${product.sku ? `SKU: ${product.sku}` : ''}</div>
    </div>
    <div class="price">${usd(product.precio_oferta || product.precio)}</div>
  </div>
  ${barcodeDisplay}
</body>
</html>`;
}

/** Imprime una etiqueta de producto. */
export function printProductLabel(product) {
  return sendToPrinter(generateLabelHTML(product));
}

/** Imprime varias etiquetas (respeta copias_etiqueta). */
export function printMultipleLabels(products) {
  const config = getBusinessConfig();
  const copias = config.copias_etiqueta || 1;
  const allLabels = products.flatMap(p =>
    Array.from({ length: copias }, () => generateLabelHTML(p))
  ).join('<div style="page-break-after:always"></div>');
  return sendToPrinter(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${allLabels}</body></html>`);
}
