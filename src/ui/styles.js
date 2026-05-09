// ─── Scale config ─────────────────────────────────────────────────────────
// Change PSM_SCALE.base to resize the entire UI. All sizes derive from it.
const PSM_SCALE = {
  base:    16,     // body/input font size in px — the one value to edit
  body:    1,      // preset names, body text            → 16px
  caption: 0.8125, // secondary text, notes, snap meta   → 13px
  label:   0.75,   // folder/section labels (uppercase)  → 12px
  iconSm:  1,      // small toolbar icons: ℹ ✕ ← +       → 16px
  iconMd:  1.5,    // main ⚙ button icon                 → 24px
  pad:     0.5,    // spacing unit                       → 8px
};

// ─── Styles ───────────────────────────────────────────────────────────────

function waitForThemeAndInjectStyles({ interval = 50, timeout = 5000 } = {}) {
  const start = Date.now();
  const cs    = () => window.parent.getComputedStyle(parentDoc.documentElement);

  function attempt() {
    const tint   = cs().getPropertyValue('--SmartThemeBlurTintColor').trim();
    const border = cs().getPropertyValue('--SmartThemeBorderColor').trim();
    const body   = cs().getPropertyValue('--SmartThemeBodyColor').trim();

    if (tint && border && body) {
      // All variables resolved — inject normally
      injectStyles();
    } else if (Date.now() - start < timeout) {
      setTimeout(attempt, interval);
    } else {
      // Timed out — if ANY variable failed to resolve, force ALL three to safe
      // black-and-white defaults. A partial resolve (e.g. bg resolves but text
      // doesn't) risks invisible text like white-on-white, so it's all or nothing.
      const anyFailed = !tint || !border || !body;
      injectStyles(anyFailed ? {
        bgFallback:     '#ffffff',
        borderFallback: '#000000',
        mutedFallback:  '#000000',
      } : {});
    }
  }

  attempt();
}

