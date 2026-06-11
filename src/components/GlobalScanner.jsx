/**
 * GlobalScanner.jsx — Escáner global por teclado, siempre escuchando.
 *
 * Captura (en cualquier pantalla, sin necesidad de un campo enfocado):
 *   1. **Cmd/Ctrl+V** → lee el portapapeles (`navigator.clipboard.readText`) y
 *      lo trata como el código escaneado. Funciona en toda la app.
 *   2. **Wedge de lector USB**: teclas muy rápidas + Enter (fuera de campos).
 * Resuelve el producto (caché local primero) y lo añade al carrito saltando a
 * la caja. Un único manejador (keydown) + anti-rebote → nunca duplica.
 * Dentro de un campo de texto no interfiere: deja pegar/escribir normal.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveProductByCode } from '../utils/resolveProduct';
import { addProductToCart } from '../utils/addProductToCart';
import { useToastStore } from '../store/toastStore';

function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function GlobalScanner() {
  const navigate = useNavigate();

  useEffect(() => {
    let buffer = '';
    let lastTime = 0;
    let lastScan = { code: '', ts: 0 };

    async function handleScanned(code) {
      const value = String(code || '').trim();
      if (value.length < 2) return;
      // Anti-rebote: ignora el mismo código repetido en <1.2s (evita duplicados).
      const now = Date.now();
      if (value === lastScan.code && now - lastScan.ts < 1200) return;
      lastScan = { code: value, ts: now };

      const toast = useToastStore.getState();
      const product = await resolveProductByCode(value);
      if (!product) { toast.warning(`Sin producto para "${value}"`, 1800); return; }
      if (addProductToCart(product)) {
        toast.success(`${product.nombre} añadido`, 1200);
        navigate('/pos');
      }
    }

    function onKeyDown(e) {
      // Cmd/Ctrl+V en CUALQUIER parte: leemos el portapapeles directamente.
      // Esto sí funciona aunque no haya un campo enfocado (a diferencia del
      // evento `paste`, que sólo se dispara dentro de campos de texto).
      if ((e.metaKey || e.ctrlKey) && (e.key === 'v' || e.key === 'V')) {
        if (isEditable(document.activeElement)) return; // pegar normal en campos
        if (navigator.clipboard?.readText) {
          navigator.clipboard.readText()
            .then(text => { if (text) handleScanned(text); })
            .catch(() => { /* permiso denegado: usar el buscador del POS */ });
        }
        return;
      }

      // Wedge de lector USB: teclas rápidas + Enter (sólo fuera de campos).
      if (isEditable(document.activeElement)) return;
      const now = Date.now();
      if (now - lastTime > 80) buffer = '';
      lastTime = now;
      if (e.key === 'Enter') {
        const code = buffer;
        buffer = '';
        if (code) handleScanned(code);
        return;
      }
      if (e.key.length === 1) buffer += e.key;
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate]);

  return null; // sin UI: siempre escuchando
}
