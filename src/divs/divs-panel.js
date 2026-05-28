// Prompt Folders panel, popovers, and inline interactions.

let pdoPanelOpen = false;
let pdoToastTimer = null;
const pdoExpandedPanelFolders = new Set();
const pdoDeletingFolders = new Map();
let pdoRenamingFolder = null;
let pdoIconPickerFolder = null;
let pdoMassFolder = null;
let pdoMassFilter = '';
let pdoMassChecked = new Set();
let pdoMassPopupPos = null;
let pdoTemplatesOpen = false;
let pdoTemplateConfirm = null;
let pdoTemplateSaveName = '';
let pdoTemplateApplyName = '';
let pdoTemplateDeleteName = '';

function pdoShowToast(msg) {
  const toast = parentDoc.querySelector('#pdo-panel .pdo-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(pdoToastTimer);
  pdoToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function ensurePdoPanel() {
  let panel = parentDoc.querySelector('#pdo-panel');
  if (panel) return panel;
  panel = parentDoc.createElement('div');
  panel.id = 'pdo-panel';
  panel.innerHTML = '<div id="pdo-panel-inner"></div><div class="pdo-toast" aria-live="polite" role="status"></div>';
  parentDoc.body.appendChild(panel);
  pdoStopBubble(panel);
  bindPdoPanelDrag();
  return panel;
}

function pdoOpenPanel() {
  pdoPanelOpen = true;
  ensurePdoPanel().classList.add('open');
  renderPdoPanel();
  window.parent.requestAnimationFrame(() => {
    const panelEl = parentDoc.querySelector('#pdo-panel');
    const saved = pdoPosLoad();
    const pos = saved || pdoDefaultPanelPos();
    panelEl.style.setProperty('top', pos.top + 'px', 'important');
    panelEl.style.setProperty('left', pos.left + 'px', 'important');
    pdoClampPanelToViewport();
  });
}

function pdoClosePanel() {
  pdoPanelOpen = false;
  pdoRenamingFolder = null;
  pdoIconPickerFolder = null;
  pdoMassFolder = null;
  pdoMassPopupPos = null;
  pdoTemplatesOpen = false;
  parentDoc.querySelector('#pdo-panel')?.classList.remove('open');
  parent$('.pdo-popup, .pdo-template-panel', parentDoc).remove();
}

function pdoFolderRowHtml(presetName, cfg, folderId, prompts, counts) {
  const folder = cfg.folders[folderId];
  if (!folder) return '';
  const expanded = pdoExpandedPanelFolders.has(folderId);
  const renaming = pdoRenamingFolder === folderId;
  const deleting = pdoDeletingFolders.has(folderId);
  const members = pdoPromptsForFolder(cfg, folderId, prompts);
  const count = counts[folderId] || 0;

  const memberHtml = expanded ? `<div class="pdo-member-list" data-folder-members="${esc(folderId)}">${
    members.length ? members.map(prompt => `
      <div class="pdo-member-line" data-pdo-goto="${esc(prompt.id)}" role="button" tabindex="0" title="${esc(psmT('jump_to_prompt'))}">
        <span class="pdo-member-name">${esc(prompt.name)}</span>
        ${pdoButtonHtml('pdo-row-btn pdo-unassign', `data-pdo-unassign="${esc(prompt.id)}"`, PDO_GLYPHS.remove, psmT('remove_from_folder'))}
      </div>
    `).join('') : `<div class="pdo-member-line"><span class="pdo-member-name">${esc(psmT('no_assigned'))}</span><span></span></div>`
  }</div>` : '';

  const iconPicker = pdoIconPickerFolder === folderId ? `
    <div class="pdo-icon-popover" data-icon-popover="${esc(folderId)}">
      ${PDO_ICON_PALETTE.map(icon => pdoButtonHtml('pdo-row-btn pdo-icon-choice', `data-pdo-icon-choice="${esc(icon)}"`, esc(icon), psmT('use_icon'))).join('')}
      <input class="pdo-icon-custom" data-pdo-icon-custom="${esc(folderId)}" maxlength="8" placeholder="${esc(psmT('custom_icon_ph'))}" />
    </div>` : '';

  return `<div class="pdo-folder-block" data-folder-id="${esc(folderId)}">
    <div class="pdo-folder-row">
      <span class="pdo-drag-handle" title="${esc(psmT('drag_reorder'))}">${PDO_GLYPHS.drag}</span>
      ${pdoButtonHtml('pdo-row-btn pdo-collapse-btn', `data-pdo-panel-expand="${esc(folderId)}"`, expanded ? PDO_GLYPHS.down : PDO_GLYPHS.right, expanded ? psmT('hide_folder_prompts') : psmT('show_folder_prompts'))}
      ${pdoButtonHtml('pdo-row-btn pdo-icon-btn', `data-pdo-icon="${esc(folderId)}"`, esc(folder.icon || PDO_DEFAULT_ICON), psmT('change_icon'))}
      ${renaming
        ? `<input class="pdo-rename-input" data-pdo-rename="${esc(folderId)}" value="${esc(folder.name)}" />`
        : `<span class="pdo-folder-name" data-pdo-rename-start="${esc(folderId)}">${esc(folder.name)}</span>`}
      <span class="pdo-count" title="${esc(psmT('prompts_in_folder'))}">(${count})</span>
      ${pdoButtonHtml('pdo-row-btn pdo-add-prompts', `data-pdo-mass="${esc(folderId)}"`, '+', psmT('add_prompts'))}
      ${pdoButtonHtml('pdo-row-btn pdo-folder-del' + (deleting ? ' confirming' : ''), `data-pdo-delete="${esc(folderId)}"`, deleting ? psmT('sure') + ' ' + PDO_GLYPHS.close : PDO_GLYPHS.close, psmT('delete_folder'))}
    </div>
    ${iconPicker}
    ${memberHtml}
  </div>`;
}

function renderPdoPanel() {
  if (!pdoPanelOpen) return;
  const panel = ensurePdoPanel();
  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const prompts = pdoReadPrompts();
  const counts = pdoFolderCounts(cfg, prompts);
  const folderHtml = cfg.folderOrder.length
    ? cfg.folderOrder.map(folderId => pdoFolderRowHtml(presetName, cfg, folderId, prompts, counts)).join('')
    : `<div class="pdo-empty">${esc(psmT('no_folders'))}</div>`;

  const hidden = pdoIsHidden();
  const hiddenBanner = hidden
    ? `<div class="pdo-hidden-notice">${esc(psmT('folders_hidden_banner'))}</div>`
    : '';

  panel.querySelector('#pdo-panel-inner').innerHTML = `
    <div class="pdo-header">
      <span class="pdo-header-title">${esc(psmT('folders_header', presetName))}</span>
      ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-hide-toggle"', hidden ? PDO_GLYPHS.eyeOff : PDO_GLYPHS.eye, hidden ? psmT('show_folders_in_list') : psmT('hide_folders_from_list'))}
      ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-templates-btn"', PDO_GLYPHS.info, psmT('templates'))}
      ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-close"', PDO_GLYPHS.close, psmT('close'))}
    </div>
    <div class="pdo-body">
      ${hiddenBanner}
      <div id="pdo-folder-list">${folderHtml}</div>
      <div class="pdo-add-folder">
        <input id="pdo-new-folder-input" type="text" placeholder="${esc(psmT('new_folder_ph'))}" />
        <button id="pdo-new-folder-btn" type="button">${esc(psmT('add'))}</button>
      </div>
    </div>`;

  bindPdoPanelEvents();
  initPdoFolderSortable();
  if (pdoRenamingFolder) {
    const input = panel.querySelector('.pdo-rename-input');
    if (input) { input.focus(); input.select(); }
  }
  if (pdoMassFolder) renderPdoMassPopup();
  else parent$('.pdo-popup', parentDoc).remove();
  if (pdoTemplatesOpen) renderPdoTemplatesPopover();
  else parent$('.pdo-template-panel', parentDoc).remove();
}

function bindPdoPanelEvents() {
  const $p = parent$('#pdo-panel', parentDoc);
  $p.find('#pdo-close').on('click', pdoClosePanel);
  $p.find('#pdo-hide-toggle').on('click', function() {
    pdoSetHidden(!pdoIsHidden());
    renderPdoPanel();
  });
  $p.find('#pdo-templates-btn').on('click', function(e) {
    e.stopPropagation();
    pdoTemplatesOpen = !pdoTemplatesOpen;
    pdoTemplateConfirm = null;
    renderPdoPanel();
  });

  $p.find('#pdo-new-folder-btn').on('click', () => {
    const input = parentDoc.querySelector('#pdo-new-folder-input');
    const name = input?.value.trim() || '';
    if (!name) { input?.focus(); return; }
    const id = pdoCreateFolder(currentPreset(), name);
    if (!id) pdoShowToast(psmT('toast_folder_exists'));
  });
  $p.find('#pdo-new-folder-input').on('keydown', e => {
    if (e.key === 'Enter') $p.find('#pdo-new-folder-btn').trigger('click');
  });

  $p.find('[data-pdo-panel-expand]').on('click', function() {
    const folderId = attr(this, 'pdo-panel-expand');
    toggleSet(pdoExpandedPanelFolders, folderId);
    renderPdoPanel();
  });

  $p.find('[data-pdo-icon]').on('click', function() {
    const folderId = attr(this, 'pdo-icon');
    pdoIconPickerFolder = pdoIconPickerFolder === folderId ? null : folderId;
    renderPdoPanel();
  });
  $p.find('[data-pdo-icon-choice]').on('click', function() {
    if (!pdoIconPickerFolder) return;
    pdoSetFolderIcon(currentPreset(), pdoIconPickerFolder, attr(this, 'pdo-icon-choice'));
    pdoIconPickerFolder = null;
  });
  $p.find('[data-pdo-icon-custom]').on('keydown blur', function(e) {
    if (e.type === 'keydown' && e.key !== 'Enter') return;
    const val = $(this).val();
    if (val) pdoSetFolderIcon(currentPreset(), attr(this, 'pdo-icon-custom'), val);
    pdoIconPickerFolder = null;
  }).on('click', e => e.stopPropagation());

  $p.find('[data-pdo-rename-start]').on('dblclick', function() {
    pdoRenamingFolder = attr(this, 'pdo-rename-start');
    renderPdoPanel();
  });
  $p.find('[data-pdo-rename]').on('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ok = pdoRenameFolder(currentPreset(), attr(this, 'pdo-rename'), $(this).val());
      if (!ok) pdoShowToast(psmT('toast_folder_exists'));
      pdoRenamingFolder = null;
    }
    if (e.key === 'Escape') { pdoRenamingFolder = null; renderPdoPanel(); }
  }).on('blur', function() {
    if (!pdoRenamingFolder) return;
    const ok = pdoRenameFolder(currentPreset(), attr(this, 'pdo-rename'), $(this).val());
    if (!ok) pdoShowToast(psmT('toast_folder_exists'));
    pdoRenamingFolder = null;
  }).on('click', e => e.stopPropagation());

  $p.find('[data-pdo-unassign]').on('click', function(e) {
    e.stopPropagation();
    pdoUnassignPrompt(currentPreset(), attr(this, 'pdo-unassign'));
  });
  $p.find('[data-pdo-goto]').on('click', function(e) {
    if (e.target.closest('.pdo-unassign')) return;
    pdoGotoPrompt(attr(this, 'pdo-goto'));
  });
  $p.find('[data-pdo-goto]').on('keydown', function(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    pdoGotoPrompt(attr(this, 'pdo-goto'));
  });
  $p.find('[data-pdo-mass]').on('click', function() {
    pdoMassFolder = attr(this, 'pdo-mass');
    pdoMassFilter = '';
    pdoMassChecked = new Set();
    pdoMassPopupPos = null;
    renderPdoPanel();
  });

  $p.find('[data-pdo-delete]').on('click', function() {
    const folderId = attr(this, 'pdo-delete');
    if (pdoDeletingFolders.has(folderId)) {
      clearTimeout(pdoDeletingFolders.get(folderId));
      pdoDeletingFolders.delete(folderId);
      pdoDeleteFolder(currentPreset(), folderId);
      return;
    }
    const timer = setTimeout(() => {
      pdoDeletingFolders.delete(folderId);
      renderPdoPanel();
    }, 3000);
    pdoDeletingFolders.set(folderId, timer);
    renderPdoPanel();
  });
}

