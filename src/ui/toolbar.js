// ─── Status strip ─────────────────────────────────────────────────────────
// One line under the header replaces the old floating toasts. "ok" and "info"
// fade after 4 s; errors stay until dismissed. While an apply/switch runs, a
// "working" line with a seconds counter shows instead.

let _statusTimer = null;
let _busyTicker  = null;

function psmSay(kind, text, extra = {}) {
  clearTimeout(_statusTimer);
  psmUi.status = { kind, text, ...extra };
  if (kind === 'ok' || kind === 'info') {
    _statusTimer = setTimeout(() => { psmUi.status = null; psmRenderStrip(); }, 4000);
  }
  if (!panelOpen && kind === 'err' && window.parent.toastr?.error) window.parent.toastr.error(text);
  psmRenderStrip();
}

// Error with a "Try again" button that repeats the same apply/switch.
function psmSayRetry(key, nameArg, presetName, snapName, asSwitch = false) {
  psmSay('err', psmT(key, nameArg), { retry: { presetName, snapName, asSwitch } });
}

function psmRetry() {
  const r = psmUi.status?.retry;
  if (!r) return;
  psmUi.status = null;
  if (r.snapName === ORIGINAL_KEY) psmApplyOriginal(r.presetName, r.asSwitch);
  else psmApply(r.presetName, r.snapName);
}

function psmBusyBegin(presetName, snapName) {
  clearTimeout(_statusTimer);
  clearInterval(_busyTicker);
  psmUi.status = null;
  psmUi.busy = { presetName, snapName, label: snapName && snapName !== ORIGINAL_KEY ? snapName : null, since: Date.now() };
  _busyTicker = setInterval(psmRenderStrip, 1000);
  psmRender();
}

// Called from psmRelease(): the operation is over, success or not.
function psmBusyFinish() {
  clearInterval(_busyTicker);
  if (!psmUi.busy) return;
  psmUi.busy = null;
  confirmingSnaps.clear();
  psmRender();
  psmRefreshEntryRow();
}

function psmStripHtml() {
  const b = psmUi.busy;
  if (b) {
    const secs = Math.floor((Date.now() - b.since) / 1000);
    const what = b.label ? psmT('applying_x', b.label)
      : b.snapName === ORIGINAL_KEY ? psmT('resetting') : psmT('switching_x', b.presetName);
    const text = secs < 1 ? what + '…'
      : what + (isChatReady() ? '' : ' · ' + psmT('waiting_chat')) + ' · ' + secs + 's';
    return `<div class="psm-strip busy" role="status"><span class="psm-spin" aria-hidden="true"></span><span class="psm-strip-t">${esc(text)}</span></div>`;
  }
  const s = psmUi.status;
  if (!s) return '';
  const icon = s.kind === 'ok' ? psmIcon('check', 'st') : s.kind === 'err' ? psmIcon('alert', 'st') : '';
  return `<div class="psm-strip ${esc(s.kind)}" role="status">${icon}<span class="psm-strip-t">${esc(s.text)}</span>
    ${s.retry ? `<button type="button" class="psm-btn psm-sm" data-act="retry">${esc(psmT('try_again'))}</button>` : ''}
    <button type="button" class="psm-ib psm-sm mut" data-act="dismiss" aria-label="${esc(psmT('dismiss'))}" title="${esc(psmT('dismiss'))}">${psmIcon('x')}</button>
  </div>`;
}

function psmRenderStrip() {
  const el = parentDoc.getElementById('psm-strip');
  if (el) el.innerHTML = psmStripHtml();
  psmPlacePanel();
}

// ─── SortableJS loader ────────────────────────────────────────────────────

function loadSortable(cb) {
  if (window.parent.Sortable) { cb(); return; }
  const s = parentDoc.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js';
  s.onload = cb;
  s.onerror = () => { ERR('Failed to load SortableJS — drag/drop will be unavailable'); cb(); };
  parentDoc.head.appendChild(s);
}

