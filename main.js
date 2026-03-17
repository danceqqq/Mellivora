const { app, BrowserWindow, BrowserView, globalShortcut, ipcMain, shell, session, screen, dialog } = require('electron');
const screenshot = require('screenshot-desktop');
const path = require('path');
const fs = require('fs');

const appDir = app.isPackaged ? path.dirname(process.execPath) : app.getAppPath();

let overlayWindow = null;
let cursorPositionInterval = null;
let wikiView = null;
let capsuleWindow = null;
let githubRestrictionActive = false;

const GITHUB_REPO_ALLOWED = 'https://github.com/danceqqq/Mellivora';
function isAllowedGitHubUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (u.origin !== 'https://github.com') return false;
    return u.pathname === '/danceqqq/Mellivora' || u.pathname.startsWith('/danceqqq/Mellivora/');
  } catch (_) { return false; }
}

function setupGithubRestriction(view, enable) {
  if (!view || !view.webContents) return;
  githubRestrictionActive = enable;
  view.webContents.removeAllListeners('will-navigate');
  view.webContents.removeAllListeners('did-start-loading');
  if (enable) {
    view.webContents.on('will-navigate', (e, url) => {
      if (!githubRestrictionActive) return;
      if (!isAllowedGitHubUrl(url)) e.preventDefault();
    });
    view.webContents.on('did-start-loading', (e, url) => {
      if (!githubRestrictionActive || !url) return;
      if (!isAllowedGitHubUrl(url)) view.webContents.stop();
    });
  }
}

ipcMain.handle('pick-wallpaper-file', async () => {
  const result = await dialog.showOpenDialog(overlayWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) return null;
  const srcPath = result.filePaths[0];
  const wpDir = path.join(appDir, 'Wallpapers');
  if (!fs.existsSync(wpDir)) fs.mkdirSync(wpDir, { recursive: true });
  const ext = path.extname(srcPath);
  const base = path.basename(srcPath, ext);
  const uniqueName = base + '-' + Date.now() + ext;
  const destPath = path.join(wpDir, uniqueName);
  fs.copyFileSync(srcPath, destPath);
  const { pathToFileURL } = require('url');
  return pathToFileURL(destPath).href;
});

