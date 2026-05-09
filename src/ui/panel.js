// ─── Shared header HTML ───────────────────────────────────────────────────

function headerHtml(title, showBack, extraBtns = '') {
  return `<div class="psm-header">
    ${showBack ? '<button class="psm-ghost psm-header-btn" id="psm-back">←</button>' : ''}
    <span class="psm-header-title">${title}</span>
    ${extraBtns}
    <button class="psm-ghost psm-header-btn" id="psm-close">✕</button>
  </div>`;
}

// ─── Render dispatcher ────────────────────────────────────────────────────

const VIEWS = { browser: renderBrowser, detail: renderDetail, note: renderNoteEdit };
function renderView() { VIEWS[currentView]?.(); }

// ─── View 1: Browser ─────────────────────────────────────────────────────

function buildListHtml() {
  const meta        = metaLoad();
  const active      = currentPreset();
  const all         = allPresetNames().filter(p => p !== 'in_use');
  const allSet      = new Set(all);
  const filter      = filterText.trim().toLowerCase();
  const folders     = meta.folders || {};
  const folderOrder = (meta.folderOrder || Object.keys(folders)).filter(f => folders[f]);
  const notes       = meta.presetNotes || {};
  const inFolders   = new Set(Object.values(folders).flatMap(f => f.presets || []));

  let folderHtml = '';

  folderOrder.forEach(fname => {
    const fdata   = folders[fname];
    const presets = (fdata.presets || []).filter(p =>
      allSet.has(p) && (!filter || p.toLowerCase().includes(filter))
    );
    if (filter && !presets.length && !fname.toLowerCase().includes(filter)) return;
    const open       = expandedFolders.has(fname);
    const isRenaming = renamingFolder === fname;
    const swipeActions =
      `<button class="psm-ghost psm-folder-add" data-folder-add="${esc(fname)}">Add</button>
       <button class="psm-ghost psm-folder-rename-btn" data-folder-rename-btn="${esc(fname)}">Rename</button>
       <button class="psm-folder-del swipe" data-folder-del="${esc(fname)}">Delete</button>`;

    folderHtml += `<div class="psm-folder-block" data-folder="${esc(fname)}">
      <div class="psm-folder-row" data-folder="${esc(fname)}">
        <div class="psm-folder-row-content">
          <div class="psm-folder-main">
            <span class="psm-drag-handle" title="Drag to reorder">⠿</span>
            <span class="psm-folder-arrow">${open ? '▼' : '▶'}</span>
            ${isRenaming
              ? `<input class="psm-folder-rename-input" data-folder-rename="${esc(fname)}" value="${esc(fname)}" />`
              : `<span class="psm-folder-label">${esc(fname)}</span>`}
          </div>
          <div class="psm-folder-swipe-actions">${swipeActions}</div>
        </div>
      </div>
      <div class="psm-preset-list${open ? '' : ' psm-preset-list--collapsed'}" data-folder="${esc(fname)}">`;
    if (open) {
      presets.forEach(pn => { folderHtml += presetRowHtml(pn, active, false, notes, fname); });
    }
    folderHtml += `</div></div>`;
  });

  const ungrouped = all.filter(p => !inFolders.has(p) && (!filter || p.toLowerCase().includes(filter)));
  const ungroupedHtml = ungrouped.map(pn => presetRowHtml(pn, active, true, notes, '')).join('');

  return `
    <div id="psm-folder-sortable">${folderHtml}</div>
    <div id="psm-ungrouped-list" class="psm-preset-list" data-folder="">${ungroupedHtml}</div>
    ${!all.length ? '<div class="psm-empty">No presets found</div>' : ''}
  `;
}

function renderList() {
  const $panel = parent$('#psm-panel', parentDoc);
  $panel.find('#psm-list').html(buildListHtml());
  bindListEvents($panel);
  if (renamingFolder) {
    const $ri = $panel.find('.psm-folder-rename-input');
    if ($ri.length) { $ri[0].focus(); $ri[0].select(); }
  }
}

