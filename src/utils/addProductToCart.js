/**
 * addProductToCart.js — Punto único para añadir un producto al carrito.
 * Si el producto no tiene stock, pregunta al usuario si desea continuar.
 * No muestra notificaciones (la UX pide que no molesten al añadir).
 *
 * @param {object} product - producto normalizado
 * @returns {boolean} true si se añadió, false si se canceló
 */
import { useCartStore } from '../store/cartStore';

export function addProductToCart(product) {
  if (!product) return false;
  const sinStock = product.stock !== undefined && product.stock <= 0 && product.gestionar_stock;
  if (sinStock) {
    const ok = window.confirm(`"${product.nombre}" no tiene stock disponible.\n¿Añadirlo de todas formas?`);
    if (!ok) return false;
  }
  useCartStore.getState().addItem(product);
  return true;
}