const notesPath = path.join(appDir, 'notes', 'notes.json');
function ensureNotesDir() {
  const dir = path.dirname(notesPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ipcMain.handle('get-notes', async () => {
  ensureNotesDir();
  try {
    if (fs.existsSync(notesPath)) {
      const raw = fs.readFileSync(notesPath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.notes) ? data.notes : [];
    }
  } catch (_) {}
  return [];
});

ipcMain.handle('save-notes', async (_, notes) => {
  ensureNotesDir();
  try {
    fs.writeFileSync(notesPath, JSON.stringify({ notes: notes || [] }, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
});

// GDI BitBlt вместо DXGI — корректно с HDR/10-bit мониторами (нет зелёного экрана)
ipcMain.handle('take-screenshot', async () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return null;
  overlayWindow.hide();
  await new Promise(r => setTimeout(r, 120));
  try {
    const ssDir = path.join(appDir, 'Screenshot');
    if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });
    const fp = path.join(ssDir, 'screenshot-' + Date.now() + '.png');
    await screenshot({ filename: fp, format: 'png' });
    return fp;
  } catch (e) {
    console.error('Screenshot error:', e);
    return null;
  } finally {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.show();
  }
});

// DDoS bypass: use full Chrome UA for wiki requests so protection sees a real browser
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

ipcMain.handle('open-external', (event, url) => {
  if (url && typeof url === 'string') shell.openExternal(url);
});

// --- Shazam: история и распознавание через AudD ---
const jsonDir = path.join(appDir, 'json');
const shazamHistoryPath = path.join(jsonDir, 'shazam_history.json');

function ensureJsonDirShazam() {
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
}

ipcMain.handle('shazam-get-history', async () => {
  ensureJsonDirShazam();
  try {
    if (fs.existsSync(shazamHistoryPath)) {
      const raw = fs.readFileSync(shazamHistoryPath, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : (data.history || []);

    }
  } catch (_) {}
  return [];
});

ipcMain.handle('shazam-save-history', async (_, history) => {
  ensureJsonDirShazam();
  try {
    const arr = Array.isArray(history) ? history : [];
    fs.writeFileSync(shazamHistoryPath, JSON.stringify(arr, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('shazam-capture-and-recognize', async () => {
  const pyDir = path.join(appDir, 'py');
  const script = path.join(pyDir, 'shazam_full_cli.py');
  const { spawnSync } = require('child_process');
  try {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const result = spawnSync(python, [script, '--duration', '8'], {
      cwd: pyDir,
      encoding: 'utf8',
      timeout: 30000,
    });
    if (result.error) throw result.error;
    const out = (result.stdout || '').trim();
    const errOut = (result.stderr || '').trim();
    if (result.status !== 0) {
      try {
        const parsed = JSON.parse(out || errOut);
        return { error: parsed.error || 'Ошибка распознавания' };
      } catch (_) {
        return { error: errOut || out || 'Ошибка записи/распознавания' };
      }
    }
    let json;
    try {
      json = JSON.parse(out);
    } catch (_) {
      return { error: 'Неверный ответ от Shazam' };
    }
    if (json.error) return { error: json.error };
    return { result: json.result || null };
  } catch (e) {
    console.error('shazam-capture-and-recognize:', e);
    return { error: String(e.message || e) };
  }
});

ipcMain.handle('shazam-recognize', async (_, { audioBase64 }) => {
  if (!audioBase64 || typeof audioBase64 !== 'string') return { error: 'No audio' };
  const pyDir = path.join(appDir, 'py');
  const script = path.join(pyDir, 'shazam_recognize_cli.py');
  const os = require('os');
  const tmpPath = path.join(os.tmpdir(), 'mellivora_shazam_' + Date.now() + '.webm');
  try {
    fs.writeFileSync(tmpPath, Buffer.from(audioBase64, 'base64'));
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const result = require('child_process').spawnSync(python, [script, '--input', tmpPath], {
      cwd: pyDir,
      encoding: 'utf8',
      timeout: 15000,
    });
    try { fs.unlinkSync(tmpPath); } catch (_) {}
    if (result.error) throw result.error;
    const out = (result.stdout || '').trim();
    try {
      const json = JSON.parse(out);
      if (json.error) return { error: json.error };
      return { result: json.result || null };
    } catch (_) {
      return { error: (result.stderr || out || 'Ошибка распознавания').trim() };
    }
  } catch (e) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('shazam-recognize:', e);
    return { error: String(e.message || e) };
  }
});

// --- Automatic: управление Python farmplugin (pyautogui) ---
const { spawn, spawnSync } = require('child_process');
const clicksPath = path.join(jsonDir, 'clicks.json');
const orangeStatsPath = path.join(jsonDir, 'orange_stats.json');
const pyDir = path.join(appDir, 'py');

let automaticOrangeProcess = null;

function ensureJsonDir() {
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
}

function getAutoOrangeRunner() {
  const exe = path.join(pyDir, 'auto_orange.exe');
  const script = path.join(pyDir, 'auto_orange_cli.py');
  if (fs.existsSync(exe)) return { cmd: exe, args: [] };
  const python = process.platform === 'win32' ? 'python' : 'python3';
  return { cmd: python, args: [script] };
}

function getAddCoordRunner() {
  const exe = path.join(pyDir, 'add_coord.exe');
  const script = path.join(pyDir, 'add_coord_cli.py');
  if (fs.existsSync(exe)) return { cmd: exe, args: [] };
  const python = process.platform === 'win32' ? 'python' : 'python3';
  return { cmd: python, args: [script] };
}

ipcMain.handle('automatic-get-clicks', async () => {
  ensureJsonDir();
  if (!fs.existsSync(clicksPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(clicksPath, 'utf8'));
    return Array.isArray(data) ? data : (data.clicks || data.coords || []);
  } catch (_) { return []; }
});

ipcMain.handle('automatic-save-clicks', async (_, clicks) => {
  ensureJsonDir();
  const arr = Array.isArray(clicks) ? clicks : [];
  fs.writeFileSync(clicksPath, JSON.stringify(arr.map((c) => ({ x: c.x, y: c.y })), null, 2), 'utf8');
  return true;
});

ipcMain.handle('automatic-add-coord', async () => {
  try {
    const runner = getAddCoordRunner();
    const args = [...runner.args, '--clicks', clicksPath];
    const result = spawnSync(runner.cmd, args, { cwd: pyDir, encoding: 'utf8', timeout: 10000 });
    if (result.error) throw result.error;
    const out = (result.stdout || '').trim();
    if (!out) return null;
    const parsed = JSON.parse(out);
    return { x: parsed.x, y: parsed.y };
  } catch (e) {
    console.error('automatic-add-coord:', e);
    return null;
  }
});

ipcMain.handle('automatic-get-stats', async () => {
  if (!fs.existsSync(orangeStatsPath)) return { total_matches: 0, total_clicks: 0, last_updated: null };
  try {
    return JSON.parse(fs.readFileSync(orangeStatsPath, 'utf8'));
  } catch (_) { return { total_matches: 0, total_clicks: 0, last_updated: null }; }
});

ipcMain.handle('automatic-stop-orange', async () => {
  ensureJsonDir();
  try { fs.writeFileSync(path.join(jsonDir, 'stop.flag'), ''); } catch (_) {}
  if (automaticOrangeProcess && !automaticOrangeProcess.killed) {
    try {
      automaticOrangeProcess.kill('SIGTERM');
    } catch (_) {}
    automaticOrangeProcess = null;
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('automatic-orange-status', { running: false });
  return true;
});

ipcMain.handle('automatic-start-orange', async (_, params) => {
  if (automaticOrangeProcess && !automaticOrangeProcess.killed) return false;
  ensureJsonDir();
  try { fs.unlinkSync(path.join(jsonDir, 'stop.flag')); } catch (_) {}
  let clicks = [];
  try {
    if (fs.existsSync(clicksPath)) clicks = JSON.parse(fs.readFileSync(clicksPath, 'utf8'));
  } catch (_) {}
  if (!Array.isArray(clicks) || clicks.filter((c) => c && typeof c.x === 'number' && typeof c.y === 'number').length === 0) {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('automatic-orange-status', { running: false, error: 'Нет координат' });
    return false;
  }
  const clickDelay = Math.max(0, parseFloat(String(params?.clickDelay || 0.5).replace(',', '.')) || 0.5);
  const moveDuration = Math.max(0, parseFloat(String(params?.moveDuration || 0.3).replace(',', '.')) || 0.3);
  const runner = getAutoOrangeRunner();
  const args = [...runner.args, '--clicks', clicksPath, '--stats', orangeStatsPath, '--delay', String(clickDelay), '--move', String(moveDuration)];
  try {
    automaticOrangeProcess = spawn(runner.cmd, args, { cwd: pyDir, stdio: ['ignore', 'pipe', 'pipe'] });
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('automatic-orange-status', { running: true });
    automaticOrangeProcess.on('exit', (code) => {
      automaticOrangeProcess = null;
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('automatic-orange-status', { running: false });
        overlayWindow.webContents.send('automatic-orange-stats', (() => {
          try { return JSON.parse(fs.readFileSync(orangeStatsPath, 'utf8')); } catch (_) { return {}; }
        })());
      }
    });
    automaticOrangeProcess.stderr?.on('data', (d) => { if (d && d.length) console.error('auto_orange:', d.toString()); });
    return true;
  } catch (e) {
    console.error('automatic-start-orange:', e);
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('automatic-orange-status', { running: false, error: String(e.message || e) });
    return false;
  }
});

let pendingRestoreScrollY = null;

function applyRestoreScroll(view) {
  if (view && view.webContents && typeof pendingRestoreScrollY === 'number') {
    const y = pendingRestoreScrollY;
    pendingRestoreScrollY = null;
    view.webContents.executeJavaScript('window.scrollTo(0, ' + y + ')').catch(() => {});
  }
}

ipcMain.handle('open-wiki', (event, { url, bounds, appId, restoreScrollY }) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (!url || !bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number' || typeof bounds.width !== 'number' || typeof bounds.height !== 'number') return;

  const b = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) };

  if (!wikiView) {
    wikiView = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        userAgent: CHROME_UA,
      },
    });
    wikiView.webContents.on('did-finish-load', () => applyRestoreScroll(wikiView));
  }

  overlayWindow.setBrowserView(wikiView);
  wikiView.setBounds(b);
  showCapsuleWindow(b);
  setupGithubRestriction(wikiView, appId === 'github');

  const currentUrl = wikiView.webContents.getURL();
  const needLoad = !currentUrl || currentUrl === 'about:blank' || currentUrl !== url;
  if (needLoad) {
    pendingRestoreScrollY = typeof restoreScrollY === 'number' ? restoreScrollY : null;
    wikiView.webContents.loadURL(url);
  } else {
    applyRestoreScroll(wikiView);
    if (typeof restoreScrollY === 'number') {
      wikiView.webContents.executeJavaScript('window.scrollTo(0, ' + restoreScrollY + ')').catch(() => {});
    }
  }
});

function showCapsuleWindow(bounds) {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const ob = overlayWindow.getBounds();
  const cw = 220;
  const ch = 50;
  const cx = ob.x + bounds.x + (bounds.width - cw) / 2;
  const cy = ob.y + bounds.y + bounds.height - ch - 8;
  if (!capsuleWindow || capsuleWindow.isDestroyed()) {
    capsuleWindow = new BrowserWindow({
      width: cw,
      height: ch,
      x: Math.round(cx),
      y: Math.round(cy),
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      parent: overlayWindow,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'capsule-preload.js'),
      },
    });
    capsuleWindow.setIgnoreMouseEvents(false);
    capsuleWindow.loadFile(path.join(__dirname, 'capsule.html'));
    capsuleWindow.on('closed', () => { capsuleWindow = null; });
  } else {
    capsuleWindow.setBounds({ x: Math.round(cx), y: Math.round(cy), width: cw, height: ch });
  }
  capsuleWindow.show();
}

