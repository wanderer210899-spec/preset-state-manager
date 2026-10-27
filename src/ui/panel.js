// ─── Panel rendering ──────────────────────────────────────────────────────
// The whole window is redrawn from psmUi on every change (it is small).
// Focus, caret and scroll position survive a redraw, so typing in a box that
// redraws the list feels normal. Clicks, typing and keys are handled by one
// delegated listener each (bindPanelEvents) through these tables:
//   data-act="name"   → PSM_ACTS[name](el, ev)      clicks
//   data-in="name"    → PSM_INPUTS[name](value, el) typing (after IME ends)
//   data-enter="name" → PSM_ACTS[name](el, ev)      Enter in a text box
// Prompt Folders (divs-panel.js) adds its own entries to the same tables.

const PSM_ACTS   = {};
const PSM_INPUTS = {};
let psmDragging = false;       // a SortableJS drag is running: don't redraw
let psmRenderPending = false;

// ─── HTML helpers ─────────────────────────────────────────────────────────

function hA(name, value) { return value === undefined || value === null ? '' : ` ${name}="${esc(value)}"`; }

function btnHtml(label, act, o = {}) {
  return `<button type="button" class="psm-btn${o.cls ? ' ' + o.cls : ''}"${hA('data-act', act)}${hA('data-a', o.a)}${hA('data-b', o.b)}${hA('title', o.title)}${o.disabled ? ' disabled' : ''}${o.attrs || ''}>${o.icon ? psmIcon(o.icon) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
}

function ibHtml(icon, act, label, o = {}) {
  return `<button type="button" class="psm-ib${o.cls ? ' ' + o.cls : ''}"${hA('data-act', act)}${hA('data-a', o.a)}${hA('data-b', o.b)} aria-label="${esc(label)}" title="${esc(o.title || label)}"${o.disabled ? ' disabled' : ''}${o.attrs || ''}>${psmIcon(icon)}</button>`;
}

function miHtml(icon, label, act, o = {}) {
  return `<button type="button" class="psm-mi${o.red ? ' red' : ''}" role="${o.role || 'menuitem'}"${hA('data-act', act)}${hA('data-a', o.a)}${hA('data-b', o.b)}${o.checked !== undefined ? ` aria-checked="${o.checked}"` : ''}>${psmIcon(icon, o.iconCls || '')}<span>${esc(label)}</span></button>`;
}

function swHtml(on, label, act, o = {}) {
  return `<button type="button" class="psm-swr" role="switch" aria-checked="${on}"${hA('data-act', act)}${hA('data-a', o.a)}${o.disabled ? ' disabled' : ''}>
    <span class="psm-swr-t">${esc(label)}</span>
    <span class="psm-sw${on ? ' on' : ''}" aria-hidden="true"></span></button>`;
}

function inpHtml(fk, value, o = {}) {
  return `<input type="text" class="psm-inp" data-fk="${esc(fk)}"${hA('data-in', o.input)}${hA('data-enter', o.enter)}${hA('data-esc', o.esc)}${hA('placeholder', o.ph)} aria-label="${esc(o.label || o.ph || '')}" value="${esc(value)}" autocomplete="off"${o.attrs || ''}>`;
}

function srchHtml(fk, value, ph, input, clearAct) {
  return `<div class="psm-srch">${psmIcon('search')}${inpHtml(fk, value, { ph, input })}
    ${value ? ibHtml('x', clearAct, psmT('clear_filter'), { cls: 'psm-sm mut' }) : ''}</div>`;
}

function crumbHtml(backAct, backLabel, title) {
  return `<div class="psm-crumb">${ibHtml('back', backAct, backLabel)}<h3>${esc(title)}</h3></div>`;
}

// Inline "name + Cancel + Create/Save" row. Phone: buttons go under the box.
function nameRowHtml(fk, value, o) {
  const btns = `${btnHtml(psmT('cancel'), o.cancel)}${btnHtml(o.okLabel, o.ok, { cls: 'psm-go' })}`;
  const input = inpHtml(fk, value, { ph: o.ph, label: o.label, input: o.input, enter: o.ok, esc: o.cancel });
  return psmIsSheet()
    ? `<div class="psm-cf">${input}<div class="psm-cf-b">${btns}</div></div>`
    : `<div class="psm-row">${input}${btns}</div>`;
}

// Inline confirm box for psmUi.confirm, shown where the action started.
function cfHtml(kind, id) {
  const c = psmUi.confirm;
  if (!c || c.kind !== kind || c.id !== id) return '';
  return `<div class="psm-cf${c.danger ? ' red' : ''}" role="alertdialog" aria-label="${esc(c.title)}">
    <p class="psm-cf-t">${esc(c.title)}</p>${c.body ? `<p class="psm-cap">${esc(c.body)}</p>` : ''}
    <div class="psm-cf-b">${btnHtml(psmT('cancel'), 'cfCancel')}${btnHtml(c.ok, 'cfOk', { cls: c.danger ? 'psm-danger' : 'psm-go' })}</div>
  </div>`;
}

function psmAsk(c) {
  psmUi.confirm = c;
  psmUi.menu = null;
  confirmingSnaps.clear();
  psmRender();
}

// ─── Render ───────────────────────────────────────────────────────────────

function psmRender() {
  if (!panelOpen) return;
  if (psmDragging) { psmRenderPending = true; return; }
  const panel = parentDoc.getElementById('psm-panel');
  if (!panel) return;

  const s = settingsLoad();
  if (!s.tools.presets && psmUi.tab === 'presets') psmUi.tab = 'folders';
  if (!s.tools.folders && psmUi.tab === 'folders') psmUi.tab = 'presets';
  if (!s.tools.presets && !s.tools.folders) psmUi.settings = true;

  // Remember focus, caret and scroll.
  const ae = parentDoc.activeElement;
  const inPanel = ae && ae !== panel && panel.contains(ae);
  const fk = inPanel ? ae.dataset.fk : null;
  // A focused button: find the same button again after the redraw.
  const btnKey = inPanel && !fk && ae.dataset.act ? [ae.dataset.act, ae.dataset.a || ''] : null;
  let selS = null, selE = null;
  try { if (fk) { selS = ae.selectionStart; selE = ae.selectionEnd; } } catch (_) {}
  const oldBody = panel.querySelector('.psm-body');
  const viewKey = psmViewKey();
  const scroll = oldBody && psmUi._viewKey === viewKey ? oldBody.scrollTop : 0;
  psmUi._viewKey = viewKey;

  panel.innerHTML = psmPanelHtml(s);

  const body = panel.querySelector('.psm-body');
  if (body) body.scrollTop = scroll;
  const want = psmUi._focus || fk;
  psmUi._focus = null;
  if (want) {
    const el = panel.querySelector(`[data-fk="${want.replace(/"/g, '\\"')}"]`);
    if (el) {
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
      try {
        if (want === fk && selS !== null) el.setSelectionRange(selS, selE);
        else if (el.value) el.setSelectionRange(el.value.length, el.value.length);
      } catch (_) {}
    }
  }
  else if (btnKey) {
    const same = [...panel.querySelectorAll('[data-act]')].find(b => b.dataset.act === btnKey[0] && (b.dataset.a || '') === btnKey[1]);
    try { (same || panel).focus({ preventScroll: true }); } catch (_) {}
  } else if (inPanel) {
    try { panel.focus({ preventScroll: true }); } catch (_) {}
  }
  psmAfterRender(panel);
  psmPlacePanel();
  psmKeepInView(panel);
}

