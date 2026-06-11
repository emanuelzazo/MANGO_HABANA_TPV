/**
 * Toast.jsx — Sistema de notificaciones toast global.
 * Utiliza las clases .toast-container y .toast definidas en index.css.
 */
import { Check, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

const TYPE_CONFIG = {
  success: { Icon: Check,         color: '#22C55E' },
  error:   { Icon: AlertCircle,   color: '#EF4444' },
  info:    { Icon: Info,          color: '#3B82F6' },
  warning: { Icon: AlertTriangle, color: '#F59E0B' },
};

function ToastItem({ id, message, type }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const { Icon, color } = cfg;

  return (
    <div
      className="toast"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <Icon size={16} style={{ color, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#fff' }}>
        {message}
      </span>
      <button
        type="button"
        onClick={() => removeToast(id)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          padding: 0,
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        aria-label="Cerrar notificación"
      >
        <X size={13} />
      </button>
    </div>
  );
}

export function Toast({ toasts }) {
  const storeToasts = useToastStore((s) => s.toasts);
  const items = toasts ?? storeToasts;

  if (!items || items.length === 0) return null;

  return (
    <div className="toast-container">
      {items.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </div>
  );
}
