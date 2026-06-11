/**
 * orders.js — Operaciones de pedidos (ventas) contra WooCommerce REST API.
 */
import { wooFetch, buildQueryString } from './woocommerceClient';

/**
 * Crea un pedido en WooCommerce al confirmar una venta.
 * @param {object} saleData - Datos de la venta del TPV
 * @returns {Promise<object>}
 */
export async function createOrder(saleData) {
  const { items, total, descuento, metodoPago, dependienta } = saleData;

  const lineItems = items.map(item => ({
    product_id: item.woo_id,
    quantity: item.cantidad,
    price: item.precio_unitario.toString(),
    ...(item.descuento > 0 ? {
      meta_data: [{ key: 'descuento_aplicado', value: `${item.descuento}` }],
    } : {}),
  }));

  const orderData = {
    status: 'completed',
    payment_method: metodoPago === 'tarjeta' ? 'cod' : 'cod',
    payment_method_title: metodoPago === 'tarjeta' ? 'Tarjeta' : 'Efectivo',
    set_paid: true,
    line_items: lineItems,
    meta_data: [
      { key: 'tpv_dependienta', value: dependienta || 'Desconocido' },
      { key: 'tpv_metodo_pago', value: metodoPago },
      ...(descuento > 0 ? [{ key: 'tpv_descuento_total', value: descuento.toString() }] : []),
    ],
    ...(descuento > 0 ? {
      coupon_lines: [],
      discount_total: descuento.toString(),
    } : {}),
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