function psmViewKey() {
  const u = psmUi;
  if (u.settings) return 'settings';
  if (u.tab === 'presets') return u.view === 'page' ? 'page:' + u.pagePreset : 'list';
  return 'folders:' + u.fview;
}

// Scrolls the body so an open menu, confirm box or focused box is in view.
function psmKeepInView(panel) {
  const body = panel.querySelector('.psm-body');
  if (!body) return;
  const target = (psmUi._reveal && panel.querySelector(psmUi._reveal)) || panel.querySelector('.psm-menu') || panel.querySelector('.psm-cf[role="alertdialog"]');
  psmUi._reveal = null;
  if (!target || !body.contains(target)) return;
  const br = body.getBoundingClientRect(), tr = target.getBoundingClientRect();
  if (tr.bottom > br.bottom - 4) body.scrollTop += Math.min(tr.bottom - br.bottom + 8, tr.top - br.top - 8);
  else if (tr.top < br.top) body.scrollTop -= br.top - tr.top + 8;
}

function psmAfterRender(panel) {
  if (!psmUi.settings && !psmUi.sel) {
    if (psmUi.tab === 'presets' && psmUi.view === 'list') initPresetSortables(panel);
    if (psmUi.tab === 'folders' && psmUi.fview === 'list' && typeof initPdoFolderSortable === 'function') initPdoFolderSortable(panel);
  }
}

function psmPanelHtml(s) {
  const u = psmUi;
  const tabs = !u.settings || s.tools.presets || s.tools.folders;
  const tabHtml = (key, icon, label) => {
    const on = !u.settings && u.tab === key;
    return `<button type="button" class="psm-tab${on ? ' psm-on' : ''}" data-act="tab" data-a="${key}"${on ? ' aria-current="page"' : ''}>${psmIcon(icon)}<span>${esc(label)}</span></button>`;
  };
  const header = `<button type="button" class="psm-grabz" data-grab="1" aria-label="${esc(psmT('sheet_handle'))}" title="${esc(psmT('sheet_handle'))}"><span class="psm-grab"></span></button>
    <header class="psm-h">
      <span class="psm-drag" title="${esc(psmT('drag_move'))}" aria-hidden="true">${psmIcon('grip')}</span>
      ${tabs ? `<nav class="psm-tabs" aria-label="${esc(psmT('brand'))}">
        ${s.tools.presets ? tabHtml('presets', 'layers', psmT('tab_presets')) : ''}
        ${s.tools.folders ? tabHtml('folders', 'folder', psmT('tab_folders')) : ''}
      </nav>` : `<span class="psm-title">${esc(psmT('brand'))}</span>`}
      ${ibHtml('gear', 'settings', psmT('settings'), { cls: u.settings ? 'psm-on' : '', attrs: ` aria-pressed="${!!u.settings}"` })}
      ${ibHtml('x', 'close', psmT('close'), { title: psmT('close') + ' (Esc)' })}
    </header>`;

  let body;
  if (u.settings) body = psmSettingsHtml(s);
  else if (u.tab === 'presets') body = u.view === 'page' && u.pagePreset ? psmPageHtml() : psmListHtml();
  else if (u.sel?.kind === 'prompt') body = pdoSelectHtml();
  else body = u.fview === 'templates' ? pdoTemplatesHtml() : pdoFoldersHtml();

  return `${header}<div id="psm-strip">${psmStripHtml()}</div>
    <div class="psm-main"><div class="psm-body">${body}</div></div>
    <span class="psm-rsz" data-rsz="1" title="${esc(psmT('drag_resize'))}" aria-hidden="true"></span>`;
}

// ─── Presets tab: list ────────────────────────────────────────────────────

function psmPresetNames() { return allPresetNames().filter(p => p !== 'in_use'); }

function psmFolderOrder(meta) {
  const folders = meta.folders || {};
  const order = (meta.folderOrder || []).filter(f => folders[f]);
  Object.keys(folders).forEach(f => { if (!order.includes(f)) order.push(f); });
  return order;
}

