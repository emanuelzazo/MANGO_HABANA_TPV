import { useState, useEffect } from 'react';
import { RefreshCw, Check, Wifi, WifiOff, Save, Clock, TrendingUp, ArrowRightLeft, Radio, AlertTriangle, Printer, Plus, Download, Upload, Trash2 } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { syncRatesFromElToque, getCurrencyConfig, setExchangeRate, setEurRateManual as applyEurRate, setUsdMargin as applyUsdMargin, setEurMargin as applyEurMargin } from '../utils/currency-converter';
import { testElTouqueConnection } from '../api/elTouqueClient';
import { testWooConnection } from '../api/woocommerceClient';
import { listSystemPrinters, getSavedPrinters, savePrinters } from '../utils/printers';
import { getAllVentas, bulkSaveVentas, clearAllVentas } from '../utils/db';
import { useSalesStore } from '../store/salesStore';

// ── Sección de configuración ──────────────────────────────────────
function Section({ title, desc, children, onSave, saving }) {
  return (
    <div className="settings-section">
      <div className="settings-section-header">
        <div className="settings-section-title">{title}</div>
        {desc && <div className="settings-section-desc">{desc}</div>}
      </div>
      <div className="settings-section-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: onSave ? 20 : 0 }}>
          {children}
        </div>
        {onSave && (
          <button
            onClick={onSave}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 8,
              background: saving ? '#22C55E' : 'var(--accent)', color: '#fff',
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s',
            }}
          >
            {saving ? <Check size={14} /> : <Save size={14} />}
            {saving ? 'Guardado' : 'Guardar cambios'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function MHInput({ value, onChange, type = 'text', placeholder, disabled }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 12px', fontSize: 14,
        fontFamily: 'var(--font-sans)',
        border: '1.5px solid var(--border)', borderRadius: 8,
        outline: 'none', color: 'var(--text-primary)',
        background: disabled ? '#F7F7F7' : '#fff',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  );
}

function MHTextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', padding: '10px 12px', fontSize: 14,
        fontFamily: 'var(--font-sans)', lineHeight: 1.5, resize: 'vertical',
        border: '1.5px solid var(--border)', borderRadius: 8,
        outline: 'none', color: 'var(--text-primary)', background: '#fff',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
    />
  );
}

