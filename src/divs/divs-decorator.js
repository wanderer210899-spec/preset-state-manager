// Decorates SillyTavern's native prompt list without moving native prompt rows.

let pdoRepaintQueued = false;
let pdoApplyingDecorations = false;
let pdoSearchQuery = '';
let pdoSearchDebounce = null;

// Folder headers stay off while the tool is off or the user hid them.
// SillyTavern's own drag works only then.
function pdoHeadersOff() {
  return pdoIsHidden() || !settingsLoad().tools.folders;
}

function schedulePdoRepaint() {
  if (pdoRepaintQueued) return;
  pdoRepaintQueued = true;
  // queueMicrotask, not requestAnimationFrame: RAF gets throttled (background tabs,
  // power-saver, devtools attached) which leaves pdoUpdateCollapseRules stale for
  // multi-second windows after the user creates a folder. Microtask fires before
  // any subsequent user interaction so the new folder's CSS rule is always current
  // by the time the user clicks its host-list header.
  const queue = window.parent.queueMicrotask || window.queueMicrotask || (cb => Promise.resolve().then(cb));
  queue(() => {
    pdoRepaintQueued = false;
    applyDecorations();
  });
}

function pdoIgnorableMutation(mutation) {
  // Treat as ignorable (don't repaint) when:
  //  (1) it originates inside one of our own header rows (chevron.textContent etc.)
  //  (2) it sits inside an individual prompt <li> — ST's own per-row updates
  //      (token counts, enabled toggles, edit states). The list-structure mutations
  //      that we DO care about (full re-render, prompt added/removed) target the
  //      list/container itself, not a prompt-row interior.
  //  (3) addedNodes are all pdo-* nodes we inserted.
  const targetEl = mutation.target?.nodeType === 1
    ? mutation.target
    : mutation.target?.parentElement;
  if (targetEl?.closest?.('.pdo-folder-header')) return true;
  if (targetEl?.closest?.('#pdo-search-bar')) return true;
  if (targetEl && targetEl.id !== 'completion_prompt_manager_list'
      && targetEl.id !== 'completion_prompt_manager'
      && targetEl.closest?.('li[data-pm-identifier]')) {
    return true;
  }
  const added = [...mutation.addedNodes || []].filter(node => node.nodeType === 1);
  const removed = [...mutation.removedNodes || []].filter(node => node.nodeType === 1);
  if (!added.length && !removed.length) return false;
  // Only PSM-OWNED removals are ignorable — specifically the .pdo-folder-header
  // rows that applyDecorations strips and re-inserts each pass. If we treat any
  // pdo-class node removal as ignorable we'd miss ST deleting a prompt row that
  // happened to carry a pdo-member-* class.
  const isPsmOwned = el => el.classList?.contains('pdo-folder-header') || el.id === 'pdo-search-bar';
  const isPsmAdded = el => [...el.classList || []].some(cls => cls.startsWith('pdo-'))
      || !!el.querySelector?.('[class*="pdo-"]');
  return added.every(isPsmAdded) && removed.every(isPsmOwned);
}

function pdoCleanPromptRow(row) {
  [...row.classList].forEach(cls => {
    if (cls.startsWith('pdo-member-')) row.classList.remove(cls);
  });
  row.classList.remove('pdo-search-hit');
  row.removeAttribute('data-pdo-folder');
}

function pdoCleanListClasses(list) {
  [...list.classList].forEach(cls => {
    if (cls.startsWith('pdo-collapsed-')) list.classList.remove(cls);
  });
}