function renderBrowser() {
  const $panel    = parent$('#psm-panel', parentDoc);
  const active    = currentPreset();
  const extraBtns = `<button class="psm-ghost psm-header-btn psm-active-link" id="psm-active-link" title="Go to active preset">${esc(active)}</button>`;
  $panel.html(
    headerHtml('PSM', false, extraBtns) +
    `<div class="psm-body">
      <input class="psm-filter" id="psm-filter" type="text" placeholder="🔍 filter presets…" value="${esc(filterText)}" />
      <div class="psm-new-folder-row">
        <input id="psm-new-folder-input" type="text" placeholder="New folder name…" />
        <button id="psm-new-folder-btn">+ Folder</button>
      </div>
      <div id="psm-list">${buildListHtml()}</div>
      <div class="psm-data-row">
        <button id="psm-export">Export</button>
        <button id="psm-import">Import</button>
        <button id="psm-reset" class="psm-danger">Reset</button>
      </div>
    </div>`
  );
  bindBrowserEvents();
}

function presetRowHtml(pn, active, ungrouped, notes, folder) {
  const isActive = pn === active;
  const noteOpen = expandedNotes.has(pn);
  const note     = notes[pn] || '';
  const cls      = ungrouped ? ' ungrouped' : '';
  // psm-preset-item is the draggable unit — it wraps BOTH the row and the note
  // so SortableJS moves them together. Previously the note was a sibling and
  // got left behind when the row was dragged, orphaning it under the wrong preset.
  return `<div class="psm-preset-item" data-preset="${esc(pn)}" data-preset-folder="${esc(folder || '')}">
    <div class="psm-preset-row${cls}">
      <span class="psm-drag-handle" title="Drag to reorder">⠿</span>
      ${isActive ? '<span class="psm-active-dot"></span>' : '<span class="psm-inactive-spacer"></span>'}
      <button class="psm-ghost psm-preset-name-btn" data-goto="${esc(pn)}">${esc(pn)}</button>
      <button class="psm-ghost psm-info-btn${noteOpen ? ' open' : ''}" data-info="${esc(pn)}" title="Note">ℹ</button>
    </div>
    ${noteOpen ? `<div class="psm-note-inline${cls}">
      ${note ? esc(note) : '<em>No note.</em>'}
      <span class="psm-ghost psm-edit-link" data-edit-note="${esc(pn)}">[edit]</span>
    </div>` : ''}
  </div>`;
}

function closeSwipedFolders($p) {
  ($p || parent$('#psm-panel', parentDoc)).find('.psm-folder-row.swipe-open').removeClass('swipe-open');
}

function isDragActive() {
  return !!parent$('#psm-list', parentDoc)[0]?.classList.contains('psm-drag-active');
}

function bindListEvents($p) {
  // Folder expand/collapse — click the main row area only
  $p.find('.psm-folder-main').on('click', function(e) {
    if (isDragActive()) return;
    if ($(e.target).closest('.psm-folder-rename-input').length) return;
    if (renamingFolder) return;
    const fname = attr($(this).closest('.psm-folder-row')[0], 'folder');
    closeSwipedFolders($p);
    toggleSet(expandedFolders, fname);
    renderList();
  });

  // Rename via button in swipe panel
  $p.find('[data-folder-rename-btn]').on('click', function(e) {
    e.stopPropagation();
    renamingFolder = attr(this, 'folder-rename-btn');
    closeSwipedFolders($p);
    renderList();
  });

  // Rename input
  $p.find('[data-folder-rename]').on('keydown', function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); confirmRename(attr(this, 'folder-rename'), $(this).val().trim()); }
    if (e.key === 'Escape') { renamingFolder = null; renderList(); }
  }).on('blur', function() {
    if (renamingFolder) confirmRename(attr(this, 'folder-rename'), $(this).val().trim());
  }).on('click', e => e.stopPropagation());

  // Add preset to folder (dropdown)
  $p.find('[data-folder-add]').on('click', function(e) {
    e.stopPropagation();
    showFolderDropdown(attr(this, 'folder-add'), this);
  });

  // Delete — native confirm, no re-render needed for confirmation state
  $p.find('[data-folder-del]').on('click', function(e) {
    e.stopPropagation();
    const fname = attr(this, 'folder-del');
    if (!window.parent.confirm(`Delete folder "${fname}"?\nPresets inside will become ungrouped.`)) return;
    const m = metaLoad();
    delete m.folders[fname];
    m.folderOrder = (m.folderOrder || []).filter(f => f !== fname);
    metaSave(m);
    expandedFolders.delete(fname);
    renderList();
  });

  // Preset navigation
  $p.find('[data-goto]').on('click', function() {
    if (isDragActive()) return;
    detailPreset = attr(this, 'goto');
    currentView  = 'detail';
    renderView();
  });

  $p.find('[data-info]').on('click', function() {
    const pn = attr(this, 'info');
    toggleSet(expandedNotes, pn);
    renderList();
  });

  $p.find('[data-edit-note]').on('click', function() {
    notePreset  = attr(this, 'edit-note');
    currentView = 'note';
    renderView();
  });

  // Drag handle clicks must not bubble to folder-main or preset row click handlers
  $p.find('.psm-drag-handle').on('click', e => e.stopPropagation());

  bindFolderSwipe($p);
  initSortables();
}

