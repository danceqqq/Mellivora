let powerVar = 0;
var currentWikiAppId = null;

function applySavedWallpaper() {
  var el = document.getElementsByClassName('wallpaper')[0];
  if (!el) return;
  try {
    var raw = localStorage.getItem('mellivora-wallpaper');
    var data = raw ? JSON.parse(raw) : null;
    if (data && data.custom) {
      el.style.backgroundImage = "url('" + data.custom.replace(/'/g, "\\'") + "')";
    } else if (data && data.builtin) {
      el.style.backgroundImage = "url('" + data.builtin + "')";
    } else {
      el.style.backgroundImage = "url('https://assets.codepen.io/2722301/bg.jpg')";
    }
  } catch (e) {
    el.style.backgroundImage = "url('https://assets.codepen.io/2722301/bg.jpg')";
  }
}

function powerMe() {
  document.getElementById('inAppBar').style.bottom = '-8%';
  document.getElementById('inAppBar').style.pointerEvents = 'none';
  applySavedWallpaper();
  if (powerVar === 1) {
    document.getElementsByClassName('ipadScreen')[0].style.opacity = 1;
    document.getElementsByClassName('ipadScreen')[0].style.pointerEvents = 'all';
    powerVar = 0;
    document.getElementsByClassName('lockScreen')[0].style.transition =
      'top 800ms ease-in 0s, backdrop-filter 200ms ease-in 0s';
    document.getElementsByClassName('dockWrapper')[0].style.transition =
      'bottom 400ms ease-in-out 0s';
  } else {
    document.getElementsByClassName('ipadScreen')[0].style.opacity = 0;
    document.getElementsByClassName('ipadScreen')[0].style.pointerEvents = 'none';
    document.getElementsByClassName('ipadScreen')[0].classList.remove('unlocked');
    powerVar = 1;
    setTimeout(function () {
      document.getElementsByClassName('lockScreen')[0].style.transition = 'none';
      document.getElementsByClassName('dockWrapper')[0].style.transition = 'none';
      document.getElementsByClassName('lockScreen')[0].style.backdropFilter = 'blur(0)';
      document.getElementsByClassName('lockScreen')[0].style.top = '0';
      document.getElementsByClassName('dockWrapper')[0].style.bottom = '-20%';
    }, 300);
  }
  resetIcons();
}

function lockClick() {
  document.getElementsByClassName('lockScreen')[0].style.backdropFilter =
    'blur(2vh) brightness(1.2)';
  document.getElementsByClassName('lockScreen')[0].style.top = '-110%';
  document.getElementsByClassName('dockWrapper')[0].style.bottom = '3%';
  document.getElementsByClassName('ipadScreen')[0].classList.add('unlocked');
}

function checkTime() {
  const day = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday'
  ];
  const month = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const d = new Date();
  const minTime = d.getMinutes() < 10 ? '0' + d.getMinutes() : String(d.getMinutes());
  document.getElementsByClassName('lockTime')[0].innerHTML =
    d.getHours() + ':' + minTime + '<br/>' +
    day[d.getDay()] + ', ' + month[d.getMonth()] + ' ' + d.getDate();
  setTimeout(checkTime, 500);
}

function returnStrayWrapsToHome() {
  var container = document.getElementById('homeIcons');
  if (!container) return;
  var stray = Array.from(document.body.children).filter(function (el) {
    return el.classList && el.classList.contains('home-app-wrap');
  });
  stray.forEach(function (wrap) {
    wrap.classList.remove('dragging', 'wiggle');
    wrap.style.opacity = '';
    wrap.style.position = '';
    wrap.style.left = '';
    wrap.style.top = '';
    wrap.style.width = '';
    wrap.style.height = '';
    wrap.style.pointerEvents = '';
    container.appendChild(wrap);
  });
}

function goHome() {
  document.getElementById('inAppBar').style.bottom = '-8%';
  document.getElementById('inAppBar').style.pointerEvents = 'none';
  applySavedWallpaper();
  document.getElementsByClassName('dockWrapper')[0].style.bottom = '3%';
  var settingsView = document.getElementById('settingsView');
  if (settingsView && settingsView.classList.contains('open')) {
    settingsView.classList.remove('open');
  }
  var notesView = document.getElementById('notesView');
  if (notesView && notesView.classList.contains('open')) {
    notesView.classList.remove('open');
    hideNotesEditor();
  }
  var automaticView = document.getElementById('automaticView');
  if (automaticView && automaticView.classList.contains('open')) {
    automaticView.classList.remove('open');
  }
  var shazamView = document.getElementById('shazamView');
  if (shazamView && shazamView.classList.contains('open')) {
    shazamView.classList.remove('open');
  }
  const appView = document.getElementById('appView');
  var inAppBarEl = document.getElementById('inAppBar');
  if (appView) {
    appView.classList.remove('open', 'wiki-browser-view');
    if (inAppBarEl) inAppBarEl.classList.remove('over-wiki');
    const frame = document.getElementById('appFrame');
    if (frame) frame.src = 'about:blank';
    if (window.electron && window.electron.getWikiState && currentWikiAppId) {
      window.electron.getWikiState().then(function (state) {
        try {
          localStorage.setItem('mellivora-wiki-state-' + currentWikiAppId, JSON.stringify({ url: state.url || '', scrollY: state.scrollY || 0 }));
        } catch (e) {}
        if (window.electron.closeWiki) window.electron.closeWiki();
        currentWikiAppId = null;
      });
    } else {
      if (window.electron && window.electron.closeWiki) window.electron.closeWiki();
      currentWikiAppId = null;
    }
    returnStrayWrapsToHome();
  }
  resetIcons();
}