function psmListHtml() {
  const meta    = metaLoad();
  const active  = currentPreset();
  const all     = psmPresetNames();
  const allSet  = new Set(all);
  const q       = filterText.trim().toLowerCase();
  const match   = p => !q || p.toLowerCase().includes(q);
  const folders = meta.folders;
  const order   = psmFolderOrder(meta);
  const notes   = meta.presetNotes || {};
  const inFolder = new Set();
  order.forEach(f => (folders[f].presets || []).forEach(p => inFolder.add(p)));
  let anyMatch = false;
  // Tick mode: every row gets a checkbox; presets already in the target
  // folder are ticked and locked.
  const sel = psmUi.sel?.kind === 'preset' ? psmUi.sel : null;
  const target = sel ? new Set((folders[sel.folder]?.presets) || []) : null;

  const rowHtml = pn => {
    const isActive = pn === active;
    if (sel) {
      const locked = target.has(pn);
      return `<div class="psm-pitem" data-preset="${esc(pn)}">
        <label class="psm-prow sel"><input type="checkbox" data-sel="${esc(pn)}"${locked || sel.ids.has(pn) ? ' checked' : ''}${locked ? ' disabled' : ''}><span class="psm-dot${isActive ? '' : ' off'}"></span><span class="psm-nm" title="${esc(pn)}">${esc(pn)}</span>${isActive ? `<span class="psm-sr">${esc(psmT('active_sr'))}</span>` : ''}</label>
      </div>`;
    }
    const note = notes[pn] || '';
    const noteOpen = !!note && expandedNotes.has(pn);
    return `<div class="psm-pitem" data-preset="${esc(pn)}">
      <div class="psm-prow">
        <span class="psm-grip" title="${esc(psmT('drag_reorder_move'))}" aria-hidden="true">${psmIcon('grip')}</span>
        <button type="button" class="psm-pbtn" data-act="openPage" data-a="${esc(pn)}" title="${esc(pn)}"><span class="psm-dot${isActive ? '' : ' off'}"></span><span class="psm-nm">${esc(pn)}</span>${isActive ? `<span class="psm-sr">${esc(psmT('active_sr'))}</span>` : ''}</button>
        ${note ? ibHtml('note', 'toggleNote', psmT('show_note_for', pn), { a: pn, title: psmT('show_note'), cls: 'psm-sm ' + (noteOpen ? 'psm-on' : 'mut'), attrs: ` aria-pressed="${noteOpen}"` }) : ''}
        ${ibHtml('chevR', 'openPage', psmT('open_x', pn), { a: pn, title: psmT('open_snapshots'), cls: 'psm-sm mut' })}
      </div>
      ${noteOpen ? `<div class="psm-note"><span>${esc(note)}</span><button type="button" class="psm-link" data-act="editNoteFromList" data-a="${esc(pn)}">${esc(psmT('edit_note'))}</button></div>` : ''}
    </div>`;
  };

  let foldersHtml = '';
  order.forEach(fname => {
    const kids = (folders[fname].presets || []).filter(p => allSet.has(p));
    const vis  = kids.filter(match);
    if (q && !vis.length) return;
    if (vis.length) anyMatch = true;
    const open = q || sel ? true : expandedFolders.has(fname);
    const renaming = !sel && psmUi.renaming === 'f:' + fname;
    const menuOpen = !sel && psmUi.menu === 'f:' + fname;
    const count = q ? psmT('n_of_m', vis.length, kids.length) : String(kids.length);
    foldersHtml += `<div class="psm-fblock" data-folder="${esc(fname)}">
      ${renaming ? nameRowHtml('rename', psmUi.renameVal, { ph: psmT('folder_name'), label: psmT('folder_name'), input: 'renameVal', ok: 'renameOk', cancel: 'renameCancel', okLabel: psmT('save') }) : `
      <div class="psm-frow${sel && sel.folder === fname ? ' tgt' : ''}">
        <span class="psm-grip" title="${esc(psmT('drag_reorder'))}" aria-hidden="true">${psmIcon('grip')}</span>
        <button type="button" class="psm-fbtn" data-act="folderToggle" data-a="${esc(fname)}" aria-expanded="${open}">${psmIcon('chevR', 'psm-chev' + (open ? ' open' : ''))}${psmIcon('folder', 'mut')}<span class="psm-fname" title="${esc(fname)}">${esc(fname)}</span><span class="psm-cnt">${esc(count)}</span></button>
        ${!sel ? ibHtml('kebab', 'menu', psmT('actions_for', fname), { a: 'f:' + fname, title: psmT('folder_actions'), cls: 'psm-sm', attrs: ` aria-expanded="${menuOpen}"` }) : ''}
        ${menuOpen ? `<div class="psm-menu" role="menu">
          ${miHtml('plus', psmT('add_presets'), 'pickPresets', { a: fname })}
          ${miHtml('pencil', psmT('rename'), 'folderRename', { a: fname })}
          ${miHtml('trash', psmT('delete_folder'), 'folderDelete', { a: fname, red: true })}
        </div>` : ''}
      </div>`}
      ${cfHtml('delFolder', fname)}
      ${open ? `<div class="psm-kids">
        <div class="psm-plist" data-folder="${esc(fname)}">${vis.map(rowHtml).join('')}</div>
        ${!kids.length ? `<p class="psm-cap" style="padding: 6px 4px">${esc(psmT('folder_empty'))}</p>` : ''}
        ${!q && !sel ? `<button type="button" class="psm-addrow" data-act="pickPresets" data-a="${esc(fname)}">${psmIcon('plus')}<span>${esc(psmT('add_presets'))}</span></button>` : ''}
      </div>` : `<div class="psm-plist psm-closed" data-folder="${esc(fname)}"></div>`}
    </div>`;
  });

  const ungrouped = all.filter(p => !inFolder.has(p) && match(p));
  if (ungrouped.length) anyMatch = true;
  const nf = psmUi.newFolder;

  return `
    ${sel ? psmSelBarHtml() : ''}
    ${srchHtml('filter', filterText, psmT('filter_presets'), 'filter', 'clearFilter')}
    ${!sel ? `<div class="psm-row">
      <button type="button" class="psm-btn psm-quiet psm-act" data-act="openPage" data-a="${esc(active)}" title="${esc(psmT('open_active'))}"><span class="psm-dot"></span><span class="psm-cap">${esc(psmT('active'))}</span><span class="psm-nm">${esc(active)}</span>${psmIcon('chevR', 'mut')}</button>
      ${btnHtml(psmT('new_folder'), 'newFolder', { icon: 'plus' })}
    </div>` : ''}
    ${nf !== null && !sel ? nameRowHtml('newFolder', nf, { ph: psmT('folder_name'), label: psmT('new_folder'), input: 'newFolder', ok: 'newFolderOk', cancel: 'newFolderCancel', okLabel: psmT('create') }) : ''}
    ${!order.length && !q && !sel ? `<div class="psm-empty"><p class="psm-cap">${esc(psmT('no_preset_folders'))}</p>${btnHtml(psmT('new_folder'), 'newFolder', { icon: 'plus' })}</div>` : ''}
    <div class="psm-fl" id="psm-flist">${foldersHtml}</div>
    <div class="psm-fl">
      <p class="psm-lbl psm-ug-lbl${ungrouped.length ? '' : ' psm-ug-zone'}">${esc(psmT('ungrouped'))}</p>
      <div class="psm-plist" data-folder="">${ungrouped.map(rowHtml).join('')}</div>
    </div>
    ${q && !anyMatch ? `<p class="psm-cap">${esc(psmT('no_presets_match', filterText.trim()))}</p>` : ''}
    ${!all.length ? `<p class="psm-cap">${esc(psmT('no_presets'))}</p>` : ''}`;
}

// ─── Presets tab: preset page ─────────────────────────────────────────────

function psmFmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts), now = new Date();
  const loc = PSM_LANG === 'zh' ? 'zh-CN' : 'en-GB';
  try {
    if (d.toDateString() === now.toDateString()) {
      return psmT('today_at', d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false }));
    }
    const opts = { day: 'numeric', month: 'short' };
    if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString(loc, opts);
  } catch (_) { return d.toISOString().slice(0, 10); }
}

function psmOnCount(states) {
  const vals = Object.values(states || {});
  return psmT('on_count', vals.filter(Boolean).length, vals.length);
}

// Prompts the snapshot would turn on (plus) and off (minus), compared to now.
function psmDiff(snapStates, nowStates) {
  let plus = 0, minus = 0;
  Object.entries(snapStates || {}).forEach(([id, on]) => {
    if (!(id in nowStates)) return;
    if (on && !nowStates[id]) plus++;
    if (!on && nowStates[id]) minus++;
  });
  return { plus, minus };
}

function psmDiffText(d) {
  if (!d.plus && !d.minus) return psmT('same_now');
  const parts = [];
  if (d.plus) parts.push(psmT('diff_on', d.plus));
  if (d.minus) parts.push(psmT('diff_off', d.minus));
  return parts.join(' ');
}

