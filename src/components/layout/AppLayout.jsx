import { Sidebar } from './Sidebar';
import { GlobalScanner } from '../GlobalScanner';
import { WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AppLayout({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="main-content flex flex-col h-full">
        {!isOnline && (
          <div className="offline-banner">
            <WifiOff size={14} />
            <span>Sin conexión — las ventas se guardarán localmente y se sincronizarán al reconectar</span>
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </div>
      <GlobalScanner />
    </div>
  );
}
