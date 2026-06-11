// app.jsx — Root app, routing, global state, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#111111",
  "sidebar": "full",
  "warmAccents": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState(() => localStorage.getItem('mh_screen') || 'dashboard');
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('mh_user')); } catch { return null; }
  });
  const [toasts, setToasts] = React.useState([]);

  // Apply accent color to CSS variable
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  // Persist screen
  React.useEffect(() => { localStorage.setItem('mh_screen', screen); }, [screen]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('mh_user', JSON.stringify(userData));
    setScreen('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mh_user');
    setScreen('dashboard');
  };

  const compact = t.sidebar === 'compact';

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toast toasts={toasts} />
      </>
    );
  }

  const screens = {
    dashboard:     <DashboardScreen onToast={addToast} />,
    pos:           <POSScreen onToast={addToast} />,
    inventario:    <InventoryScreen onToast={addToast} />,
    historial:     <HistorialScreen onToast={addToast} />,
    calendario:    <CalendarioScreen />,
    reportes:      <ReportesScreen />,
    dependientas:  <DependientasScreen onToast={addToast} />,
    configuracion: <ConfiguracionScreen onToast={addToast} />,
  };

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F7F7F7' }}>
        <Sidebar
          current={screen}
          onNav={setScreen}
          onLogout={handleLogout}
          compact={compact}
          currentUser={user}
        />
        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {screens[screen] || screens.dashboard}
        </main>
      </div>

      <TweaksPanel>
        <TweakSection label="Acento" />
        <TweakColor label="Color acento" value={t.accent}
          options={['#111111', '#C4A882', '#1a6b4a', '#2A6FDB']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Sidebar" />
        <TweakRadio label="Ancho" value={t.sidebar}
          options={['full', 'compact']}
          onChange={v => setTweak('sidebar', v)} />
      </TweaksPanel>

      <Toast toasts={toasts} />

      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          from { background-position: 200% 0; }
          to   { background-position: -200% 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E8E8E8; border-radius: 999px; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #AAAAAA; }
      `}</style>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
