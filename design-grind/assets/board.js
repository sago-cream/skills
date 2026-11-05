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
let fullContext = false, holdingBefore = false, stageIndex = 0, arrowsOn = stored.arrowsOn !== false;
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
function navigationTarget(direction) {
  const list = visible(), current = items.indexOf(selected);
  const next = direction > 0 ? list.find(item => items.indexOf(item) > current) : [...list].reverse().find(item => items.indexOf(item) < current);
  return next || (filter === 'pending' ? (direction > 0 ? list[0] : list.at(-1)) : null);
}
function record() {
  return {schemaVersion:1, boardId:BOARD.id, revision:BOARD.revision || null,
    decisions:Object.fromEntries(items.filter(item => decisions[item.id]).map(item => [item.id, decisions[item.id]]))};
}
function setExportPending(pending) {
  $('export').dataset.pending = String(pending);
  const label = pending ? 'Export decisions; not exported this session or changed since export' : 'Export decisions';
  $('export').setAttribute('aria-label', label);
  $('export').title = pending ? 'Changes not exported' : 'Export decisions';
}
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify({decisions, filter, selected:selected?.id, device, arrowsOn}));
  } catch {}
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
    const top = pane.top + document.querySelector('.side-tools').offsetHeight;
    if (row.top < top) $('sidebar').scrollTop += row.top - top;
    else if (row.bottom > pane.bottom) $('sidebar').scrollTop += row.bottom - pane.bottom;
  }
}
function renderComparison() {
  const container = $('comparison');
  container.dataset.device = device;
  if (!selected) return;
  const pair = selected.stages?.length ? selected.stages[stageIndex]?.variants?.[device] : selected.variants?.[device];
  const hasArrows = pair && ['before','after'].some(side => pair[side]?.arrows?.length);
  $('arrows').hidden = !hasArrows;
  $('arrows').setAttribute('aria-pressed',String(arrowsOn));
  if (!pair && selected.kind !== 'evidence') {
    container.innerHTML = '<p class="unavailable">No ' + (device === 'mobile' ? 'phone' : 'desktop') + ' capture for this change.</p>';
    return;
  }
  container.innerHTML = ['before','after'].map(slot => {
    const shown = holdingBefore ? 'before' : slot;
    const label = shown === 'before' ? 'Before' : 'After';
    const image = pair?.[shown];
    const crop = image && (fullContext ? [0,0,image.width,image.height] : image.crop);
    const annotations = image && arrowsOn ? (image.arrows || []).map((arrow,index) => {
      const id = 'arrow-' + selected.id + '-' + slot + '-' + stageIndex + '-' + index;
      const width = Math.max(56,arrow.label.length * 6.8 + 16);
      const startX = arrow.labelX + width / 2, startY = arrow.labelY + 22;
      return '<g class="annotation" pointer-events="none"><defs><marker id="' + id + '" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#6d28d9"/></marker></defs>' +
        '<path d="M' + startX + ',' + startY + ' L' + arrow.x + ',' + arrow.y + '" fill="none" stroke="white" stroke-width="5" vector-effect="non-scaling-stroke"/>' +
        '<path d="M' + startX + ',' + startY + ' L' + arrow.x + ',' + arrow.y + '" fill="none" stroke="#6d28d9" stroke-width="2" vector-effect="non-scaling-stroke" marker-end="url(#' + id + ')"/>' +
        '<rect x="' + arrow.labelX + '" y="' + arrow.labelY + '" width="' + width + '" height="22" rx="4" fill="#6d28d9"/>' +
        '<text x="' + (arrow.labelX + 8) + '" y="' + (arrow.labelY + 15) + '" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="white">' + safe(arrow.label) + '</text></g>';
    }).join('') : '';
    const body = image ? '<svg role="img" aria-label="' + label + ': ' + safe(selected.title) +
      '" viewBox="' + crop.join(' ') + '"><image href="' + BOARD.assets[image.asset] +
      '" width="' + image.width + '" height="' + image.height + '"/>' + annotations + '</svg>' :
      '<p class="text-evidence">' + safe(shown === 'before' ? selected.beforeText : selected.afterText) + '</p>';
    return '<figure class="capture" data-side="' + slot + '"><figcaption><strong>' + label + '</strong><span>' +
      (image ? image.width + ' × ' + image.height : 'Text evidence') + '</span></figcaption>' + body + '</figure>';
  }).join('');
}
function render() {
  renderNav();
  const empty = !selected;
  document.querySelector('.change-heading').hidden = empty;
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
  $('prev').disabled = !navigationTarget(-1) || navigationTarget(-1) === selected;
  const next = navigationTarget(1), finish = selected && filter === 'pending' && !list.length;
  $('next').disabled = !finish && (!next || next === selected);
  $('next').textContent = finish ? 'Finish' : 'Next';
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
  $('context-toggle').setAttribute('aria-pressed', String(fullContext));
  $('context-toggle').textContent = fullContext ? 'Detail' : 'Full context';
  $('context-toggle').disabled = selected.kind === 'evidence';
  $('stage-controls').hidden = !(selected.stages?.length > 1);
  $('stage-controls').innerHTML = (selected.stages || []).map((stage,index) => '<button data-stage="' + index + '" aria-pressed="' + (index === stageIndex) + '">' + safe(stage.label) + '</button>').join('');
  renderComparison();
  $('announcement').textContent = selected.group + ': ' + selected.title;
}
function choose(id) {
  selected = byId.get(id) || null;
  stageIndex = 0;
  holdingBefore = false;
  $('context').open = false;
  if (selected) {
    try { history.replaceState(null, '', '#' + selected.id); } catch {}
  }
  render();
  persist();
}
function move(direction) {
  const list = visible();
  if (!list.length) { choose(null); return; }
  const next = navigationTarget(direction);
  if (next) choose(next.id);
}
function decide(choice) {
  if (!selected) return;
  setExportPending(true);
  decisions[selected.id] = {...decision(selected), choice, fingerprint:selected.fingerprint, updatedAt:new Date().toISOString()};
  render();
  $('announcement').textContent = choice === 'accept' ? 'Accepted' : 'Declined';
  persist();
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
$('show-all').onclick = () => setFilter('all');
$('note').oninput = () => {
  if (!selected) return;
  setExportPending(true);
  decisions[selected.id] = {...decision(selected), note:$('note').value.slice(0,12000), updatedAt:new Date().toISOString()};
  // A note never reconfirms an outdated accept/decline choice.
  renderNav();
  persist();
};
$('menu').onclick = () => {
  const open = document.body.classList.toggle('sidebar-open');
  $('menu').setAttribute('aria-expanded',String(open));
};
for (const name of ['desktop','mobile']) $(name).onclick = () => { device = name; render(); persist(); };
$('context-toggle').onclick = () => { fullContext = !fullContext; render(); };
$('arrows').onclick = () => { arrowsOn = !arrowsOn; render(); persist(); };
$('stage-controls').onclick = event => { const button = event.target.closest('[data-stage]'); if (button) {stageIndex = Number(button.dataset.stage); render();} };
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (event.target === $('note')) { event.target.blur(); $('comparison').focus(); }
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing ||
      event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  const key = event.key.toLowerCase();
  const action = {'1':() => decide('accept'),'2':() => decide('decline'),
    j:() => move(1),k:() => move(-1),arrowright:() => move(1),arrowleft:() => move(-1),
    n:() => {if (selected) $('note').focus();},m:() => {device = device === 'desktop' ? 'mobile' : 'desktop'; render(); persist();},
    c:() => {fullContext = !fullContext; render();},a:() => {arrowsOn = !arrowsOn; render(); persist();},
    s:() => {if (selected?.stages?.length) {stageIndex = (stageIndex + 1) % selected.stages.length; render();}},
    u:() => setFilter('pending')}[key];
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
  setExportPending(false);
  $('announcement').textContent = 'Decision record download started';
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
if (filter !== 'all' && !matches(selected)) selected = visible()[0] || null;
setExportPending(true);
render();
persist();
