/**
 * cartStore.js — Estado del carrito de venta activo (módulo POS).
 */
import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],          // [{ id, woo_id, nombre, precio_unitario, cantidad, descuento, subtotal, imagen_url, sku }]
  descuentoTotal: 0,  // descuento fijo sobre el total
  descuentoTipo: 'porcentaje', // 'porcentaje' | 'fijo'

  // Agrega un producto o incrementa su cantidad si ya existe
  addItem: (product) => {
    const { items } = get();
    const existing = items.find(i => i.id === product.id);

    if (existing) {
      set({
        items: items.map(i =>
          i.id === product.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario * (1 - i.descuento / 100) }
            : i
        ),
      });
    } else {
      const newItem = {
        id: product.id,
        woo_id: product.woo_id || product.id,
        nombre: product.nombre,
        precio_unitario: product.precio_oferta || product.precio,
        precio_regular: product.precio,
        cantidad: 1,
        descuento: 0,      // descuento % por producto
        subtotal: product.precio_oferta || product.precio,
        imagen_url: product.imagen_url,
        sku: product.sku,
        stock: product.stock,
      };
      set({ items: [...items, newItem] });
    }
  },

  // Actualiza la cantidad de un item
  updateQuantity: (id, cantidad) => {
    if (cantidad < 1) return;
    set({
      items: get().items.map(i =>
        i.id === id
          ? { ...i, cantidad, subtotal: cantidad * i.precio_unitario * (1 - i.descuento / 100) }
          : i
      ),
    });
  },

  // Elimina un item del carrito
  removeItem: (id) => {
    set({ items: get().items.filter(i => i.id !== id) });
  },

  // Aplica descuento a un producto específico
  setItemDiscount: (id, descuento) => {
    const pct = Math.min(Math.max(0, parseFloat(descuento) || 0), 100);
    set({
      items: get().items.map(i =>
        i.id === id
          ? { ...i, descuento: pct, subtotal: i.cantidad * i.precio_unitario * (1 - pct / 100) }
          : i
      ),
    });
  },

  // Aplica descuento al total
  setDescuentoTotal: (valor, tipo = 'porcentaje') => {
    set({ descuentoTotal: parseFloat(valor) || 0, descuentoTipo: tipo });
  },

  // Limpia el carrito tras una venta
  clearCart: () => set({ items: [], descuentoTotal: 0, descuentoTipo: 'porcentaje' }),

  // Getters calculados
  getSubtotal: () => {
    return get().items.reduce((sum, i) => sum + i.subtotal, 0);
  },

  getDescuentoMonto: () => {
    const { descuentoTotal, descuentoTipo } = get();
    const subtotal = get().getSubtotal();
    if (descuentoTipo === 'porcentaje') return subtotal * (descuentoTotal / 100);
    return Math.min(descuentoTotal, subtotal);
  },

  getTotal: () => {
    return Math.max(0, get().getSubtotal() - get().getDescuentoMonto());
  },

  getTotalItems: () => {
    return get().items.reduce((sum, i) => sum + i.cantidad, 0);
  },
}));
