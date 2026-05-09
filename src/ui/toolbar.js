// ─── Toast ────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  const $t = parent$('.psm-toast', parentDoc);
  $t.text(msg).addClass('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $t.removeClass('show'), 2200);
}

// ─── SortableJS loader ────────────────────────────────────────────────────

function loadSortable(cb) {
  if (window.parent.Sortable) { cb(); return; }
  const s = parentDoc.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js';
  s.onload = cb;
  s.onerror = () => ERR('Failed to load SortableJS — drag/drop will be unavailable');
  parentDoc.head.appendChild(s);
}

// ─── Initial DOM injection ────────────────────────────────────────────────

function createAndInjectUI() {
  const $panel = $('<div/>', { id: 'psm-panel' });
  const $toast = $('<div/>', { class: 'psm-toast' });
  parent$('body', parentDoc).append($panel).append($toast);
}

// ─── Extension menu entry ─────────────────────────────────────────────────

function injectExtensionMenu() {
  if (parent$('#psm-wand-item', parentDoc).length > 0) return;
  const $container = $('<div/>', { class: 'extension_container interactable', tabindex: 0 });
  const $item = $('<div/>', {
    id:       'psm-wand-item',
    class:    'list-group-item flex-container flexGap5 interactable',
    tabindex: 0,
    role:     'listitem',
    title:    'Preset State Manager',
  }).html('<div class="fa-fw fa-solid fa-sliders extensionsMenuExtensionButton"></div><span>Preset State Manager</span>');
  $container.append($item);
  parent$('#extensionsMenu', parentDoc).append($container);
  $item.on('click', () => {
    panelOpen ? closePanel() : openPanel();
  });
}

// ─── Panel open / close ───────────────────────────────────────────────────

function openPanel() {
  panelOpen   = true;
  currentView = 'browser';
  parent$('#psm-panel', parentDoc).addClass('open');
  renderView();
  window.parent.requestAnimationFrame(() => {
    const panelEl = parent$('#psm-panel', parentDoc)[0];
    const saved   = posLoad();
    const pos     = saved || defaultPanelPos();
    panelEl.style.setProperty('top',  pos.top  + 'px', 'important');
    panelEl.style.setProperty('left', pos.left + 'px', 'important');
    clampPanelToViewport();
  });
}

function closePanel() {
  panelOpen      = false;
  renamingFolder = null;
  parent$('#psm-panel', parentDoc).removeClass('open');
  confirmingSnaps.clear();
  deletingSnaps.clear();
}

// ─── Header drag ──────────────────────────────────────────────────────────

function bindHeaderDrag() {
  const panelEl = parent$('#psm-panel', parentDoc)[0];

  parent$('#psm-panel', parentDoc).on('mousedown touchstart', '.psm-header', function(e) {
    if ($(e.target).closest('button').length) return;
    const src       = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
    const startX    = src.clientX, startY = src.clientY;
    const startTop  = parseFloat(panelEl.style.top)  || 0;
    const startLeft = parseFloat(panelEl.style.left) || 0;
    let moved = false;

    function onMove(e) {
      const src = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
      const dx = src.clientX - startX, dy = src.clientY - startY;
      if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
      if (!moved) return;
      const margin = 10;
      const pw = panelEl.offsetWidth, ph = panelEl.offsetHeight;
      const innerW = window.parent.innerWidth, innerH = window.parent.innerHeight;
      panelEl.style.setProperty('top',  Math.min(Math.max(margin, startTop  + dy), innerH - ph - margin) + 'px', 'important');
      panelEl.style.setProperty('left', Math.min(Math.max(margin, startLeft + dx), innerW - pw - margin) + 'px', 'important');
    }
    function onUp() {
      parent$(parentDoc).off('mousemove touchmove', onMove).off('mouseup touchend', onUp);
      if (moved) posSave(parseFloat(panelEl.style.top), parseFloat(panelEl.style.left));
    }
    parent$(parentDoc).on('mousemove touchmove', onMove).on('mouseup touchend', onUp);
  });
}
