// Prompt Folders tab of the PSM window: folder list, icon picker, templates,
// tick mode for adding prompts and "show in prompt list". Rendering and event
// wiring are shared with the Presets tab (see src/ui/panel.js).

const PDO_PANEL_ICONS = ['📁', '✍️', '🔥', '🎭', '⚙️', '💬', '🧠', '🌙', '⭐', '🔒', '📌', '🧪'];

function pdoNotify(msg) {
  if (panelOpen) psmSay('info', msg);
  else if (window.parent.toastr?.info) window.parent.toastr.info(msg);
  else LOG('Prompt Folders:', msg);
}

function pdoFoldersHtml() {
  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const prompts = pdoReadPrompts();
  const counts = pdoFolderCounts(cfg, prompts);
  const shown = !pdoIsHidden();
  const u = psmUi;

  const blocks = cfg.folderOrder.map(id => {
    const f = cfg.folders[id];
    if (!f) return '';
    const open = u.pfOpen.has(id);
    const renaming = u.renaming === 'p:' + id;
    const menuOpen = u.menu === 'p:' + id;
    const items = pdoPromptsForFolder(cfg, id, prompts);
    const n = counts[id] || 0;
    const iconOpen = u.iconFor === id;
    return `<div class="psm-fblock" data-pf="${esc(id)}">
      ${renaming ? nameRowHtml('renamePF', u.renameVal, { ph: psmT('folder_name'), label: psmT('folder_name'), input: 'renameVal', ok: 'renameOk', cancel: 'renameCancel', okLabel: psmT('save') }) : `
      <div class="psm-frow">
        <span class="psm-grip" title="${esc(psmT('drag_reorder'))}" aria-hidden="true">${psmIcon('grip')}</span>
        <button type="button" class="psm-fbtn" data-act="pfToggle" data-a="${esc(id)}" aria-expanded="${open}">${psmIcon('chevR', 'psm-chev' + (open ? ' open' : ''))}<span class="psm-emo" aria-hidden="true">${esc(f.icon || PDO_DEFAULT_ICON)}</span><span class="psm-fname" title="${esc(f.name)}">${esc(f.name)}</span><span class="psm-cnt" aria-label="${esc(psmT('n_prompts', n))}">${n}</span></button>
        ${ibHtml('kebab', 'menu', psmT('actions_for', f.name), { a: 'p:' + id, title: psmT('folder_actions'), cls: 'psm-sm', attrs: ` aria-expanded="${menuOpen}"` })}
        ${menuOpen ? `<div class="psm-menu" role="menu">
          ${miHtml('plus', psmT('add_prompts'), 'pickPrompts', { a: id })}
          ${miHtml('pencil', psmT('rename'), 'pfRename', { a: id })}
          ${miHtml('smile', psmT('change_icon'), 'pfIcon', { a: id })}
          ${miHtml('trash', psmT('delete_folder'), 'pfDelete', { a: id, red: true })}
        </div>` : ''}
      </div>`}
      ${cfHtml('delPF', id)}
      ${iconOpen ? `<div class="psm-cf" data-reveal="1">
        <div class="psm-icg">${PDO_PANEL_ICONS.map(ic => `<button type="button" class="psm-icn${ic === f.icon ? ' psm-on' : ''}" data-act="pfIconPick" data-a="${esc(id)}" data-b="${esc(ic)}" aria-label="${esc(psmT('use_icon', ic))}" aria-pressed="${ic === f.icon}">${esc(ic)}</button>`).join('')}</div>
        <div class="psm-row">${inpHtml('customIcon', u.customIcon, { ph: psmT('own_emoji'), label: psmT('custom_icon'), input: 'customIcon', enter: 'pfIconCustom' })}${btnHtml(psmT('use'), 'pfIconCustom', { a: id })}</div>
        <div class="psm-cf-b">${btnHtml(psmT('done'), 'pfIconDone')}</div>
      </div>` : ''}
      ${open ? `<div class="psm-kids">
        ${items.map(p => `<div class="psm-pfr">
          <span class="psm-nm" title="${esc(p.name)}">${esc(p.name)}</span>
          ${p.marker ? `<span class="psm-tag">${esc(psmT('marker'))}</span>` : ''}
          ${ibHtml('locate', 'pfJump', psmT('show_x_in_list', p.name), { a: p.id, title: psmT('show_in_list'), cls: 'psm-sm mut' })}
          ${ibHtml('x', 'pfRemove', psmT('remove_x', p.name), { a: p.id, b: id, title: psmT('remove_from_folder'), cls: 'psm-sm mut' })}
        </div>`).join('')}
        ${!items.length ? `<p class="psm-cap" style="padding: 6px">${esc(psmT('folder_empty'))}</p>` : ''}
        <button type="button" class="psm-addrow" data-act="pickPrompts" data-a="${esc(id)}">${psmIcon('plus')}<span>${esc(psmT('add_prompts'))}</span></button>
      </div>` : ''}
    </div>`;
  }).join('');

  const caption = esc(psmT('folders_for', '\u0000')).replace('\u0000', `<strong style="color: var(--psm-fg); font-weight: 600">${esc(presetName)}</strong>`);
  return `<p class="psm-cap" style="overflow-wrap: anywhere">${caption}</p>
    <div class="psm-row">${btnHtml(psmT('new_folder'), 'newPF', { icon: 'plus', cls: 'psm-wide' })}${btnHtml(psmT('templates'), 'openTpl', { icon: 'copy', cls: 'psm-wide' })}</div>
    ${swHtml(shown, psmT('show_headers'), 'pfHeaders')}
    ${u.newPF !== null ? nameRowHtml('newPF', u.newPF, { ph: psmT('folder_name'), label: psmT('new_pf_name'), input: 'newPF', ok: 'newPFOk', cancel: 'newPFCancel', okLabel: psmT('create') }) : ''}
    ${!cfg.folderOrder.length ? `<div class="psm-empty"><p class="psm-cap">${esc(psmT('no_prompt_folders'))}</p>${btnHtml(psmT('new_folder'), 'newPF', { icon: 'plus' })}</div>` : ''}
    <div class="psm-fl" id="pdo-flist">${blocks}</div>`;
}