function bindBrowserEvents() {
  const $p = parent$('#psm-panel', parentDoc);

  $p.find('#psm-close').on('click', closePanel);
  $p.find('#psm-active-link').on('click', () => {
    detailPreset = currentPreset();
    currentView  = 'detail';
    renderView();
  });
  $p.find('#psm-export').on('click', exportData);
  $p.find('#psm-import').on('click', importData);
  $p.find('#psm-reset').on('click', resetData);

  $p.find('#psm-new-folder-btn').on('click', () => {
    const name = ($p.find('#psm-new-folder-input').val() || '').trim();
    if (!name) return;
    ensureFolder(name);
    expandedFolders.add(name);
    $p.find('#psm-new-folder-input').val('');
    renderList();
  });
  $p.find('#psm-new-folder-input').on('keydown', function(e) {
    if (e.key === 'Enter') $p.find('#psm-new-folder-btn').trigger('click');
  });

  $p.find('#psm-filter').on('input', function() {
    filterText = $(this).val();
    renderList();
  });

  bindListEvents($p);
}

// ─── Folder swipe-to-reveal ───────────────────────────────────────────────

function bindFolderSwipe($p) {
  parent$(parentDoc).off('pointerdown.psmswipe');

  $p.find('.psm-folder-main').on('pointerdown', function(e) {
    if (isDragActive()) return;
    if (e.pointerType === 'mouse') return; // mouse users get hover-reveal via CSS
    if ($(e.target).closest('.psm-folder-rename-input').length) return;
    const el       = this;
    const $row     = $(this).closest('.psm-folder-row');
    const $content = $row.find('.psm-folder-row-content')[0];
    const isOpen   = $row.hasClass('swipe-open');
    const startX   = e.clientX, startY = e.clientY;
    let swipeDir   = null, swiping = false;
    const pid      = e.pointerId;

    function onMove(ev) {
      if (isDragActive()) return; // drag took over, abort swipe
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!swipeDir && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        swipeDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      if (swipeDir !== 'h') return;
      swiping = true;
      ev.preventDefault();
      const offset  = isOpen ? -140 + dx : dx;
      const clamped = Math.min(0, Math.max(-140, offset));
      $content.style.transition = 'none';
      $content.style.transform  = `translateX(${clamped}px)`;
    }
    function onUp(ev) {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
      el.removeEventListener('pointercancel', onUp);
      $content.style.transition = '';
      $content.style.transform  = '';
      if (!swiping) return;
      const dx = ev.clientX - startX;
      if (isOpen) {
        // Any swipe > 40px (either direction) closes the panel
        if (Math.abs(dx) > 40) $row.removeClass('swipe-open');
        else                    $row.addClass('swipe-open');
      } else {
        // Must swipe left at least 60px to open
        if (dx < -60) { closeSwipedFolders($p); $row.addClass('swipe-open'); }
      }
    }
    try { el.setPointerCapture(pid); } catch(_) {}
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup',   onUp);
    el.addEventListener('pointercancel', onUp);
  });

  parent$(parentDoc).on('pointerdown.psmswipe', function(e) {
    if (!$(e.target).closest('.psm-folder-row').length) {
      closeSwipedFolders($p);
    }
  });
}

// ─── Drag and drop (SortableJS) ───────────────────────────────────────────

