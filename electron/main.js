const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ── Data file path — stored in user's AppData permanently ──
const DATA_FILE = path.join(app.getPath('userData'), 'clinicpro-data.json');

// Load all data from disk
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) { console.error('Load error:', e); }
  return {};
}

// Save all data to disk
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
  } catch (e) { console.error('Save error:', e); }
}

// IPC handlers for renderer to read/write data
ipcMain.handle('storage-get', (event, key) => {
  const data = loadData();
  return data[key] || null;
});

ipcMain.handle('storage-set', (event, key, value) => {
  const data = loadData();
  data[key] = value;
  saveData(data);
  return true;
});

ipcMain.handle('storage-remove', (event, key) => {
  const data = loadData();
  delete data[key];
  saveData(data);
  return true;
});

ipcMain.handle('storage-clear', () => {
  saveData({});
  return true;
});

ipcMain.handle('storage-keys', () => {
  return Object.keys(loadData());
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'ClinicPro — Manglam Clinic',
    icon: path.join(__dirname, '../public/icon-192.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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
