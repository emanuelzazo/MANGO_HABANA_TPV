/**
 * toastStore.js — Sistema de notificaciones toast globales.
 */
import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],

  addToast: ({ message, type = 'info', duration = 3500 }) => {
    const id = Date.now();
    set({ toasts: [...get().toasts, { id, message, type, duration }] });
    setTimeout(() => get().removeToast(id), duration);
    return id;
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter(t => t.id !== id) });
  },

  // Atajos semánticos
  success: (message, duration) => get().addToast({ message, type: 'success', duration }),
  error: (message, duration) => get().addToast({ message, type: 'error', duration: duration || 5000 }),
  warning: (message, duration) => get().addToast({ message, type: 'warning', duration }),
  info: (message, duration) => get().addToast({ message, type: 'info', duration }),
}));