function pdoTemplatesHtml() {
  const tpls = pdoDbLoad().templates || {};
  const names = Object.keys(tpls).sort((a, b) => a.localeCompare(b));
  const typed = psmUi.tplName.trim();
  const ex = typed ? names.find(n => n.toLowerCase() === typed.toLowerCase()) : null;
  return `${crumbHtml('closeTpl', psmT('back_pf'), psmT('templates'))}
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('tpl_save_lbl'))}</p>
      <div class="psm-row">${inpHtml('tplName', psmUi.tplName, { ph: psmT('tpl_name'), input: 'tplName', enter: 'tplSave' })}${btnHtml(ex ? psmT('overwrite_dots') : psmT('save'), 'tplSave', { disabled: !typed })}</div>
      ${cfHtml('overTpl', 'save')}
    </div>
    <hr class="psm-hr">
    <div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('saved_tpls'))}</p>
      ${names.map(n => {
        const t = tpls[n];
        const info = psmT('tpl_info', (t.folderOrder || []).length, Object.keys(t.assignmentsByName || {}).length);
        return `<div class="psm-snap">
          <div class="psm-snap-top">
            <div class="psm-snap-txt"><span class="psm-snap-name">${esc(n)}</span><span class="psm-cap">${esc(info)}</span></div>
            ${btnHtml(psmT('apply'), 'tplApply', { a: n })}
            ${ibHtml('trash', 'tplDelete', psmT('del_tpl_x', n), { a: n, title: psmT('del_tpl'), cls: 'psm-sm mut' })}
          </div>
          ${cfHtml('applyTpl', n)}${cfHtml('delTpl', n)}
        </div>`;
      }).join('')}
      ${!names.length ? `<p class="psm-cap">${esc(psmT('no_tpls'))}</p>` : ''}
    </div>`;
}

// ─── Tick mode: add prompts to a folder ───────────────────────────────────
// Every prompt of the preset, in list order. Prompts in another folder show
// that folder; ticking one moves it here.

PSM_SELECT.prompt = {
  title(folderId) {
    const f = pdoGetPresetConfig(currentPreset()).folders[folderId];
    return f ? psmT('add_to_icon', f.icon || PDO_DEFAULT_ICON, f.name) : '';
  },
  add(folderId, ids) {
    const presetName = currentPreset();
    const f = pdoGetPresetConfig(presetName).folders[folderId];
    pdoAssignPrompts(presetName, folderId, ids);
    psmUi.pfOpen.add(folderId);
    psmSay('ok', psmT('added_n', ids.length, f ? f.name : ''));
  },
};

