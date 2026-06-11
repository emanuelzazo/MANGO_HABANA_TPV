import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useSalesStore } from '../store/salesStore';
import { Button } from '../components/ui/Button';
import { useToastStore } from '../store/toastStore';
import { exportVentasExcel, exportVentasCSV } from '../utils/export';

function ExportCard({ icon: Icon, title, description, actions }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
          <Icon size={20} className="text-gray-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function Exports() {
  const getVentasByRange = useSalesStore(s => s.getVentasByRange);
  const toast = useToastStore();

  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const getToday = () => {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fin = new Date(); fin.setHours(23,59,59,999);
    return getVentasByRange(hoy, fin);
  };

  const getWeek = () => {
    const hoy = new Date(); hoy.setHours(23,59,59,999);
    const lunes = new Date(); lunes.setDate(lunes.getDate() - lunes.getDay() + 1); lunes.setHours(0,0,0,0);
    return getVentasByRange(lunes, hoy);
  };

  const getMonth = () => {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    return getVentasByRange(inicio, fin);
  };

  const doExport = (data, type, filename) => {
    if (data.length === 0) { toast.warning('Sin datos para exportar en ese rango'); return; }
    if (type === 'excel') exportVentasExcel(data, filename);
    if (type === 'csv') exportVentasCSV(data, filename);
    toast.success(`Exportado ${data.length} ventas`);
  };

  const customVentas = customFrom && customTo
    ? getVentasByRange(new Date(customFrom), new Date(customTo + 'T23:59:59'))
    : [];

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Exportaciones</h1>
      <p className="text-sm text-gray-500 mb-8">Descarga tus ventas en Excel o CSV</p>

      <div className="flex flex-col gap-4">
        <ExportCard
          icon={Download}
          title="Hoy"
          description="Ventas del día actual"
          actions={[
            <Button key="e" variant="secondary" size="sm" onClick={() => doExport(getToday(), 'excel', 'ventas_hoy')}>Excel</Button>,
            <Button key="c" variant="secondary" size="sm" onClick={() => doExport(getToday(), 'csv', 'ventas_hoy')}>CSV</Button>,
          ]}
        />

        <ExportCard
          icon={FileSpreadsheet}
          title="Esta semana"
          description="Desde el lunes hasta hoy"
          actions={[
            <Button key="e" variant="secondary" size="sm" onClick={() => doExport(getWeek(), 'excel', 'ventas_semana')}>Excel</Button>,
            <Button key="c" variant="secondary" size="sm" onClick={() => doExport(getWeek(), 'csv', 'ventas_semana')}>CSV</Button>,
          ]}
        />

        <ExportCard
          icon={FileSpreadsheet}
          title="Este mes"
          description="Desde el día 1 hasta hoy"
          actions={[
            <Button key="e" variant="secondary" size="sm" onClick={() => doExport(getMonth(), 'excel', 'ventas_mes')}>Excel</Button>,
            <Button key="c" variant="secondary" size="sm" onClick={() => doExport(getMonth(), 'csv', 'ventas_mes')}>CSV</Button>,
          ]}
        />

        {/* Rango personalizado */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Rango personalizado</p>
              <p className="text-xs text-gray-400">Selecciona un período específico</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <span className="text-gray-400">—</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900" />
            {customVentas.length > 0 && (
              <span className="text-xs text-gray-500">{customVentas.length} ventas</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => doExport(customVentas, 'excel', 'ventas_custom')} disabled={!customFrom || !customTo}>Excel</Button>
            <Button variant="secondary" size="sm" onClick={() => doExport(customVentas, 'csv', 'ventas_custom')} disabled={!customFrom || !customTo}>CSV</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
