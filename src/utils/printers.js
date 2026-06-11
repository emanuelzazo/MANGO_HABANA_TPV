/**
 * printers.js — Lista de impresoras disponibles.
 *
 * Importante: los navegadores NO exponen la lista de impresoras del sistema
 * (por privacidad; solo el diálogo de impresión las muestra). La enumeración
 * real requiere una capa nativa (app de escritorio / Electron), que se expone
 * en `window.electronAPI.getPrinters()` o `window.tpvNative.getPrinters()`.
 *
 * @returns {Promise<string[]|null>} nombres de impresoras, o null si no se
 *   pueden enumerar (navegador).
 */
export async function listSystemPrinters() {
  try {
    if (window.electronAPI?.getPrinters) {
      const list = await window.electronAPI.getPrinters();
      return (list || []).map(p => p.displayName || p.name || String(p)).filter(Boolean);
    }
    if (window.tpvNative?.getPrinters) {
      const list = await window.tpvNative.getPrinters();
      return (list || []).map(p => p.name || String(p)).filter(Boolean);
    }
  } catch {
    /* sin acceso nativo */
  }
  return null;
}

const SAVED_KEY = 'tpv_printers';

export function getSavedPrinters() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); }
  catch { return []; }
}

export function savePrinters(list) {
  localStorage.setItem(SAVED_KEY, JSON.stringify([...new Set(list)].filter(Boolean)));
}