// ─── Initial DOM injection ────────────────────────────────────────────────

// No backdrop and no close on an outside click: the window stays usable next
// to SillyTavern's prompt list (DECISIONS.md D9-1).
function createAndInjectUI() {
  const panel = parentDoc.createElement('section');
  panel.id = 'psm-panel';
  panel.setAttribute('aria-label', psmT('brand'));
  panel.tabIndex = -1;

  parentDoc.body.append(panel);
  try { new window.parent.ResizeObserver(() => { if (panelOpen) psmPlacePanel(); }).observe(panel); } catch (_) {}
}

// Stop pointer/focus/key bubbling so SillyTavern's AI drawer does not treat
// interaction with PSM as an outside click / blur and auto-close.
function bindPanelInteractionIsolation() {
  ['#psm-panel'].forEach(sel => {
    const el = parentDoc.querySelector(sel);
    if (!el || el.dataset.psmIsolate === '1') return;
    el.dataset.psmIsolate = '1';
    ['mousedown', 'pointerdown', 'click', 'touchstart', 'focusin', 'keydown'].forEach(type => {
      el.addEventListener(type, ev => { ev.stopPropagation(); }, false);
    });
  });
}

// ─── Extension menu entry ─────────────────────────────────────────────────

function injectExtensionMenu() {
  if (parent$('#psm-wand-item', parentDoc).length > 0) return;
  const $container = $('<div/>', { class: 'extension_container interactable psm-ext-container', tabindex: 0 });
  const $item = $('<div/>', {
    id:       'psm-wand-item',
    class:    'list-group-item flex-container flexGap5 interactable',
    tabindex: 0,
    role:     'listitem',
    title:    psmT('brand'),
  }).html('<div class="fa-fw fa-solid fa-layer-group extensionsMenuExtensionButton"></div><span>' + esc(psmT('brand')) + '</span>');
  $container.append($item);
  parent$('#extensionsMenu', parentDoc).append($container);
  $item.on('click', () => {
    const s = settingsLoad();
    openPanel({ tab: s.tools.presets ? 'presets' : 'folders' });
  });
  psmRefreshEntryRow();
}

// ─── Entry row under the preset dropdown ──────────────────────────────────
// Its own <div>, inserted as a sibling right after SillyTavern's preset
// <select> row. It never goes inside a SillyTavern element, so other
// extensions that add to the same area don't collide with it.

const PSM_ENTRY_ROW_ID = 'psm-entry-row';

function injectEntryRow() {
  if (parentDoc.getElementById(PSM_ENTRY_ROW_ID)) { psmRefreshEntryRow(); return true; }
  const select = parentDoc.getElementById('settings_preset_openai');
  const selectRow = select?.closest('.flex-container');
  if (!selectRow || !selectRow.parentNode) return false;
  const row = parentDoc.createElement('div');
  row.id = PSM_ENTRY_ROW_ID;
  selectRow.insertAdjacentElement('afterend', row);
  row.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-entry]');
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (btn.dataset.entry === 'snapshots') openPanel({ tab: 'presets', page: currentPreset() });
    else openPanel({ tab: 'folders' });
  });
  psmRefreshEntryRow();
  return true;
}

function scheduleInjectEntryRow() {
  [0, 400, 1200, 2800, 5200].forEach(ms => {
    window.parent.setTimeout(() => { injectEntryRow(); }, ms);
  });
}

// Shows or hides the entry points after a settings change.
function psmRefreshEntryRow() {
  const s = settingsLoad();
  const row = parentDoc.getElementById(PSM_ENTRY_ROW_ID);
  if (row) {
    const show = s.entries.drawer && (s.tools.presets || s.tools.folders);
    row.hidden = !show;
    row.innerHTML =
      (s.tools.presets ? `<button type="button" class="psm-btn" data-entry="snapshots" title="${esc(psmT('entry_snapshots'))}">${psmIcon('layers')}<span>${esc(psmT('entry_snapshots'))}</span></button>` : '') +
      (s.tools.folders ? `<button type="button" class="psm-btn" data-entry="folders" title="${esc(psmT('tab_folders'))}">${psmIcon('folder')}<span>${esc(psmT('tab_folders'))}</span></button>` : '');
  }
  parent$('#psm-wand-item', parentDoc).closest('.extension_container').toggle(psmExtEntryShown(s));
}