function showSettingsView() {
  var sv = document.getElementById('settingsView');
  if (!sv) return;
  sv.classList.add('open');
  renderSettingsWallpaperGrid();
  var tokenEl = document.getElementById('settingsAuddToken');
  if (tokenEl) {
    try { tokenEl.value = localStorage.getItem('mellivora-audd-token') || ''; } catch (_) {}
    tokenEl.oninput = tokenEl.onchange = function () {
      try { localStorage.setItem('mellivora-audd-token', tokenEl.value || ''); } catch (_) {}
    };
  }
}

function hideSettingsView() {
  var sv = document.getElementById('settingsView');
  if (sv) sv.classList.remove('open');
}

function showAutomaticView() {
  var av = document.getElementById('automaticView');
  if (!av) return;
  av.classList.add('open');
  setupAutomaticOrangeCard();
}

function hideAutomaticView() {
  var av = document.getElementById('automaticView');
  if (av) av.classList.remove('open');
}

function showShazamView() {
  var sv = document.getElementById('shazamView');
  if (!sv) return;
  sv.classList.add('open');
  setupShazamApp();
}

function hideShazamView() {
  var sv = document.getElementById('shazamView');
  if (sv) sv.classList.remove('open');
}

function toggleAutomaticCard(cardId) {
  var card = document.getElementById('automaticCardOrange');
  if (!card) return;
  var toggle = card.querySelector('.automatic-card-toggle');
  if (card.classList.contains('expanded')) {
    card.classList.remove('expanded');
    if (toggle) toggle.textContent = '\u25BC';
  } else {
    card.classList.add('expanded');
    if (toggle) toggle.textContent = '\u25B2';
  }
}

function setupAutomaticOrangeCard() {
  var startBtn = document.getElementById('automaticOrangeStart');
  var stopBtn = document.getElementById('automaticOrangeStop');
  var addBtn = document.getElementById('automaticAddCoord');
  var statusEl = document.getElementById('automaticOrangeStatus');
  var statsEl = document.getElementById('automaticOrangeStats');
  var card = document.getElementById('automaticCardOrange');
  if (!card) return;
  var toggle = card.querySelector('.automatic-card-toggle');
  if (toggle) toggle.textContent = card.classList.contains('expanded') ? '\u25B2' : '\u25BC';

  function refreshStats() {
    if (!window.electron || !window.electron.automaticGetStats) return;
    window.electron.automaticGetStats().then(function (s) {
      if (statsEl) statsEl.textContent = JSON.stringify(s, null, 2);
    });
  }
  refreshStats();

  if (window.electron && window.electron.onAutomaticOrangeStatus) {
    window.electron.onAutomaticOrangeStatus(function (d) {
      if (!statusEl) return;
      if (d.running) {
        statusEl.textContent = d.error || 'Работает...';
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = '';
      } else {
        statusEl.textContent = d.error || 'Остановлено';
        if (startBtn) startBtn.style.display = '';
        if (stopBtn) stopBtn.style.display = 'none';
      }
    });
  }
  if (window.electron && window.electron.onAutomaticOrangeStats) {
    window.electron.onAutomaticOrangeStats(refreshStats);
  }

  if (startBtn) {
    startBtn.onclick = function () {
      var delay = document.getElementById('automaticClickDelay');
      var move = document.getElementById('automaticMoveDuration');
      var params = {
        clickDelay: delay ? delay.value : 0.5,
        moveDuration: move ? move.value : 0.3
      };
      window.electron.automaticStartOrange(params);
    };
  }
  if (stopBtn) {
    stopBtn.onclick = function () { window.electron.automaticStopOrange(); };
  }
  if (addBtn) {
    addBtn.onclick = function () {
      window.electron.automaticAddCoord().then(function (r) {
        if (r && statusEl) {
          statusEl.textContent = 'Добавлено (' + r.x + ', ' + r.y + ')';
          setTimeout(refreshStats, 1500);
        }
      });
    };
  }
}

