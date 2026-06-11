/**
 * products.js — Operaciones de productos contra WooCommerce REST API.
 */
import { wooFetch, buildQueryString } from './woocommerceClient';

/**
 * Obtiene todos los productos paginando automáticamente.
 * @param {object} filters - Filtros adicionales (category, search, etc.)
 * @returns {Promise<Array>}
 */
export async function fetchAllProducts(filters = {}) {
  const allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = { ...filters, page, per_page: 100 };
    const products = await wooFetch(`/products${buildQueryString(params)}`);
    allProducts.push(...products);
    hasMore = products.length === 100;
    page++;
  }

  return allProducts;
}

/**
 * Busca un producto por código de barras (meta_data _ean o barcode).
 * @param {string} barcode
 * @returns {Promise<object|null>}
 */
export async function findProductByBarcode(barcode) {
  const products = await wooFetch(`/products${buildQueryString({ sku: barcode })}`);
  if (products.length > 0) return products[0];

  // Buscar en meta_data si no está en SKU
  const allBySku = await wooFetch(`/products${buildQueryString({ search: barcode, per_page: 10 })}`);
  return allBySku.find(p =>
    p.meta_data?.some(m => m.key === '_barcode' && m.value === barcode)
  ) || null;
}

/**
 * Busca productos por nombre o SKU.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchProducts(query) {
  return wooFetch(`/products${buildQueryString({ search: query, per_page: 20 })}`);
}

/**
 * Actualiza el stock de un producto en WooCommerce.
 * @param {number} productId
 * @param {number} newStock
 * @returns {Promise<object>}
 */
export async function updateProductStock(productId, newStock) {
  return wooFetch(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ stock_quantity: newStock }),
  });
}

/**
 * Actualiza datos de un producto.
 * @param {number} productId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateProduct(productId, data) {
  return wooFetch(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Crea un producto nuevo en WooCommerce.
 * @param {object} productData
 * @returns {Promise<object>}
 */
export async function createProduct(productData) {
  return wooFetch('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
}

/**
 * Obtiene las categorías de productos.
 * @returns {Promise<Array>}
 */
export async function fetchCategories() {
  const categories = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const batch = await wooFetch(`/products/categories${buildQueryString({ page, per_page: 100 })}`);
    categories.push(...batch);
    hasMore = batch.length === 100;
    page++;
  }

  return categories;
}

/**
 * Normaliza un producto de WooCommerce al formato interno del TPV.
 * @param {object} wooProduct
 * @returns {object}
 */
export function normalizeProduct(wooProduct) {
  const barcode = wooProduct.sku ||
    wooProduct.meta_data?.find(m => m.key === '_barcode')?.value || '';

  return {
    id: wooProduct.id,
    woo_id: wooProduct.id,
    sku: wooProduct.sku,
    codigo_barras: barcode,
    nombre: wooProduct.name,
    precio: parseFloat(wooProduct.price) || 0,
    precio_oferta: parseFloat(wooProduct.sale_price) || null,
    precio_regular: parseFloat(wooProduct.regular_price) || 0,
    stock: wooProduct.stock_quantity ?? 0,
    categoria: wooProduct.categories?.[0]?.name || 'Sin categoría',
    categoria_id: wooProduct.categories?.[0]?.id || null,
    imagen_url: wooProduct.images?.[0]?.src || null,
    activo: wooProduct.status === 'publish',
    gestionar_stock: wooProduct.manage_stock,
    raw: wooProduct,
  };
}
