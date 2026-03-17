const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('capsule', {
  goHome: () => ipcRenderer.send('capsule-go-home'),
});
