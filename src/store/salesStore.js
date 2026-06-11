/**
 * salesStore.js — Registro de ventas con IndexedDB (preparado para SQLite en Fase 3).
 * Carga inicial desde IndexedDB, sincroniza en cada operación.
 */
import { create } from 'zustand';
import { saveVenta, getAllVentas, migrateFromLocalStorage } from '../utils/db';
import { fetchOrders, normalizeOrder } from '../api/orders';

function loadCloudMode() {
  try {
    const v = JSON.parse(localStorage.getItem('tpv_cloud_mode'));
    return typeof v === 'boolean' ? v : true; // por defecto activo (vista compartida)
  } catch { return true; }
}

export const useSalesStore = create((set, get) => ({
  ventas: [],            // ventas locales (IndexedDB) — fuente de verdad de este equipo
  cloudVentas: [],       // ventas leídas de WooCommerce (compartidas entre equipos)
  cloudMode: loadCloudMode(),
  loaded: false,

  setCloudMode: (v) => {
    localStorage.setItem('tpv_cloud_mode', JSON.stringify(v));
    set({ cloudMode: v });
    if (v) get().loadCloud();
  },

  // Carga las ventas compartidas desde WooCommerce (pedidos). Silencioso si falla.
  loadCloud: async () => {
    if (!get().cloudMode) return;
    try {
      const orders = await fetchOrders({ per_page: 100 });
      const cloud = (orders || []).map(normalizeOrder);
      cloud.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      set({ cloudVentas: cloud });
    } catch {
      /* sin conexión / sin WooCommerce → se mantiene lo local */
    }
  },

  // Inicializa: migra localStorage → IndexedDB, carga local y, si procede, la nube.
  init: async () => {
    if (get().loaded) return;
    await migrateFromLocalStorage();
    const ventas = await getAllVentas();
    ventas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    set({ ventas, loaded: true });
    get().loadCloud();
  },

  // Registra una nueva venta
  addVenta: async (ventaData) => {
    const { items, total, subtotal, descuento, recargo, recargoPct, moneda, metodoPago, pagos, tasas, dependienta, wooOrderId } = ventaData;
    const ventas = get().ventas;

    const nueva = {
      id: Date.now(),
      numero: `V-${String(ventas.length + 1).padStart(5, '0')}`,
      fecha: new Date().toISOString(),
      usuario_id: dependienta?.id,
      dependienta: dependienta?.nombre || 'Desconocido',
      items: items.map(i => ({
        producto_id: i.id,
        woo_id: i.woo_id,
        nombre: i.nombre,
        sku: i.sku,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        descuento: i.descuento,
        subtotal: i.subtotal,
      })),
      subtotal: subtotal || total,
      descuento: descuento || 0,
      recargo: recargo || 0,
      recargo_pct: recargoPct || 0,
      moneda: moneda || 'CUP',
      pagos: pagos || null,
      tasas: tasas || null,
      total,
      metodo_pago: metodoPago,
      estado: 'completada',
      woo_order_id: wooOrderId || null,
    };

    await saveVenta(nueva);
    set({ ventas: [...ventas, nueva] });
    return nueva;
  },

  // Filtro por rango de fechas
  getVentasByRange: (from, to) => {
    return get().ventas.filter(v => {
      const f = new Date(v.fecha);
      return f >= from && f <= to;
    });
  },

  getVentasHoy: () => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date(); finHoy.setHours(23, 59, 59, 999);
    return get().getVentasByRange(hoy, finHoy);
  },

  getTotalHoy: () => get().getVentasHoy().reduce((s, v) => s + v.total, 0),

  getProductosVendidosHoy: () =>
    get().getVentasHoy().reduce((s, v) => s + v.items.reduce((si, i) => si + i.cantidad, 0), 0),

  getTotalMes: () => {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    return get().getVentasByRange(inicio, fin).reduce((s, v) => s + v.total, 0);
  },

  exportDatabase: () => {
    return JSON.stringify({
      ventas: get().ventas,
      exportado: new Date().toISOString(),
      version: '1.0',
    }, null, 2);
  },
}));
