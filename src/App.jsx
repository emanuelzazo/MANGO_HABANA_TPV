import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSalesStore } from './store/salesStore';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { SalesHistory } from './pages/SalesHistory';
import { Calendar } from './pages/Calendar';
import { Reports } from './pages/Reports';
import { Exports } from './pages/Exports';
import { Staff } from './pages/Staff';
import { Settings } from './pages/Settings';
import { Toast } from './components/ui/Toast';
import { useToastStore } from './store/toastStore';
import { ensureTodayRate } from './utils/currency-converter';
import './index.css';

export default function App() {
  const initSales = useSalesStore(s => s.init);
  const ensureActiveUser = useAuthStore(s => s.ensureActiveUser);
  const toasts = useToastStore(s => s.toasts);

  // Sin login: se entra directo. Aseguramos usuario activo, cargamos datos y
  // registramos la tasa del día para el histórico de Tasas.
  useEffect(() => {
    ensureActiveUser();
    initSales();
    ensureTodayRate();
  }, [ensureActiveUser, initSales]);

  // En Electron (file://) el HashRouter sobrevive a recargas; en web, BrowserRouter (URLs limpias).
  const Router = (typeof window !== 'undefined' && window.electronAPI?.isElectron) ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<SalesHistory />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/exports" element={<Exports />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
      <Toast toasts={toasts} />
    </Router>
  );
}