function initPdoFolderSortable() {
  const listEl = parentDoc.querySelector('#pdo-folder-list');
  const Sortable = window.parent.Sortable;
  if (!listEl || !Sortable) return;
  if (listEl._pdoSortable) {
    try { listEl._pdoSortable.destroy(); } catch (_) {}
  }
  listEl._pdoSortable = Sortable.create(listEl, {
    animation: 150,
    draggable: '.pdo-folder-block',
    handle: '.pdo-drag-handle',
    ghostClass: 'pdo-sortable-ghost',
    chosenClass: 'pdo-sortable-chosen',
    onEnd() {
      const order = [...listEl.querySelectorAll(':scope > .pdo-folder-block')]
        .map(el => el.dataset.folderId).filter(Boolean);
      pdoSetFolderOrder(currentPreset(), order);
    },
  });
}

function pdoPopupPos(anchorSelector) {
  const anchor = parentDoc.querySelector(anchorSelector);
  const rect = anchor?.getBoundingClientRect();
  const top = rect ? rect.bottom + 6 : 80;
  const left = rect ? rect.left : 80;
  return { top, left };
}

function pdoClampFloatingPos(el, top, left) {
  const margin = 12;
  const maxHeight = Math.max(180, window.parent.innerHeight - margin * 2);
  el.style.maxHeight = maxHeight + 'px';
  const width = Math.min(el.offsetWidth || 320, window.parent.innerWidth - margin * 2);
  const height = Math.min(el.offsetHeight || maxHeight, maxHeight);
  return {
    top: Math.min(Math.max(margin, top), Math.max(margin, window.parent.innerHeight - height - margin)),
    left: Math.min(Math.max(margin, left), Math.max(margin, window.parent.innerWidth - width - margin)),
  };
}

