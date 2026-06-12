/**
 * orders.js — Operaciones de pedidos (ventas) contra WooCommerce REST API.
 */
import { wooFetch, buildQueryString } from './woocommerceClient';

/**
 * Crea un pedido en WooCommerce al confirmar una venta.
 * @param {object} saleData - Datos de la venta del TPV
 * @returns {Promise<object>}
 */
const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', mixto: 'Desglosado', tarjeta: 'Tarjeta' };

/**
 * Resuelve el product_id PUBLICADO real por SKU. Evita "auto-draft" en los
 * pedidos: el `woo_id` cacheado puede ser obsoleto (otra tienda / reimportación).
 */
async function resolveWooId(item) {
  if (item.sku) {
    try {
      const found = await wooFetch(`/products${buildQueryString({ sku: item.sku, per_page: 1 })}`);
      if (Array.isArray(found) && found[0]?.id) return found[0].id;
    } catch { /* sin conexión / no encontrado */ }
  }
  return item.woo_id || item.id || 0;
}

export async function createOrder(saleData) {
  const { items, descuento, metodoPago, dependienta, recargo, recargoPct, pagos } = saleData;

  const lineItems = await Promise.all(items.map(async (item) => {
    const pid = await resolveWooId(item);
    const subtotal = (item.precio_unitario * item.cantidad).toFixed(2);
    const total = (item.subtotal != null ? item.subtotal : item.precio_unitario * item.cantidad).toFixed(2);
    if (pid) {
      // product_id válido → WooCommerce usa el nombre real y descuenta stock.
      return {
        product_id: pid,
        quantity: item.cantidad,
        subtotal,
        total,
        ...(item.descuento > 0 ? { meta_data: [{ key: 'descuento_aplicado', value: `${item.descuento}` }] } : {}),
      };
    }
    // Sin product_id válido → línea con nombre explícito (nunca "auto-draft").
    return {
      name: item.nombre + (item.sku ? ` [${item.sku}]` : ''),
      quantity: item.cantidad,
      subtotal,
      total,
    };
  }));

  const orderData = {
    status: 'completed',
    payment_method: 'tpv',
    payment_method_title: METODO_LABEL[metodoPago] || metodoPago || 'Efectivo',
    set_paid: true,
    line_items: lineItems,
    meta_data: [
      { key: 'tpv_dependienta', value: dependienta || 'Desconocido' },
      { key: 'tpv_metodo_pago', value: metodoPago || '' },
      ...(recargo > 0 ? [{ key: 'tpv_recargo', value: String(recargo) }, { key: 'tpv_recargo_pct', value: String(recargoPct || '') }] : []),
      ...(pagos ? [{ key: 'tpv_pagos', value: JSON.stringify(pagos) }] : []),
      ...(descuento > 0 ? [{ key: 'tpv_descuento_total', value: String(descuento) }] : []),
    ],
  };

  return wooFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

/**
 * Obtiene órdenes recientes de WooCommerce.
 * @param {object} params - Filtros (after, before, status, per_page, page)
 * @returns {Promise<Array>}
 */
export async function fetchOrders(params = {}) {
  const defaults = { status: 'completed', orderby: 'date', order: 'desc', per_page: 50 };
  return wooFetch(`/orders${buildQueryString({ ...defaults, ...params })}`);
}

/**
 * Convierte un pedido de WooCommerce al formato de "venta" del TPV, para la
 * vista compartida (modo nube). Lee los metadatos que guarda `createOrder`.
 */
export function normalizeOrder(o) {
  const meta = Object.fromEntries((o.meta_data || []).map(m => [m.key, m.value]));
  return {
    id: `woo-${o.id}`,
    numero: o.number ? `W-${o.number}` : `W-${o.id}`,
    fecha: o.date_created || o.date_created_gmt || new Date().toISOString(),
    dependienta: meta.tpv_dependienta || 'Online',
    usuario_id: null,
    total: parseFloat(o.total) || 0,
    subtotal: parseFloat(o.total) || 0,
    descuento: parseFloat(meta.tpv_descuento_total) || 0,
    recargo: 0,
    metodo_pago: meta.tpv_metodo_pago || 'efectivo',
    moneda: 'USD',
    estado: 'completada',
    woo_order_id: o.id,
    _cloud: true,
    items: (o.line_items || []).map(li => ({
      producto_id: li.product_id,
      woo_id: li.product_id,
      nombre: li.name,
      sku: li.sku,
      cantidad: li.quantity,
      precio_unitario: parseFloat(li.price) || 0,
      subtotal: parseFloat(li.total) || 0,
      descuento: 0,
    })),
  };
}

/**
 * Obtiene las ventas del día actual desde WooCommerce.
 * @returns {Promise<Array>}
 */
export async function fetchTodaySales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return fetchOrders({ after: today.toISOString(), per_page: 100 });
}
