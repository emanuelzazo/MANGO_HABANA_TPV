// screens-d.jsx — Calendar + Reports

// ── CALENDAR ──────────────────────────────────────────────────
function CalendarioScreen() {
  const [selectedDay, setSelectedDay] = React.useState(5);
  const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  // June 2026 starts on Monday (index 0)
  const startDow = 0;
  const totalDays = 30;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const maxSales = Math.max(...Object.values(CALENDAR_DATA).map(d => d.sales));

  const dayData = selectedDay ? CALENDAR_DATA[selectedDay] : null;
  const dayRevenue = dayData?.sales || 0;
  const dayTickets = dayData?.tickets || 0;

  return (
    <div style={{ padding: 32, display: 'flex', gap: 24, height: '100%', overflow: 'hidden' }}>
      {/* Calendar grid */}
      <div style={{ flex: 1 }}>
        <PageHeader title="Calendario Comercial">
          <span style={{ fontSize: 13, color: '#AAAAAA', fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>Junio 2026</span>
        </PageHeader>

        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {DAYS_OF_WEEK.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 0' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const data = CALENDAR_DATA[day];
            const intensity = data?.sales ? data.sales / maxSales : 0;
            const isSelected = selectedDay === day;
            const isToday = day === 5;
            const bgAlpha = Math.round(intensity * 80);
            const bg = isSelected ? '#111' : intensity > 0 ? `rgba(17,17,17,${intensity * 0.12})` : '#fff';

            return (
              <div key={day} onClick={() => setSelectedDay(day)}
                style={{
                  borderRadius: 10, padding: '10px 10px 8px',
                  background: bg,
                  border: `1.5px solid ${isSelected ? '#111' : isToday ? '#C4A882' : '#E8E8E8'}`,
                  cursor: 'pointer', transition: 'all 0.15s', minHeight: 72,
                  display: 'flex', flexDirection: 'column',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#111'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = isToday ? '#C4A882' : '#E8E8E8'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: isSelected ? '#fff' : '#111' }}>{day}</span>
                  {isToday && !isSelected && <span style={{ fontSize: 9, fontWeight: 700, color: '#C4A882', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hoy</span>}
                </div>
                {data?.sales > 0 && (
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: isSelected ? 'rgba(255,255,255,0.9)' : '#111' }}>{fmt(data.sales)}</div>
                    <div style={{ fontSize: 10, color: isSelected ? 'rgba(255,255,255,0.6)' : '#AAAAAA' }}>{data.tickets} tickets</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', padding: 20, position: 'sticky', top: 0 }}>
          {selectedDay ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                {selectedDay === 5 ? 'Hoy · ' : ''} {selectedDay} junio 2026
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#111', letterSpacing: -0.5, marginBottom: 4 }}>{dayRevenue > 0 ? fmt(dayRevenue) : '—'}</div>
              <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>{dayTickets > 0 ? `${dayTickets} tickets` : 'Sin ventas'}</div>

              {dayRevenue > 0 && (
                <>
                  <div style={{ height: 1, background: '#E8E8E8', marginBottom: 16 }} />
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Desglose estimado</div>
                  {[
                    { label: 'Tarjeta', pct: 65 },
                    { label: 'Efectivo', pct: 25 },
                    { label: 'Bizum', pct: 10 },
                  ].map(m => (
                    <div key={m.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#6B6B6B' }}>{m.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{m.pct}%</span>
                      </div>
                      <div style={{ height: 4, background: '#F3F4F6', borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${m.pct}%`, background: '#111', borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#AAAAAA' }}>
              <IcoCalendar size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>Selecciona un día</div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 12, background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Intensidad de ventas</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[0.05, 0.15, 0.3, 0.55, 1].map((v, i) => (
              <div key={i} style={{ flex: 1, height: 12, borderRadius: 3, background: `rgba(17,17,17,${v * 0.12})`, border: '1px solid #E8E8E8' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: '#AAAAAA' }}>Bajo</span>
            <span style={{ fontSize: 10, color: '#AAAAAA' }}>Alto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── REPORTS ───────────────────────────────────────────────────
function ReportesScreen() {
  const [tab, setTab] = React.useState('weekly');
  const tabs = [{ key: 'daily', label: 'Diario' }, { key: 'weekly', label: 'Semanal' }, { key: 'monthly', label: 'Mensual' }, { key: 'annual', label: 'Anual' }];
  const data = REPORTS_DATA[tab];

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <PageHeader title="Reportes" />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: '#F3F4F6', borderRadius: 10, padding: 3, width: 'fit-content', marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: tab === t.key ? '#fff' : 'transparent',
            color: tab === t.key ? '#111' : '#6B6B6B',
            fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
            boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s', fontFamily: 'inherit',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <MetricCard title="Total facturado" value={fmt(data.total)} icon={<IcoTrendUp size={18} />} />
        <MetricCard title="Tickets emitidos" value={data.tickets} icon={<IcoClipboard size={18} />} />
        <MetricCard title="Ticket medio" value={fmt(data.avg)} icon={<IcoBarChart size={18} />} />
      </div>

      {/* Bar chart */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 20 }}>Ventas por período</div>
        <BarChart data={data} />
      </div>

      {/* Detail table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Detalle</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Período', 'Facturación', 'Tickets', 'Ticket Medio', 'Variación'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.labels.map((label, i) => {
              const v = data.values[i];
              const prev = data.values[i - 1];
              const pct = prev ? ((v - prev) / prev * 100).toFixed(1) : null;
              const tickets = Math.round(v / data.avg);
              return (
                <tr key={label} style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '11px 20px', fontSize: 14, fontWeight: 500, color: '#111' }}>{label}</td>
                  <td style={{ padding: '11px 20px', fontSize: 14, fontWeight: 600, color: '#111' }}>{fmt(v)}</td>
                  <td style={{ padding: '11px 20px', fontSize: 13, color: '#6B6B6B' }}>{tickets}</td>
                  <td style={{ padding: '11px 20px', fontSize: 13, color: '#6B6B6B' }}>{fmt(data.avg)}</td>
                  <td style={{ padding: '11px 20px' }}>
                    {pct !== null && (
                      <span style={{ fontSize: 13, fontWeight: 600, color: parseFloat(pct) >= 0 ? '#22C55E' : '#EF4444' }}>
                        {parseFloat(pct) >= 0 ? '+' : ''}{pct}%
                      </span>
                    )}
                    {pct === null && <span style={{ color: '#AAAAAA' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bar Chart (SVG) ───────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.values);
  const H = 180, PAD_L = 60, PAD_B = 32, PAD_T = 12, PAD_R = 16;
  const n = data.labels.length;
  const innerW = 800;
  const barW = Math.max(20, Math.floor((innerW - PAD_L - PAD_R) / n) - 10);
  const step = innerW / n;

  const yTicks = 4;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round(max / yTicks * i));

  return (
    <svg viewBox={`0 0 ${innerW} ${H + PAD_B + PAD_T}`} style={{ width: '100%', overflow: 'visible' }}>
      {/* Y axis grid lines */}
      {tickVals.map((v, i) => {
        const y = PAD_T + H - (v / max) * H;
        return (
          <g key={i}>
            <line x1={PAD_L} x2={innerW - PAD_R} y1={y} y2={y} stroke="#F3F4F6" strokeWidth={1} />
            <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#AAAAAA" fontFamily="Inter,sans-serif">
              {v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.labels.map((label, i) => {
        const v = data.values[i];
        const bh = Math.max(2, (v / max) * H);
        const x = PAD_L + i * step + step / 2 - barW / 2;
        const y = PAD_T + H - bh;
        const isLast = i === n - 1;
        return (
          <g key={label}>
            <rect x={x} y={y} width={barW} height={bh} fill={isLast ? 'var(--accent)' : '#E8E8E8'} rx={4} />
            <text x={x + barW / 2} y={PAD_T + H + 20} textAnchor="middle" fontSize="11" fill="#6B6B6B" fontFamily="Inter,sans-serif">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { CalendarioScreen, ReportesScreen, BarChart });