function injectStyles({ bgFallback = null, borderFallback = null, mutedFallback = null } = {}) {
  if (parent$('#' + STYLE_ID, parentDoc).length > 0) return;

  const b    = PSM_SCALE.base;
  const px   = k => `${Math.round(b * PSM_SCALE[k])}px`;
  const sp   = n => `${Math.round(b * PSM_SCALE.pad * n)}px`;
  const fluid = k => {
    const hi = Math.round(b * PSM_SCALE[k]);
    const lo = Math.max(14, Math.round(hi * 0.875));
    if (lo === hi) return `${hi}px`;
    const slope  = ((hi - lo) / 649 * 100).toFixed(2);
    const offset = (lo - parseFloat(slope) / 100 * 375).toFixed(2);
    return `clamp(${lo}px, ${slope}vw + ${offset}px, ${hi}px)`;
  };

  const bg     = bgFallback     ?? 'oklch(from var(--SmartThemeBlurTintColor) l c h / 1)';
  const border = borderFallback ?? 'var(--SmartThemeBorderColor)';
  const muted  = mutedFallback  ?? 'var(--SmartThemeBodyColor)';
  const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';

  const css = `
    #psm-panel {
      position: fixed !important; z-index: 99998 !important;
      width: min(320px, calc(100vw - 24px)) !important;
      max-height: 80vh !important; overflow: hidden !important;
      display: none !important; flex-direction: column !important;
      background: ${bg} !important; border: 1px solid ${border} !important;
      border-radius: 12px !important; padding: 0 !important;
      font-size: ${fluid('body')} !important; color: ${muted} !important;
      font-family: ${bodyFont} !important;
      box-sizing: border-box !important;
    }
    #psm-panel.open { display: flex !important; }
    #psm-panel-inner {
      flex: 1 1 auto !important; min-height: 0 !important;
      overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;
    }
    #psm-panel button, #psm-panel input, #psm-panel select, #psm-panel textarea {
      font-family: inherit !important; color: ${muted};
    }
    .psm-filter,
    .psm-save-row input, .psm-save-row button,
    .psm-snap-apply,
    .psm-snap-del.confirming,
    .psm-form-select, .psm-form-input, .psm-form-textarea,
    .psm-new-folder-row input, .psm-new-folder-row button,
    .psm-btn-row button, .psm-data-row button {
      border: 1px solid ${border}; background: ${bg}; color: ${muted};
    }

    .psm-header {
      display: flex; align-items: center; gap: ${sp(0.75)};
      padding: ${sp(1.25)} ${sp(1.5)}; border-bottom: 1px solid ${border};
      position: sticky; top: 0; background: ${bg}; z-index: 1;
      cursor: move;
    }
    .psm-header button { cursor: pointer; }
    .psm-header-title {
      flex: 1; font-size: ${px('label')}; font-weight: 600;
      text-transform: uppercase; letter-spacing: .07em;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .psm-ghost { background: none; border: none; cursor: pointer; }
    .psm-header-btn {
      font-size: ${px('iconSm')}; padding: ${sp(0.25)} ${sp(0.625)}; border-radius: 4px; line-height: 1; flex-shrink: 0;
    }
    .psm-active-link { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${px('caption')} !important; }

    .psm-body { padding: ${sp(1.25)} ${sp(1.5)}; }

    .psm-filter {
      width: 100%; box-sizing: border-box; border-radius: 6px;
      padding: ${sp(0.625)} ${sp(1.125)}; font-size: ${fluid('body')} !important;
      outline: none; margin-bottom: ${sp(1)}; display: block;
    }

    .psm-folder-row {
      display: flex; align-items: center; gap: 0;
      padding: 0 0; cursor: pointer; user-select: none;
      overflow: hidden; position: relative;
    }
    /* ── Folder row inner layout (swipe-to-reveal) ─────────────── */
    .psm-folder-row-content {
      display: flex; width: 100%;
      transform: translateX(0); transition: transform 0.18s ease;
      will-change: transform;
    }
    .psm-folder-row.swipe-open .psm-folder-row-content { transform: translateX(-175px); }
    .psm-folder-main {
      flex-shrink: 0; width: 100%;
      display: flex; align-items: center; gap: ${sp(0.625)};
      padding: ${sp(1)} ${sp(0.25)};
    }
    .psm-folder-swipe-actions {
      flex-shrink: 0; width: 175px;
      display: flex; align-items: center; gap: ${sp(0.375)}; padding: 0 ${sp(0.75)};
      border-left: 1px solid ${border};
    }
    .psm-folder-swipe-actions button { flex: 1; padding: ${sp(0.375)} 0; border-radius: 4px;
      font-size: ${px('caption')} !important; cursor: pointer; white-space: nowrap; }
    .psm-folder-add, .psm-folder-rename-btn { background: none !important; border: 1px solid ${border} !important; }
    .psm-folder-del.swipe { background: none !important; border: 1px solid #E24B4A !important; color: #E24B4A !important; }

    @media (hover: hover) {
      .psm-folder-row { overflow: visible; }
      .psm-folder-swipe-actions {
        position: absolute; right: 0; top: 0; bottom: 0; width: auto;
        background: ${bg}; border-left: 1px solid ${border};
        opacity: 0; pointer-events: none;
        transition: opacity 0.1s 0s;
      }
      .psm-folder-row:hover:not(.dragging) .psm-folder-swipe-actions {
        opacity: 1; pointer-events: auto;
        transition: opacity 0.15s 0.4s;
      }
    }

    .psm-folder-arrow { font-size: ${px('label')}; width: ${px('label')}; flex-shrink: 0; }
    .psm-folder-label {
      flex: 1; font-size: ${px('label')}; font-weight: 600;
      text-transform: uppercase; letter-spacing: .06em;
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .psm-folder-rename-input {
      flex: 1; background: ${bg}; border: none; border-bottom: 1px solid ${border};
      outline: none; padding: 0; min-width: 0;
      font-size: ${px('label')}; font-weight: 600;
      text-transform: uppercase; letter-spacing: .06em;
    }

    .psm-preset-row {
      display: flex; align-items: center; gap: ${sp(0.5)};
      padding: ${sp(0.875)} 0 ${sp(0.875)} ${sp(1.75)};
      user-select: none; -webkit-user-select: none;
    }
    .psm-preset-row.ungrouped { padding-left: ${sp(0.25)}; }
    .psm-active-dot { width: 5px; height: 5px; border-radius: 50%; background: #1D9E75; flex-shrink: 0; }
    .psm-inactive-spacer { width: 5px; flex-shrink: 0; }
    .psm-preset-name-btn {
      flex: 1; font-size: ${fluid('body')} !important; text-align: left;
      padding: ${sp(0.25)} ${sp(0.625)}; border-radius: 4px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .psm-info-btn {
      font-size: ${px('iconSm')}; padding: ${sp(0.375)} ${sp(0.75)}; border-radius: 3px; flex-shrink: 0;
      min-width: ${px('iconSm')}; text-align: center;
    }

    .psm-note-inline {
      padding: ${sp(0.375)} ${sp(0.75)} ${sp(0.625)} ${sp(2.5)};
      font-size: ${px('caption')}; white-space: pre-wrap; word-break: break-word;
      border-left: 2px solid ${border}; margin: 1px 0 ${sp(0.5)} ${sp(1.75)};
    }
    .psm-note-inline.ungrouped { margin-left: ${sp(0.25)}; }
    .psm-edit-link {
      text-decoration: underline;
      font-size: ${px('caption')}; margin-left: ${sp(0.5)}; padding: 1px ${sp(0.5)}; border-radius: 3px;
    }

    .psm-folder-dropdown {
      position: fixed; z-index: 999999;
      background: ${bg}; border: 1px solid ${border}; color: ${muted};
      font-family: var(--mainFontFamily);
      border-radius: 8px; padding: ${sp(0.5)} 0; min-width: 180px;
      max-width: calc(100vw - 16px);
      font-size: ${fluid('body')}; max-height: 200px; overflow-y: auto;
    }
    .psm-fd-item {
      padding: ${sp(0.625)} ${sp(1.5)}; cursor: pointer; white-space: nowrap;
      display: flex; align-items: baseline; gap: ${sp(0.75)};
    }

    .psm-save-row { display: flex; gap: ${sp(0.75)}; margin-bottom: ${sp(1.25)}; }
    .psm-save-row input {
      flex: 1; border-radius: 6px; outline: none; min-width: 0;
      padding: ${sp(0.625)} ${sp(1.125)}; font-size: ${fluid('body')} !important;
    }
    .psm-save-row button {
      padding: ${sp(0.625)} ${sp(1.625)}; border-radius: 6px; cursor: pointer;
      font-size: ${fluid('body')} !important; white-space: nowrap;
    }

    .psm-empty {
      text-align: center; font-size: ${px('caption')}; padding: ${sp(1.25)};
      border: 1px dashed ${border}; border-radius: 6px;
    }

    .psm-snap {
      display: flex; align-items: center; gap: ${sp(0.625)};
      padding: ${sp(0.625)} ${sp(1)};
      border: 1px solid ${border}; border-radius: 6px; margin-bottom: ${sp(0.5)};
    }
    .psm-snap:last-child { margin-bottom: 0; }
    .psm-snap-name { flex: 1; min-width: 0; font-size: ${fluid('body')} !important; word-break: break-all; cursor: pointer; }
    .psm-snap-meta { font-size: ${px('caption')}; white-space: nowrap; flex-shrink: 0; }
    .psm-snap-apply {
      padding: ${sp(0.25)} ${sp(1)}; border-radius: 4px; cursor: pointer;
      font-size: ${px('caption')}; white-space: nowrap; flex-shrink: 0;
    }
    .psm-snap-apply.confirming { border-color: #1D9E75; color: #1D9E75; }
    .psm-snap-cancel {
      padding: ${sp(0.25)} ${sp(0.625)}; border-radius: 4px;
      font-size: ${px('caption')}; white-space: nowrap; flex-shrink: 0;
    }
    .psm-snap-cancel:hover { color: #E24B4A; }
    .psm-snap-del {
      font-size: ${px('caption')}; padding: ${sp(0.25)} ${sp(0.5)}; border-radius: 3px; line-height: 1; flex-shrink: 0;
    }
    .psm-snap-del:hover { color: #E24B4A; }
    .psm-snap-del.confirming {
      padding: ${sp(0.25)} ${sp(1)}; border-radius: 4px;
      border-color: #E24B4A; color: #E24B4A; white-space: nowrap;
    }

    .psm-divider { border: none; border-top: 1px solid ${border}; margin: ${sp(1)} 0; }

    details.psm-details summary {
      cursor: pointer; font-size: ${px('label')};
      text-transform: uppercase; letter-spacing: .07em;
      padding: ${sp(0.5)} 0; list-style: none;
      display: flex; align-items: center; gap: ${sp(0.625)};
    }
    details.psm-details summary::before { content: '▶'; font-size: ${px('label')}; }
    details.psm-details[open] summary::before { content: '▼'; }
    details.psm-details summary::-webkit-details-marker { display: none; }

    .psm-show-disabled {
      display: flex; align-items: center; gap: ${sp(0.625)};
      font-size: ${px('caption')}; padding: ${sp(0.5)} 0 ${sp(0.75)}; cursor: pointer;
    }
    .psm-prompt-row { display: flex; align-items: center; gap: ${sp(0.75)}; padding: ${sp(0.25)} 0; }
    .psm-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    .psm-dot.on  { background: #1D9E75; }
    .psm-dot.off { background: ${border}; }
    .psm-pname { font-size: ${px('caption')}; }

    .psm-form-label {
      font-size: ${px('label')}; text-transform: uppercase;
      letter-spacing: .07em; margin-bottom: ${sp(0.5)}; display: block;
    }
    .psm-form-select, .psm-form-input, .psm-form-textarea {
      width: 100%; box-sizing: border-box; border-radius: 6px; outline: none;
      padding: ${sp(0.625)} ${sp(1.125)}; font-size: ${fluid('body')} !important;
      display: block; margin-bottom: ${sp(1)};
    }
    .psm-form-textarea { min-height: 72px; resize: vertical; }

    .psm-new-folder-row { display: flex; gap: ${sp(0.625)}; margin-bottom: ${sp(1)}; }
    .psm-new-folder-row input {
      flex: 1; border-radius: 6px; outline: none; min-width: 0;
      padding: ${sp(0.5)} ${sp(1)}; font-size: ${fluid('body')} !important;
    }
    .psm-new-folder-row button {
      padding: ${sp(0.5)} ${sp(1.25)}; border-radius: 5px; cursor: pointer;
      font-size: ${fluid('body')} !important; white-space: nowrap;
    }

    .psm-btn-row { display: flex; gap: ${sp(0.75)}; margin-top: ${sp(1)}; }
    .psm-btn-row button {
      flex: 1; padding: ${sp(0.625)} 0; border-radius: 6px;
      font-size: ${fluid('body')} !important; cursor: pointer;
    }

    .psm-data-row {
      display: flex; gap: ${sp(0.75)}; padding-top: ${sp(1)};
      border-top: 1px solid ${border}; margin-top: ${sp(0.5)};
    }
    .psm-data-row button {
      flex: 1; padding: ${sp(0.375)} 0; border-radius: 5px; cursor: pointer;
      font-size: ${px('caption')} !important;
    }
    .psm-data-row .psm-danger { border-color: #E24B4A !important; color: #E24B4A !important; }
    .psm-data-row .psm-danger:hover { background: oklch(from #E24B4A l c h / 0.08) !important; }

    .psm-toast {
      position: absolute !important; bottom: ${sp(0.75)} !important; left: 50% !important;
      transform: translateX(-50%) !important;
      background: ${bg} !important; border: 1px solid ${border} !important;
      border-radius: 7px; padding: ${sp(0.75)} ${sp(1.25)}; font-size: ${px('caption')};
      color: ${muted} !important; opacity: 0; pointer-events: none; transition: opacity .2s;
      z-index: 3 !important; max-width: calc(100% - ${sp(2)}) !important;
      white-space: normal !important; text-align: center !important; line-height: 1.35 !important;
      box-shadow: 0 2px 10px oklch(0 0 0 / 0.2);
    }
    .psm-toast.show { opacity: 1 !important; }

    /* ── Text selection prevention ──────────────────────────────── */
    .psm-body { user-select: none; -webkit-user-select: none; }
    #psm-panel input, #psm-panel textarea, #psm-panel select {
      user-select: text !important; -webkit-user-select: text !important;
    }

    /* ── Folder block + preset sublist ─────────────────────────── */
    .psm-folder-block { display: block; }
    /* psm-preset-item is the SortableJS draggable unit — wraps both the
       preset row AND its inline note so they travel together as one piece. */
    .psm-preset-item  { display: block; }
    .psm-preset-list  { display: block; min-height: 2px; }
    /* Collapsed lists: zero height normally, inflated to a full touch target
       during drag so mobile users can drop into them. The list is empty (no
       presets rendered) so the 44px zone is invisible but hittable. On a
       successful drop, onEnd auto-expands the folder. */
    .psm-preset-list--collapsed { height: 0; overflow: hidden; min-height: 0; }
    .psm-drag-active .psm-preset-list--collapsed { min-height: 44px; height: 44px; }
    .psm-preset-list--collapsed * { transition: none !important; transform: none !important; }

    /* ── Drag handle ────────────────────────────────────────────── */
    .psm-drag-handle {
      cursor: grab; flex-shrink: 0;
      padding: 0 ${sp(0.5)}; color: ${border};
      font-size: ${px('body')}; line-height: 1;
      touch-action: none;
      user-select: none; -webkit-user-select: none;
    }
    .psm-drag-handle:active { cursor: grabbing; }

    /* ── SortableJS feedback ────────────────────────────────────── */
    .psm-sortable-ghost  { opacity: 0.35; }
    .psm-sortable-chosen { background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.1); }

    /* ── Folder drag-over highlight ─────────────────────────────── */
    .psm-folder-block.psm-folder-drag-over > .psm-folder-row .psm-folder-main {
      background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.18);
      border-radius: 4px;
      outline: 1px solid oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.55);
      outline-offset: -1px;
    }
  `;
  parent$(parentDoc.head).append(`<style id="${STYLE_ID}">${css}</style>`);
}
