const { contextBridge, ipcRenderer } = require('electron');

// Override localStorage with file-based storage
// This runs before the React app loads
contextBridge.exposeInMainWorld('electronStorage', {
  getItem: (key) => ipcRenderer.invoke('storage-get', key),
  setItem: (key, value) => ipcRenderer.invoke('storage-set', key, value),
  removeItem: (key) => ipcRenderer.invoke('storage-remove', key),
  clear: () => ipcRenderer.invoke('storage-clear'),
  keys: () => ipcRenderer.invoke('storage-keys'),
});
