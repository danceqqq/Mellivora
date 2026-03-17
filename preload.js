const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onCursorPosition: (callback) => {
    ipcRenderer.on('cursor-screen-position', (_event, pos) => callback(pos));
  },
  openWiki: (url, bounds, appId, restoreScrollY) => ipcRenderer.invoke('open-wiki', { url, bounds, appId, restoreScrollY }),
  closeWiki: () => ipcRenderer.invoke('close-wiki'),
  getWikiState: () => ipcRenderer.invoke('get-wiki-state'),
  setWikiBounds: (bounds) => ipcRenderer.invoke('set-wiki-bounds', bounds),
  pickWallpaperFile: () => ipcRenderer.invoke('pick-wallpaper-file'),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  saveNotes: (notes) => ipcRenderer.invoke('save-notes', notes),
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  onCaptureScreen: (callback) => ipcRenderer.on('capture-screen', (_event, sourceId) => callback(sourceId)),
  sendScreenshotData: (dataUrl) => ipcRenderer.send('screenshot-png', dataUrl),
  automaticGetClicks: () => ipcRenderer.invoke('automatic-get-clicks'),
  automaticSaveClicks: (clicks) => ipcRenderer.invoke('automatic-save-clicks', clicks),
  automaticAddCoord: () => ipcRenderer.invoke('automatic-add-coord'),
  automaticGetStats: () => ipcRenderer.invoke('automatic-get-stats'),
  automaticStartOrange: (params) => ipcRenderer.invoke('automatic-start-orange', params),
  automaticStopOrange: () => ipcRenderer.invoke('automatic-stop-orange'),
  onAutomaticOrangeStatus: (callback) => ipcRenderer.on('automatic-orange-status', (_e, data) => callback(data)),
  onAutomaticOrangeStats: (callback) => ipcRenderer.on('automatic-orange-stats', (_e, stats) => callback(stats)),
  shazamGetHistory: () => ipcRenderer.invoke('shazam-get-history'),
  shazamSaveHistory: (history) => ipcRenderer.invoke('shazam-save-history', history),
  shazamCaptureAndRecognize: () => ipcRenderer.invoke('shazam-capture-and-recognize'),
});
