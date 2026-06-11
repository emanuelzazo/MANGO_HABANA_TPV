/**
 * main.cjs — Proceso principal de Electron (app de escritorio Windows/Mac).
 *
 * Carga la SPA (dist en producción, dev server si VITE_DEV_SERVER_URL) y expone
 * por IPC: lista de impresoras del sistema e impresión nativa silenciosa.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: 'TPV Mango Habana',
    backgroundColor: '#F7F7F7',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: impresoras del sistema ──
ipcMain.handle('get-printers', async () => {
  try {
    if (mainWindow) return await mainWindow.webContents.getPrintersAsync();
  } catch { /* sin impresoras */ }
  return [];
});

// ── IPC: impresión nativa silenciosa (HTML → impresora, N copias) ──
ipcMain.handle('print-html', async (_e, { html, deviceName = '', copies = 1, silent = true }) => {
  return new Promise((resolve) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    printWin.webContents.once('did-finish-load', () => {
      printWin.webContents.print(
        { silent, deviceName, copies, printBackground: true, margins: { marginType: 'none' } },
        () => { try { printWin.close(); } catch { /* */ } resolve(true); }
      );
    });
    printWin.webContents.on('did-fail-load', () => { try { printWin.close(); } catch { /* */ } resolve(false); });
  });
});

// ── IPC: tasas de El Toque (desde el proceso principal → sin CORS) ──
ipcMain.handle('eltoque-fetch', async (_e, token) => {
  return new Promise((resolve) => {
    const req = https.request(
      'https://tasas.eltoque.com/v1/trmi',
      { method: 'GET', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      (res) => {
        let body = '';
        res.on('data', (d) => { body += d; });
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
      }
    );
    req.on('error', () => resolve(null));
    req.end();
  });
});
