// screens-c.jsx — Inventory + Sales History

// ── INVENTORY ─────────────────────────────────────────────────
function InventoryScreen({ onToast }) {
  const [query, setQuery] = React.useState('');
  const [catFilter, setCatFilter] = React.useState('Todas');
  const [syncing, setSyncing] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const PER_PAGE = 8;

  const filtered = PRODUCTS.filter(p => {
    const q = query.toLowerCase();
    const matchQ = !query || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(q);
    const matchC = catFilter === 'Todas' || p.category === catFilter;
    return matchQ && matchC;
  });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); onToast('Inventario sincronizado con WooCommerce', 'success'); }, 1800);
  };

  const stockStatus = (s) => {
    if (s === 0) return { label: 'Sin stock', type: 'sinstock' };
    if (s <= 3)  return { label: 'Bajo', type: 'bajo' };
    return { label: `${s} uds`, type: 'neutral' };
  };

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Inventario">
        <Btn variant="secondary" icon={<IcoRefresh size={14} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />} onClick={handleSync} disabled={syncing}>
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </Btn>
      </PageHeader>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <Input placeholder="Buscar por nombre, SKU o código..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} icon={<IcoSearch size={15} />} />
        </div>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }} style={{
          padding: '9px 14px', borderRadius: 8, border: '1.5px solid #E8E8E8',
          fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#fff', cursor: 'pointer',
        }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E8E8E8' }}>
              {['', 'Producto', 'SKU', 'Código', 'Precio', 'Categoría', 'Stock'].map((h, i) => (
                <th key={i} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((p, i) => {
              const st = stockStatus(p.stock);
              return (
                <tr key={p.id} style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}>
                  <td style={{ padding: '12px 16px' }}>
                    <ImgPlaceholder w={40} h={40} color={p.color} radius={8} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{p.name}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B6B6B', fontFamily: 'monospace' }}>{p.sku}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#AAAAAA', fontFamily: 'monospace' }}>{p.barcode}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#111' }}>{fmt(p.price)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B6B6B' }}>{p.category}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge label={st.label} type={st.type} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
          <span style={{ fontSize: 13, color: '#AAAAAA' }}>
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} · Página {page} de {pages || 1}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 12px', border: '1px solid #E8E8E8', borderRadius: 6, background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 13 }}>
              ←
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)}
                style={{ padding: '6px 12px', border: '1px solid #E8E8E8', borderRadius: 6, background: n === page ? '#111' : '#fff', color: n === page ? '#fff' : '#111', cursor: 'pointer', fontSize: 13 }}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages || pages === 0}
              style={{ padding: '6px 12px', border: '1px solid #E8E8E8', borderRadius: 6, background: '#fff', cursor: page === pages ? 'not-allowed' : 'pointer', opacity: page === pages ? 0.4 : 1, fontSize: 13 }}>
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── HISTORIAL DE VENTAS ───────────────────────────────────────
function HistorialScreen({ onToast }) {
  const [from, setFrom] = React.useState('2026-06-01');
  const [to, setTo] = React.useState('2026-06-05');
  const [staffFilter, setStaffFilter] = React.useState('Todas');
  const [search, setSearch] = React.useState('');
  const [expanded, setExpanded] = React.useState(null);

  const filtered = SALES_HISTORY.filter(s => {
    const inRange = s.date >= from && s.date <= to;
    const matchStaff = staffFilter === 'Todas' || s.staff === staffFilter;
    const matchSearch = !search || s.id.toLowerCase().includes(search.toLowerCase()) || s.staff.toLowerCase().includes(search.toLowerCase());
    return inRange && matchStaff && matchSearch;
  });

  const payBadge = { tarjeta: 'tarjeta', efectivo: 'efectivo', bizum: 'bizum' };

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Historial de Ventas">
        <Btn variant="secondary" icon={<IcoDownload size={14} />} onClick={() => onToast('Exportando a CSV...', 'info')}>
          Exportar
        </Btn>
      </PageHeader>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B6B6B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '9px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#111', background: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B6B6B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '9px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#111', background: '#fff' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B6B6B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Dependienta</label>
          <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)}
            style={{ padding: '9px 14px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#111', background: '#fff', cursor: 'pointer' }}>
            <option>Todas</option>
            {STAFF.map(s => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B6B6B', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Buscar</label>
          <Input placeholder="Nº ticket, dependienta..." value={search} onChange={e => setSearch(e.target.value)} icon={<IcoSearch size={15} />} />
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Ventas', value: filtered.length },
          { label: 'Total', value: fmt(filtered.reduce((s, v) => s + v.total, 0)) },
          { label: 'Ticket medio', value: filtered.length ? fmt(filtered.reduce((s, v) => s + v.total, 0) / filtered.length) : '—' },
        ].map(m => (
          <div key={m.label} style={{ background: '#fff', border: '1px solid #E8E8E8', borderRadius: 10, padding: '10px 18px', display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{m.value}</span>
            <span style={{ fontSize: 12, color: '#AAAAAA' }}>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#AAAAAA', fontSize: 14 }}>No hay ventas para los filtros seleccionados</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E8E8E8' }}>
                {['Nº Ticket', 'Fecha', 'Hora', 'Dependienta', 'Artículos', 'Total', 'Pago', ''].map((h, i) => (
                  <th key={i} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <React.Fragment key={s.id}>
                  <tr style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none', background: i % 2 === 0 ? '#fff' : '#FAFAFA', cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'monospace' }}>{s.id}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B6B6B' }}>{s.date}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B6B6B' }}>{s.time}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#111' }}>{s.staff}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B6B6B' }}>{s.items.reduce((n, it) => n + it.qty, 0)} uds</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#111' }}>{fmt(s.total)}</td>
                    <td style={{ padding: '12px 16px' }}><Badge label={PAYMENT_METHODS[s.payment]} type={payBadge[s.payment]} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAAAAA', fontSize: 16, padding: 0 }}>
                        {expanded === s.id ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {expanded === s.id && (
                    <tr style={{ background: '#F9FAFB' }}>
                      <td colSpan={8} style={{ padding: '12px 20px 16px 48px', borderBottom: '1px solid #E8E8E8' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Detalle de productos</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {s.items.map((it, j) => (
                            <div key={j} style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 400, fontSize: 13 }}>
                              <span style={{ color: '#111' }}>{it.name} <span style={{ color: '#AAAAAA' }}>×{it.qty}</span></span>
                              <span style={{ fontWeight: 600, color: '#111' }}>{fmt(it.price * it.qty)}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <Btn size="sm" variant="secondary" icon={<IcoPrinter size={13} />}
                            onClick={() => alert('Reimprimir ticket ' + s.id)}>
                            Reimprimir ticket
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { InventoryScreen, HistorialScreen });