function pdoPlaceFloatingEl(el, pos) {
  const next = pdoClampFloatingPos(el, pos.top, pos.left);
  el.style.top = next.top + 'px';
  el.style.left = next.left + 'px';
  return next;
}

function bindPdoFloatingDrag(el, handleSelector, onMoved) {
  if (!el || el.dataset.pdoFloatingDrag === '1') return;
  el.dataset.pdoFloatingDrag = '1';
  parent$(el).on('mousedown touchstart', handleSelector, function(e) {
    if (parent$(e.target).closest('button, input, select, label').length) return;
    const src = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
    const startX = src.clientX;
    const startY = src.clientY;
    const startTop = parseFloat(el.style.top) || 0;
    const startLeft = parseFloat(el.style.left) || 0;
    let moved = false;

    function onMove(ev) {
      const raw = ev.originalEvent || ev;
      const p = raw.touches ? raw.touches[0] : raw;
      const dx = p.clientX - startX;
      const dy = p.clientY - startY;
      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
      if (!moved) return;
      if (ev.cancelable) ev.preventDefault();
      const next = pdoPlaceFloatingEl(el, { top: startTop + dy, left: startLeft + dx });
      if (onMoved) onMoved(next);
    }

    function onUp() {
      parentDoc.removeEventListener('mousemove', onMove);
      parentDoc.removeEventListener('touchmove', onMove);
      parentDoc.removeEventListener('mouseup', onUp);
      parentDoc.removeEventListener('touchend', onUp);
      parentDoc.removeEventListener('touchcancel', onUp);
    }

    parentDoc.addEventListener('mousemove', onMove);
    parentDoc.addEventListener('touchmove', onMove, { passive: false });
    parentDoc.addEventListener('mouseup', onUp);
    parentDoc.addEventListener('touchend', onUp);
    parentDoc.addEventListener('touchcancel', onUp);
  });
}

