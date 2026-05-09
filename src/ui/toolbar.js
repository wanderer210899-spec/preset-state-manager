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
  const $inner = $('<div/>', { id: 'psm-panel-inner' });
  const $toast = $('<div/>', { class: 'psm-toast', 'aria-live': 'polite', role: 'status' });
  $panel.append($inner).append($toast);
  parent$('body', parentDoc).append($panel);
}

// Stop pointer/focus/key bubbling so SillyTavern's AI drawer does not treat
// interaction with PSM as an outside click / blur and auto-close.
function bindPanelInteractionIsolation() {
  const el = parent$('#psm-panel', parentDoc)[0];
  if (!el || el.dataset.psmIsolate === '1') return;
  el.dataset.psmIsolate = '1';
  ['mousedown', 'pointerdown', 'click', 'touchstart', 'focusin', 'keydown'].forEach(type => {
    el.addEventListener(type, ev => { ev.stopPropagation(); }, false);
  });
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

const PSM_OPENAI_PRESET_WRAP_ID = 'psm-openai-preset-shortcut-wrap';

function injectOpenaiRangePresetShortcut() {
  if (parent$('#' + PSM_OPENAI_PRESET_WRAP_ID, parentDoc).length > 0) return true;
  const $rb = parent$('#range_block_openai', parentDoc);
  if (!$rb.length) return false;
  const $nth = $rb.children().eq(9);
  if (!$nth.length) return false;
  const $wrap = $('<div/>', {
    id:    PSM_OPENAI_PRESET_WRAP_ID,
    class: 'flex-container flexGap5 alignItemsCenter wide100p',
  }).css({ marginBottom: '6px' });
  const $btn = $('<button/>', {
    type:  'button',
    id:    'psm-openai-preset-shortcut-btn',
    class: 'menu_button menu_button_icon',
    title: 'Snapshots for current preset',
    html:  '<i class="fa-fw fa-solid fa-layer-group"></i>',
  });
  $btn.on('click', e => {
    e.preventDefault();
    e.stopPropagation();
    openPanel({ openDetailForPreset: true });
  });
  $wrap.append($btn);
  $nth.prepend($wrap);
  return true;
}

function scheduleInjectOpenaiRangePresetShortcut() {
  [0, 400, 1200, 2800].forEach(ms => {
    window.parent.setTimeout(() => { injectOpenaiRangePresetShortcut(); }, ms);
  });
}

// ─── Panel open / close ───────────────────────────────────────────────────

function openPanel(opts = {}) {
  panelOpen = true;
  if (opts.openDetailForPreset) {
    detailPreset = currentPreset();
    currentView  = 'detail';
  } else {
    currentView = 'browser';
  }
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