// The Extensions menu item stays when it is the only way left to open PSM.
function psmExtEntryShown(s = settingsLoad()) {
  const drawerShown = s.entries.drawer && (s.tools.presets || s.tools.folders);
  return s.entries.ext || !drawerShown;
}

// ─── Panel open / close ───────────────────────────────────────────────────

function psmIsSheet() { return window.parent.innerWidth <= 640; }
function psmIsTouch() {
  return psmIsSheet() || !!window.parent.matchMedia?.('(pointer: coarse)').matches;
}

// opts.tab: 'presets' | 'folders'; opts.page: open this preset's page.
function openPanel(opts = {}) {
  const s = settingsLoad();
  panelOpen = true;
  psmUi.settings = false;
  psmUi.sel      = null;
  psmUi.menu     = null;
  psmUi.confirm  = null;
  psmUi.renaming = null;
  psmUi.fview    = 'list';
  psmUi.tab      = opts.tab || psmUi.tab;
  if (psmUi.tab === 'presets') {
    psmUi.view       = opts.page ? 'page' : 'list';
    psmUi.pagePreset = opts.page || '';
    psmUi.saveName   = '';
    psmUi.noteEdit   = null;
  }
  if (!s.tools.presets && !s.tools.folders) psmUi.settings = true;
  const panel = parentDoc.getElementById('psm-panel');
  panel.classList.add('open');
  psmUi._placed = false;
  psmRender();
  psmWatchViewport(true);
  psmOnTabShown();
}

function closePanel() {
  panelOpen = false;
  psmUi.menu = null;
  psmUi.confirm = null;
  psmUi.renaming = null;
  psmUi.sel = null;
  confirmingSnaps.clear();
  parentDoc.getElementById('psm-panel')?.classList.remove('open');
  psmSetDrawerPad(0);
  psmWatchViewport(false);
}

// Phone: the Prompt folders tab is used next to SillyTavern's prompt list, so
// it opens the AI settings drawer and scrolls the list into the space above
// the sheet.
function psmOnTabShown() {
  if (!panelOpen || !psmIsSheet() || psmUi.settings || psmUi.tab !== 'folders') return;
  const opened = typeof pdoOpenPromptDrawer === 'function' && pdoOpenPromptDrawer();
  setTimeout(() => {
    const el = parentDoc.getElementById('pdo-search-bar') || parentDoc.getElementById('completion_prompt_manager');
    if (el) psmScrollAboveSheet(el, 'top');
  }, opened ? 350 : 60);
}