function pdoNativeHeader(folderId, folder, count, collapsed) {
  const li = parentDoc.createElement('li');
  li.className = 'pdo-folder-header pdo-folder-header-' + folderId;
  li.dataset.pdoFolder = folderId;
  li.setAttribute('role', 'button');
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-expanded', String(!collapsed));
  li.innerHTML = `
    ${psmIcon('chevR', 'pdo-native-chevron' + (collapsed ? '' : ' open'))}
    <span class="pdo-native-icon" aria-hidden="true">${esc(folder.icon || PDO_DEFAULT_ICON)}</span>
    <span class="pdo-native-title">${esc(folder.name)}</span>
    <span class="pdo-native-count">${count}</span>
  `;
  const toggle = ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const presetName = currentPreset();
    const next = !pdoIsCollapsed(presetName, folderId, folder);
    pdoSetCollapsed(presetName, folderId, next, { panel: true, repaint: false });
    const list = pdoListEl();
    if (list) list.classList.toggle(pdoCollapsedClass(folderId), next);
    pdoSetHeaderOpen(list, folderId, !next);
  };
  li.addEventListener('click', toggle);
  li.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' || ev.key === ' ') toggle(ev);
  });
  // Prevent jQuery UI Sortable from capturing pointer events on folder headers
  ['mousedown', 'pointerdown', 'touchstart'].forEach(type => {
    li.addEventListener(type, ev => { ev.stopPropagation(); }, false);
  });
  return li;
}

function pdoSetHeaderOpen(list, folderId, open) {
  const header = list?.querySelector(':scope > .pdo-folder-header-' + folderId);
  if (!header) return;
  header.setAttribute('aria-expanded', String(open));
  header.querySelector('.pdo-native-chevron')?.classList.toggle('open', open);
}

function pdoManageSortable() {
  try {
    const $list = parent$('#completion_prompt_manager_list', parentDoc);
    if (!$list.length || !$list.sortable('instance')) return;
    if (pdoHeadersOff()) {
      $list.sortable('enable');
    } else {
      $list.sortable('disable');
    }
  } catch (_) { /* sortable not initialized yet */ }
}

function applyDecorations() {
  const list = pdoListEl();
  if (!list) return;

  pdoEnsureSearchBar();

  if (pdoHeadersOff()) {
    list.classList.remove('pdo-headers-on');
    list.querySelectorAll(':scope > .pdo-folder-header').forEach(h => h.remove());
    pdoCleanListClasses(list);
    list.classList.remove('pdo-search-active');
    [...list.querySelectorAll(':scope > li[data-pm-identifier]')].forEach(pdoCleanPromptRow);
    pdoManageSortable();
    return;
  }

  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const rows = [...list.querySelectorAll(':scope > li[data-pm-identifier]')];
  const rowIds = new Set(rows.map(row => row.getAttribute('data-pm-identifier')).filter(Boolean));
  const prompts = pdoReadPrompts().filter(prompt => rowIds.has(prompt.id));
  const counts = pdoFolderCounts(cfg, prompts);
  const inserted = new Set();

  pdoUpdateCollapseRules(cfg);

  pdoApplyingDecorations = true;
  try {
    list.classList.add('pdo-headers-on');
    list.querySelectorAll(':scope > .pdo-folder-header').forEach(header => header.remove());
    pdoCleanListClasses(list);
    rows.forEach(pdoCleanPromptRow);

    cfg.folderOrder.forEach(folderId => {
      const folder = cfg.folders[folderId];
      if (!folder) return;
      const collapsed = pdoIsCollapsed(presetName, folderId, folder);
      list.classList.toggle(pdoCollapsedClass(folderId), collapsed);
    });

    rows.forEach(row => {
      const promptId = row.getAttribute('data-pm-identifier');
      const folderId = cfg.assignments[promptId];
      const folder = cfg.folders[folderId];
      if (!folder) return;

      row.classList.add(pdoMemberClass(folderId));
      row.dataset.pdoFolder = folderId;

      if (!inserted.has(folderId)) {
        const header = pdoNativeHeader(
          folderId,
          folder,
          counts[folderId] || 0,
          pdoIsCollapsed(presetName, folderId, folder)
        );
        list.insertBefore(header, row);
        inserted.add(folderId);
      }
    });

    cfg.folderOrder.forEach(folderId => {
      if (inserted.has(folderId)) return;
      const folder = cfg.folders[folderId];
      if (!folder) return;
      list.appendChild(pdoNativeHeader(
        folderId,
        folder,
        counts[folderId] || 0,
        pdoIsCollapsed(presetName, folderId, folder)
      ));
      inserted.add(folderId);
    });
    pdoManageSortable();
  } finally {
    // Defer the reset by one microtask. Mutations made above are delivered to
    // the observer as a microtask queued BEFORE this one (FIFO). That observer
    // tick must still see pdoApplyingDecorations === true so it returns early
    // instead of looping back via schedulePdoRepaint.
    const queue = window.parent.queueMicrotask || window.queueMicrotask || (cb => Promise.resolve().then(cb));
    queue(() => { pdoApplyingDecorations = false; });
  }

  if (pdoSearchQuery) pdoApplySearch(pdoSearchQuery);
  else list.classList.remove('pdo-search-active');
}

