import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { useSalesStore } from '../store/salesStore';
import { useSalesList } from '../store/useSalesList';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/format';
import { getCurrencyConfig } from '../utils/currency-converter';
import { getCurrencyRates } from '../utils/db';
import { exportVentasExcel } from '../utils/export';
import { useToastStore } from '../store/toastStore';

const TABS = [
  { id: 'diario', label: 'Diario' },
  { id: 'semanal', label: 'Semanal' },
  { id: 'mensual', label: 'Mensual' },
  { id: 'anual', label: 'Anual' },
  { id: 'tasas', label: 'Tasas' },
];

const RATE_PERIODS = [
  { id: 'mes', label: 'Mes' },
  { id: 'anio', label: 'Año' },
  { id: 'todo', label: 'Todo' },
];

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function Reports() {
  const [tab, setTab] = useState('diario');
  const ventas = useSalesList();
  const getVentasByRange = useSalesStore(s => s.getVentasByRange);
  const toast = useToastStore();

  // --- Histórico de tasas (USD/EUR por día) ---
  const [rates, setRates] = useState([]);
  const [ratePeriod, setRatePeriod] = useState('mes');
  useEffect(() => { getCurrencyRates(1000).then(setRates).catch(() => {}); }, []);
  const currConfig = getCurrencyConfig();

  const rateSeries = useMemo(() => {
    const byDay = {};
    rates.forEach(r => {
      const d = (r.date || '').slice(0, 10);
      if (!d) return;
      byDay[d] = { date: d, usd: Math.round(r.usd_rate || 0), eur: Math.round(r.eur_rate || 0) };
    });
    let arr = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date();
    if (ratePeriod === 'mes') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      arr = arr.filter(x => new Date(x.date) >= from);
    } else if (ratePeriod === 'anio') {
      const from = new Date(now.getFullYear(), 0, 1);
      arr = arr.filter(x => new Date(x.date) >= from);
    }
    return arr.map(x => ({ ...x, label: x.date.slice(5) }));
  }, [rates, ratePeriod]);

  // --- Reporte diario: ventas hora a hora con comparativa ayer ---
  const dailyData = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const finHoy = new Date(); finHoy.setHours(23,59,59,999);
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
    const finAyer = new Date(ayer); finAyer.setHours(23,59,59,999);

    const hours = Array.from({ length: 15 }, (_, i) => ({
      hora: `${String(i + 8).padStart(2,'0')}:00`,
      hoy: 0,
      ayer: 0,
      tickets: 0,
    }));

    ventas.forEach(v => {
      const f = new Date(v.fecha);
      const h = f.getHours();
      if (h < 8 || h > 22) return;
      const idx = h - 8;
      if (f >= hoy && f <= finHoy) {
        hours[idx].hoy += v.total;
        hours[idx].tickets++;
      } else if (f >= ayer && f <= finAyer) {
        hours[idx].ayer += v.total;
      }
    });
    return hours;
  }, [ventas]);

  // --- Reporte semanal: ventas por día con comparativa semana anterior ---
  const weeklyData = useMemo(() => {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const data = dias.map(d => ({ dia: d, estaS: 0, anteriorS: 0, tickets: 0 }));
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    lunes.setHours(0,0,0,0);
    const lunesAnterior = new Date(lunes);
    lunesAnterior.setDate(lunesAnterior.getDate() - 7);

    ventas.forEach(v => {
      const f = new Date(v.fecha);
      const diffEsta = Math.floor((f - lunes) / 86400000);
      const diffAnterior = Math.floor((f - lunesAnterior) / 86400000);
      if (diffEsta >= 0 && diffEsta < 7) {
        data[diffEsta].estaS += v.total;
        data[diffEsta].tickets++;
      } else if (diffAnterior >= 0 && diffAnterior < 7) {
        data[diffAnterior].anteriorS += v.total;
      }
    });
    return data;
  }, [ventas]);

  // --- Reporte mensual: ventas por semana + top productos + top dependientas ---
  const monthlyData = useMemo(() => {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ventasMes = ventas.filter(v => new Date(v.fecha) >= inicioMes);

    const semanas = [
      { semana: 'Sem 1', total: 0, tickets: 0 },
      { semana: 'Sem 2', total: 0, tickets: 0 },
      { semana: 'Sem 3', total: 0, tickets: 0 },
      { semana: 'Sem 4+', total: 0, tickets: 0 },
    ];
    ventasMes.forEach(v => {
      const dia = new Date(v.fecha).getDate();
      const idx = Math.min(Math.floor((dia - 1) / 7), 3);
      semanas[idx].total += v.total;
      semanas[idx].tickets++;
    });

    // Top productos del mes
    const prodMap = {};
    ventasMes.forEach(v => v.items?.forEach(i => {
      if (!prodMap[i.nombre]) prodMap[i.nombre] = { nombre: i.nombre, cantidad: 0, total: 0 };
      prodMap[i.nombre].cantidad += i.cantidad;
      prodMap[i.nombre].total += i.subtotal;
    }));
    const topProductos = Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 5);

    // Top dependientas del mes
    const depMap = {};
    ventasMes.forEach(v => {
      if (!depMap[v.dependienta]) depMap[v.dependienta] = { nombre: v.dependienta, ventas: 0, total: 0 };
      depMap[v.dependienta].ventas++;
      depMap[v.dependienta].total += v.total;
    });
    const topDependientas = Object.values(depMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return { semanas, topProductos, topDependientas };
  }, [ventas]);

  // --- Reporte anual: ventas por mes del año actual + crecimiento ---
  const annualData = useMemo(() => {
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    const anioAnterior = anioActual - 1;

    const meses = MESES.map((mes) => ({
      mes,
      esteA: 0,
      anteriorA: 0,
      tickets: 0,
    }));

    ventas.forEach(v => {
      const f = new Date(v.fecha);
      const anio = f.getFullYear();
      const mes = f.getMonth();
      if (anio === anioActual) {
        meses[mes].esteA += v.total;
        meses[mes].tickets++;
      } else if (anio === anioAnterior) {
        meses[mes].anteriorA += v.total;
      }
    });

    // Calcular crecimiento mes a mes
    const withGrowth = meses.map((m) => ({
      ...m,
      crecimiento: m.anteriorA > 0
        ? ((m.esteA - m.anteriorA) / m.anteriorA * 100).toFixed(1)
        : null,
    }));

    // Productos estrella del año
    const prodMap = {};
    const ventasAnio = ventas.filter(v => new Date(v.fecha).getFullYear() === anioActual);
    ventasAnio.forEach(v => v.items?.forEach(i => {
      if (!prodMap[i.nombre]) prodMap[i.nombre] = { nombre: i.nombre, cantidad: 0, total: 0 };
      prodMap[i.nombre].cantidad += i.cantidad;
      prodMap[i.nombre].total += i.subtotal;
    }));
    const productosEstrella = Object.values(prodMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return { meses: withGrowth, productosEstrella, totalAnio: ventasAnio.reduce((s, v) => s + v.total, 0) };
  }, [ventas]);

  // --- Derivados según tab ---
  const getChartData = () => {
    if (tab === 'diario') return { data: dailyData, xKey: 'hora', key1: 'hoy', key2: 'ayer', label1: 'Hoy', label2: 'Ayer' };
    if (tab === 'semanal') return { data: weeklyData, xKey: 'dia', key1: 'estaS', key2: 'anteriorS', label1: 'Esta semana', label2: 'Sem. anterior' };
    if (tab === 'mensual') return { data: monthlyData.semanas, xKey: 'semana', key1: 'total', key2: null, label1: 'Este mes' };
    if (tab === 'anual') return { data: annualData.meses, xKey: 'mes', key1: 'esteA', key2: 'anteriorA', label1: String(new Date().getFullYear()), label2: String(new Date().getFullYear() - 1) };
    return { data: [], xKey: 'x', key1: 'total', key2: null, label1: '' };
  };

  const { data, xKey, key1, key2, label1, label2 } = getChartData();
  const totalPeriodo = data.reduce((s, d) => s + (d[key1] || 0), 0);
  const ticketsPeriodo = data.reduce((s, d) => s + (d.tickets || 0), 0);

  const handleExport = () => {
    const ahora = new Date();
    let from, to;
    if (tab === 'diario') { from = new Date(); from.setHours(0,0,0,0); to = new Date(); to.setHours(23,59,59,999); }
    else if (tab === 'semanal') { from = new Date(); from.setDate(from.getDate() - 7); to = new Date(); }
    else if (tab === 'mensual') { from = new Date(ahora.getFullYear(), ahora.getMonth(), 1); to = new Date(); }
    else { from = new Date(ahora.getFullYear(), 0, 1); to = new Date(); }
    const filtradas = getVentasByRange(from, to);
    exportVentasExcel(filtradas, `reporte_${tab}`);
    toast.success('Exportando reporte...');
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis de ventas por período</p>
        </div>
        <Button variant="secondary" icon={Download} onClick={handleExport} size="sm">
          Exportar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'tasas' && (
      <>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 col-span-2">
          <p className="text-xs text-gray-500">Total período</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(totalPeriodo)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs text-gray-500">Tickets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{ticketsPeriodo}</p>
        </div>
      </div>

      {/* Gráfico principal */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {TABS.find(t => t.id === tab)?.label} — Ventas
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9ca3af' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `$${v}`} width={55} />
            <Tooltip
              formatter={(value, name) => [formatCurrency(value), name]}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            {key2 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <Bar dataKey={key1} name={label1} fill="#111827" radius={[4, 4, 0, 0]} />
            {key2 && <Bar dataKey={key2} name={label2} fill="#e5e7eb" radius={[4, 4, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Secciones específicas por tab */}
      {tab === 'mensual' && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Top productos */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top productos del mes</h3>
            {monthlyData.topProductos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin datos</p>
            ) : monthlyData.topProductos.map((p, i) => (
              <div key={p.nombre} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-400">{p.cantidad} uds.</p>
                </div>
                <span className="text-xs font-semibold text-gray-900">{formatCurrency(p.total)}</span>
              </div>
            ))}
          </div>
          {/* Top dependientas */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Top dependientas del mes</h3>
            {monthlyData.topDependientas.length === 0 ? (
              <p className="text-sm text-gray-400">Sin datos</p>
            ) : monthlyData.topDependientas.map((d, i) => (
              <div key={d.nombre} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-300 w-4">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">{d.nombre}</p>
                  <p className="text-xs text-gray-400">{d.ventas} ventas</p>
                </div>
                <span className="text-xs font-semibold text-gray-900">{formatCurrency(d.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'anual' && annualData.productosEstrella.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Productos estrella del año</h3>
          <div className="flex flex-col gap-2">
            {annualData.productosEstrella.map((p, i) => (
              <div key={p.nombre} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="bg-gray-900 h-1.5 rounded-full" style={{
                      width: `${(p.total / annualData.productosEstrella[0].total) * 100}%`
                    }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.total)}</p>
                  <p className="text-xs text-gray-400">{p.cantidad} uds.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla detallada */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Período</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">{label1}</th>
              {key2 && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">{label2}</th>}
              {tab === 'anual' && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Crecimiento</th>}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Tickets</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-700">{row[xKey]}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(row[key1] || 0)}</td>
                {key2 && <td className="px-4 py-3 text-sm text-gray-400 text-right">{formatCurrency(row[key2] || 0)}</td>}
                {tab === 'anual' && (
                  <td className="px-4 py-3 text-sm text-right">
                    {row.crecimiento !== null ? (
                      <span className={parseFloat(row.crecimiento) >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                        {parseFloat(row.crecimiento) >= 0 ? '+' : ''}{row.crecimiento}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                )}
                <td className="px-4 py-3 text-sm text-gray-500 text-right">{row.tickets || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* ── REPORTE DE TASAS USD/EUR ── */}
      {tab === 'tasas' && (
        <div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
            {RATE_PERIODS.map(p => (
              <button key={p.id} onClick={() => setRatePeriod(p.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${ratePeriod === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-500">1 USD (hoy)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{Math.round(currConfig.exchange_rate || 0).toLocaleString('es-ES')} <span className="text-base font-medium text-gray-400">CUP</span></p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-xs text-gray-500">1 EUR (hoy)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{Math.round(currConfig.eur_rate || 0).toLocaleString('es-ES')} <span className="text-base font-medium text-gray-400">CUP</span></p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Tasa del día — USD y EUR (CUP)</h2>
            {rateSeries.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">Aún no hay histórico de tasas. Sincroniza con El Toque en Configuración → Conversión de Moneda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rateSeries} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={55} domain={['auto', 'auto']} />
                  <Tooltip formatter={(value, name) => [`${value} CUP`, name]} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="usd" name="USD" stroke="#111827" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="eur" name="EUR" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {rateSeries.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">USD (CUP)</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">EUR (CUP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...rateSeries].reverse().map(r => (
                    <tr key={r.date} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700">{r.date}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{r.usd.toLocaleString('es-ES')}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.eur ? r.eur.toLocaleString('es-ES') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