function psmPageHtml() {
  const pn       = psmUi.pagePreset;
  const active   = currentPreset();
  const isActive = pn === active;
  const meta     = metaLoad();
  const folder   = getFolderForPreset(pn);
  const note     = (meta.presetNotes || {})[pn] || '';
  const snaps    = dbLoad()[pn] || {};
  const lastSnap = (meta.activeSnaps || {})[pn];
  const working  = !!psmUi.busy;
  // "Now" = the live on/off pattern for the active preset, the saved one otherwise.
  const nowStates = isActive ? currentStates() : (originalStatesFor(pn)?.states || {});

  // One button: switch to this preset, or reset the active one, to the saved
  // state. While it runs, the button shows the wait instead.
  const b = psmUi.busy;
  const actBusy = !!b && b.presetName === pn && (b.snapName === null || b.snapName === ORIGINAL_KEY);
  const short = psmIsSheet();
  let actSec;
  if (actBusy) {
    // The active preset changes halfway through a switch, so the label
    // follows the operation, not the page.
    const reset = b.snapName === ORIGINAL_KEY;
    actSec = `<div class="psm-btn psm-full psm-busy" role="status"><span class="psm-spin" aria-hidden="true"></span><span>${esc(psmT(reset ? (short ? 'resetting_wait_s' : 'resetting_wait') : (short ? 'switching_wait_s' : 'switching_wait')))}</span></div>`;
  } else if (psmUi.confirm?.kind === 'resetPreset' && psmUi.confirm.id === pn) {
    actSec = cfHtml('resetPreset', pn);
  } else {
    actSec = btnHtml(psmT(isActive ? 'reset_saved' : 'switch_to'), 'presetAct', { icon: isActive ? 'restore' : 'swap', cls: 'psm-full', disabled: working });
  }

  // Folder picker
  const fMenuOpen = psmUi.menu === 'pgf';
  const fOpts = [['', psmT('ungrouped')]].concat(psmFolderOrder(meta).map(f => [f, f]));
  const folderSec = `<div class="psm-sec">
    <p class="psm-lbl">${esc(psmT('folder_label'))}</p>
    <div class="psm-fldw">
      <button type="button" class="psm-btn psm-fsel" data-act="menu" data-a="pgf" aria-haspopup="menu" aria-expanded="${fMenuOpen}">${psmIcon('folder', 'mut')}<span class="psm-nm">${esc(folder || psmT('ungrouped'))}</span>${psmIcon('chevD', 'mut')}</button>
      ${fMenuOpen ? `<div class="psm-menu full" role="menu">
        ${fOpts.map(([id, label]) => miHtml('check', label, 'setFolder', { a: id, role: 'menuitemradio', checked: (folder || '') === id, iconCls: (folder || '') === id ? '' : 'hide' })).join('')}
        ${miHtml('plus', psmT('new_folder'), 'newFolderPg')}
      </div>` : ''}
    </div>
    ${psmUi.newFolderPg !== null ? nameRowHtml('newFolderPg', psmUi.newFolderPg, { ph: psmT('folder_name'), label: psmT('new_folder'), input: 'newFolderPg', ok: 'newFolderPgOk', cancel: 'newFolderPgCancel', okLabel: psmT('create') }) : ''}
  </div>`;

  // Note
  const editing = psmUi.noteEdit === pn;
  const noteSec = `<div class="psm-sec">
    <div class="psm-row"><p class="psm-lbl" style="flex: 1">${esc(psmT('note_label'))}</p>${!editing ? btnHtml(note ? psmT('edit') : psmT('add_note'), 'editNote', { icon: 'pencil', cls: 'psm-sm psm-quiet' }) : ''}</div>
    ${!editing && note ? `<p class="psm-notetext">${esc(note)}</p>` : ''}
    ${editing ? `<textarea class="psm-inp psm-ta" data-fk="note" data-in="noteDraft" aria-label="${esc(psmT('note_label'))}" style="height: auto; min-height: 88px; padding: 8px 10px; resize: vertical; line-height: 1.45">${esc(psmUi.noteDraft)}</textarea>
      <div class="psm-cf-b">${btnHtml(psmT('cancel'), 'noteCancel')}${btnHtml(psmT('save_note'), 'noteSave', { cls: 'psm-go' })}</div>` : ''}
  </div>`;

  // Save box (active preset only)
  const exists = psmUi.saveName.trim() ? findSnapKey(pn, psmUi.saveName) : null;
  const saveSec = isActive ? `
    <div class="psm-row">
      ${inpHtml('saveName', psmUi.saveName, { ph: psmT('name_snapshot_ph'), label: psmT('new_snap_name'), input: 'saveName', enter: 'saveSnap' })}
      ${btnHtml(exists ? psmT('replace_dots') : psmT('save'), 'saveSnap', { cls: exists ? 'psm-danger-o' : '', disabled: !psmUi.saveName.trim() || working })}
    </div>
    ${cfHtml('saveOver', 'save')}` : '';

  // Snapshot cards
  const card = key => {
    const sn = snaps[key];
    const isCur = lastSnap === key;
    const isWorking = working && psmUi.busy.presetName === pn && psmUi.busy.snapName === key;
    const confirming = !working && confirmingSnaps.has(snapKey(pn, key));
    const renaming = psmUi.renaming === 's:' + key;
    const menuOpen = psmUi.menu === 's:' + key;
    const d = psmDiff(sn.states, nowStates);
    const parts = [psmOnCount(sn.states)];
    if (sn.savedAt) parts.push(psmFmtDate(sn.savedAt));
    parts.push(psmDiffText(d));
    const applyText = !isActive ? psmT('apply_other')
      : (d.plus || d.minus) ? psmT('apply_changes', d.plus, d.minus) : psmT('apply_same');

    return `<div class="psm-snap${isCur ? ' cur' : ''}" data-snap="${esc(key)}">
      <div class="psm-snap-top">
        <div class="psm-snap-txt">
          ${renaming ? inpHtml('renameSnap', psmUi.renameVal, { label: psmT('snap_name'), input: 'renameVal', enter: 'renameOk', esc: 'renameCancel' }) : `<span class="psm-snap-name">${esc(key)}</span>`}
          <span class="psm-cap">${esc(parts.join(' · '))}</span>
          ${isCur ? `<span class="psm-tag q" style="align-self: flex-start">${psmIcon('check')}${esc(psmT('last_applied'))}</span>` : ''}
        </div>
        ${!confirming && !isWorking && !renaming ? btnHtml(psmT('apply'), 'applyAsk', { a: key, disabled: working }) : ''}
        ${isWorking ? `<span class="psm-wk"><span class="psm-spin" aria-hidden="true"></span>${esc(psmT('applying'))}</span>` : ''}
        ${!renaming ? ibHtml('kebab', 'menu', psmT('more_for', key), { a: 's:' + key, title: psmT('more'), cls: 'psm-sm', disabled: working, attrs: ` aria-expanded="${menuOpen}"` }) : ''}
        ${menuOpen ? `<div class="psm-menu" role="menu">
          ${miHtml('pencil', psmT('rename'), 'snapRename', { a: key })}
          ${isActive ? miHtml('restore', psmT('replace_current'), 'snapOverwrite', { a: key }) : ''}
          ${miHtml('trash', psmT('del'), 'snapDelete', { a: key, red: true })}
        </div>` : ''}
      </div>
      ${confirming ? `<div class="psm-cf" role="alertdialog" aria-label="${esc(psmT('apply_q', key))}">
        <p class="psm-cf-t">${esc(psmT('apply_q', key))}</p><p class="psm-cap">${esc(applyText)}</p>
        <div class="psm-cf-b">${btnHtml(psmT('cancel'), 'applyCancel', { a: key })}${btnHtml(psmT('confirm_btn'), 'applyOk', { a: key, cls: 'psm-go', icon: 'check' })}</div>
      </div>` : ''}
      ${cfHtml('delSnap', key)}${cfHtml('overSnap', key)}
      ${renaming ? `<div class="psm-cf-b">${btnHtml(psmT('cancel'), 'renameCancel')}${btnHtml(psmT('save_name'), 'renameOk', { cls: 'psm-go' })}</div>` : ''}
    </div>`;
  };
  const keys = Object.keys(snaps);

  // Prompt states
  const prompts = isActive ? readPrompts() : (() => { try { return getPreset(pn).prompts || []; } catch (_) { return []; } })();
  const shown = prompts.filter(p => (isActive && psmUi.showOff) || p.enabled);
  const statesSec = `<div class="psm-sec">
    <button type="button" class="psm-disc" data-act="toggleStates" aria-expanded="${psmUi.statesOpen}">${psmIcon('chevR', 'psm-chev' + (psmUi.statesOpen ? ' open' : ''))}<span class="psm-lbl">${esc(psmT('prompt_states'))}</span><span class="psm-cap" style="margin-left: auto">${esc(psmT('on_count', prompts.filter(p => p.enabled).length, prompts.length))}</span></button>
    ${psmUi.statesOpen ? `
      ${isActive ? swHtml(psmUi.showOff, psmT('include_off'), 'toggleShowOff') : ''}
      <div class="psm-pst">${shown.length ? shown.map(p => `<div class="psm-pst-r"><span class="psm-sd${p.enabled ? '' : ' off'}" aria-hidden="true"></span><span>${esc(p.name)}</span></div>`).join('') : `<p class="psm-cap">${esc(psmT('all_disabled'))}</p>`}</div>` : ''}
  </div>`;

  return `${crumbHtml('back', psmT('back_all'), pn)}
    ${isActive ? `<div class="psm-row" style="margin-top: -6px"><span class="psm-tag"><span class="psm-dot"></span>${esc(psmT('active_preset'))}</span></div>` : ''}
    ${actSec}
    ${folderSec}${noteSec}
    <hr class="psm-hr">
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('snapshots_lbl'))}</p>
      ${saveSec}
      <div class="psm-snaps">${keys.map(card).join('')}</div>
      ${!keys.length ? `<p class="psm-cap">${esc(psmT('no_snaps'))}</p>` : ''}
    </div>
    <hr class="psm-hr">
    ${statesSec}`;
}

