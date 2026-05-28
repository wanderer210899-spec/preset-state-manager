// Decorates SillyTavern's native prompt list without moving native prompt rows.

let pdoRepaintQueued = false;
let pdoApplyingDecorations = false;
let pdoSearchQuery = '';
let pdoSearchDebounce = null;

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
  li.innerHTML = `
    <span class="pdo-native-chevron" aria-hidden="true">${collapsed ? PDO_GLYPHS.right : PDO_GLYPHS.down}</span>
    <span class="pdo-native-icon">${esc(folder.icon || PDO_DEFAULT_ICON)}</span>
    <span class="pdo-native-title">${esc(folder.name)}</span>
    <span class="pdo-native-count">(${count})</span>
  `;
  const toggle = ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const presetName = currentPreset();
    const next = !pdoIsCollapsed(presetName, folderId, folder);
    pdoSetCollapsed(presetName, folderId, next, { panel: true, repaint: false });
    const list = pdoListEl();
    if (list) list.classList.toggle(pdoCollapsedClass(folderId), next);
    const liveChevron = list?.querySelector('.pdo-folder-header-' + folderId + ' .pdo-native-chevron');
    if (liveChevron) liveChevron.textContent = next ? PDO_GLYPHS.right : PDO_GLYPHS.down;
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

function pdoManageSortable() {
  try {
    const $list = parent$('#completion_prompt_manager_list', parentDoc);
    if (!$list.length || !$list.sortable('instance')) return;
    if (pdoIsHidden()) {
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

  if (pdoIsHidden()) {
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
    const chevron = list.querySelector('.pdo-folder-header-' + folderId + ' .pdo-native-chevron');
    if (chevron) chevron.textContent = PDO_GLYPHS.down;
  }

  const raf = window.parent.requestAnimationFrame || window.requestAnimationFrame;
  raf(() => {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('pdo-flash');
    setTimeout(() => row.classList.remove('pdo-flash'), 1200);
  });
}

function pdoEnsureSearchBar() {
  const list = pdoListEl();
  if (!list || !list.parentNode) return;
  if (parentDoc.getElementById('pdo-search-bar')) return;
  const bar = parentDoc.createElement('div');
  bar.id = 'pdo-search-bar';
  bar.setAttribute('data-pdo-ignore', '1');
  bar.innerHTML =
    '<span class="pdo-search-icon" aria-hidden="true">' + PDO_GLYPHS.search + '</span>' +
    '<input type="text" id="pdo-search-input" placeholder="' + esc(psmT('search_prompts_ph')) + '" autocomplete="off" />' +
    '<button type="button" id="pdo-search-clear" class="pdo-search-btn" title="' + esc(psmT('clear_search')) + '">' + PDO_GLYPHS.close + '</button>' +
    '<button type="button" id="pdo-collapse-all" class="pdo-search-btn" title="' + esc(psmT('collapse_all')) + '"><i class="fa-solid fa-angles-up"></i></button>' +
    '<button type="button" id="pdo-expand-all" class="pdo-search-btn" title="' + esc(psmT('expand_all')) + '"><i class="fa-solid fa-angles-down"></i></button>';
  list.parentNode.insertBefore(bar, list);
  pdoStopBubble(bar);

  const input = bar.querySelector('#pdo-search-input');
  const clear = bar.querySelector('#pdo-search-clear');
  input.value = pdoSearchQuery;
  input.addEventListener('input', e => {
    clearTimeout(pdoSearchDebounce);
    const val = e.target.value;
    pdoSearchDebounce = setTimeout(() => pdoApplySearch(val), 150);
  });
  clear.addEventListener('click', () => {
    clearTimeout(pdoSearchDebounce);
    input.value = '';
    pdoApplySearch('');
    input.focus();
  });
  bar.querySelector('#pdo-collapse-all').addEventListener('click', () => pdoSetAllFoldersCollapsed(true));
  bar.querySelector('#pdo-expand-all').addEventListener('click', () => pdoSetAllFoldersCollapsed(false));
}

function pdoSetAllFoldersCollapsed(collapsed) {
  const list = pdoListEl();
  if (!list) return;
  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  Object.keys(cfg.folders || {}).forEach(folderId => {
    pdoSetCollapsed(presetName, folderId, collapsed, { panel: false, repaint: false });
    list.classList.toggle(pdoCollapsedClass(folderId), collapsed);
    const chevron = list.querySelector('.pdo-folder-header-' + folderId + ' .pdo-native-chevron');
    if (chevron) chevron.textContent = collapsed ? PDO_GLYPHS.right : PDO_GLYPHS.down;
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
