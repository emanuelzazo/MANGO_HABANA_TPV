import { useState, useMemo } from 'react';
import { Search, Eye, Printer, Download } from 'lucide-react';
import { useSalesList } from '../store/useSalesList';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateTime } from '../utils/format';
import { printReceipt } from '../utils/print';
import { exportVentasExcel, exportVentasCSV, exportVentasPDF } from '../utils/export';
import { useToastStore } from '../store/toastStore';

export function SalesHistory() {
  const ventas = useSalesList();
  const toast = useToastStore();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dependientaFilter, setDependientaFilter] = useState('');
  const [selectedVenta, setSelectedVenta] = useState(null);

  const dependientas = [...new Set(ventas.map(v => v.dependienta).filter(Boolean))].sort();

  const filtered = useMemo(() => {
    let result = [...ventas].reverse();

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.numero?.toLowerCase().includes(q) ||
        v.dependienta?.toLowerCase().includes(q) ||
        v.items?.some(i => i.nombre?.toLowerCase().includes(q))
      );
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(v => new Date(v.fecha) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(v => new Date(v.fecha) <= to);
    }

    if (dependientaFilter) {
      result = result.filter(v => v.dependienta === dependientaFilter);
    }

    return result;
  }, [ventas, search, dateFrom, dateTo, dependientaFilter]);

  const totalFiltrado = filtered.reduce((s, v) => s + v.total, 0);

  return (
    <div className="p-8 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historial de Ventas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{ventas.length} ventas registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => {
            exportVentasExcel(filtered);
            toast.success('Excel exportado');
          }}>Excel</Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => {
            exportVentasCSV(filtered);
            toast.success('CSV exportado');
          }}>CSV</Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => {
            exportVentasPDF(filtered);
            toast.success('PDF exportado');
          }}>PDF</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          icon={Search}
          placeholder="Buscar por Nº venta, dependienta o producto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          wrapperClassName="flex-1 min-w-[200px]"
        />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900" />
        <span className="text-gray-400 text-sm">—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900" />
        <select value={dependientaFilter} onChange={e => setDependientaFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Todas las dependientas</option>
          {dependientas.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Total filtrado */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
          <p className="text-sm text-gray-500">{filtered.length} ventas encontradas</p>
          <p className="text-sm font-semibold text-gray-900">Total: {formatCurrency(totalFiltrado)}</p>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-sm">Sin ventas registradas</p>
            <p className="text-xs mt-1">Las ventas aparecerán aquí tras completarlas en el POS</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Nº Venta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha y hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Dependienta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Productos</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Pago</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(venta => (
                <tr key={venta.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{venta.numero}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(venta.fecha)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{venta.dependienta}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate">
                    {venta.items?.map(i => i.nombre).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(venta.total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={venta.metodo_pago === 'tarjeta' ? 'info' : 'default'}>
                      {venta.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Efectivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelectedVenta(venta)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => printReceipt(venta)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle venta */}
      <Modal isOpen={!!selectedVenta} onClose={() => setSelectedVenta(null)} title={`Venta ${selectedVenta?.numero}`} size="md">
        {selectedVenta && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Fecha</p><p className="font-medium">{formatDateTime(selectedVenta.fecha)}</p></div>
              <div><p className="text-gray-500 text-xs">Dependienta</p><p className="font-medium">{selectedVenta.dependienta}</p></div>
              <div><p className="text-gray-500 text-xs">Método de pago</p><p className="font-medium capitalize">{selectedVenta.metodo_pago}</p></div>
              <div><p className="text-gray-500 text-xs">Estado</p><Badge variant="success">Completada</Badge></div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Productos</p>
              <div className="flex flex-col gap-2">
                {selectedVenta.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.nombre} × {item.cantidad}</span>
                    <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(selectedVenta.subtotal)}</span></div>
              {selectedVenta.descuento > 0 && (
                <div className="flex justify-between text-emerald-600"><span>Descuento</span><span>−{formatCurrency(selectedVenta.descuento)}</span></div>
              )}
              <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatCurrency(selectedVenta.total)}</span></div>
            </div>
            <Button icon={Printer} variant="secondary" onClick={() => printReceipt(selectedVenta)} className="w-full">
              Reimprimir ticket
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