function initSortables() {
  const Sortable = window.parent.Sortable;
  if (!Sortable) return;

  const listEl = parent$('#psm-list', parentDoc)[0];
  if (!listEl) return;

  // Destroy stale instances from the previous renderList() call.
  // Without this, old instances pile up on detached DOM nodes and fire errors.
  if (listEl._psmSortables) {
    listEl._psmSortables.forEach(s => { try { s.destroy(); } catch (_) {} });
  }
  listEl._psmSortables = [];

  const folderEl = listEl.querySelector('#psm-folder-sortable');

  const isMobile = ('ontouchstart' in window.parent)
    || ((window.parent.navigator?.maxTouchPoints ?? 0) > 0);

  function setDragActive(on) {
    listEl.classList.toggle('psm-drag-active', on);
  }

  // Track which folder block is currently highlighted during drag so we can
  // clear it cleanly on every move without scanning the full DOM each time.
  let dragOverFolder = null;
  function setDragOver(fname) {
    if (dragOverFolder === fname) return;
    if (dragOverFolder !== null) {
      Array.from(listEl.querySelectorAll('.psm-folder-block'))
        .find(el => el.dataset.folder === dragOverFolder)
        ?.classList.remove('psm-folder-drag-over');
    }
    dragOverFolder = fname;
    if (fname !== null) {
      Array.from(listEl.querySelectorAll('.psm-folder-block'))
        .find(el => el.dataset.folder === fname)
        ?.classList.add('psm-folder-drag-over');
    }
  }

  // Merge DOM-visible preset order with hidden (filtered) presets.
  // `exclude` prevents a just-moved preset from being re-added to its source
  // folder as a "hidden" item (SortableJS has already removed it from the DOM
  // but the saved data still lists it).
  function mergePresets(domListEl, existingPresets, exclude) {
    // Each draggable is now a .psm-preset-item wrapper that carries data-preset.
    const domOrder = [...domListEl.querySelectorAll(':scope > .psm-preset-item')]
      .map(el => el.dataset.preset).filter(Boolean);
    const domSet = new Set(domOrder);
    const hidden = (existingPresets || []).filter(p => !domSet.has(p) && p !== exclude);
    return [...domOrder, ...hidden];
  }

  // Shared base options.
  // forceFallback / fallbackOnBody are intentionally absent — SortableJS's
  // fallback mode captures ALL pointer events, which collides directly with
  // bindFolderSwipe's pointerdown/pointermove handlers on mobile.
  const base = {
    animation:           150,
    delay:               isMobile ? 200 : 0,
    delayOnTouchOnly:    true,
    touchStartThreshold: 5,
    ghostClass:          'psm-sortable-ghost',
    chosenClass:         'psm-sortable-chosen',
  };

  // ── Folder reorder ────────────────────────────────────────────────────────
  if (folderEl) {
    const inst = Sortable.create(folderEl, {
      ...base,
      group:    { name: 'psm-folders', pull: false, put: false },
      draggable: '.psm-folder-block',
      handle:    '.psm-folder-row .psm-drag-handle',
      onStart:   () => setDragActive(true),
      onEnd() {
        setDragActive(false);
        const m = metaLoad();
        m.folderOrder = [...folderEl.querySelectorAll(':scope > .psm-folder-block')]
          .map(el => el.dataset.folder).filter(Boolean);
        metaSave(m);
      }
    });
    listEl._psmSortables.push(inst);
  }

  // ── Preset lists: reorder within folder + cross-folder drag ───────────────
  listEl.querySelectorAll('.psm-preset-list').forEach(el => {
    const inst = Sortable.create(el, {
      ...base,
      // Every list — including collapsed — accepts drops. Collapsed lists are
      // inflated to 44px during drag (via CSS .psm-drag-active) so they form a
      // reachable touch target on mobile. On successful drop, onEnd auto-expands
      // the destination folder so the item is immediately visible.
      group:                { name: 'psm-presets', pull: true, put: true },
      draggable:            '.psm-preset-item',   // drag the wrapper, not just the row
      handle:               '.psm-drag-handle',
      emptyInsertThreshold: 8,
      onStart: () => setDragActive(true),
      onMove(evt) {
        // Highlight whichever folder block the dragged item is currently over.
        const block = (evt.related ?? evt.to)?.closest?.('.psm-folder-block[data-folder]');
        setDragOver(block?.dataset.folder ?? null);
      },
      onEnd(evt) {
        setDragOver(null);
        setDragActive(false);

        const fromFolder  = evt.from.dataset.folder ?? '';
        const toFolder    = evt.to.dataset.folder   ?? '';
        const movedPreset = evt.item.dataset.preset;

        if (evt.from === evt.to && evt.oldIndex === evt.newIndex) return;

        const m = metaLoad();

        if (toFolder && m.folders[toFolder]) {
          m.folders[toFolder].presets = mergePresets(evt.to, m.folders[toFolder].presets);
        }
        if (fromFolder && fromFolder !== toFolder && m.folders[fromFolder]) {
          m.folders[fromFolder].presets = mergePresets(
            evt.from, m.folders[fromFolder].presets, movedPreset
          );
        }

        metaSave(m);

        if (fromFolder !== toFolder) {
          // Expand destination so the dropped preset is immediately visible.
          // Delay matches animation duration so SortableJS finishes its drop
          // animation before we replace the DOM node it is still animating.
          if (toFolder) expandedFolders.add(toFolder);
          setTimeout(renderList, 170);
        } else {
          evt.item.dataset.presetFolder = toFolder;
        }
      }
    });
    listEl._psmSortables.push(inst);
  });
}