// Scrolls el's scroll box so el shows in the free space above the phone
// sheet: at its top, or centred.
function psmScrollAboveSheet(el, where = 'center') {
  let box = el.parentElement;
  while (box && box !== parentDoc.body) {
    const oy = window.parent.getComputedStyle(box).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  if (!box || box === parentDoc.body) { el.scrollIntoView({ behavior: 'smooth', block: where === 'top' ? 'start' : 'center' }); return; }
  const panel = parentDoc.getElementById('psm-panel');
  const br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
  let top = Math.max(br.top, psmTopBarBottom());
  // Things floating over the top of the scroll box (the drawer's
  // "Click slider numbers…" line) would cover el.
  [...(box.parentElement?.children || [])].forEach(c => {
    if (c === box || window.parent.getComputedStyle(c).position !== 'absolute') return;
    const r = c.getBoundingClientRect();
    if (r.height && r.top <= top + 4 && r.bottom > top) top = r.bottom;
  });
  const bottom = panelOpen && psmIsSheet() && panel ? Math.min(br.bottom, panel.getBoundingClientRect().top) : br.bottom;
  const rel = er.top - br.top + box.scrollTop;
  const offset = where === 'top' ? top - br.top + 8 : (top - br.top) + Math.max(0, (bottom - top - er.height) / 2);
  box.scrollTo({ top: Math.max(0, rel - offset), behavior: 'smooth' });
}

// ─── Placement ────────────────────────────────────────────────────────────
// Desktop: a floating window. The user moves it by the header and resizes it
// from the corner; place and size are saved in psm_v1_pos. It never runs off
// the screen: a window lower down gets shorter and scrolls.
// Phone (≤ 640 px wide): a bottom sheet. Its height is set with the handle,
// one height per tab, and it stays above the on-screen keyboard.

const PSM_WIN_W = 330, PSM_WIN_MIN_W = 300, PSM_WIN_MAX_W = 640, PSM_WIN_MIN_H = 220;

function psmDefaultPos(pw) {
  const vw = window.parent.innerWidth;
  const drawer = parentDoc.getElementById('left-nav-panel');
  const r = drawer?.getBoundingClientRect();
  const drawerOpen = drawer && r && r.width > 0 && r.right > 0 && getComputedStyle(drawer).display !== 'none';
  if (drawerOpen && r.right + 10 + pw <= vw - 10) return { top: 44, left: Math.round(r.right + 10) };
  return { top: 44, left: Math.round((vw - pw) / 2) };
}

function psmClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function psmPlacePanel() {
  const panel = parentDoc.getElementById('psm-panel');
  if (!panel || !panelOpen || psmUi._sizing) return;
  const sheet = psmIsSheet();
  panel.classList.toggle('psm-sheet', sheet);
  panel.classList.toggle('psm-float', !sheet);
  panel.classList.toggle('psm-touch', psmIsTouch());

  if (sheet) {
    psmPlaceSheet(panel);
    return;
  }
  psmSetDrawerPad(0);
  panel.style.removeProperty('bottom');
  const margin = 10;
  const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
  const saved = posLoad() || {};
  const w = psmClamp(saved.w || PSM_WIN_W, Math.min(PSM_WIN_MIN_W, vw - 2 * margin), Math.min(PSM_WIN_MAX_W, vw - 2 * margin));
  panel.style.setProperty('width', w + 'px', 'important');
  if (!psmUi._placed) {
    const pos = saved.top !== undefined && saved.left !== undefined ? saved : psmDefaultPos(w);
    panel.style.setProperty('top',  pos.top  + 'px', 'important');
    panel.style.setProperty('left', pos.left + 'px', 'important');
    psmUi._placed = true;
  }
  const top  = psmClamp(parseFloat(panel.style.top)  || 0, margin, Math.max(margin, vh - 120));
  const left = psmClamp(parseFloat(panel.style.left) || 0, margin, Math.max(margin, vw - w - margin));
  // Lower down there is less room: the window gets shorter, never off-screen.
  const room = vh - top - 8;
  panel.style.setProperty('top',  top  + 'px', 'important');
  panel.style.setProperty('left', left + 'px', 'important');
  panel.style.setProperty('max-height', room + 'px', 'important');
  if (saved.h) panel.style.setProperty('height', Math.min(Math.max(saved.h, PSM_WIN_MIN_H), room) + 'px', 'important');
  else panel.style.removeProperty('height');
}

// Bottom of SillyTavern's top bar: the sheet never covers it.
function psmTopBarBottom() {
  let b = 0;
  ['top-settings-holder', 'top-bar'].forEach(id => {
    const r = parentDoc.getElementById(id)?.getBoundingClientRect();
    if (r && r.height > 0 && r.bottom < 150) b = Math.max(b, r.bottom);
  });
  return Math.round(b || 50);
}

// On phones SillyTavern's root element has no height and is the anchor for
// fixed elements, so "bottom: 0" would land at the top of the screen. The
// sheet is placed from the top, using the measured screen height.
// The keyboard: Android with SillyTavern's "resizes-content" viewport shrinks
// innerHeight (the tallest height seen at this width is the full screen);
// iOS does not, so the visual viewport is read too.
let _psmFullH = { w: 0, h: 0 };
function psmSheetGeom() {
  const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
  if (_psmFullH.w !== vw) _psmFullH = { w: vw, h: vh };
  else _psmFullH.h = Math.max(_psmFullH.h, vh);
  let bottom = vh, kb = _psmFullH.h - vh;
  const vv = window.parent.visualViewport;
  if (vv) {
    const k = vh - vv.height - vv.offsetTop;
    if (k > 80) { bottom = Math.round(vv.height + vv.offsetTop); kb = Math.max(kb, k); }
  }
  return { bottom, kb: kb > 80 ? kb : 0, full: _psmFullH.h, topMin: psmTopBarBottom() };
}

// Sheet sizes as a share of the screen (from the 390 × 844 design).
const PSM_SHEET_STEPS = [360 / 844, 620 / 844];
const PSM_SHEET_DEFAULT = { presets: 620 / 844, folders: 400 / 844 };
const PSM_SHEET_MIN = 140, PSM_SHEET_CLOSE = 200, PSM_SHEET_KB_MIN = 240;

function psmSheetTab() { return psmUi.tab === 'folders' && !psmUi.settings ? 'folders' : 'presets'; }

function psmSheetHeight(g = psmSheetGeom()) {
  const want = psmUi.sheetH[psmSheetTab()] * g.full;
  const h = g.kb ? Math.max(want - g.kb, PSM_SHEET_KB_MIN) : want;
  return Math.round(psmClamp(h, PSM_SHEET_MIN, g.bottom - g.topMin));
}

function psmPlaceSheet(panel, h) {
  const g = psmSheetGeom();
  if (h === undefined) h = psmSheetHeight(g);
  ['width', 'max-height'].forEach(k => panel.style.removeProperty(k));
  panel.style.setProperty('height', h + 'px', 'important');
  panel.style.setProperty('top', (g.bottom - h) + 'px', 'important');
  psmSetDrawerPad(h + 16);
}

// Lets SillyTavern's AI settings drawer scroll its content up above the sheet.
function psmSetDrawerPad(px) {
  const body = parentDoc.body;
  body.classList.toggle('psm-sheet-pad', px > 0);
  if (px > 0) body.style.setProperty('--psm-sheet-pad', px + 'px');
  else body.style.removeProperty('--psm-sheet-pad');
}

let _vvWatching = false;
function _onViewportChange() { if (panelOpen) psmPlacePanel(); }
function psmWatchViewport(on) {
  const vv = window.parent.visualViewport;
  if (!vv || on === _vvWatching) return;
  _vvWatching = on;
  if (on) { vv.addEventListener('resize', _onViewportChange); vv.addEventListener('scroll', _onViewportChange); }
  else    { vv.removeEventListener('resize', _onViewportChange); vv.removeEventListener('scroll', _onViewportChange); }
}

// ─── Pointer drags: header (move), corner (resize), sheet handle ──────────

function psmPointerDrag(e, onMove, onUp) {
  const end = ev => {
    parentDoc.removeEventListener('pointermove', onMove);
    parentDoc.removeEventListener('pointerup', end);
    parentDoc.removeEventListener('pointercancel', end);
    onUp(ev);
  };
  parentDoc.addEventListener('pointermove', onMove);
  parentDoc.addEventListener('pointerup', end);
  parentDoc.addEventListener('pointercancel', end);
}

function bindHeaderDrag(panel) {
  panel.addEventListener('pointerdown', e => {
    if (!panel.classList.contains('psm-float')) return;
    const head = e.target.closest('.psm-h');
    if (!head || e.target.closest('button, input')) return;
    if (e.button !== undefined && e.button !== 0) return;
    const startX = e.clientX, startY = e.clientY;
    const startTop = parseFloat(panel.style.top) || 0, startLeft = parseFloat(panel.style.left) || 0;
    let moved = false;
    psmPointerDrag(e, ev => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
      if (!moved) return;
      ev.preventDefault();
      const margin = 10, pw = panel.offsetWidth;
      const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
      panel.style.setProperty('top',  psmClamp(startTop  + dy, margin, Math.max(margin, vh - 120)) + 'px', 'important');
      panel.style.setProperty('left', psmClamp(startLeft + dx, margin, Math.max(margin, vw - pw - margin)) + 'px', 'important');
      psmPlacePanel();
    }, () => {
      if (moved) posSave({ top: parseFloat(panel.style.top), left: parseFloat(panel.style.left) });
    });
  });
}