function setupShazamApp() {
  var logoBtn = document.getElementById('shazamLogoBtn');
  var mainEl = logoBtn ? logoBtn.closest('.shazam-main') : null;
  var hintEl = document.getElementById('shazamHint');
  var resultEl = document.getElementById('shazamResult');
  var resultCover = document.getElementById('shazamResultCover');
  var resultTitle = document.getElementById('shazamResultTitle');
  var resultArtist = document.getElementById('shazamResultArtist');
  var resultLinks = document.getElementById('shazamResultLinks');
  var btnAgain = document.getElementById('shazamBtnAgain');
  var historyList = document.getElementById('shazamHistoryList');

  function getApiToken() {
    try {
      return (localStorage.getItem('mellivora-audd-token') || '').trim();
    } catch (_) { return ''; }
  }

  function setApiToken(t) {
    try { localStorage.setItem('mellivora-audd-token', (t || '').trim()); } catch (_) {}
  }

  function renderHistory() {
    if (!historyList || !window.electron || !window.electron.shazamGetHistory) return;
    window.electron.shazamGetHistory().then(function (items) {
      historyList.innerHTML = '';
      (items || []).slice(0, 20).forEach(function (item) {
        var div = document.createElement('div');
        div.className = 'shazam-history-item';
        var img = item.coverUrl ? '<img src="' + escapeHtml(item.coverUrl) + '" alt="" onerror="this.style.display=\'none\'" />' : '<div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:6px;"></div>';
        div.innerHTML = img + '<div class="shazam-history-item-text"><div class="shazam-history-item-title">' + escapeHtml(item.title || '—') + '</div><div class="shazam-history-item-artist">' + escapeHtml(item.artist || '') + '</div></div>';
        div.onclick = function () {
          if (resultEl && resultCover && resultTitle && resultArtist && resultLinks) {
            resultCover.src = item.coverUrl || '';
            resultTitle.textContent = item.title || '—';
            resultArtist.textContent = item.artist || '';
            resultLinks.innerHTML = (item.links || []).map(function (l) {
              return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener">' + escapeHtml(l.label) + '</a>';
            }).join('');
            resultEl.style.display = 'block';
            if (mainEl) mainEl.classList.remove('listening');
            if (hintEl) hintEl.style.display = 'none';
          }
        };
        historyList.appendChild(div);
      });
    }).catch(function () {});
  }

  function buildPlatformLinks(result) {
    var links = [];
    var title = (result.title || '').trim();
    var artist = (result.artist || '').trim();
    var q = encodeURIComponent(artist + ' ' + title);

    if (result.spotify && result.spotify.external_urls && result.spotify.external_urls.spotify) {
      links.push({ label: 'Spotify', url: result.spotify.external_urls.spotify });
    }
    if (result.apple_music && result.apple_music.url) {
      links.push({ label: 'Apple Music', url: result.apple_music.url });
    }
    if (result.deezer && result.deezer.link) {
      links.push({ label: 'Deezer', url: result.deezer.link });
    }
    if (result.napster && result.napster.link) {
      links.push({ label: 'Napster', url: result.napster.link });
    }
    links.push({ label: 'SoundCloud', url: 'https://soundcloud.com/search?q=' + q });
    links.push({ label: 'YouTube', url: 'https://www.youtube.com/results?search_query=' + q });
    return links;
  }

  function getCoverUrl(result) {
    if (result.apple_music && result.apple_music.artwork && result.apple_music.artwork.url) {
      var u = result.apple_music.artwork.url;
      return u.replace('{w}', '300').replace('{h}', '300');
    }
    if (result.spotify && result.spotify.album && result.spotify.album.images && result.spotify.album.images[0]) {
      return result.spotify.album.images[0].url;
    }
    if (result.deezer && result.deezer.album && result.deezer.album.cover) {
      return result.deezer.album.cover;
    }
    return '';
  }

  function showResult(result) {
    var coverUrl = getCoverUrl(result);
    var links = buildPlatformLinks(result);
    if (resultCover) resultCover.src = coverUrl || '';
    if (resultTitle) resultTitle.textContent = (result.title || '').trim() || '—';
    if (resultArtist) resultArtist.textContent = (result.artist || '').trim() || '';
    if (resultLinks) {
      resultLinks.innerHTML = links.map(function (l) {
        return '<a href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">' + escapeHtml(l.label) + '</a>';
      }).join('');
    }
    if (resultEl) resultEl.style.display = 'block';
    if (mainEl) mainEl.classList.remove('listening');
    if (hintEl) hintEl.style.display = 'none';

    var entry = {
      id: Date.now(),
      title: (result.title || '').trim(),
      artist: (result.artist || '').trim(),
      coverUrl: coverUrl,
      links: links,
      timestamp: Date.now()
    };
    if (window.electron && window.electron.shazamGetHistory && window.electron.shazamSaveHistory) {
      window.electron.shazamGetHistory().then(function (items) {
        var arr = [entry].concat(items || []).slice(0, 50);
        window.electron.shazamSaveHistory(arr);
        renderHistory();
      });
    }
  }

  function stopListening() {
    if (mainEl) mainEl.classList.remove('listening');
    if (hintEl) {
      hintEl.textContent = 'Нажмите, чтобы найти музыку';
      hintEl.style.display = '';
    }
  }

  function startListening() {
    if (!window.electron || !window.electron.shazamCaptureAndRecognize) return;
    if (mainEl) mainEl.classList.add('listening');
    if (hintEl) {
      hintEl.textContent = 'Слушаю ПК… (~8 сек)';
      hintEl.style.display = '';
    }
    if (resultEl) resultEl.style.display = 'none';

    window.electron.shazamCaptureAndRecognize().then(function (r) {
      stopListening();
      if (r.error) {
        var errText = typeof r.error === 'string' ? r.error : (r.error && r.error.message) || (r.error && r.error.error) || (r.error ? String(r.error) : 'Не найдено');
        if (hintEl) hintEl.textContent = errText === 'NO_LOOPBACK' ? 'Установите PyAudioWPatch: pip install PyAudioWPatch' : errText;
        return;
      }
      if (r.result && (r.result.title || r.result.artist)) {
        showResult(r.result);
      } else {
        if (hintEl) hintEl.textContent = 'Музыка не распознана';
      }
    }).catch(function (err) {
      stopListening();
      if (hintEl) hintEl.textContent = 'Ошибка: ' + (err.message || err);
    });
  }

  renderHistory();

  if (logoBtn) logoBtn.onclick = startListening;

  if (btnAgain) {
    btnAgain.onclick = function () {
      if (resultEl) resultEl.style.display = 'none';
      if (hintEl) hintEl.style.display = '';
      startListening();
    };
  }
}