// ─── Settings ─────────────────────────────────────────────────────────────

function psmSettingsHtml(s) {
  const drawerShown = s.entries.drawer && (s.tools.presets || s.tools.folders);
  const tools = [
    ['presets', psmT('tool_presets')],
    ['folders', psmT('tab_folders')],
    ['search',  psmT('tool_search')],
  ];
  return `${crumbHtml('settings', psmT('back'), psmT('settings'))}
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('tools'))}</p>
      ${tools.map(([k, label]) => swHtml(s.tools[k], label, 'toolToggle', { a: k })).join('')}
    </div>
    <hr class="psm-hr">
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('open_from'))}</p>
      ${swHtml(s.entries.drawer, psmT('entry_drawer'), 'entryToggle', { a: 'drawer' })}
      ${swHtml(psmExtEntryShown(s), psmT('entry_ext'), 'entryToggle', { a: 'ext', disabled: !drawerShown })}
    </div>
    <hr class="psm-hr">
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('backup'))}</p>
      <div class="psm-seg" role="group" aria-label="${esc(psmT('export_what'))}">
        ${[['snapshots', psmT('export_snapshots')], ['folders', psmT('export_folders')], ['both', psmT('export_both')]].map(([k, l]) =>
          `<button type="button" class="${s.exportWhat === k ? 'psm-on' : ''}" data-act="exportWhat" data-a="${k}" aria-pressed="${s.exportWhat === k}">${esc(l)}</button>`).join('')}
      </div>
      <div class="psm-row">${btnHtml(psmT('export'), 'doExport', { icon: 'download', cls: 'psm-wide' })}${btnHtml(psmT('import_btn'), 'doImport', { icon: 'upload', cls: 'psm-wide' })}</div>
      ${cfHtml('import', 'import')}
    </div>
    <hr class="psm-hr">
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('danger_zone'))}</p>
      ${btnHtml(psmT('reset_all'), 'askReset', { icon: 'trash', cls: 'psm-danger-o', attrs: ' style="align-self: flex-start"' })}
      ${cfHtml('reset', 'reset')}
    </div>`;
}

// ─── Tick mode: "Add to folder" (preset and prompt folders) ───────────────
// The list itself gets checkboxes and a sticky bar with Cancel / Add N.
// Ticking an item that sits in another folder moves it here.
// PSM_SELECT[kind] = { title(folder), add(folder, ids) }

const PSM_SELECT = {
  preset: {
    title: f => psmT('add_to', f),
    add(folder, ids) {
      const m = metaLoad();
      if (!m.folders[folder]) return;
      Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(p => !ids.includes(p)); });
      ids.forEach(p => m.folders[folder].presets.push(p));
      try { metaSave(m); } catch (e) { ERR('add to folder:', e); psmSay('err', psmT('save_failed')); return; }
      expandedFolders.add(folder);
      psmSay('ok', psmT('added_n', ids.length, folder));
    },
  },
};

function psmStartSel(kind, folder) {
  Object.assign(psmUi, { sel: { kind, folder, ids: new Set() }, selq: '', menu: null, confirm: null, renaming: null,
    newFolder: null, newPF: null, iconFor: null });
  if (kind === 'preset') Object.assign(psmUi, { tab: 'presets', view: 'list' });
  else Object.assign(psmUi, { tab: 'folders', fview: 'list' });
  psmUi._reveal = null;
  psmRender();
  const body = parentDoc.querySelector('#psm-panel .psm-body');
  if (body) body.scrollTop = 0;
}

function psmSelBarHtml() {
  const k = psmUi.sel;
  const n = k.ids.size;
  const title = PSM_SELECT[k.kind].title(k.folder);
  return `<div class="psm-selbar">
    <div class="psm-selbar-t"><span class="psm-cf-t" title="${esc(title)}">${esc(title)}</span><span class="psm-cap">${esc(psmT('n_selected', n))}</span></div>
    ${btnHtml(psmT('cancel'), 'selCancel')}${btnHtml(n ? psmT('add_n', n) : psmT('add'), 'selAdd', { cls: 'psm-go', disabled: !n })}
  </div>`;
}

// ─── Drag and drop (SortableJS): preset folders ───────────────────────────