function renderPdoMassPopup() {
  parent$('.pdo-popup', parentDoc).remove();
  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const folder = cfg.folders[pdoMassFolder];
  if (!folder) { pdoMassFolder = null; pdoMassPopupPos = null; return; }
  const filter = pdoMassFilter.trim().toLowerCase();
  const unassigned = pdoUnassignedPrompts(cfg);
  const visible = unassigned.filter(prompt => !filter || prompt.name.toLowerCase().includes(filter));
  const pos = pdoMassPopupPos || pdoPopupPos(`[data-pdo-mass="${pdoMassFolder}"]`);

  const popup = parentDoc.createElement('div');
  popup.className = 'pdo-popup';
  popup.style.top = Math.max(12, pos.top) + 'px';
  popup.style.left = Math.max(12, pos.left) + 'px';
  popup.innerHTML = `
    <div class="pdo-popup-header">
      <span class="pdo-popup-title">${esc(psmT('add_to', folder.icon, folder.name))}</span>
      ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-mass-close"', PDO_GLYPHS.close, psmT('close'))}
    </div>
    <div class="pdo-popup-body">
      <input class="pdo-popup-filter" id="pdo-mass-filter" value="${esc(pdoMassFilter)}" placeholder="${esc(psmT('mass_filter_ph'))}" />
      <div id="pdo-mass-list">${
        visible.length ? visible.map(prompt => `
          <label class="pdo-prompt-choice">
            <input type="checkbox" data-pdo-check="${esc(prompt.id)}"${pdoMassChecked.has(prompt.id) ? ' checked' : ''} />
            <span class="pdo-prompt-choice-name">${esc(prompt.name)}</span>
            ${prompt.marker ? '<span class="pdo-marker">marker</span>' : '<span></span>'}
          </label>`).join('') : `<div class="pdo-empty">${esc(psmT('no_unassigned'))}</div>`
      }</div>
      <div class="pdo-popup-actions">
        <button id="pdo-select-visible" type="button">${esc(psmT('select_all'))}</button>
        <button id="pdo-mass-add" type="button">${esc(psmT('add'))}</button>
        <button id="pdo-mass-cancel" type="button">${esc(psmT('cancel'))}</button>
      </div>
      </div>`;
  parentDoc.body.appendChild(popup);
  pdoMassPopupPos = pdoPlaceFloatingEl(popup, pos);
  bindPdoFloatingDrag(popup, '.pdo-popup-header', next => { pdoMassPopupPos = next; });
  pdoStopBubble(popup);

  parent$('#pdo-mass-filter', parentDoc).on('input', function() {
    pdoMassFilter = $(this).val();
    renderPdoMassPopup();
  }).trigger('focus');
  parent$('[data-pdo-check]', popup).on('change', function() {
    const id = attr(this, 'pdo-check');
    this.checked ? pdoMassChecked.add(id) : pdoMassChecked.delete(id);
  });
  parent$('#pdo-select-visible', popup).on('click', () => {
    const allSelected = visible.length && visible.every(prompt => pdoMassChecked.has(prompt.id));
    visible.forEach(prompt => allSelected ? pdoMassChecked.delete(prompt.id) : pdoMassChecked.add(prompt.id));
    renderPdoMassPopup();
  });
  parent$('#pdo-mass-add', popup).on('click', () => {
    pdoAssignPrompts(presetName, pdoMassFolder, [...pdoMassChecked]);
    pdoMassFolder = null;
    pdoMassChecked = new Set();
    pdoMassPopupPos = null;
  });
  parent$('#pdo-mass-close, #pdo-mass-cancel', popup).on('click', () => {
    pdoMassFolder = null;
    pdoMassChecked = new Set();
    pdoMassPopupPos = null;
    renderPdoPanel();
  });
}

