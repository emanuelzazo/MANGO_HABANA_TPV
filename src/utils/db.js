/**
 * db.js — Capa de persistencia con IndexedDB (preparada para migrar a SQLite en Fase 3).
 * Usa la librería `idb` para una API basada en promesas.
 */
import { openDB } from 'idb';

const DB_NAME = 'tpv_mango_habana';
const DB_VERSION = 1;

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store de ventas
      if (!db.objectStoreNames.contains('ventas')) {
        const ventasStore = db.createObjectStore('ventas', { keyPath: 'id' });
        ventasStore.createIndex('fecha', 'fecha');
        ventasStore.createIndex('usuario_id', 'usuario_id');
        ventasStore.createIndex('dependienta', 'dependienta');
      }
      // Store de log de sincronización
      if (!db.objectStoreNames.contains('sync_log')) {
        db.createObjectStore('sync_log', { keyPath: 'id', autoIncrement: true });
      }
      // Store de caché de productos
      if (!db.objectStoreNames.contains('productos_cache')) {
        const prodStore = db.createObjectStore('productos_cache', { keyPath: 'id' });
        prodStore.createIndex('sku', 'sku');
        prodStore.createIndex('codigo_barras', 'codigo_barras');
      }
      // Store de tasas de cambio
      if (!db.objectStoreNames.contains('currency_rates')) {
        const ratesStore = db.createObjectStore('currency_rates', { keyPath: 'id', autoIncrement: true });
        ratesStore.createIndex('date', 'date');
      }
    },
  });
  return dbInstance;
}

// --- VENTAS ---

export async function saveVenta(venta) {
  const db = await getDB();
  await db.put('ventas', venta);
  return venta;
}

export async function getAllVentas() {
  const db = await getDB();
  return db.getAll('ventas');
}

/** Importa un lote de ventas (restaurar copia de seguridad). */
export async function bulkSaveVentas(ventas = []) {
  const db = await getDB();
  const tx = db.transaction('ventas', 'readwrite');
  await Promise.all(ventas.map(v => tx.store.put(v)));
  await tx.done;
}

/** Borra TODAS las ventas (reset total). */
export async function clearAllVentas() {
  const db = await getDB();
  await db.clear('ventas');
}

export async function getVentasByDateRange(from, to) {
  const db = await getDB();
  const range = IDBKeyRange.bound(from.toISOString(), to.toISOString());
  const tx = db.transaction('ventas', 'readonly');
  const index = tx.store.index('fecha');
  return index.getAll(range);
}

// --- CACHE DE PRODUCTOS ---

export async function cacheProducts(products) {
  const db = await getDB();
  const tx = db.transaction('productos_cache', 'readwrite');
  await Promise.all(products.map(p => tx.store.put(p)));
  await tx.done;
}

export async function getCachedProducts() {
  const db = await getDB();
  return db.getAll('productos_cache');
}

export async function findCachedByBarcode(barcode) {
  const db = await getDB();
  const byCode = await db.getFromIndex('productos_cache', 'codigo_barras', barcode);
  if (byCode) return byCode;
  return db.getFromIndex('productos_cache', 'sku', barcode);
}

// --- STOCK DE PRODUCTOS ---

/**
 * Actualiza el stock de un producto en caché.
 * delta: número negativo para rebajar (ej: -2 para vender 2 unidades)
 */
export async function updateCachedProductStock(productId, delta) {
  const db = await getDB();
  const tx = db.transaction('productos_cache', 'readwrite');
  const product = await tx.store.get(productId);
  if (product) {
    product.stock = Math.max(0, (product.stock || 0) + delta);
    await tx.store.put(product);
  }
  await tx.done;
  return product;
}

/**
 * Busca un producto por ID en caché
 */
export async function getCachedProduct(productId) {
  const db = await getDB();
  return db.get('productos_cache', productId);
}

// --- LOG DE SINCRONIZACIÓN ---

export async function addSyncLog(entry) {
  const db = await getDB();
  return db.add('sync_log', {
    ...entry,
    fecha: new Date().toISOString(),
  });
}

export async function getSyncLog(limit = 50) {
  const db = await getDB();
  const all = await db.getAll('sync_log');
  return all.reverse().slice(0, limit);
}

// --- TASAS DE CAMBIO ---

export async function addCurrencyRate(rate) {
  const db = await getDB();
  return db.add('currency_rates', rate);
}

export async function getCurrencyRates(limit = 30) {
  const db = await getDB();
  const all = await db.getAll('currency_rates');
  return all.reverse().slice(0, limit);
}

export async function getLatestCurrencyRate() {
  const db = await getDB();
  const all = await db.getAll('currency_rates');
  return all.length > 0 ? all[all.length - 1] : null;
}

// --- MIGRACIÓN desde localStorage ---

/**
 * Migra las ventas almacenadas en localStorage a IndexedDB.
 * Solo se ejecuta una vez al detectar datos en localStorage.
 */
export async function migrateFromLocalStorage() {
  try {
    const raw = localStorage.getItem('tpv_ventas');
    if (!raw) return 0;
    const ventas = JSON.parse(raw);
    if (!ventas.length) return 0;

    const db = await getDB();
    const existing = await db.count('ventas');
    if (existing > 0) return 0; // Ya migrado

    const tx = db.transaction('ventas', 'readwrite');
    await Promise.all(ventas.map(v => tx.store.put(v)));
    await tx.done;

    localStorage.removeItem('tpv_ventas');
    return ventas.length;
  } catch {
    return 0;
  }
}
