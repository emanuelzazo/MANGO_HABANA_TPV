/**
 * resolveProduct.js — Resuelve un código (de barras numérico o SKU/QR de texto)
 * a un producto normalizado. Lógica única compartida por la búsqueda del POS y
 * el escáner global (pegar / wedge).
 *
 * Orden de resolución (optimizado para velocidad):
 *   1. **Caché local (IndexedDB) primero** → instantáneo. Cubre el caso normal
 *      porque POS/Inventario/Dashboard ya cargan y cachean todo el catálogo.
 *   2. Solo si no está en caché, se consulta WooCommerce (puede ser lento).
 *
 * @param {string} rawCode
 * @returns {Promise<object|null>} producto normalizado o null si no se encuentra
 */
import { searchProducts, findProductByBarcode, normalizeProduct } from '../api/products';
import { getCachedProducts } from './db';
import { looksLikeBarcode } from './barcode';

export async function resolveProductByCode(rawCode) {
  const value = String(rawCode || '').trim();
  if (!value) return null;
  const vl = value.toLowerCase();

  // 1. CACHÉ LOCAL primero (instantáneo, sin red)
  try {
    const all = await getCachedProducts();
    if (all && all.length) {
      const exact = all.find(p =>
        p.sku?.toLowerCase() === vl || p.codigo_barras?.toLowerCase() === vl
      );
      if (exact) return exact;
      const partial = all.find(p =>
        p.sku?.toLowerCase().includes(vl) || p.nombre?.toLowerCase().includes(vl)
      );
      if (partial) return partial;
    }
  } catch {
    /* sin caché → probar red */
  }

  // 2. Red (solo si no estaba en caché)
  if (looksLikeBarcode(value)) {
    try {
      const p = await findProductByBarcode(value);
      if (p) return normalizeProduct(p);
    } catch { /* sigue */ }
  }
  try {
    const found = (await searchProducts(value)).map(normalizeProduct);
    const exact = found.find(p => p.sku?.toLowerCase() === vl);
    return exact || found[0] || null;
  } catch {
    return null;
  }
}
