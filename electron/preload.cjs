/**
 * preload.cjs — Puente seguro entre la app (renderer) y Electron.
 * Expone `window.electronAPI` con acceso a impresoras e impresión nativa.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printHTML: (payload) => ipcRenderer.invoke('print-html', payload),
  eltoqueFetch: (token) => ipcRenderer.invoke('eltoque-fetch', token),
});