// ─── Data reset ───────────────────────────────────────────────────────────

function resetData() {
  if (!window.parent.confirm(
    'Reset ALL PSM data?\n\nThis will permanently delete all folders, preset assignments, notes, and snapshots.\nThis cannot be undone.'
  )) return;
  dbSave({});
  metaSave({ folders: {}, presetNotes: {}, folderOrder: [] });
  expandedFolders.clear();
  expandedNotes.clear();
  filterText    = '';
  renamingFolder = null;
  showToast('Data reset');
  renderView();
}

// ─── Data export / import ─────────────────────────────────────────────────

function exportData() {
  const payload = { version: 1, exported: new Date().toISOString(),
    snapshots: dbLoad(), meta: metaLoad() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = window.parent.URL.createObjectURL(blob);
  const a    = parentDoc.createElement('a');
  a.href = url; a.download = 'psm-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  parentDoc.body.appendChild(a); a.click();
  parentDoc.body.removeChild(a); window.parent.URL.revokeObjectURL(url);
  showToast('Exported');
}

function importData() {
  const input = parentDoc.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new window.parent.FileReader();
    reader.onload = function(ev) {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d.snapshots || !d.meta) { showToast('Invalid backup file'); return; }
        if (!window.parent.confirm('Overwrite all PSM data with this backup?')) return;
        dbSave(d.snapshots); metaSave(d.meta);
        showToast('Imported'); renderView();
      } catch { showToast('Failed to read file'); }
    };
    reader.readAsText(file);
  };
  parentDoc.body.appendChild(input); input.click(); parentDoc.body.removeChild(input);
}

// ─── Folder operations ────────────────────────────────────────────────────

function confirmRename(oldName, newName) {
  renamingFolder = null;
  if (!newName || newName === oldName) { renderList(); return; }
  const m = metaLoad();
  if (m.folders[newName]) { showToast('Folder name already exists'); renderList(); return; }
  m.folders[newName] = m.folders[oldName];
  delete m.folders[oldName];
  const idx = (m.folderOrder || []).indexOf(oldName);
  if (idx !== -1) m.folderOrder[idx] = newName;
  metaSave(m);
  if (expandedFolders.has(oldName)) { expandedFolders.delete(oldName); expandedFolders.add(newName); }
  renderList();
}

