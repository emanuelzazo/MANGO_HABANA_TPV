/**
 * syncStore.js — Estado de sincronización y retry de operaciones pendientes.
 * Gestiona operaciones que fallaron por falta de conexión y las reintenta.
 */
import { create } from 'zustand';
import { addSyncLog, getSyncLog } from '../utils/db';
import { createOrder } from '../api/orders';

const PENDING_KEY = 'tpv_pending_orders';

function loadPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; }
}
function savePending(items) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
}

export const useSyncStore = create((set, get) => ({
  pendingOrders: loadPending(),
  syncLog: [],
  syncing: false,

  // Registra un pedido pendiente de sincronizar
  addPendingOrder: (ventaData, ventaId) => {
    const pending = [...get().pendingOrders, { ventaData, ventaId, intentos: 0, timestamp: Date.now() }];
    savePending(pending);
    set({ pendingOrders: pending });
  },

  // Intenta sincronizar los pedidos pendientes con WooCommerce
  syncPending: async () => {
    const pending = get().pendingOrders;
    if (pending.length === 0 || get().syncing) return;

    set({ syncing: true });
    const remaining = [];

    for (const item of pending) {
      try {
        const order = await createOrder(item.ventaData);
        await addSyncLog({
          tipo: 'order_sync',
          resultado: 'success',
          mensaje: `Pedido #${order.id} sincronizado (venta local ${item.ventaId})`,
        });
      } catch (err) {
        item.intentos = (item.intentos || 0) + 1;
        await addSyncLog({
          tipo: 'order_sync',
          resultado: 'error',
          mensaje: `Error sincronizando venta ${item.ventaId}: ${err.message}`,
        });
        if (item.intentos < 10) remaining.push(item);
      }
    }

    savePending(remaining);
    set({ pendingOrders: remaining, syncing: false });
  },

  // Carga el log de sincronización desde IndexedDB
  loadSyncLog: async () => {
    const log = await getSyncLog(100);
    set({ syncLog: log });
  },
}));

// Intentar sincronizar pedidos pendientes cuando se recupera la conexión
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    const store = useSyncStore.getState();
    if (store.pendingOrders.length > 0) {
      store.syncPending();
    }
  });
}