function initPresetSortables(panel) {
  const Sortable = window.parent.Sortable;
  if (!Sortable) return;
  const flist = panel.querySelector('#psm-flist');
  if (!flist) return;

  const base = {
    animation:           150,
    delay:               psmIsTouch() ? 150 : 0,
    delayOnTouchOnly:    true,
    touchStartThreshold: 5,
    ghostClass:          'psm-sortable-ghost',
    chosenClass:         'psm-sortable-chosen',
    // Scroll only the panel's own list. Bubbling up would scroll SillyTavern's
    // page too, which shifts the phone sheet away from the finger.
    scroll:              panel.querySelector('.psm-body') || true,
    bubbleScroll:        false,
  };
  // kind 'p' = a preset drag: only then do closed folders take drops.
  const startDrag = kind => { psmDragging = true; panel.classList.add('psm-dragging'); if (kind) panel.classList.add('psm-dragging-' + kind); psmUi.menu = null; };
  const endDrag = () => {
    psmDragging = false;
    panel.classList.remove('psm-dragging', 'psm-dragging-p');
    panel.querySelectorAll('.psm-drag-over').forEach(el => el.classList.remove('psm-drag-over'));
    spacer.remove();
  };
  // While a preset hovers a closed folder it sits in that folder's hidden
  // list. A spacer keeps its old space, so the rows below don't slide up
  // under the pointer.
  const spacer = parentDoc.createElement('div');
  spacer.className = 'psm-drag-spacer';
  let origin = null;
  const redrawSoon = () => setTimeout(() => { psmRenderPending = false; psmRender(); }, 170);

  Sortable.create(flist, {
    ...base,
    group:     { name: 'psm-folders', pull: false, put: false },
    draggable: '.psm-fblock',
    handle:    '.psm-frow > .psm-grip',
    onStart:   () => startDrag(),
    onEnd() {
      endDrag();
      const m = metaLoad();
      const shown = [...flist.querySelectorAll(':scope > .psm-fblock')].map(el => el.dataset.folder);
      const hidden = psmFolderOrder(m).filter(f => !shown.includes(f));
      m.folderOrder = [...shown, ...hidden];
      metaSave(m);
      redrawSoon();
    },
  });

  // Merge the on-screen order with presets hidden by the filter (or deleted
  // from SillyTavern), so dragging never drops data that isn't shown.
  const mergePresets = (listEl, existing, exclude) => {
    const dom = [...listEl.querySelectorAll(':scope > .psm-pitem')].map(el => el.dataset.preset).filter(Boolean);
    const domSet = new Set(dom);
    return [...dom, ...(existing || []).filter(p => !domSet.has(p) && p !== exclude)];
  };

  panel.querySelectorAll('.psm-plist').forEach(el => {
    Sortable.create(el, {
      ...base,
      group:                { name: 'psm-presets', pull: true, put: true },
      draggable:            '.psm-pitem',
      handle:               '.psm-prow > .psm-grip',
      emptyInsertThreshold: 8,
      onStart(evt) {
        startDrag('p');
        origin = { list: evt.from, next: evt.item.nextElementSibling, h: evt.item.offsetHeight };
      },
      onMove(evt) {
        panel.querySelectorAll('.psm-drag-over').forEach(b => b.classList.remove('psm-drag-over'));
        const block = evt.to?.closest?.('.psm-fblock');
        const closed = !!block && evt.to.classList.contains('psm-closed');
        if (closed) block.classList.add('psm-drag-over');
        if (closed && origin && !spacer.isConnected) {
          spacer.style.height = origin.h + 'px';
          const next = origin.next?.parentNode === origin.list ? origin.next : null;
          origin.list.insertBefore(spacer, next);
        } else if (!closed) spacer.remove();
      },
      onEnd(evt) {
        endDrag();
        const from = evt.from.dataset.folder ?? '', to = evt.to.dataset.folder ?? '';
        const moved = evt.item.dataset.preset;
        if (evt.from === evt.to && evt.oldIndex === evt.newIndex) { redrawSoon(); return; }
        const m = metaLoad();
        if (to && m.folders[to]) m.folders[to].presets = mergePresets(evt.to, m.folders[to].presets);
        if (from && from !== to && m.folders[from]) m.folders[from].presets = mergePresets(evt.from, m.folders[from].presets, moved);
        metaSave(m);
        if (to && from !== to) expandedFolders.add(to);
        redrawSoon();
      },
    });
  });
}

// ─── Data reset / export / import ─────────────────────────────────────────

function doExport(kind) {
  const payload = { version: 1, exported: new Date().toISOString(), kind };
  if (kind === 'snapshots' || kind === 'both') payload.snapshots = dbLoad();
  if (kind === 'folders'   || kind === 'both') payload.meta      = metaLoad();

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = window.parent.URL.createObjectURL(blob);
  const a    = parentDoc.createElement('a');
  const tag  = kind === 'snapshots' ? 'snapshots' : kind === 'folders' ? 'folders' : 'backup';
  a.href = url; a.download = 'psm-' + tag + '-' + new Date().toISOString().slice(0, 10) + '.json';
  parentDoc.body.appendChild(a); a.click();
  parentDoc.body.removeChild(a); window.parent.URL.revokeObjectURL(url);
  psmSay('ok', psmT('toast_exported'));
}

// Reads the file first, then asks inline before replacing anything.
function importData() {
  const input = parentDoc.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new window.parent.FileReader();
    reader.onload = function(ev) {
      let d;
      try { d = JSON.parse(ev.target.result); } catch { psmSay('err', psmT('toast_read_fail')); return; }
      const hasSnaps = !!d && typeof d.snapshots === 'object' && d.snapshots !== null;
      const hasMeta  = !!d && typeof d.meta      === 'object' && d.meta      !== null;
      if (!hasSnaps && !hasMeta) { psmSay('err', psmT('toast_invalid_backup')); return; }
      psmAsk({
        kind: 'import', id: 'import', danger: true, ok: psmT('overwrite'), title: psmT('import_q'),
        body: (hasSnaps && hasMeta) ? psmT('import_all_body') : hasSnaps ? psmT('import_snaps_body') : psmT('import_meta_body'),
        run() {
          try {
            if (hasSnaps) dbSave(d.snapshots);
            if (hasMeta)  metaSave(d.meta);
          } catch (err) { ERR('import:', err); psmSay('err', psmT('save_failed')); return; }
          psmSay('ok', psmT('toast_imported'));
        },
      });
    };
    reader.onerror = () => psmSay('err', psmT('toast_read_fail'));
    reader.readAsText(file);
  };
  parentDoc.body.appendChild(input); input.click(); parentDoc.body.removeChild(input);
}

// ─── Presets: folder operations ───────────────────────────────────────────

function psmFolderExists(m, name, except) {
  const k = name.toLowerCase();
  return Object.keys(m.folders).some(f => f !== except && f.toLowerCase() === k);
}

function psmCreateFolder(rawName, assignPreset) {
  const name = String(rawName || '').trim();
  if (!name) return false;
  const m = metaLoad();
  if (psmFolderExists(m, name)) { psmSay('err', psmT('toast_folder_exists')); return false; }
  m.folders[name] = { presets: [] };
  m.folderOrder = psmFolderOrder(m).filter(f => f !== name).concat(name);
  if (assignPreset) {
    Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(p => p !== assignPreset); });
    m.folders[name].presets.push(assignPreset);
  }
  metaSave(m);
  expandedFolders.add(name);
  return true;
}