function renderPdoTemplatesPopover() {
  parent$('.pdo-template-panel', parentDoc).remove();
  const templates = Object.keys(pdoDbLoad().templates || {}).sort((a, b) => a.localeCompare(b));
  if (!pdoTemplateApplyName && templates.length) pdoTemplateApplyName = templates[0];
  if (!pdoTemplateDeleteName && templates.length) pdoTemplateDeleteName = templates[0];
  const pos = pdoPopupPos('#pdo-templates-btn');
  const panel = parentDoc.createElement('div');
  panel.className = 'pdo-template-panel';
  panel.style.top = Math.max(12, pos.top) + 'px';
  panel.style.left = Math.max(12, pos.left) + 'px';
  const confirm = pdoTemplateConfirm ? `
    <div class="pdo-confirm-row">
      <span>${esc(pdoTemplateConfirm.label)}</span>
      <button type="button" id="pdo-template-confirm-yes">${esc(psmT('yes'))}</button>
      <button type="button" id="pdo-template-confirm-cancel">${esc(psmT('cancel'))}</button>
    </div>` : '';

  const opts = templates.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
  panel.innerHTML = `
    <div class="pdo-popup-header">
      <span class="pdo-popup-title">${esc(psmT('templates'))}</span>
      ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-template-close"', PDO_GLYPHS.close, psmT('close'))}
    </div>
    <div class="pdo-template-body">
      ${confirm}
      <label class="pdo-template-label">${esc(psmT('tpl_save_current'))}</label>
      <div class="pdo-template-row">
        <input id="pdo-template-save-name" value="${esc(pdoTemplateSaveName)}" placeholder="${esc(psmT('name_ph'))}" />
        <button id="pdo-template-save" type="button">${esc(psmT('save'))}</button>
      </div>
      <label class="pdo-template-label">${esc(psmT('tpl_apply'))}</label>
      <div class="pdo-template-row">
        <select id="pdo-template-apply">${opts}</select>
        <button id="pdo-template-replace" type="button">${esc(psmT('apply'))}</button>
      </div>
      <label class="pdo-template-label">${esc(psmT('tpl_delete'))}</label>
      <div class="pdo-template-row">
        <select id="pdo-template-delete">${opts}</select>
        <button id="pdo-template-delete-btn" type="button">${esc(psmT('del'))}</button>
      </div>
    </div>`;
  parentDoc.body.appendChild(panel);
  pdoStopBubble(panel);
  parent$('#pdo-template-apply', panel).val(pdoTemplateApplyName);
  parent$('#pdo-template-delete', panel).val(pdoTemplateDeleteName);

  parent$('#pdo-template-close', panel).on('click', () => {
    pdoTemplatesOpen = false;
    pdoTemplateConfirm = null;
    renderPdoPanel();
  });
  parent$('#pdo-template-save-name', panel).on('input', function() { pdoTemplateSaveName = $(this).val(); });
  parent$('#pdo-template-apply', panel).on('change', function() { pdoTemplateApplyName = $(this).val(); });
  parent$('#pdo-template-delete', panel).on('change', function() { pdoTemplateDeleteName = $(this).val(); });

  parent$('#pdo-template-save', panel).on('click', () => {
    const name = (parent$('#pdo-template-save-name', panel).val() || '').trim();
    if (!name) return;
    if (pdoDbLoad().templates[name] && pdoTemplateConfirm?.action !== 'save') {
      pdoTemplateConfirm = { action: 'save', name, label: psmT('confirm_tpl_overwrite', name) };
      renderPdoTemplatesPopover();
      return;
    }
    pdoSaveTemplate(name);
    pdoTemplateSaveName = '';
    pdoTemplateConfirm = null;
    pdoShowToast(psmT('toast_tpl_saved'));
    renderPdoPanel();
  });
  parent$('#pdo-template-replace', panel).on('click', () => pdoAskTemplateApply());
  parent$('#pdo-template-delete-btn', panel).on('click', () => {
    const name = parent$('#pdo-template-delete', panel).val();
    if (!name) return;
    pdoTemplateConfirm = { action: 'delete', name, label: psmT('confirm_tpl_delete', name) };
    renderPdoTemplatesPopover();
  });
  parent$('#pdo-template-confirm-cancel', panel).on('click', () => {
    pdoTemplateConfirm = null;
    renderPdoTemplatesPopover();
  });
  parent$('#pdo-template-confirm-yes', panel).on('click', () => {
    const c = pdoTemplateConfirm;
    if (!c) return;
    if (c.action === 'save') pdoSaveTemplate(c.name);
    if (c.action === 'replace') pdoApplyTemplate(c.name);
    if (c.action === 'delete') pdoDeleteTemplate(c.name);
    pdoTemplateConfirm = null;
    pdoShowToast(psmT('toast_tpl_updated'));
    renderPdoPanel();
  });
}

