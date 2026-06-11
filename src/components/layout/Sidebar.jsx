import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, ClipboardList,
  CalendarDays, BarChart3, Download, Users, Settings,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { path: '/',          label: 'Dashboard',      Icon: LayoutDashboard },
  { path: '/pos',       label: 'Punto de Venta', Icon: ShoppingCart },
  { path: '/inventory', label: 'Inventario',      Icon: Package },
  { path: '/sales',     label: 'Historial',       Icon: ClipboardList },
  { path: '/calendar',  label: 'Calendario',      Icon: CalendarDays },
  { path: '/reports',   label: 'Reportes',        Icon: BarChart3 },
  { path: '/exports',   label: 'Exportar',        Icon: Download },
  { path: '/staff',     label: 'Dependientas',    Icon: Users },
  { path: '/settings',  label: 'Configuración',   Icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [compact, setCompact] = useState(false);
  const initials = 'MH';

  return (
    <aside className={`sidebar ${compact ? 'compact' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {compact ? (
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, letterSpacing: 1 }}>M</div>
        ) : (
          <>
            <div className="sidebar-logo-main">Mango</div>
            <div className="sidebar-logo-sub">Habana</div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ path, label, Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(path)}
              title={compact ? label : undefined}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {!compact && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Toggle compact */}
        <button
          onClick={() => setCompact(c => !c)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: compact ? 'center' : 'flex-end',
            width: '100%',
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            marginBottom: 8,
            borderRadius: 6,
          }}
          title={compact ? 'Expandir menú' : 'Contraer menú'}
        >
          {compact ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="user-avatar">{initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Mango Habana
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Administrador
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