function confirmRename(oldName, rawName) {
  const newName = String(rawName || '').trim();
  if (!newName || newName === oldName) return true;
  const m = metaLoad();
  if (psmFolderExists(m, newName, oldName)) { psmSay('err', psmT('toast_folder_exists')); return false; }
  const order = psmFolderOrder(m);
  m.folders[newName] = m.folders[oldName];
  delete m.folders[oldName];
  m.folderOrder = order.map(f => f === oldName ? newName : f);
  metaSave(m);
  if (expandedFolders.has(oldName)) { expandedFolders.delete(oldName); expandedFolders.add(newName); }
  return true;
}

function psmSetPresetFolder(pn, folder) {
  const m = metaLoad();
  const was = getFolderForPreset(pn) || '';
  if (was === folder) return;
  Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(p => p !== pn); });
  if (folder && m.folders[folder]) m.folders[folder].presets.push(pn);
  try { metaSave(m); } catch (e) { ERR('set folder:', e); psmSay('err', psmT('save_failed')); }
}

// ─── Actions ──────────────────────────────────────────────────────────────

function psmOpenPage(pn) {
  Object.assign(psmUi, { tab: 'presets', settings: false, sel: null, view: 'page', pagePreset: pn,
    menu: null, confirm: null, renaming: null, noteEdit: null, saveName: '', newFolderPg: null });
  confirmingSnaps.clear();
}

Object.assign(PSM_ACTS, {
  close: () => closePanel(),
  dismiss: () => { psmUi.status = null; psmRenderStrip(); },
  retry: () => psmRetry(),
  tab(el) {
    Object.assign(psmUi, { tab: el.dataset.a, settings: false, sel: null, menu: null, confirm: null, renaming: null, fview: 'list' });
    if (el.dataset.a === 'presets') psmUi.view = 'list';
    psmOnTabShown();
  },
  settings() { Object.assign(psmUi, { settings: !psmUi.settings, menu: null, confirm: null, sel: null, renaming: null }); },
  menu(el) {
    const k = el.dataset.a;
    psmUi.menu = psmUi.menu === k ? null : k;
    psmUi.confirm = null;
  },
  cfCancel() { psmUi.confirm = null; },
  cfOk() {
    const c = psmUi.confirm;
    psmUi.confirm = null;
    if (c?.run) c.run();
  },

  // list
  clearFilter() { filterText = ''; psmUi._focus = 'filter'; },
  openPage(el) { psmOpenPage(el.dataset.a); },
  toggleNote(el) { toggleSet(expandedNotes, el.dataset.a); },
  editNoteFromList(el) {
    const pn = el.dataset.a;
    psmOpenPage(pn);
    psmUi.noteEdit = pn;
    psmUi.noteDraft = (metaLoad().presetNotes || {})[pn] || '';
    psmUi._focus = 'note';
  },
  folderToggle(el) { if (!filterText.trim()) toggleSet(expandedFolders, el.dataset.a); },
  newFolder() { psmUi.newFolder = ''; psmUi.menu = null; psmUi._focus = 'newFolder'; psmUi._reveal = '[data-fk="newFolder"]'; },
  newFolderCancel() { psmUi.newFolder = null; },
  newFolderOk() { if (psmCreateFolder(psmUi.newFolder)) psmUi.newFolder = null; },
  folderRename(el) {
    Object.assign(psmUi, { renaming: 'f:' + el.dataset.a, renameVal: el.dataset.a, menu: null, _focus: 'rename', _reveal: '[data-fk="rename"]' });
  },
  folderDelete(el) {
    const fname = el.dataset.a;
    const all = new Set(psmPresetNames());
    const n = ((metaLoad().folders[fname] || {}).presets || []).filter(p => all.has(p)).length;
    psmAsk({
      kind: 'delFolder', id: fname, danger: true, ok: psmT('del'),
      title: psmT('del_folder_q', fname),
      body: n ? psmT('del_folder_body') : '',
      run() {
        const m = metaLoad();
        delete m.folders[fname];
        m.folderOrder = (m.folderOrder || []).filter(f => f !== fname);
        metaSave(m);
        expandedFolders.delete(fname);
        psmSay('ok', psmT('toast_deleted', fname));
      },
    });
    return false;
  },
  renameCancel() { psmUi.renaming = null; },
  renameOk() {
    const r = psmUi.renaming;
    if (!r) return;
    const kind = r.slice(0, 1), id = r.slice(2);
    let ok = true;
    if (kind === 'f') ok = confirmRename(id, psmUi.renameVal);
    else if (kind === 's') ok = psmRename(psmUi.pagePreset, id, psmUi.renameVal);
    else if (kind === 'p') ok = pdoRenameFromPanel(id, psmUi.renameVal);
    if (ok) psmUi.renaming = null;
  },
  pickPresets(el) { psmStartSel('preset', el.dataset.a); return false; },

  // page
  back() { Object.assign(psmUi, { view: 'list', menu: null, confirm: null, renaming: null }); confirmingSnaps.clear(); },
  setFolder(el) { psmUi.menu = null; psmSetPresetFolder(psmUi.pagePreset, el.dataset.a); },
  newFolderPg() { psmUi.menu = null; psmUi.newFolderPg = ''; psmUi._focus = 'newFolderPg'; psmUi._reveal = '[data-fk="newFolderPg"]'; },
  newFolderPgCancel() { psmUi.newFolderPg = null; },
  newFolderPgOk() { if (psmCreateFolder(psmUi.newFolderPg, psmUi.pagePreset)) psmUi.newFolderPg = null; },
  editNote() {
    psmUi.noteEdit = psmUi.pagePreset;
    psmUi.noteDraft = (metaLoad().presetNotes || {})[psmUi.pagePreset] || '';
    psmUi._focus = 'note';
  },
  noteCancel() { psmUi.noteEdit = null; },
  noteSave() {
    const m = metaLoad();
    m.presetNotes[psmUi.noteEdit] = psmUi.noteDraft.trim();
    try { metaSave(m); } catch (e) { ERR('note:', e); psmSay('err', psmT('save_failed')); return; }
    psmUi.noteEdit = null;
    psmSay('ok', psmT('toast_note_saved'));
  },
  saveSnap() {
    const pn = psmUi.pagePreset, name = psmUi.saveName.trim();
    if (!name || pn !== currentPreset() || psmUi.busy) return;
    const ex = findSnapKey(pn, name);
    if (ex) {
      psmAsk({ kind: 'saveOver', id: 'save', danger: true, ok: psmT('replace'), title: psmT('replace_q', ex), body: '',
        run() { if (psmSave(pn, ex)) psmUi.saveName = ''; } });
      return false;
    }
    if (psmSave(pn, name)) psmUi.saveName = '';
  },
  // Other preset: switch right away. Active preset: reset, after a confirm.
  presetAct() {
    const pn = psmUi.pagePreset;
    if (psmUi.busy) return;
    if (pn !== currentPreset()) { psmApplyOriginal(pn, true); return false; }
    psmAsk({ kind: 'resetPreset', id: pn, danger: true, ok: psmT('reset_btn'), title: psmT('reset_saved_q'), body: psmT('reset_saved_body'),
      run() { psmApplyOriginal(pn); } });
    return false;
  },
  applyAsk(el) {
    confirmingSnaps.clear();
    confirmingSnaps.add(snapKey(psmUi.pagePreset, el.dataset.a));
    psmUi.menu = null; psmUi.confirm = null;
  },
  applyCancel(el) { confirmingSnaps.delete(snapKey(psmUi.pagePreset, el.dataset.a)); },
  applyOk(el) { psmApply(psmUi.pagePreset, el.dataset.a); return false; },
  snapRename(el) { Object.assign(psmUi, { renaming: 's:' + el.dataset.a, renameVal: el.dataset.a, menu: null, _focus: 'renameSnap', _reveal: '.psm-snap [data-fk="renameSnap"]' }); },
  snapOverwrite(el) {
    const key = el.dataset.a, pn = psmUi.pagePreset;
    psmAsk({ kind: 'overSnap', id: key, danger: true, ok: psmT('replace'), title: psmT('replace_cur_q', key), body: '',
      run() { psmSave(pn, key); } });
    return false;
  },
  snapDelete(el) {
    const key = el.dataset.a, pn = psmUi.pagePreset;
    psmAsk({ kind: 'delSnap', id: key, danger: true, ok: psmT('del'), title: psmT('del_q', key), body: '',
      run() { psmDelete(pn, key); } });
    return false;
  },
  toggleStates() { psmUi.statesOpen = !psmUi.statesOpen; },
  toggleShowOff() { psmUi.showOff = !psmUi.showOff; },

  // tick mode
  selCancel() { psmUi.sel = null; },
  selAdd() {
    const k = psmUi.sel;
    if (!k || !k.ids.size) return;
    PSM_SELECT[k.kind].add(k.folder, [...k.ids]);
    psmUi.sel = null;
  },

  // settings
  toolToggle(el) {
    const s = settingsLoad();
    s.tools[el.dataset.a] = !s.tools[el.dataset.a];
    settingsSave(s);
    psmRefreshEntryRow();
    if (typeof schedulePdoRepaint === 'function') schedulePdoRepaint();
  },
  entryToggle(el) {
    const s = settingsLoad();
    const k = el.dataset.a;
    s.entries[k] = !s.entries[k];
    settingsSave(s);
    psmRefreshEntryRow();
  },
  exportWhat(el) { const s = settingsLoad(); s.exportWhat = el.dataset.a; settingsSave(s); },
  doExport() { doExport(settingsLoad().exportWhat); },
  doImport() { importData(); return false; },
  askReset() {
    psmAsk({ kind: 'reset', id: 'reset', danger: true, ok: psmT('reset_ok'), title: psmT('reset_q'), body: psmT('reset_body'),
      run() {
        dbSave({});
        metaSave({ folders: {}, presetNotes: {}, folderOrder: [] });
        expandedFolders.clear();
        expandedNotes.clear();
        filterText = '';
        psmSay('ok', psmT('toast_data_reset'));
      } });
    return false;
  },
});

