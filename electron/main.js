const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

Menu.setApplicationMenu(null);

let mainWindow;
let isQuitting = false;

const DATA_FILE = path.join(app.getPath('userData'), 'clinicpro-data.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { console.error('Load error:', e); }
  return {};
}

function saveData(data) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8'); } catch (e) { console.error('Save error:', e); }
}

ipcMain.handle('storage-get',    (_, key)        => { return loadData()[key] || null; });
ipcMain.handle('storage-set',    (_, key, value) => { const d = loadData(); d[key] = value; saveData(d); return true; });
ipcMain.handle('storage-remove', (_, key)        => { const d = loadData(); delete d[key]; saveData(d); return true; });
ipcMain.handle('storage-clear',  ()              => { saveData({}); return true; });
ipcMain.handle('storage-keys',   ()              => { return Object.keys(loadData()); });

ipcMain.handle('backup-data', async (_, jsonString) => {
  const today = new Date().toISOString().slice(0, 10);
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save ClinicPro Backup',
    defaultPath: path.join(app.getPath('documents'), `ClinicPro-Backup-${today}.json`),
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { success: false, reason: 'canceled' };
  try { fs.writeFileSync(filePath, jsonString, 'utf8'); return { success: true, filePath }; }
  catch (e) { return { success: false, reason: e.message }; }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    title: 'Manglam ClinicPro',
    icon: path.join(__dirname, '../public/icon-192.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      devTools: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // ── F12 to toggle DevTools ────────────────────────────────────────────────
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools({ mode: 'detach' });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', async (e) => {
    if (isQuitting) return;
    e.preventDefault();

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Backup Before Exit',
      message: 'Do you want to backup your data before closing?',
      detail: 'Recommended: Take a backup every day to keep your data safe.',
      buttons: ['Backup & Exit', 'Exit Without Backup', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
    });

    if (result.response === 2) return;

    if (result.response === 0) {
      try {
        const jsonString = await mainWindow.webContents.executeJavaScript(
          `JSON.stringify(Object.fromEntries(Object.entries(localStorage)))`
        );
        const today = new Date().toISOString().slice(0, 10);
        const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
          title: 'Save ClinicPro Backup',
          defaultPath: path.join(app.getPath('documents'), `ClinicPro-Backup-${today}.json`),
          filters: [{ name: 'JSON Backup', extensions: ['json'] }],
        });
        if (!canceled && filePath) fs.writeFileSync(filePath, jsonString, 'utf8');
      } catch (err) { console.error('Backup error:', err); }
    }

    isQuitting = true;
    app.quit();
  });

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