function showNotesView() {
  var nv = document.getElementById('notesView');
  if (!nv) return;
  nv.classList.add('open');
  var editor = document.getElementById('notesEditor');
  if (editor) editor.style.display = 'none';
  var list = document.getElementById('notesList');
  if (list) list.style.display = '';
  renderNotesList();
}

function hideNotesView() {
  var nv = document.getElementById('notesView');
  if (nv) nv.classList.remove('open');
}

var currentNoteId = null;
function renderNotesList() {
  var list = document.getElementById('notesList');
  if (!list || !window.electron || !window.electron.getNotes) return;
  window.electron.getNotes().then(function (notes) {
    list.innerHTML = '';
    (notes || []).forEach(function (n) {
      var card = document.createElement('div');
      card.className = 'notes-card';
      card.dataset.id = n.id;
      card.innerHTML = '<div class="notes-card-title">' + (n.title || '(Без названия)').replace(/</g, '&lt;') + '</div><div class="notes-card-preview">' + (n.content || '').substring(0, 80).replace(/</g, '&lt;').replace(/\n/g, ' ') + '</div>';
      card.onclick = function () { openNoteEditor(n.id); };
      list.appendChild(card);
    });
  }).catch(function () {});
}

function openNoteEditor(id) {
  currentNoteId = id;
  var list = document.getElementById('notesList');
  var editor = document.getElementById('notesEditor');
  var addBtn = document.getElementById('notesAddBtn');
  if (list) list.style.display = 'none';
  if (addBtn) addBtn.style.display = 'none';
  if (editor) editor.style.display = 'block';
  var titleEl = document.getElementById('notesEditorTitle');
  var contentEl = document.getElementById('notesEditorContent');
  if (!window.electron || !window.electron.getNotes) return;
  window.electron.getNotes().then(function (notes) {
    var note = (notes || []).find(function (n) { return String(n.id) === String(id); });
    if (titleEl) titleEl.value = note ? (note.title || '') : '';
    if (contentEl) contentEl.value = note ? (note.content || '') : '';
    bindNoteEditorSave();
  }).catch(function () {});
}

function bindNoteEditorSave() {
  var titleEl = document.getElementById('notesEditorTitle');
  var contentEl = document.getElementById('notesEditorContent');
  if (!titleEl || !contentEl || !window.electron || !window.electron.getNotes || !window.electron.saveNotes) return;
  function save() {
    window.electron.getNotes().then(function (notes) {
      var arr = notes || [];
      var idx = arr.findIndex(function (n) { return String(n.id) === String(currentNoteId); });
      var title = titleEl.value.trim();
      var content = contentEl.value;
      if (idx >= 0) {
        arr[idx].title = title;
        arr[idx].content = content;
      } else if (currentNoteId) {
        arr.push({ id: currentNoteId, title: title, content: content, createdAt: Date.now() });
      }
      window.electron.saveNotes(arr).catch(function () {});
    }).catch(function () {});
  }
  titleEl.oninput = save;
  contentEl.oninput = save;
}

function createNewNote() {
  currentNoteId = Date.now();
  openNoteEditor(currentNoteId);
}

function showNotesView() {
  var nv = document.getElementById('notesView');
  if (!nv) return;
  nv.classList.add('open');
  document.getElementById('notesList').parentElement.style.display = '';
  document.getElementById('notesEditor').style.display = 'none';
  loadNotesList();
}

function hideNotesView() {
  var nv = document.getElementById('notesView');
  if (nv) nv.classList.remove('open');
}

var notesCache = [];
function loadNotesList() {
  if (!window.electron || !window.electron.getNotes) return;
  window.electron.getNotes().then(function (arr) {
    notesCache = arr || [];
    renderNotesList();
  }).catch(function () { notesCache = []; renderNotesList(); });
}

function renderNotesList() {
  var list = document.getElementById('notesList');
  if (!list) return;
  list.innerHTML = '';
  notesCache.forEach(function (n) {
    var card = document.createElement('div');
    card.className = 'notes-card';
    card.dataset.id = n.id;
    var title = (n.title || '').trim() || 'Без названия';
    var preview = (n.content || '').substring(0, 60).replace(/\n/g, ' ');
    if (preview.length >= 60) preview += '...';
    card.innerHTML = '<div class="notes-card-title">' + escapeHtml(title) + '</div><div class="notes-card-preview">' + escapeHtml(preview) + '</div>';
    card.onclick = function () { openNoteEditor(n.id); };
    list.appendChild(card);
  });
}

function escapeHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

var currentNoteId = null;
function openNoteEditor(id) {
  var note = notesCache.find(function (n) { return n.id === id; });
  if (!note) return;
  currentNoteId = id;
  document.getElementById('notesList').parentElement.style.display = 'none';
  var editor = document.getElementById('notesEditor');
  editor.style.display = 'block';
  document.getElementById('notesEditorTitle').value = note.title || '';
  document.getElementById('notesEditorContent').value = note.content || '';
}

function saveCurrentNote() {
  if (currentNoteId === null) return;
  var title = document.getElementById('notesEditorTitle').value.trim();
  var content = document.getElementById('notesEditorContent').value;
  var idx = notesCache.findIndex(function (n) { return n.id === currentNoteId; });
  if (idx >= 0) {
    notesCache[idx].title = title;
    notesCache[idx].content = content;
    notesCache[idx].updatedAt = Date.now();
  }
  if (window.electron && window.electron.saveNotes) {
    window.electron.saveNotes(notesCache).catch(function () {});
  }
}

