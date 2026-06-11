// screens-e.jsx — Staff Management + Settings

// ── DEPENDIENTAS ──────────────────────────────────────────────
function DependientasScreen({ onToast }) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [form, setForm] = React.useState({ name: '', role: 'Dependienta', email: '', phone: '', status: 'activo' });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', role: 'Dependienta', email: '', phone: '', status: 'activo' });
    setModalOpen(true);
  };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, role: s.role, email: s.email, phone: s.phone, status: s.status });
    setModalOpen(true);
  };
  const handleSave = () => {
    if (!form.name.trim()) return;
    setModalOpen(false);
    onToast(editing ? `${form.name} actualizada` : `${form.name} añadida`, 'success');
  };

  const avatarColors = ['#C4A882', '#8B9E6B', '#7B9EC4', '#C47B7B', '#9B8BC4'];

  return (
    <div style={{ padding: 32 }}>
      <PageHeader title="Dependientas">
        <Btn icon={<IcoPlus size={14} />} onClick={openNew}>Nueva dependienta</Btn>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {STAFF.map((s, i) => (
          <div key={s.id} style={{
            background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8',
            padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.15s, border-color 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#D0D0D0'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#E8E8E8'; }}
          >
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: avatarColors[i % avatarColors.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>{s.initials}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#6B6B6B' }}>{s.role}</div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Badge label={s.status === 'activo' ? 'Activo' : 'Inactivo'} type={s.status} />
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{s.sales}</div>
                <div style={{ fontSize: 11, color: '#AAAAAA' }}>ventas / mes</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{s.revenue > 0 ? fmt(s.revenue) : '—'}</div>
                <div style={{ fontSize: 11, color: '#AAAAAA' }}>facturado</div>
              </div>
            </div>

            {/* Contact */}
            <div style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.email}
            </div>

            <button onClick={() => openEdit(s)} style={{
              width: '100%', padding: '8px', border: '1px solid #E8E8E8', borderRadius: 8,
              background: '#F9FAFB', color: '#6B6B6B', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s', fontFamily: 'inherit',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#111'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#6B6B6B'; e.currentTarget.style.borderColor = '#E8E8E8'; }}
            >
              <IcoEdit size={13} /> Editar
            </button>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar dependienta' : 'Nueva dependienta'} width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 6 }}>Nombre completo</label>
            <Input placeholder="Nombre Apellido" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 6 }}>Rol</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#fff' }}>
              <option>Dependienta</option>
              <option>Dependienta Senior</option>
              <option>Supervisora</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 6 }}>Email</label>
            <Input type="email" placeholder="nombre@mangohabana.es" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 6 }}>Teléfono</label>
            <Input placeholder="6XX XXX XXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B6B6B', marginBottom: 8 }}>Estado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['activo', 'inactivo'].map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} style={{
                  flex: 1, padding: '9px', border: `2px solid ${form.status === s ? '#111' : '#E8E8E8'}`,
                  borderRadius: 8, background: form.status === s ? '#111' : '#fff',
                  color: form.status === s ? '#fff' : '#6B6B6B',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn variant="secondary" onClick={() => setModalOpen(false)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn onClick={handleSave} style={{ flex: 2 }} disabled={!form.name.trim()}>
              {editing ? 'Guardar cambios' : 'Añadir dependienta'}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── CONFIGURACIÓN ─────────────────────────────────────────────
function ConfiguracionScreen({ onToast }) {
  const [woo, setWoo] = React.useState({ url: 'https://mangohabana.es', key: 'ck_••••••••••••••••', secret: 'cs_••••••••••••••••', testing: false });
  const [printer, setPrinter] = React.useState({ ip: '192.168.1.100', port: '9100', copies: 1, model: 'Epson TM-T20III' });
  const [sys, setSys] = React.useState({ storeName: 'Mango Habana', currency: 'EUR', timezone: 'Europe/Madrid', language: 'es', taxRate: 21 });
  const [saved, setSaved] = React.useState({});

  const handleSave = (section) => {
    setSaved(s => ({ ...s, [section]: true }));
    onToast('Configuración guardada', 'success');
    setTimeout(() => setSaved(s => ({ ...s, [section]: false })), 2000);
  };
  const handleTestConn = () => {
    setWoo(w => ({ ...w, testing: true }));
    setTimeout(() => { setWoo(w => ({ ...w, testing: false })); onToast('Conexión con WooCommerce establecida', 'success'); }, 1500);
  };

  const Section = ({ title, desc, children, id }) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16 }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{title}</div>
        {desc && <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 2 }}>{desc}</div>}
      </div>
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>{children}</div>
        <Btn icon={saved[id] ? <IcoCheck size={14} /> : null} onClick={() => handleSave(id)}
          style={{ background: saved[id] ? '#22C55E' : 'var(--accent)', minWidth: 160 }}>
          {saved[id] ? 'Guardado' : 'Guardar cambios'}
        </Btn>
      </div>
    </div>
  );

  const Field = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center' }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{label}</label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <PageHeader title="Configuración" />

      {/* WooCommerce */}
      <Section id="woo" title="WooCommerce" desc="Conexión con tu tienda online para sincronizar inventario y ventas">
        <Field label="URL de la tienda" value={woo.url} onChange={v => setWoo(w => ({ ...w, url: v }))} placeholder="https://tutienda.es" />
        <Field label="Consumer Key" value={woo.key} onChange={v => setWoo(w => ({ ...w, key: v }))} placeholder="ck_..." />
        <Field label="Consumer Secret" value={woo.secret} onChange={v => setWoo(w => ({ ...w, secret: v }))} placeholder="cs_..." type="password" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
          <Btn variant="secondary" icon={<IcoRefresh size={13} style={{ animation: woo.testing ? 'spin 0.8s linear infinite' : 'none' }} />}
            onClick={handleTestConn} disabled={woo.testing}>
            {woo.testing ? 'Probando...' : 'Probar conexión'}
          </Btn>
          <span style={{ fontSize: 12, color: '#AAAAAA' }}>Verifica que las credenciales son correctas</span>
        </div>
      </Section>

      {/* Printer */}
      <Section id="printer" title="Impresora de tickets" desc="Configuración de la impresora térmica para tickets de venta">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Modelo</label>
          <select value={printer.model} onChange={e => setPrinter(p => ({ ...p, model: e.target.value }))}
            style={{ padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#fff' }}>
            <option>Epson TM-T20III</option>
            <option>Star TSP143</option>
            <option>Citizen CT-S310II</option>
          </select>
        </div>
        <Field label="IP de la impresora" value={printer.ip} onChange={v => setPrinter(p => ({ ...p, ip: v }))} placeholder="192.168.1.100" />
        <Field label="Puerto" value={printer.port} onChange={v => setPrinter(p => ({ ...p, port: v }))} placeholder="9100" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Copias por defecto</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setPrinter(p => ({ ...p, copies: Math.max(1, p.copies - 1) }))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E8E8E8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcoMinus size={14} />
            </button>
            <span style={{ fontSize: 16, fontWeight: 600, width: 24, textAlign: 'center' }}>{printer.copies}</span>
            <button onClick={() => setPrinter(p => ({ ...p, copies: Math.min(3, p.copies + 1) }))} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E8E8E8', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IcoPlus size={14} />
            </button>
          </div>
        </div>
      </Section>

      {/* System */}
      <Section id="system" title="Sistema" desc="Ajustes generales del punto de venta">
        <Field label="Nombre de la tienda" value={sys.storeName} onChange={v => setSys(s => ({ ...s, storeName: v }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Zona horaria</label>
          <select value={sys.timezone} onChange={e => setSys(s => ({ ...s, timezone: e.target.value }))}
            style={{ padding: '10px 12px', border: '1.5px solid #E8E8E8', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', color: '#111', background: '#fff' }}>
            <option value="Europe/Madrid">Europe/Madrid (CET)</option>
            <option value="Europe/London">Europe/London (GMT)</option>
            <option value="America/Havana">America/Havana (CST)</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, alignItems: 'center' }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>IVA por defecto</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Input type="number" value={sys.taxRate} onChange={e => setSys(s => ({ ...s, taxRate: e.target.value }))} style={{ width: 80 }} />
            <span style={{ fontSize: 14, color: '#6B6B6B' }}>%</span>
          </div>
        </div>
      </Section>
    </div>
  );
}

Object.assign(window, { DependientasScreen, ConfiguracionScreen });