function showFolderDropdown(folderName, anchorEl) {
  parent$('.psm-folder-dropdown', parentDoc).remove();

  const meta        = metaLoad();
  const inAnyFolder = new Set(Object.values(meta.folders).flatMap(f => f.presets || []));
  const available   = allPresetNames().filter(p => p !== 'in_use' && !inAnyFolder.has(p));

  if (!available.length) { showToast('All presets already in folders'); return; }

  const $drop = $('<div/>', { class: 'psm-folder-dropdown' });
  available.forEach(pn => {
    $drop.append($('<div/>', { class: 'psm-fd-item', 'data-move': pn }).text(pn));
  });

  const rect = anchorEl.getBoundingClientRect();
  parent$('body', parentDoc).append($drop);
  const dw = $drop[0].offsetWidth, dh = $drop[0].offsetHeight;
  const vw = window.parent.innerWidth,  vh = window.parent.innerHeight;
  let top  = rect.bottom + 4, left = rect.left;
  if (left + dw > vw - 8) left = Math.max(8, vw - dw - 8);
  if (top  + dh > vh - 8) top  = Math.max(8, rect.top - dh - 4);
  $drop.css({ top: top + 'px', left: left + 'px' });

  $drop.find('[data-move]').on('click', function() {
    const pn = attr(this, 'move');
    const m  = metaLoad();
    Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(x => x !== pn); });
    if (!m.folders[folderName]) m.folders[folderName] = { presets: [] };
    m.folders[folderName].presets.push(pn);
    metaSave(m);
    $drop.remove();
    renderBrowser();
  });

  setTimeout(() => { parent$(parentDoc).one('click', () => $drop.remove()); }, 0);
}

// ─── View 2: Preset detail ────────────────────────────────────────────────

function renderDetail() {
  const $panel   = parent$('#psm-panel', parentDoc);
  const db       = dbLoad();
  const active   = currentPreset();
  const pn       = detailPreset;
  const snaps    = db[pn] || {};
  const keys     = Object.keys(snaps);
  const isActive = pn === active;

  const snapHtml = keys.length
    ? keys.map(name => {
        const s          = snaps[name];
        const cKey       = snapKey(pn, name);
        const confirming = confirmingSnaps.has(cKey);
        const deleting   = deletingSnaps.has(cKey);
        return `<div class="psm-snap">
          <span class="psm-snap-name">${esc(name)}</span>
          <span class="psm-snap-meta">${esc(s.meta)}</span>
          ${confirming
            ? `<button class="psm-snap-apply confirming" data-confirm="${esc(name)}">Confirm</button>
               <button class="psm-ghost psm-snap-cancel" data-cancel="${esc(name)}">Cancel</button>`
            : `<button class="psm-snap-apply" data-apply="${esc(name)}">Apply</button>`}
          ${deleting
            ? `<button class="psm-snap-del confirming" data-del-confirm="${esc(name)}">Delete?</button>
               <button class="psm-ghost psm-snap-cancel" data-del-cancel="${esc(name)}">Cancel</button>`
            : `<button class="psm-ghost psm-snap-del" data-del="${esc(name)}" title="Delete">✕</button>`}
        </div>`;
      }).join('')
    : '<div class="psm-empty">No snapshots yet</div>';

  $panel.html(
    headerHtml(esc(pn), true, '<button class="psm-ghost psm-header-btn" id="psm-detail-info" title="Note">ℹ</button>') +
    `<div class="psm-body">
      ${isActive ? `<div class="psm-save-row">
        <input id="psm-snap-input" type="text" placeholder="Name this snapshot…" />
        <button id="psm-save-btn">Save</button>
      </div>` : ''}
      ${snapHtml}
      ${isActive ? `<hr class="psm-divider">
        <details class="psm-details">
          <summary>Prompt states</summary>
          <label class="psm-show-disabled"><input type="checkbox" id="psm-show-off"> show disabled</label>
          <div id="psm-prompt-list"></div>
        </details>` : ''}
    </div>`
  );

  if (isActive) renderPromptList(false);
  bindDetailEvents(pn, isActive);
}

function renderPromptList(showDisabled) {
  const prompts = readPrompts();
  const visible = showDisabled ? prompts : prompts.filter(p => p.enabled);
  parent$('#psm-prompt-list', parentDoc).html(
    visible.length
      ? visible.map(p =>
          `<div class="psm-prompt-row">
            <span class="psm-dot ${p.enabled ? 'on' : 'off'}"></span>
            <span class="psm-pname ${p.enabled ? 'on' : 'off'}">${esc(p.name)}</span>
          </div>`
        ).join('')
      : '<div class="psm-empty">All prompts disabled</div>'
  );
}

