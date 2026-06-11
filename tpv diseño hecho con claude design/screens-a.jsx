// screens-a.jsx — LoginScreen + DashboardScreen

// ── LOGIN ─────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [user, setUser] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [remember, setRemember] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('mh_remember_user');
    if (saved) { setUser(saved); setRemember(true); }
  }, []);

  const handleLogin = () => {
    if (!user.trim() || !pass.trim()) { setError('Por favor, completa todos los campos.'); return; }
    setLoading(true); setError('');
    setTimeout(() => {
      if (remember) localStorage.setItem('mh_remember_user', user);
      else localStorage.removeItem('mh_remember_user');
      onLogin({ name: 'Ana García', initials: 'AG', role: 'Dependienta Senior' });
      setLoading(false);
    }, 800);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', width: 380, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', border: '1px solid #E8E8E8' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 26, letterSpacing: 4, color: '#111', textTransform: 'uppercase' }}>Mango</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: 16, letterSpacing: 6, color: '#AAAAAA', textTransform: 'uppercase' }}>Habana</div>
          <div style={{ width: 32, height: 1, background: '#E8E8E8', margin: '16px auto 0' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Usuario</label>
            <Input placeholder="nombre.apellido" value={user} onChange={e => setUser(e.target.value)} autoFocus />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contraseña</label>
            <Input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)}
              style={{}} />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', padding: '8px 12px', borderRadius: 8 }}>{error}</div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#6B6B6B', userSelect: 'none' }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: '#111', cursor: 'pointer' }} />
            Recordar usuario
          </label>

          <Btn onClick={handleLogin} disabled={loading} fullWidth size="lg" style={{ marginTop: 8, letterSpacing: 0.3 }}>
            {loading ? 'Accediendo...' : 'Entrar'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────
function DashboardScreen({ onToast }) {
  const { salesToday, salesMonth, itemsToday, bestStaff, topProducts, lowStock } = DASHBOARD;
  const lastSales = SALES_HISTORY.slice(0, 5);

  const payIcon = { tarjeta: <IcoCreditCard size={14} />, efectivo: <IcoBanknote size={14} />, bizum: <IcoSmartphone size={14} /> };

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <PageHeader title="Dashboard">
        <span style={{ fontSize: 13, color: '#AAAAAA' }}>Jueves, 5 junio 2026</span>
      </PageHeader>

      {/* Metric cards row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <MetricCard accent title="Ventas hoy" value={fmt(salesToday)} sub="+12% vs. ayer" icon={<IcoTrendUp size={20} />} />
        <MetricCard title="Ventas mes" value={fmt(salesMonth)} sub="Junio 2026" icon={<IcoBarChart size={20} />} />
        <MetricCard title="Artículos vendidos" value={itemsToday} sub="hoy" icon={<IcoPackage size={20} />} />
        <MetricCard title="Mejor dependienta" value={bestStaff} sub="hoy" icon={<IcoUser size={20} />} />
      </div>

      {/* Second row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Top products */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E8E8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Top 5 Productos</div>
          {topProducts.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid #F3F4F6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#AAAAAA', width: 16 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{p.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{p.sold} uds</div>
                <div style={{ fontSize: 11, color: '#AAAAAA' }}>{fmt(p.revenue)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Low stock alerts */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E8E8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Alertas Stock</div>
            <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF2F2', color: '#EF4444', padding: '2px 8px', borderRadius: 999 }}>{lowStock.length}</span>
          </div>
          {lowStock.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < lowStock.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
              <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{s.name}</span>
              <Badge label={s.stock === 0 ? 'Sin stock' : `${s.stock} uds`} type={s.stock === 0 ? 'sinstock' : 'bajo'} />
            </div>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            <button style={{ fontSize: 12, color: '#6B6B6B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onToast('Sincronizando con WooCommerce...', 'info')}>
              <IcoRefresh size={12} /> Sincronizar ahora
            </button>
          </div>
        </div>

        {/* Mini chart — daily sales bar */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #E8E8E8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Ventas 7 días</div>
          <MiniBarChart data={REPORTS_DATA.daily.values} labels={REPORTS_DATA.daily.labels} />
        </div>
      </div>

      {/* Last 5 sales */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>Últimas Ventas</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Ticket', 'Hora', 'Dependienta', 'Total', 'Pago'].map(h => (
                <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lastSales.map((s, i) => (
              <tr key={s.id} style={{ borderTop: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'monospace' }}>{s.id}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, color: '#6B6B6B' }}>{s.time}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, color: '#111' }}>{s.staff}</td>
                <td style={{ padding: '11px 20px', fontSize: 13, fontWeight: 600, color: '#111' }}>{fmt(s.total)}</td>
                <td style={{ padding: '11px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {payIcon[s.payment]}
                    <Badge label={PAYMENT_METHODS[s.payment]} type={s.payment} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mini bar chart (inline SVG) ───────────────────────────────
function MiniBarChart({ data, labels }) {
  const max = Math.max(...data);
  const W = 240, H = 80;
  const n = data.length;
  const barW = Math.floor((W - 8) / n) - 4;

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', overflow: 'visible' }}>
      {data.map((v, i) => {
        const bh = Math.max(4, (v / max) * H);
        const x = 4 + i * ((W - 8) / n);
        const y = H - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} fill="var(--accent)" rx="3" opacity={i === n - 1 ? 1 : 0.25} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="#AAAAAA" fontFamily="Inter,sans-serif">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

Object.assign(window, { LoginScreen, DashboardScreen, MiniBarChart });