function pdoSelectHtml() {
  const k = psmUi.sel;
  const cfg = pdoGetPresetConfig(currentPreset());
  const q = psmUi.selq.trim().toLowerCase();
  const rows = pdoReadPrompts().filter(p => !q || p.name.toLowerCase().includes(q)).map(p => {
    const fid = cfg.assignments[p.id];
    const owner = fid && cfg.folders[fid] ? cfg.folders[fid] : null;
    const locked = fid === k.folder;
    const ownerLabel = owner && !locked ? (owner.icon || PDO_DEFAULT_ICON) + ' ' + owner.name : '';
    return `<label class="psm-pk-r"><input type="checkbox" data-sel="${esc(p.id)}"${locked || k.ids.has(p.id) ? ' checked' : ''}${locked ? ' disabled' : ''}><span class="psm-nm" title="${esc(p.name)}">${esc(p.name)}</span>${p.marker ? `<span class="psm-tag">${esc(psmT('marker'))}</span>` : ''}${ownerLabel ? `<span class="psm-tag" title="${esc(ownerLabel)}"><span>${esc(ownerLabel)}</span></span>` : ''}</label>`;
  });
  return `${psmSelBarHtml()}
    <div class="psm-srch">${psmIcon('search')}${inpHtml('selq', psmUi.selq, { ph: psmT('filter_prompts'), input: 'selq' })}</div>
    <div class="psm-fl">${rows.join('')}</div>`;
}

// ─── Show a prompt in SillyTavern's list ──────────────────────────────────

function pdoOpenPromptDrawer() {
  const drawer = parentDoc.getElementById('left-nav-panel');
  if (!drawer || drawer.classList.contains('openDrawer')) return false;
  parentDoc.querySelector('#ai-config-button .drawer-toggle')?.click();
  return true;
}

// Phone: the sheet gets shorter (at most 340 of 844) and the prompt is
// centred in the space above it. The sheet stays open.
function pdoJumpFromPanel(promptId) {
  // A search could hide the row: clear it first.
  const input = parentDoc.getElementById('pdo-search-input');
  if (input) input.value = '';
  parentDoc.getElementById('pdo-search-clear')?.setAttribute('hidden', '');
  pdoApplySearch('');
  if (psmIsSheet()) {
    psmUi.sheetH.folders = Math.min(psmUi.sheetH.folders, 340 / 844);
    psmPlacePanel();
  }
  const opened = pdoOpenPromptDrawer();
  setTimeout(() => pdoGotoPrompt(promptId), opened ? 350 : 80);
}

function pdoRenameFromPanel(folderId, rawName) {
  const name = String(rawName || '').trim();
  if (!name) return true;
  if (!pdoRenameFolder(currentPreset(), folderId, name)) { psmSay('err', psmT('toast_folder_exists')); return false; }
  return true;
}

// ─── Drag and drop: prompt folder order ───────────────────────────────────

function initPdoFolderSortable(panel) {
  const listEl = panel.querySelector('#pdo-flist');
  const Sortable = window.parent.Sortable;
  if (!listEl || !Sortable) return;
  Sortable.create(listEl, {
    animation: 150,
    delay: psmIsTouch() ? 150 : 0,
    delayOnTouchOnly: true,
    touchStartThreshold: 5,
    draggable: '.psm-fblock',
    handle: '.psm-frow > .psm-grip',
    ghostClass: 'psm-sortable-ghost',
    chosenClass: 'psm-sortable-chosen',
    scroll: panel.querySelector('.psm-body') || true,
    bubbleScroll: false,
    onStart() { psmDragging = true; psmUi.menu = null; },
    onEnd() {
      psmDragging = false;
      const order = [...listEl.querySelectorAll(':scope > .psm-fblock')].map(el => el.dataset.pf).filter(Boolean);
      pdoSetFolderOrder(currentPreset(), order);
      setTimeout(() => { psmRenderPending = false; psmRender(); }, 170);
    },
  });
}

// ─── Actions ──────────────────────────────────────────────────────────────