function bindDetailEvents(pn, isActive) {
  const $p = parent$('#psm-panel', parentDoc);

  $p.find('#psm-back').on('click', () => { currentView = 'browser'; renderView(); });
  $p.find('#psm-close').on('click', closePanel);
  $p.find('#psm-detail-info').on('click', () => {
    notePreset  = pn;
    currentView = 'note';
    renderView();
  });

  if (isActive) {
    $p.find('#psm-save-btn').on('click', () => psmSave(pn));
    $p.find('#psm-snap-input').on('keydown', e => { if (e.key === 'Enter') psmSave(pn); });
    $p.find('#psm-show-off').on('change', function() { renderPromptList(this.checked); });
    $p.find('.psm-snap-name').on('click', function() {
      $p.find('#psm-snap-input').val($(this).text());
    });
  }

  $p.find('[data-apply]').on('click', function() {
    confirmingSnaps.add(snapKey(pn, attr(this, 'apply')));
    renderDetail();
  });
  $p.find('[data-confirm]').on('click', function() { psmApply(pn, attr(this, 'confirm')); });
  $p.find('[data-cancel]').on('click', function() {
    confirmingSnaps.delete(snapKey(pn, attr(this, 'cancel')));
    renderDetail();
  });
  $p.find('[data-del]').on('click', function() {
    deletingSnaps.add(snapKey(pn, attr(this, 'del')));
    renderDetail();
  });
  $p.find('[data-del-confirm]').on('click', function() { psmDelete(pn, attr(this, 'del-confirm')); });
  $p.find('[data-del-cancel]').on('click', function() {
    deletingSnaps.delete(snapKey(pn, attr(this, 'del-cancel')));
    renderDetail();
  });
}

// ─── View 3: Note edit ────────────────────────────────────────────────────

function renderNoteEdit() {
  const $panel  = parent$('#psm-panel', parentDoc);
  const meta    = metaLoad();
  const note    = (meta.presetNotes || {})[notePreset] || '';
  const folders = Object.keys(meta.folders || {});
  const current = getFolderForPreset(notePreset) || '';

  const folderOpts = `<option value="">— ungrouped —</option>` +
    folders.map(f => `<option value="${esc(f)}"${f === current ? ' selected' : ''}>${esc(f)}</option>`).join('');

  $panel.html(
    headerHtml(esc(notePreset) + ' · note', true) +
    `<div class="psm-body">
      <label class="psm-form-label">Folder</label>
      <select class="psm-form-select" id="psm-folder-sel">${folderOpts}</select>
      <div class="psm-new-folder-row">
        <input id="psm-new-folder-input" type="text" placeholder="New folder name…" />
        <button id="psm-new-folder-btn">Create</button>
      </div>
      <label class="psm-form-label">Note</label>
      <textarea class="psm-form-textarea" id="psm-note-text">${esc(note)}</textarea>
      <div class="psm-btn-row">
        <button id="psm-note-save">Save</button>
        <button id="psm-note-cancel">Cancel</button>
      </div>
    </div>`
  );
  bindNoteEvents();
}

function bindNoteEvents() {
  const $p = parent$('#psm-panel', parentDoc);

  $p.find('#psm-back, #psm-note-cancel').on('click', () => {
    currentView = detailPreset ? 'detail' : 'browser';
    renderView();
  });
  $p.find('#psm-close').on('click', closePanel);

  $p.find('#psm-new-folder-btn').on('click', () => {
    const name = ($p.find('#psm-new-folder-input').val() || '').trim();
    if (!name) return;
    ensureFolder(name);
    renderNoteEdit();
    parent$('#psm-folder-sel', parentDoc).val(name);
  });

  $p.find('#psm-note-save').on('click', () => {
    const m              = metaLoad();
    const noteText       = ($p.find('#psm-note-text').val() || '').trim();
    const selectedFolder = $p.find('#psm-folder-sel').val() || '';

    if (!m.presetNotes) m.presetNotes = {};
    m.presetNotes[notePreset] = noteText;

    Object.values(m.folders).forEach(f => {
      f.presets = (f.presets || []).filter(x => x !== notePreset);
    });
    if (selectedFolder && m.folders[selectedFolder]) {
      if (!m.folders[selectedFolder].presets.includes(notePreset)) {
        m.folders[selectedFolder].presets.push(notePreset);
      }
    }
    metaSave(m);
    showToast('Note saved');
    currentView = detailPreset ? 'detail' : 'browser';
    renderView();
  });
}
