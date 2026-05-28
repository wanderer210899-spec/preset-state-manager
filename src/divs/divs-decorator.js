// Decorates SillyTavern's native prompt list without moving native prompt rows.

let pdoRepaintQueued = false;
let pdoApplyingDecorations = false;

function schedulePdoRepaint() {
  if (pdoRepaintQueued) return;
  pdoRepaintQueued = true;
  const raf = window.parent.requestAnimationFrame || window.requestAnimationFrame;
  raf(() => {
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
  if (targetEl && targetEl.id !== 'completion_prompt_manager_list'
      && targetEl.id !== 'completion_prompt_manager'
      && targetEl.closest?.('li[data-pm-identifier]')) {
    return true;
  }
  const added = [...mutation.addedNodes || []].filter(node => node.nodeType === 1);
  if (!added.length) return false;
  return added.every(node => {
    const el = /** @type {Element} */ (node);
    return [...el.classList || []].some(cls => cls.startsWith('pdo-'))
      || !!el.querySelector?.('[class*="pdo-"]');
  });
}

function pdoCleanPromptRow(row) {
  [...row.classList].forEach(cls => {
    if (cls.startsWith('pdo-member-')) row.classList.remove(cls);
  });
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

  if (pdoIsHidden()) {
    list.querySelectorAll(':scope > .pdo-folder-header').forEach(h => h.remove());
    pdoCleanListClasses(list);
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
    pdoApplyingDecorations = false;
  }
}

function initPdoDecorator() {
  if (parentDoc._pdoObserver) {
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
  schedulePdoRepaint();
}