function handleDockIconClick(e, action) {
  if (action === 'screenshot') {
    if (window.electron && window.electron.takeScreenshot) {
      window.electron.takeScreenshot().then(function () {
        try {
          var a = new Audio('sound/shyot.mp3');
          a.play().catch(function () {});
        } catch (_) {}
      }).catch(function () {});
    }
    return;
  }
  window.barColor = 'white';
  iconFClick(e);
}

function selectWallpaper(idOrPath) {
  try {
    var data = idOrPath.indexOf('://') >= 0 || idOrPath.startsWith('file:') || idOrPath.indexOf('/') >= 0
      ? { custom: idOrPath }
      : { builtin: idOrPath };
    localStorage.setItem('mellivora-wallpaper', JSON.stringify(data));
    applySavedWallpaper();
    renderSettingsWallpaperGrid();
  } catch (e) {}
}

function renderSettingsWallpaperGrid() {
  var grid = document.getElementById('settingsWallpaperGrid');
  if (!grid) return;
  var builtins = [
    { id: 'https://assets.codepen.io/2722301/bg.jpg', label: 'Default' }
  ];
  var custom = [];
  try {
    var raw = localStorage.getItem('mellivora-wallpaper-custom');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {}
  var current = null;
  try {
    var wraw = localStorage.getItem('mellivora-wallpaper');
    if (wraw) {
      var w = JSON.parse(wraw);
      current = w.builtin || w.custom;
    }
  } catch (e) {}
  var addBtn = document.getElementById('settingsAddWallpaper');
  grid.innerHTML = '';
  builtins.forEach(function (b) {
    var div = document.createElement('div');
    div.className = 'settings-wallpaper-preview' + (current === b.id ? ' selected' : '');
    div.style.backgroundImage = "url('" + b.id + "')";
    div.dataset.id = b.id;
    div.onclick = function () { selectWallpaper(b.id); };
    grid.appendChild(div);
  });
  custom.forEach(function (c) {
    var div = document.createElement('div');
    div.className = 'settings-wallpaper-preview' + (current === c ? ' selected' : '');
    div.style.backgroundImage = "url('" + c.replace(/'/g, "\\'") + "')";
    div.dataset.path = c;
    div.onclick = function () { selectWallpaper(c); };
    grid.appendChild(div);
  });
  if (addBtn) grid.appendChild(addBtn);
}

function showNotesView() {
  var nv = document.getElementById('notesView');
  if (!nv) return;
  nv.classList.add('open');
  var listEl = document.getElementById('notesList');
  var editorEl = document.getElementById('notesEditor');
  var contentEl = document.querySelector('.notes-content');
  if (listEl) listEl.style.display = '';
  if (editorEl) editorEl.style.display = 'none';
  if (contentEl) contentEl.style.display = '';
  loadNotesList();
}

function hideNotesView() {
  var nv = document.getElementById('notesView');
  if (nv) nv.classList.remove('open');
}

var currentNoteId = null;
function hideNotesEditor() {
  currentNoteId = null;
  var editorEl = document.getElementById('notesEditor');
  var contentEl = document.querySelector('.notes-content');
  if (editorEl) editorEl.style.display = 'none';
  if (contentEl) contentEl.style.display = '';
}

function loadNotesList() {
  if (!window.electron || !window.electron.getNotes) return;
  window.electron.getNotes().then(function (notes) {
    var listEl = document.getElementById('notesList');
    if (!listEl) return;
    listEl.innerHTML = '';
    (notes || []).forEach(function (n) {
      var card = document.createElement('div');
      card.className = 'notes-card';
      card.innerHTML = '<div class="notes-card-title">' + (n.title || 'Без названия') + '</div><div class="notes-card-preview">' + ((n.content || '').slice(0, 80) + ((n.content || '').length > 80 ? '...' : '')) + '</div>';
      card.onclick = function () { openNoteEditor(n.id); };
      listEl.appendChild(card);
    });
  });
}

function openNoteEditor(id) {
  currentNoteId = id;
  var contentEl = document.querySelector('.notes-content');
  var editorEl = document.getElementById('notesEditor');
  var titleEl = document.getElementById('notesEditorTitle');
  var contentField = document.getElementById('notesEditorContent');
  if (contentEl) contentEl.style.display = 'none';
  if (editorEl) editorEl.style.display = '';
  if (!window.electron || !window.electron.getNotes) return;
  window.electron.getNotes().then(function (notes) {
    var note = (notes || []).find(function (n) { return String(n.id) === String(id); });
    if (titleEl) titleEl.value = note ? (note.title || '') : '';
    if (contentField) contentField.value = note ? (note.content || '') : '';
    setupNoteEditorSave();
  });
}

function setupNoteEditorSave() {
  var titleEl = document.getElementById('notesEditorTitle');
  var contentField = document.getElementById('notesEditorContent');
  if (!titleEl || !contentField) return;
  var save = function () {
    if (!window.electron || !window.electron.getNotes || !window.electron.saveNotes) return;
    window.electron.getNotes().then(function (notes) {
      notes = notes || [];
      var n = currentNoteId ? notes.find(function (x) { return String(x.id) === String(currentNoteId); }) : null;
      if (!n) {
        n = { id: currentNoteId || Date.now(), title: '', content: '', createdAt: new Date().toISOString() };
        notes.unshift(n);
        currentNoteId = n.id;
      }
      n.title = titleEl.value;
      n.content = contentField.value;
      window.electron.saveNotes(notes);
    });
  };
  titleEl.oninput = save;
  contentField.oninput = save;
}

function openHomeApp(url, appId) {
  if (!url && appId !== 'settings' && appId !== 'notes' && appId !== 'automatic' && appId !== 'shazam') return;
  returnStrayWrapsToHome();
  if (appId === 'settings' || url === 'settings://') {
    showSettingsView();
    var barEl = document.getElementById('inAppBar');
    barEl.style.setProperty('--colorMe', 'white');
    barEl.style.bottom = '0';
    barEl.style.pointerEvents = 'all';
    return;
  }
  if (appId === 'automatic' || url === 'automatic://') {
    showAutomaticView();
    var barEl = document.getElementById('inAppBar');
    barEl.style.setProperty('--colorMe', 'white');
    barEl.style.bottom = '0';
    barEl.style.pointerEvents = 'all';
    return;
  }
  if (appId === 'shazam' || url === 'shazam://') {
    showShazamView();
    var barEl = document.getElementById('inAppBar');
    barEl.style.setProperty('--colorMe', 'white');
    barEl.style.bottom = '0';
    barEl.style.pointerEvents = 'all';
    return;
  }
  if (appId === 'notes' || url === 'notes://') {
    showNotesView();
    var barEl = document.getElementById('inAppBar');
    barEl.style.setProperty('--colorMe', 'white');
    barEl.style.bottom = '0';
    barEl.style.pointerEvents = 'all';
    return;
  }
  if (appId === 'automatic' || url === 'automatic://') {
    showAutomaticView();
    var barEl = document.getElementById('inAppBar');
    barEl.style.setProperty('--colorMe', 'white');
    barEl.style.bottom = '0';
    barEl.style.pointerEvents = 'all';
    return;
  }
  const appView = document.getElementById('appView');
  const frame = document.getElementById('appFrame');
  if (!appView || !frame) return;
  appView.classList.add('open');
  var barEl = document.getElementById('inAppBar');
  barEl.style.setProperty('--colorMe', 'white');
  barEl.style.bottom = '0';
  barEl.style.pointerEvents = 'all';
  if (window.electron && window.electron.openWiki) {
    appView.classList.add('wiki-browser-view');
    currentWikiAppId = appId || '';
    var saved = null;
    try {
      var key = 'mellivora-wiki-state-' + (appId || '');
      var raw = localStorage.getItem(key);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}
    var urlToLoad = (saved && saved.url) ? saved.url : url;
    var restoreScrollY = (saved && typeof saved.scrollY === 'number') ? saved.scrollY : undefined;
    var r = appView.getBoundingClientRect();
    window.electron.openWiki(urlToLoad, { x: r.left, y: r.top, width: r.width, height: r.height }, appId || '', restoreScrollY);
  } else {
    frame.src = url;
  }
}

function resetIcons() {
  window.lastIcon = false;
  const x = document.getElementsByClassName('iconDiv');
  for (let i = 0; i < x.length; i++) {
    x[i].style.width = 'calc(var(--sizeVar) / 20)';
    x[i].style.height = 'calc(var(--sizeVar) / 20)';
    x[i].style.margin = 'calc(var(--sizeVar) / 60) calc(var(--sizeVar) / 120)';
    x[i].style.pointerEvents = 'all';
    x[i].getElementsByClassName('imgDiv')[0].style.opacity = 0;
    if (powerVar === 1) {
      x[i].style.transition =
        'all 0s ease-in-out 350ms, transform 100ms ease-in-out 0s';
      x[i].getElementsByClassName('imgDiv')[0].style.transition =
        'opacity 0s linear 350ms';
    } else {
      x[i].style.transition =
        'all 500ms ease-in-out 0s, transform 100ms ease-in-out 0s';
      x[i].getElementsByClassName('imgDiv')[0].style.transition =
        'opacity 300ms linear 0s';
    }
  }
}

function iconClick(e) {
  const icon = e.target.closest('.iconDiv');
  if (!icon) return;

  const x = document.getElementsByClassName('iconDiv');
  for (let i = 0; i < x.length; i++) {
    x[i].style.width = 0;
    x[i].style.height = 0;
    x[i].style.margin = 0;
    x[i].style.pointerEvents = 'none';
    x[i].getElementsByClassName('imgDiv')[0].style.opacity = 0;
  }

  if (window.lastIcon) {
    icon.style.width = 'calc(var(--sizeVar) * 1)';
  } else {
    icon.style.width = 'calc(var(--sizeVar) * .96)';
  }
  icon.style.height = 'calc(var(--sizeVar) * .74)';
  icon.style.marginLeft = 'calc(var(--sizeVar) / 35)';
  document.getElementsByClassName('dockWrapper')[0].style.bottom = 0;
  icon.getElementsByClassName('imgDiv')[0].style.opacity = 1;
  document.getElementById('inAppBar').style.setProperty('--colorMe', window.barColor);
  document.getElementById('inAppBar').style.bottom = '0';
  document.getElementById('inAppBar').style.pointerEvents = 'all';
  setTimeout(function () {
    document.getElementsByClassName('wallpaper')[0].style.backgroundImage = 'none';
  }, 500);
}

function iconFClick(e) {
  window.lastIcon = true;
  iconClick(e);
}

function handleDockIconClick(e, action) {
  if (action === 'screenshot') {
    e.stopPropagation();
    e.preventDefault();
    if (window.electron && window.electron.takeScreenshot) {
      window.electron.takeScreenshot().then(function () {
        try {
          var a = new Audio('sound/shyot.mp3');
          a.play().catch(function () {});
        } catch (err) {}
      }).catch(function () {});
    }
    return;
  }
  window.barColor = 'white';
  iconFClick(e);
}

(function homeAppsInit() {
  const LONG_PRESS_MS = 500;
  var pressTimer = null;
  var isDragging = false;
  var dragEl = null;
  var dragPlaceholder = null;
  var dragOffsetX = 0;
  var dragOffsetY = 0;
  var lastReorderIndex = -1;

  function getHomeWraps() {
    return Array.from(document.querySelectorAll('#homeIcons .home-app-wrap'));
  }

  function getItemsInGrid() {
    var c = document.getElementById('homeIcons');
    if (!c) return [];
    return Array.from(c.children).filter(function (n) {
      return n.classList.contains('home-app-wrap') || n.classList.contains('drag-placeholder');
    });
  }

  function clearWiggle() {
    getHomeWraps().forEach(function (el) {
      el.classList.remove('wiggle', 'dragging');
      el.style.opacity = '';
      el.style.position = '';
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
      el.style.pointerEvents = '';
    });
    if (dragPlaceholder && dragPlaceholder.parentNode) dragPlaceholder.parentNode.removeChild(dragPlaceholder);
    dragPlaceholder = null;
    isDragging = false;
    dragEl = null;
    lastReorderIndex = -1;
  }

  function onHomeAppClick(e) {
    if (isDragging) return;
    var wrap = e.target.closest('.home-app-wrap');
    if (!wrap || wrap.classList.contains('wiggle')) return;
    var icon = wrap.querySelector('.home-app');
    var url = (icon && icon.getAttribute('data-url')) || '';
    var appId = (icon && icon.getAttribute('data-app')) || '';
    openHomeApp(url, appId);
  }

  function startDrag(wrap) {
    isDragging = true;
    dragEl = wrap;
    var rect = wrap.getBoundingClientRect();
    dragOffsetX = rect.width / 2;
    dragOffsetY = rect.height / 2;
    getHomeWraps().forEach(function (w) { w.classList.add('wiggle'); });
    wrap.classList.add('dragging');
    dragPlaceholder = document.createElement('div');
    dragPlaceholder.className = 'drag-placeholder';
    dragPlaceholder.style.cssText = 'width:' + rect.width + 'px;height:' + rect.height + 'px;flex-shrink:0;';
    var container = document.getElementById('homeIcons');
    container.insertBefore(dragPlaceholder, wrap);
    wrap.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;z-index:10000;pointer-events:none;opacity:1;';
    document.body.appendChild(wrap);
  }

  function reorderToIndex(targetIndex) {
    if (targetIndex < 0 || !dragPlaceholder) return;
    var container = document.getElementById('homeIcons');
    if (!container) return;
    var gridItems = Array.from(container.children).filter(function (c) {
      return c === dragPlaceholder || (c.classList && c.classList.contains('home-app-wrap') && c !== dragEl);
    });
    if (targetIndex > gridItems.length) targetIndex = gridItems.length;
    if (targetIndex >= gridItems.length) {
      container.appendChild(dragPlaceholder);
    } else {
      var before = gridItems[targetIndex] === dragPlaceholder ? gridItems[targetIndex + 1] : gridItems[targetIndex];
      if (before && before !== dragPlaceholder) container.insertBefore(dragPlaceholder, before);
      else if (!before) container.appendChild(dragPlaceholder);
    }
  }

  function onMouseMove(e) {
    if (!dragEl) return;
    var x = e.clientX;
    var y = e.clientY;
    dragEl.style.left = (x - dragOffsetX) + 'px';
    dragEl.style.top = (y - dragOffsetY) + 'px';
    var container = document.getElementById('homeIcons');
    if (!container) return;
    var slots = Array.from(container.children);
    var targetIndex = -1;
    for (var i = 0; i < slots.length; i++) {
      var r = slots[i].getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex < 0 && slots.length > 0) {
      var lastR = slots[slots.length - 1].getBoundingClientRect();
      if (x > lastR.right || y > lastR.bottom) targetIndex = slots.length;
    }
    if (targetIndex >= 0 && targetIndex !== lastReorderIndex) {
      lastReorderIndex = targetIndex;
      reorderToIndex(targetIndex);
    }
  }

  function saveHomeOrder() {
    var container = document.getElementById('homeIcons');
    if (!container) return;
    var order = Array.from(container.children)
      .filter(function (n) { return n.classList && n.classList.contains('home-app-wrap'); })
      .map(function (w) {
        var icon = w.querySelector('.home-app');
        return (icon && icon.getAttribute('data-app')) || '';
      });
    try { localStorage.setItem('mellivora-home-order', JSON.stringify(order)); } catch (e) {}
  }

  function onMouseUp() {
    if (dragEl && dragPlaceholder) {
      var container = document.getElementById('homeIcons');
      if (container) container.insertBefore(dragEl, dragPlaceholder);
      clearWiggle();
      saveHomeOrder();
    } else if (dragEl) {
      clearWiggle();
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('homeIcons');
    if (!container) return;
    try {
      var saved = localStorage.getItem('mellivora-home-order');
      if (saved) {
        var order = JSON.parse(saved);
        var defaultApps = ['mellivora', 'fletcherwiki', 'majesticwiki', 'settings', 'github', 'notes', 'automatic'];
        defaultApps.forEach(function (app) {
          if (order.indexOf(app) < 0) order.push(app);
        });
        var wraps = Array.from(container.querySelectorAll('.home-app-wrap'));
        var byApp = {};
        wraps.forEach(function (w) {
          var icon = w.querySelector('.home-app');
          var app = (icon && icon.getAttribute('data-app')) || '';
          byApp[app] = w;
        });
        order.forEach(function (app) {
          if (byApp[app]) container.appendChild(byApp[app]);
        });
      }
    } catch (e) {}
    container.addEventListener('click', function (e) {
      if (isDragging) { e.preventDefault(); e.stopPropagation(); return; }
      onHomeAppClick(e);
    });
    container.addEventListener('mousedown', function (e) {
      var wrap = e.target.closest('.home-app-wrap');
      if (!wrap) return;
      e.preventDefault();
      pressTimer = setTimeout(function () {
        pressTimer = null;
        startDrag(wrap);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }, LONG_PRESS_MS);
    });
    container.addEventListener('mouseup', function () {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
    });
    container.addEventListener('mouseleave', function () {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
    });
  });
})();

document.addEventListener('DOMContentLoaded', function () {
  applySavedWallpaper();
  var addBtn = document.getElementById('settingsAddWallpaper');
  if (addBtn && window.electron && window.electron.pickWallpaperFile) {
    addBtn.onclick = function () {
      window.electron.pickWallpaperFile().then(function (path) {
        if (path) {
          var custom = [];
          try {
            var raw = localStorage.getItem('mellivora-wallpaper-custom');
            if (raw) custom = JSON.parse(raw);
          } catch (e) {}
          if (custom.indexOf(path) < 0) custom.push(path);
          localStorage.setItem('mellivora-wallpaper-custom', JSON.stringify(custom));
          selectWallpaper(path);
        }
      }).catch(function () {});
    };
  }
  checkTime();
  setTimeout(function () {
    document.getElementsByClassName('ipadScreen')[0].style.opacity = 1;
  }, 1000);

  if (window.electron && window.electron.onCaptureScreen && window.electron.sendScreenshotData) {
    window.electron.onCaptureScreen(function (sourceId) {
      if (!sourceId || !window.electron || !window.electron.sendScreenshotData) return;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      // mandatory deprecated in Electron 28+, используем плоский формат
      var constraint = {
        audio: false,
        video: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      };
      navigator.mediaDevices.getUserMedia(constraint).then(function (stream) {
        var video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        function capture() {
          try {
            if (video.videoWidth === 0 || video.videoHeight === 0) {
              setTimeout(capture, 50);
              return;
            }
            var canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            stream.getTracks().forEach(function (t) { t.stop(); });
            window.electron.sendScreenshotData(canvas.toDataURL('image/png'));
          } catch (e) {
            stream.getTracks().forEach(function (t) { t.stop(); });
          }
        }
        video.onloadedmetadata = function () {
          video.play().then(function () {
            setTimeout(capture, 100);
          }).catch(function () { capture(); });
        };
        video.onerror = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
        };
      }).catch(function () {});
    });
  }

  var notesAddBtn = document.getElementById('notesAddBtn');
  if (notesAddBtn) notesAddBtn.onclick = createNewNote;
  var notesEditorBack = document.getElementById('notesEditorBack');
  if (notesEditorBack) notesEditorBack.onclick = function () { hideNotesEditor(); loadNotesList(); };
  var notesEditorDelete = document.getElementById('notesEditorDelete');
  if (notesEditorDelete) notesEditorDelete.onclick = function () {
    if (!confirm('Удалить заметку?')) return;
    if (!window.electron || !window.electron.getNotes || !window.electron.saveNotes) return;
    window.electron.getNotes().then(function (notes) {
      var arr = (notes || []).filter(function (n) { return String(n.id) !== String(currentNoteId); });
      window.electron.saveNotes(arr).then(function () { hideNotesEditor(); loadNotesList(); });
    });
  };

  window.addEventListener('resize', function () {
    var appView = document.getElementById('appView');
    if (appView && appView.classList.contains('open') && window.electron && window.electron.setWikiBounds) {
      var r = appView.getBoundingClientRect();
      window.electron.setWikiBounds({ x: r.left, y: r.top, width: r.width, height: r.height });
    }
  });

  /* Custom cursor (CodePen ByzgBxm style); position from main so it works over iframe/BrowserView */
  var dot = document.getElementById('cursor-dot');
  var ring = document.getElementById('cursor-ring');
  if (dot && ring) {
    var rx = 0, ry = 0, mx = 0, my = 0;
    function setCursorPos(x, y) {
      mx = x;
      my = y;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    }
    document.addEventListener('mousemove', function (e) {
      setCursorPos(e.clientX, e.clientY);
    });
    if (window.electron && window.electron.onCursorPosition) {
      window.electron.onCursorPosition(function (pos) {
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') setCursorPos(pos.x, pos.y);
      });
    }
    (function lerpRing() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(lerpRing);
    })();
  }
});
