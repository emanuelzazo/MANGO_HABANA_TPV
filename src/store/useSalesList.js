/**
 * useSalesList — Lista de ventas "efectiva" para Historial, Reportes, Dashboard,
 * Calendario y Staff.
 *
 * En modo nube (por defecto, si hay WooCommerce): devuelve las ventas
 * compartidas de WooCommerce + las ventas locales aún NO sincronizadas
 * (las que están en la cola pendiente). Así los dos equipos ven lo mismo y no
 * se duplican las ya enviadas.
 *
 * Sin nube / sin conexión / sin pedidos: devuelve las ventas locales.
 */
import { useMemo } from 'react';
import { useSalesStore } from './salesStore';
import { useSyncStore } from './syncStore';

export function useSalesList() {
  const ventas = useSalesStore(s => s.ventas);
  const cloud = useSalesStore(s => s.cloudVentas);
  const cloudMode = useSalesStore(s => s.cloudMode);
  const pending = useSyncStore(s => s.pendingOrders);

  return useMemo(() => {
    if (!cloudMode || cloud.length === 0) return ventas;
    const pendingIds = new Set(pending.map(p => p.ventaId));
    const localPendientes = ventas.filter(v => pendingIds.has(v.id));
    const merged = [...cloud, ...localPendientes];
    merged.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return merged;
  }, [ventas, cloud, cloudMode, pending]);
}