function initPdoDecorator() {
  if (parentDoc._pdoObserver) {
    pdoEnsureSearchBar();
    schedulePdoRepaint();
    return;
  }

  const root = parentDoc.querySelector('#completion_prompt_manager') || parentDoc.body;
  const observer = new window.parent.MutationObserver(mutations => {
    if (pdoApplyingDecorations) return;
    if (mutations.length && mutations.every(pdoIgnorableMutation)) return;
    schedulePdoRepaint();
  });
  observer.observe(root, { childList: true, subtree: true });
  parentDoc._pdoObserver = observer;
  pdoEnsureSearchBar();
  schedulePdoRepaint();
}

function pdoGotoPrompt(promptId) {
  const list = pdoListEl();
  if (!list || !promptId) return;
  const selector = (window.parent.CSS && CSS.escape) ? CSS.escape(promptId) : promptId.replace(/"/g, '\\"');
  const row = list.querySelector(':scope > li[data-pm-identifier="' + selector + '"]');
  if (!row) { pdoNotify(psmT('prompt_not_found')); return; }

  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const folderId = cfg.assignments[promptId];
  if (folderId && cfg.folders[folderId] && pdoIsCollapsed(presetName, folderId, cfg.folders[folderId])) {
    pdoSetCollapsed(presetName, folderId, false, { panel: true, repaint: false });
    list.classList.remove(pdoCollapsedClass(folderId));
    pdoSetHeaderOpen(list, folderId, true);
  }

  const raf = window.parent.requestAnimationFrame || window.requestAnimationFrame;
  raf(() => {
    psmScrollAboveSheet(row, 'center');
    row.classList.add('pdo-flash');
    setTimeout(() => row.classList.remove('pdo-flash'), 1700);
  });
}

// The bar above SillyTavern's prompt list: one row with the search box and
// collapse/expand all. The search box is built once and kept, so typing is
// never interrupted; the buttons are rebuilt only when the settings change.
function pdoEnsureSearchBar() {
  const list = pdoListEl();
  if (!list || !list.parentNode) return;
  const s = settingsLoad();
  let bar = parentDoc.getElementById('pdo-search-bar');

  if (!s.tools.search) {
    bar?.remove();
    if (pdoSearchQuery) { pdoSearchQuery = ''; list.classList.remove('pdo-search-active'); }
    return;
  }

  if (!bar) {
    bar = parentDoc.createElement('div');
    bar.id = 'pdo-search-bar';
    bar.setAttribute('data-pdo-ignore', '1');
    bar.innerHTML =
      '<div class="psm-srch">' + psmIcon('search') +
        '<input type="text" id="pdo-search-input" class="psm-inp" placeholder="' + esc(psmT('search_prompts_short')) + '" aria-label="' + esc(psmT('search_prompts_label')) + '" autocomplete="off" />' +
        '<button type="button" id="pdo-search-clear" class="psm-ib psm-sm mut" aria-label="' + esc(psmT('clear_search')) + '" title="' + esc(psmT('clear_search')) + '" hidden>' + psmIcon('x') + '</button>' +
      '</div><span id="pdo-bar-row"></span>';
    list.parentNode.insertBefore(bar, list);
    pdoStopBubble(bar);
    pdoBindSearchBar(bar);
  } else if (bar.nextElementSibling !== list) {
    list.parentNode.insertBefore(bar, list);
  }

  const sig = [s.tools.folders, PSM_LANG].join('|');
  const row = bar.querySelector('#pdo-bar-row');
  if (row.dataset.sig !== sig) {
    row.dataset.sig = sig;
    row.hidden = !s.tools.folders;
    row.innerHTML = !s.tools.folders ? '' :
      ibHtml('collapse', null, psmT('collapse_all'), { cls: 'mut', attrs: ' data-bar="collapse"' }) +
      ibHtml('expand', null, psmT('expand_all'), { cls: 'mut', attrs: ' data-bar="expand"' });
  }
}

function pdoBindSearchBar(bar) {
  const input = bar.querySelector('#pdo-search-input');
  const clear = bar.querySelector('#pdo-search-clear');
  input.value = pdoSearchQuery;
  clear.hidden = !input.value;
  const run = () => {
    clear.hidden = !input.value;
    clearTimeout(pdoSearchDebounce);
    const val = input.value;
    pdoSearchDebounce = setTimeout(() => pdoApplySearch(val), 150);
  };
  input.addEventListener('input', e => { if (!e.isComposing) run(); });
  input.addEventListener('compositionend', run);
  clear.addEventListener('click', () => {
    clearTimeout(pdoSearchDebounce);
    input.value = '';
    clear.hidden = true;
    pdoApplySearch('');
    input.focus();
  });
  bar.addEventListener('click', ev => {
    const b = ev.target.closest('[data-bar]');
    if (!b) return;
    const what = b.dataset.bar;
    if (what === 'collapse') pdoSetAllFoldersCollapsed(true);
    if (what === 'expand') pdoSetAllFoldersCollapsed(false);
  });
}

function pdoSetAllFoldersCollapsed(collapsed) {
  const list = pdoListEl();
  if (!list) return;
  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  Object.keys(cfg.folders || {}).forEach(folderId => {
    pdoSetCollapsed(presetName, folderId, collapsed, { panel: false, repaint: false });
    list.classList.toggle(pdoCollapsedClass(folderId), collapsed);
    pdoSetHeaderOpen(list, folderId, !collapsed);
  });
}

function pdoApplySearch(query) {
  pdoSearchQuery = String(query || '').trim().toLowerCase();
  const list = pdoListEl();
  if (!list) return;

  list.querySelectorAll(':scope > li[data-pm-identifier].pdo-search-hit')
      .forEach(r => r.classList.remove('pdo-search-hit'));
  list.querySelectorAll(':scope > .pdo-folder-header.pdo-search-folder-active')
      .forEach(h => h.classList.remove('pdo-search-folder-active'));

  if (!pdoSearchQuery) {
    list.classList.remove('pdo-search-active');
    return;
  }

  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const source = pdoReadPromptSource();
  const hits = new Set();
  source.forEach(p => {
    const id = String(p?.identifier ?? p?.id ?? '');
    if (!id) return;
    const hay = (String(p?.name || '') + '\n' + String(p?.content || '')).toLowerCase();
    if (hay.includes(pdoSearchQuery)) hits.add(id);
  });

  const folderHits = new Set();
  list.querySelectorAll(':scope > li[data-pm-identifier]').forEach(row => {
    const id = row.getAttribute('data-pm-identifier');
    if (!id || !hits.has(id)) return;
    row.classList.add('pdo-search-hit');
    const fid = cfg.assignments[id];
    if (fid) folderHits.add(fid);
  });
  folderHits.forEach(fid => {
    const header = list.querySelector(':scope > .pdo-folder-header-' + fid);
    if (header) header.classList.add('pdo-search-folder-active');
  });
  list.classList.add('pdo-search-active');
}