Object.assign(PSM_ACTS, {
  pfToggle(el) { toggleSet(psmUi.pfOpen, el.dataset.a); },
  newPF() { psmUi.newPF = ''; psmUi.menu = null; psmUi._focus = 'newPF'; psmUi._reveal = '[data-fk="newPF"]'; },
  newPFCancel() { psmUi.newPF = null; },
  newPFOk() {
    const name = String(psmUi.newPF || '').trim();
    if (!name) return;
    const id = pdoCreateFolder(currentPreset(), name);
    if (!id) { psmSay('err', psmT('toast_folder_exists')); return; }
    psmUi.pfOpen.add(id);
    psmUi.newPF = null;
  },
  pfHeaders() { pdoSetHidden(!pdoIsHidden()); },
  openTpl() { Object.assign(psmUi, { fview: 'templates', menu: null, confirm: null }); },
  closeTpl() { Object.assign(psmUi, { fview: 'list', confirm: null }); },
  pickPrompts(el) { psmStartSel('prompt', el.dataset.a); return false; },
  pfRename(el) {
    const f = pdoGetPresetConfig(currentPreset()).folders[el.dataset.a];
    if (!f) return;
    Object.assign(psmUi, { renaming: 'p:' + el.dataset.a, renameVal: f.name, menu: null, _focus: 'renamePF', _reveal: '[data-fk="renamePF"]' });
  },
  pfIcon(el) { Object.assign(psmUi, { iconFor: el.dataset.a, customIcon: '', menu: null, _reveal: '[data-reveal]' }); },
  pfIconPick(el) { pdoSetFolderIcon(currentPreset(), el.dataset.a, el.dataset.b); },
  pfIconCustom() {
    const v = psmUi.customIcon.trim();
    if (!v || !psmUi.iconFor) return;
    pdoSetFolderIcon(currentPreset(), psmUi.iconFor, v);
    psmUi.iconFor = null;
    psmUi.customIcon = '';
  },
  pfIconDone() { psmUi.iconFor = null; },
  pfDelete(el) {
    const id = el.dataset.a;
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const f = cfg.folders[id];
    if (!f) return;
    psmAsk({ kind: 'delPF', id, danger: true, ok: psmT('del'), title: psmT('del_folder_q', f.name), body: psmT('del_pf_body'),
      run() { pdoDeleteFolder(presetName, id); psmUi.pfOpen.delete(id); psmSay('ok', psmT('toast_deleted', f.name)); } });
    return false;
  },
  pfJump(el) { pdoJumpFromPanel(el.dataset.a); return false; },
  pfRemove(el) { pdoUnassignPrompt(currentPreset(), el.dataset.a); },

  // templates
  tplSave() {
    const typed = psmUi.tplName.trim();
    if (!typed) return;
    const names = Object.keys(pdoDbLoad().templates || {});
    const ex = names.find(n => n.toLowerCase() === typed.toLowerCase());
    const save = name => {
      const r = pdoSaveTemplate(name);
      if (!r) return;
      psmUi.tplName = '';
      psmSay(r === 'dup' ? 'info' : 'ok', r === 'dup' ? psmT('notify_tpl_dup') : (ex ? psmT('toast_tpl_updated') : psmT('toast_tpl_saved')));
    };
    if (ex) {
      psmAsk({ kind: 'overTpl', id: 'save', danger: true, ok: psmT('overwrite'), title: psmT('tpl_over_q', ex), body: '', run: () => save(ex) });
      return false;
    }
    save(typed);
  },
  tplApply(el) {
    const n = el.dataset.a;
    psmAsk({ kind: 'applyTpl', id: n, danger: false, ok: psmT('replace'), title: psmT('tpl_apply_q', n), body: '',
      run() { if (pdoApplyTemplate(n)) { psmUi.pfOpen.clear(); psmSay('ok', psmT('toast_applied', n)); } } });
    return false;
  },
  tplDelete(el) {
    const n = el.dataset.a;
    psmAsk({ kind: 'delTpl', id: n, danger: true, ok: psmT('del'), title: psmT('del_tpl_q', n), body: '',
      run() { if (pdoDeleteTemplate(n)) psmSay('ok', psmT('toast_deleted', n)); } });
    return false;
  },
});

Object.assign(PSM_INPUTS, {
  newPF(v) { psmUi.newPF = v; return false; },
  customIcon(v) { psmUi.customIcon = v; return false; },
  tplName(v) { psmUi.tplName = v; if (psmUi.confirm?.kind === 'overTpl') psmUi.confirm = null; },
});