function hideCapsuleWindow() {
  if (capsuleWindow && !capsuleWindow.isDestroyed()) {
    capsuleWindow.hide();
  }
}

function positionCapsuleWindow(bounds) {
  if (capsuleWindow && !capsuleWindow.isDestroyed() && overlayWindow && !overlayWindow.isDestroyed()) {
    const ob = overlayWindow.getBounds();
    const cw = 220;
    const ch = 50;
    const cx = ob.x + bounds.x + (bounds.width - cw) / 2;
    const cy = ob.y + bounds.y + bounds.height - ch - 8;
    capsuleWindow.setBounds({ x: Math.round(cx), y: Math.round(cy), width: cw, height: ch });
  }
}

ipcMain.on('capsule-go-home', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.executeJavaScript('goHome()').catch(() => {});
  }
  hideCapsuleWindow();
});

ipcMain.handle('close-wiki', () => {
  hideCapsuleWindow();
  if (wikiView && overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBrowserView(null);
  }
});

ipcMain.handle('get-wiki-state', async () => {
  if (!wikiView || !wikiView.webContents) return { url: '', scrollY: 0 };
  const url = wikiView.webContents.getURL();
  if (!url || url === 'about:blank') return { url: '', scrollY: 0 };
  try {
    const scrollY = await wikiView.webContents.executeJavaScript('window.scrollY');
    return { url, scrollY: typeof scrollY === 'number' ? scrollY : 0 };
  } catch (_) {
    return { url, scrollY: 0 };
  }
});

