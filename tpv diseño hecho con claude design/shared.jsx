// shared.jsx — Sidebar, core UI components

// ── Design tokens applied via CSS variables (set in tpv.html) ──

// ── Sidebar ──────────────────────────────────────────────────
function Sidebar({ current, onNav, onLogout, compact, currentUser }) {
  const nav = [
    { key: 'dashboard',     label: 'Dashboard',     Icon: IcoDashboard  },
    { key: 'pos',           label: 'Punto de Venta', Icon: IcoCart       },
    { key: 'inventario',    label: 'Inventario',     Icon: IcoPackage    },
    { key: 'historial',     label: 'Historial',      Icon: IcoClipboard  },
    { key: 'calendario',    label: 'Calendario',     Icon: IcoCalendar   },
    { key: 'reportes',      label: 'Reportes',       Icon: IcoBarChart   },
    { key: 'dependientas',  label: 'Dependientas',   Icon: IcoUsers      },
    { key: 'configuracion', label: 'Configuración',  Icon: IcoSettings   },
  ];

  return (
    <aside style={{
      width: compact ? 64 : 240,
      minWidth: compact ? 64 : 240,
      background: '#fff',
      borderRight: '1px solid #E8E8E8',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ padding: compact ? '24px 0' : '24px 20px', borderBottom: '1px solid #E8E8E8', textAlign: compact ? 'center' : 'left' }}>
        {compact
          ? <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 18, letterSpacing: 1 }}>M</span>
          : <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 16, letterSpacing: 2, color: '#111', textTransform: 'uppercase' }}>Mango</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500, fontSize: 13, letterSpacing: 3, color: '#6B6B6B', textTransform: 'uppercase' }}>Habana</div>
            </div>
        }
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {nav.map(({ key, label, Icon }) => {
          const active = current === key;
          return (
            <button key={key} onClick={() => onNav(key)}
              title={compact ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px',
                background: active ? 'var(--accent)' : 'transparent',
                color: active ? '#fff' : '#6B6B6B',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderRadius: 8, margin: '1px 8px', width: 'calc(100% - 16px)',
                fontSize: 14, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s ease',
                justifyContent: compact ? 'center' : 'flex-start',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F7F7F7'; e.currentTarget.style.color = '#111'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6B6B6B'; }}}
            >
              <Icon size={18} />
              {!compact && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer: user + logout */}
      <div style={{ borderTop: '1px solid #E8E8E8', padding: compact ? '12px 0' : '12px 16px' }}>
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>
              {currentUser?.initials || 'AG'}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.2 }}>{currentUser?.name || 'Ana García'}</div>
              <div style={{ fontSize: 11, color: '#AAAAAA' }}>{currentUser?.role || 'Dependienta'}</div>
            </div>
          </div>
        )}
        <button onClick={onLogout}
          title={compact ? 'Cerrar sesión' : undefined}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start',
            gap: 8, width: '100%', padding: '8px 10px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#AAAAAA', fontSize: 13, borderRadius: 6,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#AAAAAA'; e.currentTarget.style.background = 'transparent'; }}
        >
          <IcoLogOut size={16} />
          {!compact && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

// ── Button ────────────────────────────────────────────────────
function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, style = {}, icon, fullWidth }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontWeight: 600, borderRadius: 8,
    transition: 'all 0.15s ease', opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };
  const sizes = { sm: { fontSize: 13, padding: '6px 12px' }, md: { fontSize: 14, padding: '10px 16px' }, lg: { fontSize: 15, padding: '13px 20px' } };
  const variants = {
    primary:     { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' },
    secondary:   { background: '#fff', color: '#111', border: '1px solid #E8E8E8' },
    destructive: { background: '#FEF2F2', color: '#EF4444', border: '1px solid #FECACA' },
    ghost:       { background: 'transparent', color: '#6B6B6B', border: '1px solid transparent' },
  };

  const [hover, setHover] = React.useState(false);
  const hoverStyles = {
    primary:     { background: '#2a2a2a' },
    secondary:   { background: '#F7F7F7', borderColor: '#D0D0D0' },
    destructive: { background: '#FEE2E2' },
    ghost:       { background: '#F7F7F7', color: '#111' },
  };

  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...sizes[size], ...variants[variant], ...(hover && !disabled ? hoverStyles[variant] : {}), ...style }}>
      {icon && icon}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