export function Settings() {
  const toast = useToastStore();
  const cloudMode = useSalesStore(s => s.cloudMode);
  const setCloudMode = useSalesStore(s => s.setCloudMode);

  // ── WooCommerce ──
  const [woo, setWoo] = useState({ url: '', key: '', secret: '' });
  const [wooSaved, setWooSaved] = useState(false);
  const [wooTesting, setWooTesting] = useState(false);
  const [wooStatus, setWooStatus] = useState(null); // 'ok' | 'error' | null

  // ── Sistema ──
  const [sys, setSys] = useState({ nombre_negocio: 'Mango Habana', pie_comprobante: 'Gracias por su compra', umbral_stock: 5, copias: 1, impresora: '', impresion_directa: false });
  const [sysSaved, setSysSaved] = useState(false);

  // ── Impresoras ──
  const [printers, setPrinters] = useState(() => getSavedPrinters());
  const [printersNative, setPrintersNative] = useState(false);

  useEffect(() => {
    // Detección automática (solo disponible en la app de escritorio).
    listSystemPrinters().then(list => {
      if (list && list.length) { setPrinters(list); setPrintersNative(true); }
    });
  }, []);

  const detectPrinters = async () => {
    const list = await listSystemPrinters();
    if (list && list.length) {
      setPrinters(list); setPrintersNative(true);
      toast.success(`${list.length} impresoras detectadas`);
    } else {
      toast.info('La detección automática requiere la app de escritorio. Añade la impresora por su nombre.');
    }
  };

  const addPrinter = () => {
    const name = window.prompt('Nombre exacto de la impresora (como aparece en el sistema):');
    if (name && name.trim()) {
      const next = [...new Set([...printers, name.trim()])];
      setPrinters(next);
      savePrinters(next);
      setSys(s => ({ ...s, impresora: name.trim() }));
    }
  };

  // ── Moneda / El Toque ──
  const [currencyRate, setCurrencyRate] = useState(600);
  const [eurRate, setEurRate] = useState(650);
  const [usdMargin, setUsdMargin] = useState(0);
  const [eurMargin, setEurMargin] = useState(0);
  const [rateInput, setRateInput] = useState('600');
  const [eurInput, setEurInput] = useState('650');
  const [syncingRate, setSyncingRate] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [toqueStatus, setToqueStatus] = useState(null);
  const [liveRate, setLiveRate] = useState(null);

  // Cargar config guardada al inicio
  useEffect(() => {
    // WooCommerce
    try {
      const wooConf = JSON.parse(localStorage.getItem('tpv_woo_config') || '{}');
      if (wooConf.url) setWoo(wooConf);
    } catch { /* noop */ }

    // Sistema
    try {
      const sysConf = JSON.parse(localStorage.getItem('tpv_config') || '{}');
      if (sysConf.nombre_negocio) setSys(sysConf);
    } catch { /* noop */ }

    // Moneda
    const currConf = getCurrencyConfig();
    setCurrencyRate(currConf.exchange_rate || 600);
    setEurRate(currConf.eur_rate || 650);
    setUsdMargin(currConf.usd_margin || 0);
    setEurMargin(currConf.eur_margin || 0);
    setRateInput(String(currConf.exchange_rate || 600));
    setEurInput(String(currConf.eur_rate || 650));
    if (currConf.last_sync) {
      setLastSync(new Date(currConf.last_sync));
    }
  }, []);

  const handleSetUsdMargin = (value) => {
    const config = applyUsdMargin(value);
    setUsdMargin(config.usd_margin);
    setCurrencyRate(config.exchange_rate);
    setRateInput(String(config.exchange_rate));
    toast.success(`Margen USD +${config.usd_margin} CUP aplicado`);
    setTimeout(() => window.location.reload(), 800);
  };

  const handleSetEurMargin = (value) => {
    const config = applyEurMargin(value);
    setEurMargin(config.eur_margin);
    setEurRate(config.eur_rate);
    setEurInput(String(config.eur_rate));
    toast.success(`Margen EUR +${config.eur_margin} CUP aplicado`);
    setTimeout(() => window.location.reload(), 800);
  };

  const handleSaveEurRate = () => {
    const rate = parseFloat(eurInput);
    if (!rate || rate < 1) { toast.error('Factor EUR inválido'); return; }
    applyEurRate(rate);
    setEurRate(rate);
    toast.success(`Factor actualizado: 1 EUR = ${rate} CUP`);
    setTimeout(() => window.location.reload(), 800);
  };

  // ── Handlers WooCommerce ──
  const handleSaveWoo = () => {
    localStorage.setItem('tpv_woo_config', JSON.stringify(woo));
    setWooSaved(true);
    toast.success('Configuración WooCommerce guardada');
    setTimeout(() => setWooSaved(false), 2500);
  };

  const handleTestWoo = async () => {
    setWooTesting(true);
    setWooStatus(null);
    try {
      const ok = await testWooConnection(woo);
      if (ok) {
        setWooStatus('ok');
        toast.success('Conexión con WooCommerce establecida');
      } else {
        setWooStatus('error');
        toast.error('No se pudo conectar con WooCommerce');
      }
    } catch {
      setWooStatus('error');
      toast.error('Error al probar la conexión');
    } finally {
      setWooTesting(false);
    }
  };

  // ── Handler sistema ──
  const handleSaveSys = () => {
    localStorage.setItem('tpv_config', JSON.stringify(sys));
    setSysSaved(true);
    toast.success('Configuración del sistema guardada');
    setTimeout(() => setSysSaved(false), 2500);
  };

  // ── Handlers moneda ──
  const handleSaveRate = () => {
    const rate = parseFloat(rateInput);
    if (!rate || rate < 1) { toast.error('Factor de cambio inválido'); return; }
    setExchangeRate(rate);
    setCurrencyRate(rate);
    setRateSaved(true);
    toast.success(`Factor actualizado: 1 USD = ${rate} CUP`);
    setTimeout(() => setRateSaved(false), 2500);
    // Recargar toda la app para que se aplique en todos los componentes
    setTimeout(() => window.location.reload(), 800);
  };

  const handleSyncToque = async () => {
    setSyncingRate(true);
    setToqueStatus(null);
    try {
      // Primero hacer test para obtener el valor en vivo
      const testResult = await testElTouqueConnection();
      if (testResult.ok && testResult.usdRate) {
        setLiveRate(testResult.usdRate);
      }

      const result = await syncRatesFromElToque();
      if (result.success) {
        const newRate = result.config.exchange_rate;
        setCurrencyRate(newRate);
        setEurRate(result.config.eur_rate || 650);
        setRateInput(String(newRate));
        setLastSync(new Date());
        setToqueStatus('ok');
        toast.success(`Tasa actualizada desde El Toque: 1 USD = ${newRate} CUP · 1 EUR = ${result.config.eur_rate} CUP`);
        // Recargar para que se aplique globalmente
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setToqueStatus('error');
        toast.warning('El Toque no disponible. Se mantiene el factor actual.');
      }
    } catch (err) {
      setToqueStatus('error');
      toast.error(`Error al sincronizar: ${err.message}`);
    } finally {
      setSyncingRate(false);
    }
  };

  // ── Copia de seguridad (bidireccional) ──
  const buildBackup = async () => ({
    exportado: new Date().toISOString(),
    version: '3.0',
    woo: JSON.parse(localStorage.getItem('tpv_woo_config') || '{}'),
    sistema: JSON.parse(localStorage.getItem('tpv_config') || '{}'),
    moneda: getCurrencyConfig(),
    usuarios: JSON.parse(localStorage.getItem('tpv_users') || '[]'),
    impresoras: JSON.parse(localStorage.getItem('tpv_printers') || '[]'),
    ventas: await getAllVentas(),
  });

  const downloadJSON = (data, name) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackup = async () => {
    try {
      const data = await buildBackup();
      downloadJSON(data, 'mango-habana-backup');
      toast.success(`Copia completa exportada (${data.ventas.length} ventas)`);
    } catch (err) {
      toast.error(`Error al exportar: ${err.message}`);
    }
  };

  // Importar: restaura configuración, usuarios, impresoras y ventas desde un JSON.
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.woo) localStorage.setItem('tpv_woo_config', JSON.stringify(data.woo));
        if (data.sistema) localStorage.setItem('tpv_config', JSON.stringify(data.sistema));
        if (data.moneda) localStorage.setItem('tpv_currency_config', JSON.stringify(data.moneda));
        if (data.usuarios) localStorage.setItem('tpv_users', JSON.stringify(data.usuarios));
        if (data.impresoras) localStorage.setItem('tpv_printers', JSON.stringify(data.impresoras));
        if (Array.isArray(data.ventas)) await bulkSaveVentas(data.ventas);
        toast.success('Copia restaurada. Recargando…');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast.error(`Archivo inválido: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset total: descarga una copia completa y luego borra todas las ventas.
  const handleReset = async () => {
    if (!window.confirm('Se descargará una copia completa y luego se BORRARÁN TODAS las ventas. La configuración se mantiene.\n\n¿Continuar?')) return;
    try {
      const data = await buildBackup();
      downloadJSON(data, 'mango-habana-backup-antes-de-reset');
      await clearAllVentas();
      toast.success('Ventas reiniciadas. Recargando…');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(`Error al reiniciar: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.3 }}>Configuración</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Sistema TPV Mango Habana</p>
      </div>

      {/* ── MONEDA CUP/USD ── */}
      <Section
        title="Conversión de Moneda"
        desc="Tasas USD y EUR (CUP) desde El Toque + margen. Se usan en todo el sistema: precios, cobro, vales y reportes."
      >
        {/* Factor actual */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#166534', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Tasas de cambio efectivas
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#166534', letterSpacing: -0.5, marginTop: 4 }}>
                1 USD = {currencyRate.toFixed(0)} CUP
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#166534', letterSpacing: -0.3 }}>
                1 EUR = {eurRate.toFixed(0)} CUP
              </div>
              {(usdMargin > 0 || eurMargin > 0) && (
                <div style={{ fontSize: 11, color: '#16A34A', marginTop: 2 }}>
                  Margen: USD +{usdMargin} CUP · EUR +{eurMargin} CUP sobre El Toque
                </div>
              )}
              {lastSync && (
                <div style={{ fontSize: 11, color: '#16A34A', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} />
                  Actualizado: {lastSync.toLocaleString('es-ES')}
                </div>
              )}
            </div>
            <ArrowRightLeft size={40} style={{ opacity: 0.2, color: 'var(--text-primary)' }} />
          </div>
        </div>

        {/* Sync con El Toque */}
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={16} />
                Sincronizar con El Toque
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Obtiene la tasa de cambio USD/CUP en tiempo real del mercado informal
              </div>
            </div>
            <button
              onClick={handleSyncToque}
              disabled={syncingRate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 8,
                background: '#F0FDF4', color: '#166534',
                border: '1px solid #BBF7D0', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                opacity: syncingRate ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: syncingRate ? 'spin 0.8s linear infinite' : 'none' }} />
              {syncingRate ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          </div>

          {liveRate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F7FEE7', border: '1px solid #D9F99D', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#365314', marginBottom: 8 }}>
              <Radio size={14} style={{ flexShrink: 0 }} />
              El Toque informa: <strong>1 USD = {liveRate} CUP</strong> (datos en tiempo real)
            </div>
          )}

          {toqueStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--danger)', background: '#FEF2F2', padding: '8px 12px', borderRadius: 6 }}>
              <WifiOff size={13} /> No se pudo conectar con El Toque. Se mantiene el factor guardado.
            </div>
          )}
        </div>

        {/* Factor manual */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Cambiar factor manualmente (CUP por 1 USD)
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
              <span style={{ padding: '0 12px', fontSize: 14, color: 'var(--text-muted)', background: '#F7F7F7', height: 40, display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
                1 USD =
              </span>
              <input
                type="number"
                min="1"
                max="10000"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                style={{
                  flex: 1, padding: '10px 12px', fontSize: 16, fontWeight: 700,
                  border: 'none', outline: 'none', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <span style={{ padding: '0 12px', fontSize: 14, color: 'var(--text-muted)', background: '#F7F7F7', height: 40, display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
                CUP
              </span>
            </div>
            <button
              onClick={handleSaveRate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', borderRadius: 8,
                background: rateSaved ? '#22C55E' : 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                flexShrink: 0, transition: 'background 0.2s',
              }}
            >
              {rateSaved ? <Check size={14} /> : <Save size={14} />}
              {rateSaved ? 'Guardado' : 'Aplicar'}
            </button>
          </div>
          <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            <AlertTriangle size={12} style={{ flexShrink: 0 }} />
            Cambiar el factor recarga la aplicación para aplicarlo en toda la interfaz.
          </p>
        </div>

        {/* Factor manual EUR (independiente del USD) */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Cambiar factor manualmente (CUP por 1 EUR)
          </label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--border)', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
              <span style={{ padding: '0 12px', fontSize: 14, color: 'var(--text-muted)', background: '#F7F7F7', height: 40, display: 'flex', alignItems: 'center', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
                1 EUR =
              </span>
              <input
                type="number" min="1" max="10000" value={eurInput}
                onChange={e => setEurInput(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', fontSize: 16, fontWeight: 700, border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}
              />
              <span style={{ padding: '0 12px', fontSize: 14, color: 'var(--text-muted)', background: '#F7F7F7', height: 40, display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
                CUP
              </span>
            </div>
            <button onClick={handleSaveEurRate}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', flexShrink: 0 }}>
              <Save size={14} /> Aplicar
            </button>
          </div>
        </div>

        {/* Margen USD sobre la tasa de El Toque */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Margen USD sobre El Toque (CUP)
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Se suma a la tasa cruda USD de El Toque. Se refleja en precios, cobro, vales y reportes.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {[0, 10, 15, 20].map(m => (
              <button key={m} onClick={() => handleSetUsdMargin(m)}
                style={{
                  padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  border: `1.5px solid ${usdMargin === m ? 'var(--accent)' : 'var(--border)'}`,
                  background: usdMargin === m ? 'var(--accent)' : '#fff',
                  color: usdMargin === m ? '#fff' : 'var(--text-secondary)',
                }}
              >{m === 0 ? 'Sin margen' : `+${m}`}</button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Otro:</span>
              <input
                type="number" min="0" max="200" defaultValue={usdMargin}
                onKeyDown={e => { if (e.key === 'Enter') handleSetUsdMargin(e.target.value); }}
                onBlur={e => { if (parseFloat(e.target.value) !== usdMargin) handleSetUsdMargin(e.target.value); }}
                style={{ width: 70, padding: '8px 10px', fontSize: 14, fontWeight: 700, textAlign: 'right', border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>CUP</span>
            </div>
          </div>
        </div>

        {/* Margen EUR sobre la tasa de El Toque (independiente) */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            Margen EUR sobre El Toque (CUP)
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Margen propio para el euro (puede ser distinto al del dólar).
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {[0, 10, 15, 20].map(m => (
              <button key={m} onClick={() => handleSetEurMargin(m)}
                style={{
                  padding: '9px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  border: `1.5px solid ${eurMargin === m ? 'var(--accent)' : 'var(--border)'}`,
                  background: eurMargin === m ? 'var(--accent)' : '#fff',
                  color: eurMargin === m ? '#fff' : 'var(--text-secondary)',
                }}
              >{m === 0 ? 'Sin margen' : `+${m}`}</button>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Otro:</span>
              <input
                type="number" min="0" max="200" defaultValue={eurMargin}
                onKeyDown={e => { if (e.key === 'Enter') handleSetEurMargin(e.target.value); }}
                onBlur={e => { if (parseFloat(e.target.value) !== eurMargin) handleSetEurMargin(e.target.value); }}
                style={{ width: 70, padding: '8px 10px', fontSize: 14, fontWeight: 700, textAlign: 'right', border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>CUP</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ── WOOCOMMERCE ── */}
      <Section
        title="WooCommerce"
        desc="Conecta con tu tienda online para sincronizar productos, inventario y pedidos"
        onSave={handleSaveWoo}
        saving={wooSaved}
      >
        <Field label="URL de la tienda">
          <MHInput value={woo.url} onChange={v => setWoo(w => ({ ...w, url: v }))} placeholder="https://mangohabana.com" />
        </Field>
        <Field label="Consumer Key">
          <MHInput value={woo.key} onChange={v => setWoo(w => ({ ...w, key: v }))} placeholder="ck_..." />
        </Field>
        <Field label="Consumer Secret">
          <MHInput value={woo.secret} onChange={v => setWoo(w => ({ ...w, secret: v }))} type="password" placeholder="cs_..." />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <button
            onClick={handleTestWoo}
            disabled={wooTesting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 8,
              background: '#fff', color: 'var(--text-primary)',
              border: '1.5px solid var(--border)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
              opacity: wooTesting ? 0.7 : 1,
            }}
          >
            <RefreshCw size={13} style={{ animation: wooTesting ? 'spin 0.8s linear infinite' : 'none' }} />
            {wooTesting ? 'Probando...' : 'Probar conexión'}
          </button>
          {wooStatus === 'ok' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
              <Wifi size={13} /> Conectado
            </span>
          )}
          {wooStatus === 'error' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
              <WifiOff size={13} /> Sin conexión
            </span>
          )}
        </div>

        {/* Modo nube: historial/reportes compartidos entre equipos */}
        <Field label="Vista compartida (nube)">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={cloudMode} onChange={e => setCloudMode(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Mostrar en Historial, Reportes y Dashboard las ventas de <b>todos los equipos</b> (leídas de WooCommerce)
            </span>
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            Activado, los dos PCs ven lo mismo. Desactivado, cada equipo ve solo sus ventas locales. Si no hay conexión, se usan las locales.
          </p>
        </Field>
      </Section>

      {/* ── SISTEMA ── */}
      <Section
        title="Sistema"
        desc="Configuración general del punto de venta"
        onSave={handleSaveSys}
        saving={sysSaved}
      >
        <Field label="Nombre del negocio">
          <MHTextarea value={sys.nombre_negocio} onChange={v => setSys(s => ({ ...s, nombre_negocio: v }))} rows={2} placeholder={'Mango Habana\nDirección, teléfono…'} />
        </Field>
        <Field label="Pie del comprobante">
          <MHTextarea value={sys.pie_comprobante} onChange={v => setSys(s => ({ ...s, pie_comprobante: v }))} rows={3} placeholder={'Gracias por su compra\n¡Vuelva pronto!'} />
        </Field>
        <Field label="Umbral stock bajo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number" min="1" max="50"
              value={sys.umbral_stock}
              onChange={e => setSys(s => ({ ...s, umbral_stock: parseInt(e.target.value) || 5 }))}
              style={{ width: 80, padding: '10px 12px', fontSize: 14, border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none', fontFamily: 'var(--font-sans)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>unidades — alertar cuando el stock sea menor o igual a este valor</span>
          </div>
        </Field>
        <Field label="Copias de comprobante">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setSys(s => ({ ...s, copias: Math.max(1, s.copias - 1) }))}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              −
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, width: 24, textAlign: 'center' }}>{sys.copias}</span>
            <button onClick={() => setSys(s => ({ ...s, copias: Math.min(3, s.copias + 1) }))}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              +
            </button>
          </div>
        </Field>
        <Field label="Impresora">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={sys.impresora}
              onChange={e => setSys(s => ({ ...s, impresora: e.target.value }))}
              style={{ flex: 1, minWidth: 220, height: 42, padding: '0 12px', fontSize: 14, fontFamily: 'var(--font-sans)', border: '1.5px solid var(--border)', borderRadius: 8, outline: 'none', background: '#fff', color: 'var(--text-primary)' }}
            >
              <option value="">Impresora predeterminada del sistema</option>
              {printers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button type="button" onClick={detectPrinters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 42, padding: '0 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
              <Printer size={14} /> Detectar
            </button>
            <button type="button" onClick={addPrinter}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 42, padding: '0 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
              <Plus size={14} /> Añadir
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            {printersNative
              ? 'Impresoras conectadas al sistema detectadas automáticamente.'
              : 'El navegador no puede listar las impresoras del sistema por seguridad. Pulsa “Detectar” (funciona en la app de escritorio) o “Añadir” para registrar la impresora por su nombre. Al imprimir, el diálogo del sistema mostrará todas las impresoras conectadas.'}
          </p>
        </Field>
        <Field label="Impresión directa">
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={sys.impresion_directa}
              onChange={e => setSys(s => ({ ...s, impresion_directa: e.target.checked }))}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Imprimir las copias al instante, sin pedir confirmación
            </span>
          </label>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
            En la app de escritorio (Fase 3) imprime directo a la impresora seleccionada. En navegador,
            por seguridad, puede mostrarse el diálogo del sistema una vez; actívalo en el modo kiosco
            del navegador para impresión silenciosa.
          </p>
        </Field>
      </Section>

      {/* ── COPIA DE SEGURIDAD ── */}
      <div className="settings-section">
        <div className="settings-section-header">
          <div className="settings-section-title">Copia de Seguridad</div>
          <div className="settings-section-desc">Exporta o importa toda la info (config, usuarios, ventas) en JSON — para moverla a otra PC. El reset borra las ventas (descarga copia antes).</div>
        </div>
        <div className="settings-section-body">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={handleBackup}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#fff', color: 'var(--text-primary)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
              <Download size={15} /> Exportar todo
            </button>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#fff', color: 'var(--text-primary)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <Upload size={15} /> Importar
              <input type="file" accept="application/json,.json" onChange={handleImport} style={{ display: 'none' }} />
            </label>
            <button onClick={handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, background: '#fff', color: 'var(--danger)', border: '1.5px solid #FECACA', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', marginLeft: 'auto' }}>
              <Trash2 size={15} /> Reset (borrar ventas)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