ipcMain.handle('set-wiki-bounds', (event, bounds) => {
  if (wikiView && bounds && typeof bounds.x === 'number' && typeof bounds.y === 'number' && typeof bounds.width === 'number' && typeof bounds.height === 'number') {
    const b = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) };
    wikiView.setBounds(b);
    positionCapsuleWindow(b);
  }
});

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  overlayWindow.loadFile(path.join(__dirname, 'index.html'));

  function startCursorPositionUpdates() {
    if (cursorPositionInterval) return;
    cursorPositionInterval = setInterval(() => {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;
      try {
        const point = screen.getCursorScreenPoint();
        const bounds = overlayWindow.getBounds();
        const x = point.x - bounds.x;
        const y = point.y - bounds.y;
        overlayWindow.webContents.send('cursor-screen-position', { x, y });
      } catch (_) {}
    }, 50);
  }

  function stopCursorPositionUpdates() {
    if (cursorPositionInterval) {
      clearInterval(cursorPositionInterval);
      cursorPositionInterval = null;
    }
  }

  overlayWindow.on('show', () => {
    startCursorPositionUpdates();
    if (capsuleWindow && wikiView) capsuleWindow.show();
  });
  overlayWindow.on('hide', () => {
    stopCursorPositionUpdates();
    if (capsuleWindow) capsuleWindow.hide();
  });
  overlayWindow.on('closed', () => {
    stopCursorPositionUpdates();
    hideCapsuleWindow();
    if (capsuleWindow) {
      capsuleWindow.destroy();
      capsuleWindow = null;
    }
    if (wikiView) {
      wikiView.destroy();
      wikiView = null;
    }
    overlayWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media' || permission === 'display-capture') callback(true);
    else callback(false);
  });
  createOverlayWindow();
  overlayWindow.hide();

  const ret = globalShortcut.register('Alt+W', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) {
        overlayWindow.hide();
      } else {
        overlayWindow.show();
      }
    }
  });

  if (!ret) {
    console.error('Global shortcut Alt+W registration failed');
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