function Input({ type = 'text', placeholder, value, onChange, icon, style = {}, autoFocus, id, name }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 12, color: '#AAAAAA', display: 'flex', pointerEvents: 'none' }}>
          {icon}
        </div>
      )}
      <input type={type} id={id} name={name} placeholder={placeholder} value={value} onChange={onChange}
        autoFocus={autoFocus}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          width: '100%', padding: icon ? '10px 12px 10px 38px' : '10px 12px',
          fontSize: 14, fontFamily: 'inherit', color: '#111',
          background: '#fff', border: `1.5px solid ${focus ? 'var(--accent)' : '#E8E8E8'}`,
          borderRadius: 8, outline: 'none', transition: 'border-color 0.15s ease',
          ...style,
        }}
      />
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────
function Badge({ label, type = 'neutral' }) {
  const colors = {
    activo:     { bg: '#F0FDF4', color: '#16A34A', dot: '#22C55E' },
    inactivo:   { bg: '#F9FAFB', color: '#6B7280', dot: '#9CA3AF' },
    bajo:       { bg: '#FFF7ED', color: '#C2410C', dot: '#F59E0B' },
    sinstock:   { bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
    neutral:    { bg: '#F3F4F6', color: '#374151', dot: '#9CA3AF' },
    tarjeta:    { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
    efectivo:   { bg: '#F0FDF4', color: '#166534', dot: '#22C55E' },
    bizum:      { bg: '#F5F3FF', color: '#6D28D9', dot: '#8B5CF6' },
  };
  const c = colors[type] || colors.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }}></span>
      {label}
    </span>
  );
}

// ── MetricCard ────────────────────────────────────────────────
function MetricCard({ title, value, sub, trend, icon, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--accent)' : '#fff',
      borderRadius: 12, padding: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      border: accent ? 'none' : '1px solid #E8E8E8',
      color: accent ? '#fff' : '#111',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: accent ? 'rgba(255,255,255,0.7)' : '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
        {icon && <span style={{ color: accent ? 'rgba(255,255,255,0.5)' : '#E8E8E8' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent ? 'rgba(255,255,255,0.6)' : '#AAAAAA', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 28, width, maxWidth: 'calc(100vw - 32px)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)', position: 'relative',
      }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111' }}>{title}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AAAAAA', padding: 4, borderRadius: 6 }}>
              <IcoX size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toasts }) {
  const icons = { success: <IcoCheck size={16} />, error: <IcoAlert size={16} />, info: <IcoAlert size={16} /> };
  const colors = { success: '#22C55E', error: '#EF4444', info: '#3B82F6' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#111', color: '#fff', padding: '12px 16px',
          borderRadius: 10, fontSize: 14, fontWeight: 500,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          borderLeft: `3px solid ${colors[t.type] || colors.info}`,
          minWidth: 260, maxWidth: 360,
          animation: 'slideInToast 0.2s ease',
        }}>
          <span style={{ color: colors[t.type], flexShrink: 0 }}>{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ width = '100%', height = 16, radius = 4, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #F0F0F0 25%, #E8E8E8 50%, #F0F0F0 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
      ...style,
    }} />
  );
}

// ── ImagePlaceholder ──────────────────────────────────────────
function ImgPlaceholder({ w = 48, h = 48, color = '#C4A882', label, radius = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: `${color}22`,
      border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{ width: w * 0.5, height: h * 0.5, borderRadius: radius * 0.5, background: `${color}88` }} />
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────
function PageHeader({ title, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', letterSpacing: -0.3 }}>{title}</h1>
      {children && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>}
    </div>
  );
}

function fmt(n) { return '€' + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

Object.assign(window, { Sidebar, Btn, Input, Badge, MetricCard, Modal, Toast, Skeleton, ImgPlaceholder, PageHeader, fmt });