function bindResizeGrip(panel) {
  panel.addEventListener('pointerdown', e => {
    if (!panel.classList.contains('psm-float') || !e.target.closest('[data-rsz]')) return;
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, w0 = panel.offsetWidth, h0 = panel.offsetHeight;
    let size = null;
    psmUi._sizing = true;
    psmPointerDrag(e, ev => {
      ev.preventDefault();
      const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
      const left = parseFloat(panel.style.left) || 0, top = parseFloat(panel.style.top) || 0;
      size = {
        w: Math.round(psmClamp(w0 + ev.clientX - x0, PSM_WIN_MIN_W, Math.min(PSM_WIN_MAX_W, vw - left - 4))),
        h: Math.round(psmClamp(h0 + ev.clientY - y0, PSM_WIN_MIN_H, vh - top - 8)),
      };
      panel.style.setProperty('width', size.w + 'px', 'important');
      panel.style.setProperty('height', size.h + 'px', 'important');
    }, () => { psmUi._sizing = false; if (size) posSave(size); psmPlacePanel(); });
  });
}

// Phone: drag the handle to resize (below 200 px closes); tap it to step
// through the sizes.
function bindSheetHandle(panel) {
  let moved = false;
  panel.addEventListener('pointerdown', e => {
    if (!panel.classList.contains('psm-sheet') || !e.target.closest('[data-grab]')) return;
    const y0 = e.clientY, h0 = panel.offsetHeight;
    let h = h0;
    moved = false;
    psmPointerDrag(e, ev => {
      const dy = ev.clientY - y0;
      if (!moved && Math.abs(dy) > 5) { moved = true; psmUi._sizing = true; panel.classList.add('psm-sheet-drag'); }
      if (!moved) return;
      ev.preventDefault();
      const g = psmSheetGeom();
      h = Math.round(psmClamp(h0 - dy, PSM_SHEET_MIN, g.bottom - g.topMin));
      psmPlaceSheet(panel, h);
    }, () => {
      panel.classList.remove('psm-sheet-drag');
      psmUi._sizing = false;
      if (!moved) return;
      const tab = psmSheetTab();
      if (h < PSM_SHEET_CLOSE) { psmUi.sheetH[tab] = PSM_SHEET_DEFAULT[tab]; closePanel(); return; }
      const g = psmSheetGeom();
      psmUi.sheetH[tab] = (h + g.kb) / g.full;
      psmPlacePanel();
    });
  });
  panel.addEventListener('click', e => {
    if (!e.target.closest('[data-grab]')) return;
    e.preventDefault();
    if (moved) { moved = false; return; }
    const g = psmSheetGeom();
    const cur = panel.offsetHeight + g.kb;
    const steps = [...PSM_SHEET_STEPS.map(f => f * g.full), g.full - g.topMin];
    const next = steps.find(x => x > cur + 10) || steps[0];
    psmUi.sheetH[psmSheetTab()] = next / g.full;
    psmPlacePanel();
  });
}