Object.assign(PSM_INPUTS, {
  filter(v) { filterText = v; },
  newFolder(v) { psmUi.newFolder = v; return false; },
  newFolderPg(v) { psmUi.newFolderPg = v; return false; },
  renameVal(v) { psmUi.renameVal = v; return false; },
  noteDraft(v) { psmUi.noteDraft = v; return false; },
  saveName(v) { psmUi.saveName = v; if (psmUi.confirm?.kind === 'saveOver') psmUi.confirm = null; },
  selq(v) { psmUi.selq = v; },
});

// ─── Event wiring (once) ──────────────────────────────────────────────────

function bindPanelEvents() {
  const panel = parentDoc.getElementById('psm-panel');
  if (!panel || panel.dataset.psmBound === '1') return;
  panel.dataset.psmBound = '1';

  panel.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    // A click anywhere else closes an open ⋯ menu.
    let dirty = false;
    if (psmUi.menu && !ev.target.closest('.psm-menu') && !(el && el.dataset.act === 'menu')) { psmUi.menu = null; dirty = true; }
    if (el && panel.contains(el) && !el.disabled) {
      const fn = PSM_ACTS[el.dataset.act];
      if (fn) {
        ev.preventDefault();
        // An action returns false when it already redrew (or will redraw) itself.
        if (fn(el, ev) !== false) dirty = true;
      }
    }
    if (dirty) psmRender();
  });

  panel.addEventListener('change', ev => {
    const cb = ev.target.closest('[data-sel]');
    if (!cb || !psmUi.sel || cb.disabled) return;
    cb.checked ? psmUi.sel.ids.add(cb.dataset.sel) : psmUi.sel.ids.delete(cb.dataset.sel);
    psmRender();
  });

  const onInput = el => {
    const fn = PSM_INPUTS[el.dataset.in];
    if (fn && fn(el.value, el) !== false) psmRender();
  };
  // Chinese and other IME input: wait until the word is committed.
  panel.addEventListener('input', ev => {
    const el = ev.target.closest('[data-in]');
    if (!el || ev.isComposing || el._psmComposing) return;
    onInput(el);
  });
  panel.addEventListener('compositionstart', ev => { if (ev.target.dataset?.in) ev.target._psmComposing = true; });
  panel.addEventListener('compositionend', ev => {
    const el = ev.target.closest?.('[data-in]');
    if (!el) return;
    el._psmComposing = false;
    onInput(el);
  });

  panel.addEventListener('keydown', ev => {
    const t = ev.target;
    if (ev.key === 'Enter' && t.dataset?.enter && !ev.isComposing && !t._psmComposing) {
      ev.preventDefault();
      const fn = PSM_ACTS[t.dataset.enter];
      if (fn && fn(t, ev) !== false) psmRender();
      return;
    }
    if (ev.key !== 'Escape' || ev.isComposing) return;
    ev.preventDefault();
    if (t.dataset?.esc) { PSM_ACTS[t.dataset.esc]?.(t, ev); psmRender(); return; }
    psmEscape();
  });

  bindHeaderDrag(panel);
  bindResizeGrip(panel);
  bindSheetHandle(panel);

  // Escape also works when the focus is not inside the window.
  parentDoc.addEventListener('keydown', ev => {
    if (!panelOpen || ev.key !== 'Escape' || ev.isComposing) return;
    if (panel.contains(ev.target)) return;
    if (ev.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    ev.stopPropagation();
    psmEscape();
  }, true);
}

// Escape steps back one level: menu → confirm → rename → tick mode → close.
function psmEscape() {
  const u = psmUi;
  if (u.menu) u.menu = null;
  else if (u.confirm) u.confirm = null;
  else if (confirmingSnaps.size) confirmingSnaps.clear();
  else if (u.renaming) u.renaming = null;
  else if (u.iconFor) u.iconFor = null;
  else if (u.sel) u.sel = null;
  else { closePanel(); return; }
  psmRender();
}
