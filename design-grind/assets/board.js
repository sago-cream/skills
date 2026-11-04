'use strict';
const BOARD = JSON.parse(document.getElementById('board-data').textContent);
const $ = id => document.getElementById(id);
const CHOICES = ['accept', 'decline'];
const FILTERS = ['pending', 'all', 'accept', 'decline', 'notes'];
const key = 'design-grind:' + BOARD.id + ':v1';
const items = BOARD.changes;
const byId = new Map(items.map(item => [item.id, item]));
const safe = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let stored = {};
try { stored = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
function cleanDecisions(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid decisions record');
  const result = Object.create(null);
  for (const [id, value] of Object.entries(raw)) {
    if (!byId.has(id)) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        !(value.choice == null || CHOICES.includes(value.choice)) ||
        (value.note !== undefined && typeof value.note !== 'string')) {
      throw new Error('Invalid decision for ' + id);
    }
    result[id] = {choice:value.choice ?? null, note:(value.note || '').slice(0, 12000),
      fingerprint:typeof value.fingerprint === 'string' ? value.fingerprint : '',
      updatedAt:typeof value.updatedAt === 'string' ? value.updatedAt : ''};
  }
  return result;
}
let decisions;
try { decisions = cleanDecisions(stored.decisions || BOARD.initialDecisions || {}); }
catch { decisions = Object.create(null); }
let filter = FILTERS.includes(stored.filter) ? stored.filter : (BOARD.initialFilter || 'pending');
let selected = byId.get(location.hash.slice(1)) || byId.get(stored.selected) || byId.get(BOARD.initialChange) || items[0];
let device = stored.device === 'mobile' ? 'mobile' : 'desktop';
let side = ['before','after','both'].includes(stored.side) ? stored.side : (matchMedia('(max-width:480px)').matches ? 'after' : 'both');
let fullContext = false, holdingBefore = false;
const undo = [];
let browserSaved = false, fileHandle = null, rememberedHandle = null, fileError = '', saveGeneration = 0;
let writes = Promise.resolve();
let noteTimer;
function decision(item) { return decisions[item.id] || {choice:null,note:'',fingerprint:'',updatedAt:''}; }
function stale(item) { const d = decision(item); return Boolean(d.choice && d.fingerprint !== item.fingerprint); }
function matches(item) {
  const d = decision(item);
  if (filter === 'all') return true;
  if (filter === 'notes') return Boolean(d.note.trim());
  if (filter === 'pending') return !d.choice || stale(item);
  return d.choice === filter && !stale(item);
}
function visible() { return items.filter(matches); }
function record() {
  return {schemaVersion:1, boardId:BOARD.id, revision:BOARD.revision || null,
    decisions:Object.fromEntries(items.filter(item => decisions[item.id]).map(item => [item.id, decisions[item.id]]))};
}
function setMessage(text) { $('message').textContent = text; }
function saveStatus(text, error = false) {
  $('save-status').textContent = text;
  $('save-status').dataset.error = String(error);
}
function persist(writeFile = true) {
  try {
    localStorage.setItem(key, JSON.stringify({decisions, filter, selected:selected?.id,
      device, side}));
    browserSaved = true;
  } catch { browserSaved = false; }
  if (!fileHandle || !writeFile) {
    if (fileError) saveStatus(fileError + (browserSaved ? ' · browser saved' : ' · export now'), true);
    else if (!fileHandle) saveStatus(browserSaved ? 'Saved in this browser' : 'Session only · export to save', !browserSaved);
    return;
  }
  const generation = ++saveGeneration;
  const payload = JSON.stringify(record(), null, 2) + '\n';
  const handle = fileHandle;
  saveStatus('Saving file…');
  writes = writes.catch(() => {}).then(async () => {
    try {
      const writer = await handle.createWritable();
      try { await writer.write(payload); await writer.close(); }
      catch (error) { await writer.abort?.().catch(() => {}); throw error; }
      if (generation === saveGeneration) {
        fileError = '';
        saveStatus('Saved to ' + handle.name);
      }
    } catch {
      fileError = 'File save failed';
      fileHandle = null;
      if (generation === saveGeneration) saveStatus(fileError + (browserSaved ? ' · browser saved' : ' · export now'), true);
    }
  });
}
function renderNav() {
  const groups = new Map();
  for (const item of visible()) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push(item);
  }
  $('change-list').innerHTML = [...groups].map(([name, group]) =>
    '<section class="nav-group"><h2>' + safe(name) + '</h2>' + group.map(item =>
      '<button class="nav-item" data-id="' + item.id + '" aria-current="' + (selected?.id === item.id) + '">' +
      '<span class="dot" aria-label="' + (stale(item) ? 'Comparison updated' : safe(decision(item).choice || 'Pending')) +
      '" data-choice="' + safe(decision(item).choice) + '" data-stale="' + stale(item) + '"></span>' +
      '<span>' + safe(item.title) + '</span></button>').join('') + '</section>').join('');
  const completed = items.filter(item => decision(item).choice && !stale(item)).length;
  $('progress').textContent = completed + ' / ' + items.length + ' decided';
  $('filter').value = filter;
  const active = $('change-list').querySelector('[aria-current=true]');
  if (active && $('sidebar').clientHeight) {
    const row = active.getBoundingClientRect(), pane = $('sidebar').getBoundingClientRect();
    if (row.top < pane.top) $('sidebar').scrollTop += row.top - pane.top;
    else if (row.bottom > pane.bottom) $('sidebar').scrollTop += row.bottom - pane.bottom;
  }
}
function renderComparison() {
  const container = $('comparison');
  container.dataset.side = side;
  container.dataset.device = device;
  if (!selected) return;
  const pair = selected.variants?.[device];
  if (!pair && selected.kind !== 'evidence') {
    container.innerHTML = '<p class="unavailable">No ' + (device === 'mobile' ? 'phone' : 'desktop') + ' capture for this change.</p>';
    return;
  }
  container.innerHTML = ['before','after'].map(slot => {
    const shown = holdingBefore ? 'before' : slot;
    const label = shown === 'before' ? 'Before' : 'After';
    const image = pair?.[shown];
    const crop = image && (fullContext ? [0,0,image.width,image.height] : image.crop);
    const body = image ? '<svg role="img" aria-label="' + label + ': ' + safe(selected.title) +
      '" viewBox="' + crop.join(' ') + '"><image href="' + BOARD.assets[image.asset] +
      '" width="' + image.width + '" height="' + image.height + '"/></svg>' :
      '<p class="text-evidence">' + safe(shown === 'before' ? selected.beforeText : selected.afterText) + '</p>';
    return '<figure class="capture" data-side="' + slot + '"><figcaption><strong>' + label + '</strong><span>' +
      (image ? image.width + ' × ' + image.height : 'Text evidence') + '</span></figcaption>' + body + '</figure>';
  }).join('');
}
function render() {
  renderNav();
  const empty = !selected;
  $('review-content').hidden = empty;
  $('empty').hidden = !empty;
  $('change-title').textContent = selected?.title || (filter === 'pending' ? 'All decisions reviewed' : 'No matching changes');
  $('section').textContent = selected?.group || '';
  $('reason').textContent = selected?.reason || '';
  $('stale').hidden = !selected || !stale(selected);
  const list = visible();
  const index = list.indexOf(selected);
  $('position').textContent = selected ? (index >= 0 ? (index + 1) + ' / ' + list.length : 'Decision saved') : '';
  $('empty-title').textContent = filter === 'pending' ? 'No decisions left' : 'Nothing in this filter';
  $('empty-copy').textContent = filter === 'pending' ? 'You can revisit any choice or export the record.' : 'Your decisions and notes are preserved.';
  $('undo').disabled = !undo.length;
  if (!selected) return;
  const d = decision(selected);
  document.querySelectorAll('[data-choice]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.choice === d.choice && !stale(selected)));
  });
  $('note').value = d.note;
  $('before-text').textContent = selected.beforeText;
  $('after-text').textContent = selected.afterText;
  $('evidence-note').textContent = selected.context || (selected.kind === 'evidence' ? 'Supporting work; no visual comparison is claimed.' : 'Screenshots show appearance. They do not prove interaction behavior.');
  $('source').hidden = !/^https:\/\//.test(selected.sourceUrl || '');
  if (!$('source').hidden) $('source').href = selected.sourceUrl;
  for (const name of ['desktop','mobile']) $(name).setAttribute('aria-pressed', String(device === name));
  for (const name of ['before','after','both']) $('side-' + name).setAttribute('aria-pressed', String(side === name));
  $('context-toggle').setAttribute('aria-pressed', String(fullContext));
  $('context-toggle').innerHTML = (fullContext ? 'Detail' : 'Full context') + ' <kbd>C</kbd>';
  $('context-toggle').disabled = selected.kind === 'evidence';
  renderComparison();
  $('announcement').textContent = selected.group + ': ' + selected.title;
}
function choose(id) {
  selected = byId.get(id) || null;
  holdingBefore = false;
  $('context').open = false;
  if (selected) {
    try { history.replaceState(null, '', '#' + selected.id); } catch {}
  }
  render();
  persist(false);
}
function move(direction) {
  const list = visible();
  if (!list.length) { choose(null); return; }
  const current = items.indexOf(selected);
  const next = direction > 0 ? list.find(item => items.indexOf(item) > current) : [...list].reverse().find(item => items.indexOf(item) < current);
  if (next) choose(next.id);
  else if (filter === 'pending') choose((direction > 0 ? list[0] : list.at(-1)).id);
}
function decide(choice) {
  if (!selected) return;
  clearTimeout(noteTimer);
  undo.push({id:selected.id, previous:decisions[selected.id] ? {...decisions[selected.id]} : null});
  decisions[selected.id] = {...decision(selected), choice, fingerprint:selected.fingerprint, updatedAt:new Date().toISOString()};
  setMessage((choice === 'accept' ? 'Accepted' : 'Declined') + ' · J for next');
  render();
  persist();
}
function undoDecision() {
  const change = undo.pop();
  if (!change) return;
  const latestNote = decisions[change.id]?.note || '';
  if (change.previous) decisions[change.id] = {...change.previous, note:latestNote};
  else if (latestNote) decisions[change.id] = {choice:null,note:latestNote,fingerprint:'',updatedAt:new Date().toISOString()};
  else delete decisions[change.id];
  choose(change.id);
  persist();
  setMessage('Decision undone; note kept');
}
function setFilter(value) {
  filter = value;
  const list = visible();
  choose((list.includes(selected) ? selected : list[0])?.id);
}
$('board-title').textContent = BOARD.title;
document.title = BOARD.title;
$('filter').onchange = () => setFilter($('filter').value);
$('change-list').onclick = event => {
  const button = event.target.closest('[data-id]');
  if (button) { choose(button.dataset.id); document.body.classList.remove('sidebar-open'); $('menu').setAttribute('aria-expanded','false'); }
};
document.querySelectorAll('button[data-choice]').forEach(button => { button.onclick = () => decide(button.dataset.choice); });
$('prev').onclick = () => move(-1);
$('next').onclick = () => move(1);
$('undo').onclick = undoDecision;
$('show-all').onclick = () => setFilter('all');
$('note').oninput = () => {
  if (!selected) return;
  decisions[selected.id] = {...decision(selected), note:$('note').value.slice(0,12000), updatedAt:new Date().toISOString()};
  // A note never reconfirms an outdated accept/decline choice.
  renderNav();
  persist(false);
  clearTimeout(noteTimer);
  if (fileHandle) {
    saveStatus('Saving file…');
    noteTimer = setTimeout(() => persist(),250);
  }
};
$('menu').onclick = () => {
  const open = document.body.classList.toggle('sidebar-open');
  $('menu').setAttribute('aria-expanded',String(open));
};
for (const name of ['desktop','mobile']) $(name).onclick = () => { device = name; render(); persist(false); };
for (const name of ['before','after','both']) $('side-' + name).onclick = () => { side = name; render(); persist(false); };
$('context-toggle').onclick = () => { fullContext = !fullContext; render(); };
$('help').onclick = () => $('shortcuts').showModal();
$('close-help').onclick = () => $('shortcuts').close();
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (event.target === $('note')) { event.target.blur(); $('comparison').focus(); }
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing ||
      event.target.closest('input,textarea,select,[contenteditable=true]') || $('shortcuts').open) return;
  const key = event.key.toLowerCase();
  const action = {'1':() => decide('accept'),'2':() => decide('decline'),
    j:() => move(1),k:() => move(-1),arrowright:() => move(1),arrowleft:() => move(-1),
    n:() => $('note').focus(),z:undoDecision,m:() => {device = device === 'desktop' ? 'mobile' : 'desktop'; render(); persist(false);},
    c:() => {fullContext = !fullContext; render();},u:() => setFilter('pending'),'?':() => $('shortcuts').showModal()}[key];
  if (action) { event.preventDefault(); action(); }
  else if (event.code === 'Space' && !event.target.closest('button,a,summary')) {
    event.preventDefault(); holdingBefore = true; renderComparison();
  }
});
document.addEventListener('keyup', event => {
  if (event.code === 'Space' && holdingBefore) { holdingBefore = false; renderComparison(); }
});
window.addEventListener('blur', () => { if (holdingBefore) {holdingBefore = false; renderComparison();} });
window.addEventListener('hashchange', () => { if (byId.has(location.hash.slice(1))) choose(location.hash.slice(1)); });
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(record(),null,2)+'\n'],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url; link.download = BOARD.id + '-decisions.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
$('import').onclick = () => $('import-file').click();
$('import-file').onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data.schemaVersion !== 1 || data.boardId !== BOARD.id) throw new Error('This record belongs to another board or format');
    const incoming = cleanDecisions(data.decisions);
    decisions = Object.assign(Object.create(null), decisions, incoming);
    render(); persist(); setMessage('Decision record imported');
  } catch (error) { setMessage('Import failed: ' + error.message); }
  event.target.value = '';
};
function handleStore(mode, value) {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('design-grind-files',1);
    request.onupgradeneeded = () => request.result.createObjectStore('handles');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction('handles',mode);
        const result = mode === 'readwrite' ? tx.objectStore('handles').put(value,BOARD.id) : tx.objectStore('handles').get(BOARD.id);
        result.onsuccess = () => { if (mode === 'readonly') resolve(result.result); };
        tx.oncomplete = () => {db.close(); if (mode === 'readwrite') resolve();};
        tx.onerror = () => {db.close(); reject(tx.error);};
      } catch (error) {db.close(); reject(error);}
    };
  });
}
async function attachFile(handle, writeNow) {
  const text = await (await handle.getFile()).text();
  if (text.trim()) {
    const data = JSON.parse(text);
    if (data.schemaVersion !== 1 || data.boardId !== BOARD.id) throw new Error('This file belongs to another board or format');
    const incoming = cleanDecisions(data.decisions);
    for (const [id, value] of Object.entries(incoming)) {
      const local = decisions[id];
      if (!local || (Date.parse(value.updatedAt) || 0) > (Date.parse(local.updatedAt) || 0)) decisions[id] = value;
    }
  }
  fileHandle = handle; rememberedHandle = handle; fileError = '';
  render();
  persist(writeNow);
  if (!writeNow) saveStatus('File connected · ' + handle.name);
}
$('connect').onclick = async () => {
  try {
    let handle = rememberedHandle;
    if (handle) {
      const permission = await handle.requestPermission({mode:'readwrite'});
      if (permission !== 'granted') handle = null;
    }
    if (!handle) {
      if (!window.showSaveFilePicker) { setMessage('File autosave needs Chrome or Edge. Export a JSON record here.'); return; }
      handle = await showSaveFilePicker({startIn:'downloads',suggestedName:BOARD.id+'-decisions.json',types:[{description:'Decision record',accept:{'application/json':['.json']}}]});
    }
    await attachFile(handle,true);
    handleStore('readwrite',handle).catch(() => {});
  } catch (error) { if (error.name !== 'AbortError') setMessage('File not connected: ' + error.message + '. Use Export to save separately.'); }
};
handleStore('readonly').then(async handle => {
  if (!handle) return;
  rememberedHandle = handle;
  if (await handle.queryPermission({mode:'readwrite'}) === 'granted') {
    await attachFile(handle,false);
  } else $('connect').textContent = 'Resume file save';
}).catch(() => {});
if (filter !== 'all' && !matches(selected)) selected = visible()[0] || null;
render();
persist(false);
