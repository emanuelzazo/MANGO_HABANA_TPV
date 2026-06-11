import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, ShoppingBag, Users, AlertTriangle,
  ArrowUpRight, Clock, RefreshCw, Wifi, WifiOff,
  Sun, Sunset, Moon, CheckCircle2, UploadCloud,
} from 'lucide-react';
import { fetchAllProducts, normalizeProduct } from '../api/products';
import { getCachedProducts, cacheProducts } from '../utils/db';
import { useSalesStore } from '../store/salesStore';
import { useSalesList } from '../store/useSalesList';
import { useSyncStore } from '../store/syncStore';
import { useToastStore } from '../store/toastStore';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDateTime } from '../utils/format';

function GreetingIcon({ hora, ...props }) {
  const Icon = hora < 13 ? Sun : hora < 20 ? Sunset : Moon;
  return <Icon {...props} />;
}

// Aviso discreto de sincronización pendiente (ventas hechas sin internet).
function SyncNotice() {
  const pending = useSyncStore(s => s.pendingOrders);
  const syncing = useSyncStore(s => s.syncing);
  const syncPending = useSyncStore(s => s.syncPending);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  if (!pending.length) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      padding: '8px 14px', borderRadius: 10,
      background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E',
      fontSize: 12.5,
    }}>
      <UploadCloud size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {pending.length} {pending.length === 1 ? 'venta' : 'ventas'} sin sincronizar
        {!online && ' — se enviarán automáticamente al volver el internet'}
      </span>
      {online && (
        <button onClick={() => syncPending()} disabled={syncing}
          style={{ background: '#92400E', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: syncing ? 'default' : 'pointer', opacity: syncing ? 0.6 : 1, fontFamily: 'var(--font-sans)' }}>
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, loading, accent }) {
  return (
    <div
      className="rounded-2xl border p-6 flex flex-col gap-4"
      style={accent
        ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
        : { background: '#fff', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: accent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>{label}</p>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accent ? 'rgba(255,255,255,0.15)' : '#F3F4F6' }}>
          <Icon size={17} style={{ color: accent ? '#fff' : 'var(--text-secondary)' }} />
        </div>
      </div>
      {loading ? (
        <div className="h-9 w-28 skeleton rounded-lg" />
      ) : (
        <p className="text-3xl font-bold tracking-tight" style={{ color: accent ? '#fff' : 'var(--text-primary)', lineHeight: 1.1 }}>{value}</p>
      )}
      {sub && !loading && (
        <p className="text-xs" style={{ color: accent ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>{sub}</p>
      )}
    </div>
  );
}

export function Dashboard() {
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [wooConnected, setWooConnected] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Usar ventas raw + useMemo para evitar bucles infinitos de re-render
  const ventas = useSalesList();
  const salesLoaded = useSalesStore(s => s.loaded);
  const toast = useToastStore();

  const umbral = useMemo(() => {
    try { return parseInt(JSON.parse(localStorage.getItem('tpv_config') || '{}').umbral_stock ?? 5); }
    catch { return 5; }
  }, []);

  const ventasHoy = useMemo(() => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fin = new Date(); fin.setHours(23, 59, 59, 999);
    return ventas.filter(v => {
      const f = new Date(v.fecha);
      return f >= hoy && f <= fin;
    });
  }, [ventas]);

  const totalHoy = useMemo(() => ventasHoy.reduce((s, v) => s + v.total, 0), [ventasHoy]);

  const totalMes = useMemo(() => {
    const ahora = new Date();
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    return ventas.filter(v => {
      const f = new Date(v.fecha);
      return f >= inicio && f <= fin;
    }).reduce((s, v) => s + v.total, 0);
  }, [ventas]);

  const productosHoy = useMemo(() =>
    ventasHoy.reduce((s, v) => s + v.items.reduce((si, i) => si + i.cantidad, 0), 0),
  [ventasHoy]);

  const topDependienta = useMemo(() => {
    const map = {};
    ventasHoy.forEach(v => { map[v.dependienta] = (map[v.dependienta] || 0) + v.total; });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return entries[0] ? { nombre: entries[0][0], total: entries[0][1] } : null;
  }, [ventasHoy]);

  const topProducts = useMemo(() => {
    const map = {};
    ventasHoy.forEach(v => v.items?.forEach(i => {
      if (!map[i.nombre]) map[i.nombre] = { nombre: i.nombre, cantidad: 0, total: 0 };
      map[i.nombre].cantidad += i.cantidad;
      map[i.nombre].total += i.subtotal;
    }));
    return Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  }, [ventasHoy]);

  const loadWooData = useCallback(async (showToast = false) => {
    const lowFrom = (list) => list.filter(p => p.gestionar_stock && p.stock > 0 && p.stock <= umbral);
    // Cache-first: alertas al instante desde la caché.
    const cached = await getCachedProducts().catch(() => []);
    if (cached.length) { setLowStockProducts(lowFrom(cached)); setLoadingStock(false); }
    else setLoadingStock(true);
    try {
      const products = await fetchAllProducts({ per_page: 100 });
      const normalized = products.map(normalizeProduct);
      setLowStockProducts(lowFrom(normalized));
      if (normalized.length) cacheProducts(normalized).catch(() => {});
      setWooConnected(true);
      setLastRefresh(new Date());
      if (showToast) toast.success('Datos actualizados');
    } catch {
      setWooConnected(cached.length > 0 ? true : false);
    } finally {
      setLoadingStock(false);
    }
  }, [umbral, toast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadWooData(); }, [loadWooData]);

  const hora = new Date().getHours();
  const saludo = hora < 13 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="p-8">
      <SyncNotice />
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
            <GreetingIcon hora={hora} size={20} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {saludo}, Mango Habana
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {wooConnected !== null && (
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
              wooConnected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}>
              {wooConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {wooConnected ? 'Conectado' : 'Sin conexión'}
            </div>
          )}
          <Button variant="secondary" size="sm" icon={RefreshCw} loading={loadingStock} onClick={() => loadWooData(true)}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          accent
          icon={TrendingUp}
          label="Ventas hoy"
          value={formatCurrency(totalHoy)}
          sub={`${ventasHoy.length} ticket${ventasHoy.length !== 1 ? 's' : ''}`}
          loading={!salesLoaded}
        />
        <StatCard
          icon={ArrowUpRight}
          label="Ventas del mes"
          value={formatCurrency(totalMes)}
          loading={!salesLoaded}
        />
        <StatCard
          icon={ShoppingBag}
          label="Productos vendidos hoy"
          value={productosHoy}
          sub="unidades"
          loading={!salesLoaded}
        />
        <StatCard
          icon={Users}
          label="Top dependienta"
          value={topDependienta?.nombre || '—'}
          sub={topDependienta ? formatCurrency(topDependienta.total) : 'Sin ventas aún'}
          loading={!salesLoaded}
        />
      </div>

      {/* Contenido principal */}
      <div className="grid grid-cols-2 gap-5">
        {/* Top productos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Top productos hoy</p>
          {!salesLoaded ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <ShoppingBag size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Sin ventas registradas hoy</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {topProducts.map((p, i) => (
                <div key={p.nombre} className="flex items-center gap-3">
                  <span className="text-xs text-gray-300 w-4 font-mono font-semibold select-none">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-800 rounded-full transition-all"
                          style={{ width: `${(p.cantidad / topProducts[0].cantidad) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{p.cantidad} uds.</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas ventas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Últimas ventas</p>
          </div>
          {!salesLoaded ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : ventasHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Clock size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Sin ventas hoy</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {[...ventasHoy].reverse().slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.numero}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.dependienta} · {formatDateTime(v.fecha)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(v.total)}</p>
                    <Badge variant={v.metodo_pago === 'transferencia' ? 'info' : 'default'} className="mt-0.5">
                      {v.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock bajo — ocupa todo el ancho */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <p className="text-sm font-semibold text-gray-900">Alertas de stock</p>
              {lowStockProducts.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  {lowStockProducts.length}
                </span>
              )}
            </div>
            {lastRefresh && (
              <p className="text-xs text-gray-400">
                Act. {lastRefresh.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {loadingStock ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : wooConnected === false ? (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <WifiOff size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">WooCommerce no configurado</p>
                <p className="text-xs text-gray-400 mt-0.5">Ve a Configuración para conectar tu tienda y ver el stock en tiempo real</p>
              </div>
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 py-2">
              <CheckCircle2 size={16} />
              <p className="text-sm">Todo el stock está en niveles correctos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{p.nombre}</p>
                    <p className="text-xs text-amber-600 font-semibold mt-0.5">{p.stock} restantes</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
