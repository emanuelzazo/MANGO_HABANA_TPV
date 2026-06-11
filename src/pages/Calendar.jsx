import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { useSalesList } from '../store/useSalesList';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDateTime, formatCup } from '../utils/format';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const ventas = useSalesList();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calcular días del mes con datos de ventas
  const calendarData = useMemo(() => {
    const inicio = new Date(year, month, 1);
    const fin = new Date(year, month + 1, 0);
    const ventasMes = ventas.filter(v => {
      const f = new Date(v.fecha);
      return f >= inicio && f <= fin;
    });

    const byDay = {};
    ventasMes.forEach(v => {
      const dia = new Date(v.fecha).getDate();
      if (!byDay[dia]) byDay[dia] = { total: 0, tickets: 0, ventas: [] };
      byDay[dia].total += v.total;
      byDay[dia].tickets++;
      byDay[dia].ventas.push(v);
    });
    return { byDay, daysInMonth: fin.getDate(), firstDayOfWeek: (inicio.getDay() + 6) % 7 };
  }, [ventas, year, month]);

  const { byDay, daysInMonth, firstDayOfWeek } = calendarData;

  const totalMes = Object.values(byDay).reduce((s, d) => s + d.total, 0);
  const ticketsMes = Object.values(byDay).reduce((s, d) => s + d.tickets, 0);

  // Días seleccionados
  const selectedData = selectedDay ? byDay[selectedDay] : null;

  // Desglose por método de pago del día seleccionado
  const paymentBreakdown = useMemo(() => {
    if (!selectedData) return [];
    const counts = { efectivo: 0, transferencia: 0 };
    selectedData.ventas.forEach(v => {
      if (counts[v.metodo_pago] !== undefined) counts[v.metodo_pago]++;
      else counts[v.metodo_pago] = 1;
    });
    const total = selectedData.ventas.length || 1;
    const labels = { efectivo: 'Efectivo', transferencia: 'Transferencia' };
    return Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([key, n]) => ({ key, label: labels[key] || key, pct: Math.round((n / total) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [selectedData]);

  // Máximo del mes para el mapa de calor de intensidad.
  const maxDayTotal = Math.max(1, ...Object.values(byDay).map(d => d.total));

  // Cortes quincenales: 11–25 del mes visible y 26 → 10 del mes siguiente.
  const quincenas = useMemo(() => {
    const sum = (from, to) => {
      const vs = ventas.filter(v => { const f = new Date(v.fecha); return f >= from && f <= to; });
      return { total: vs.reduce((s, v) => s + v.total, 0), tickets: vs.length };
    };
    return [
      { label: '11 – 25', sub: MESES[month], ...sum(new Date(year, month, 11, 0, 0, 0), new Date(year, month, 25, 23, 59, 59)) },
      { label: '26 – 10', sub: `${MESES[month].slice(0, 3)} → ${MESES[(month + 1) % 12].slice(0, 3)}`, ...sum(new Date(year, month, 26, 0, 0, 0), new Date(year, month + 1, 10, 23, 59, 59)) },
    ];
  }, [ventas, year, month]);

  return (
    <div className="p-8 flex gap-6">
      {/* Calendario */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{MESES[month]} {year}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatCurrency(totalMes)} · {ticketsMes} tickets
            </p>
          </div>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 mb-2">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 gap-1">
          {/* Espacios vacíos */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Días del mes */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const data = byDay[day];
            const isToday = new Date().getDate() === day &&
              new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSelected = selectedDay === day;
            const intensity = data?.total ? data.total / maxDayTotal : 0;

            const bg = isSelected ? '#111' : intensity > 0 ? `rgba(17,17,17,${(intensity * 0.12).toFixed(3)})` : '#fff';
            const borderColor = isSelected ? '#111' : isToday ? '#C4A882' : '#E8E8E8';

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="text-left transition-all"
                style={{
                  minHeight: 74, padding: '10px 10px 8px', borderRadius: 10,
                  background: bg, border: `1.5px solid ${borderColor}`,
                  display: 'flex', flexDirection: 'column', cursor: 'pointer',
                  color: isSelected ? '#fff' : '#111',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#111'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = borderColor; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: isSelected ? '#fff' : '#111' }}>{day}</span>
                  {isToday && !isSelected && <span style={{ fontSize: 9, fontWeight: 700, color: '#C4A882', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hoy</span>}
                </div>
                {data && (
                  <div style={{ marginTop: 'auto' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, color: isSelected ? 'rgba(255,255,255,0.95)' : '#111' }}>
                      {formatCurrency(data.total)}
                    </p>
                    <p style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.6)' : '#AAA' }}>
                      {data.tickets} tickets
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Columna derecha: panel del día + leyenda */}
      <div className="w-80 flex flex-col gap-4">
        {selectedDay ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-5 h-fit">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {selectedDay} de {MESES[month]} {year}
              </p>
              <p className="text-2xl font-bold text-gray-900 tracking-tight mt-1">
                {selectedData ? formatCurrency(selectedData.total) : formatCurrency(0)}
              </p>
              {selectedData && (
                <p className="text-xs text-gray-400 mt-0.5">{selectedData.tickets} tickets</p>
              )}
            </div>
            <button onClick={() => setSelectedDay(null)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {!selectedData ? (
            <p className="text-sm text-gray-400 py-4 text-center">Sin ventas este día</p>
          ) : (
            <>
              {/* Desglose por método de pago */}
              {paymentBreakdown.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Desglose por método</p>
                  {paymentBreakdown.map(({ key, label, pct }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-16 shrink-0">{label}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-900 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-900 w-9 text-right shrink-0">{pct}%</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ventas del día</p>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px]">
                {selectedData.ventas.map(v => (
                  <div key={v.id} className="border border-gray-100 rounded-xl p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-mono font-medium text-gray-900">{v.numero}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(v.fecha)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{v.dependienta}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(v.total)}</p>
                        <Badge variant={v.metodo_pago === 'transferencia' ? 'info' : 'default'} className="mt-0.5">
                          {v.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </>
          )}
        </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 h-fit">
            <CalendarIcon size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Selecciona un día</p>
          </div>
        )}

        {/* Cortes quincenales */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Cortes quincenales</p>
          <div className="flex flex-col gap-3">
            {quincenas.map(q => (
              <div key={q.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{q.label}</p>
                  <p className="text-xs text-gray-400">{q.sub} · {q.tickets} tickets</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(q.total)}</p>
                  <p className="text-xs text-gray-400">{formatCup(q.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leyenda de intensidad */}
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Intensidad de ventas</p>
          <div className="flex gap-1 items-center">
            {[0.05, 0.15, 0.3, 0.55, 1].map((v, i) => (
              <div key={i} className="flex-1 rounded" style={{ height: 12, background: `rgba(17,17,17,${(v * 0.12).toFixed(3)})`, border: '1px solid #E8E8E8' }} />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: 10 }} className="text-gray-400">Bajo</span>
            <span style={{ fontSize: 10 }} className="text-gray-400">Alto</span>
          </div>
        </div>
      </div>
    </div>
  );
}