function pdoAskTemplateApply() {
  const name = parent$('#pdo-template-apply', parentDoc).val();
  if (!name) return;
  pdoTemplateConfirm = {
    action: 'replace',
    name,
    label: psmT('confirm_tpl_apply', name),
  };
  renderPdoTemplatesPopover();
}

function bindPdoPanelDrag() {
  const panelEl = parentDoc.querySelector('#pdo-panel');
  if (!panelEl || panelEl.dataset.pdoDrag === '1') return;
  panelEl.dataset.pdoDrag = '1';
  parent$('#pdo-panel', parentDoc).on('mousedown touchstart', '.pdo-header', function(e) {
    if ($(e.target).closest('button, input, select').length) return;
    const src = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
    const startX = src.clientX;
    const startY = src.clientY;
    const startTop = parseFloat(panelEl.style.top) || 0;
    const startLeft = parseFloat(panelEl.style.left) || 0;
    let moved = false;
    function onMove(ev) {
      const p = ev.originalEvent?.touches ? ev.originalEvent.touches[0] : ev;
      const dx = p.clientX - startX;
      const dy = p.clientY - startY;
      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
      if (!moved) return;
      const margin = 10;
      const pw = panelEl.offsetWidth;
      const ph = panelEl.offsetHeight;
      panelEl.style.setProperty('top', Math.min(Math.max(margin, startTop + dy), window.parent.innerHeight - ph - margin) + 'px', 'important');
      panelEl.style.setProperty('left', Math.min(Math.max(margin, startLeft + dx), window.parent.innerWidth - pw - margin) + 'px', 'important');
    }
    function onUp() {
      parent$(parentDoc).off('mousemove.pdodrag touchmove.pdodrag', onMove).off('mouseup.pdodrag touchend.pdodrag', onUp);
      if (moved) pdoPosSave(parseFloat(panelEl.style.top), parseFloat(panelEl.style.left));
    }
    parent$(parentDoc).on('mousemove.pdodrag touchmove.pdodrag', onMove).on('mouseup.pdodrag touchend.pdodrag', onUp);
  });
}
