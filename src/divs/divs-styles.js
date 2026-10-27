// Prompt Folders styles for what PSM adds to SillyTavern's prompt list: the
// bar above it, folder headers and member rows. The bar
// reuses the PSM atoms (.psm-btn, .psm-ib, .psm-inp) from src/ui/styles.js.

function injectDivStyles() {
  if (parent$('#' + PDO_STYLE_ID, parentDoc).length > 0) return;

  const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';
  const L = '#completion_prompt_manager_list';

  const css = `
    /* ── Bar above the prompt list: search + collapse/expand, one row ── */
    #pdo-search-bar {
      display: flex; align-items: center; gap: 2px; width: 100%; min-width: 0; max-width: 100%;
      padding: 0; margin: 0 0 8px;
      /* Never let long text or the buttons widen SillyTavern's settings column. */
      contain: inline-size;
      font-family: ${bodyFont}; font-size: 14px; color: var(--psm-fg); line-height: 1.4;
    }
    #pdo-search-bar #pdo-bar-row { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
    #pdo-search-bar #pdo-bar-row[hidden], #pdo-search-bar .psm-ib[hidden] { display: none; }
    #pdo-search-bar .psm-inp { background: transparent; }
    @media (pointer: coarse) {
      #pdo-search-bar, #pdo-search-bar #pdo-bar-row { gap: 0; }
      #pdo-search-bar .psm-i { width: 18px; height: 18px; }
      #pdo-search-bar .psm-ib, #pdo-search-bar .psm-ib.psm-sm { width: 44px; height: 44px; }
      #pdo-search-bar .psm-inp { height: 44px; padding-left: 38px; padding-right: 46px; }
      #pdo-search-bar .psm-srch > .psm-i { left: 12px; }
      #pdo-search-bar .psm-srch .psm-ib { right: 0; }
    }

    /* ── Folder headers inside the list ─────────────────────────────── */
    ${L} > .pdo-folder-header {
      display: flex !important; align-items: center !important; gap: 8px !important;
      grid-template-columns: none !important; list-style: none;
      min-height: 34px; box-sizing: border-box; padding: 0 6px !important; margin: 4px 0 6px !important;
      border: none !important; border-bottom: 1px solid color-mix(in oklab, var(--SmartThemeBorderColor) 32%, transparent) !important;
      border-radius: 0; background: none; color: var(--SmartThemeBodyColor);
      font-size: 14px; font-weight: 600; user-select: none; -webkit-user-select: none; cursor: pointer;
      contain: inline-size;
    }
    @media (pointer: coarse) { ${L} > .pdo-folder-header { min-height: 44px; } }
    @media (hover: hover) {
      ${L} > .pdo-folder-header:hover { background: color-mix(in oklab, var(--SmartThemeBodyColor) 7%, transparent); }
    }
    ${L} > .pdo-folder-header:focus-visible { outline: 1px solid var(--SmartThemeQuoteColor); outline-offset: -1px; }
    ${L} > .pdo-folder-header .pdo-native-chevron {
      width: 16px; height: 16px; flex: 0 0 auto; color: color-mix(in oklab, var(--SmartThemeBodyColor) 70%, transparent);
      transition: transform .15s;
    }
    ${L} > .pdo-folder-header .pdo-native-chevron.open { transform: rotate(90deg); }
    ${L} > .pdo-folder-header .pdo-native-icon { flex: 0 0 auto; width: 20px; text-align: center; font-size: 15px; line-height: 1; }
    ${L} > .pdo-folder-header .pdo-native-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    ${L} > .pdo-folder-header .pdo-native-count {
      flex: 0 0 auto; font-weight: 400; font-size: 13px; font-variant-numeric: tabular-nums;
      color: color-mix(in oklab, var(--SmartThemeBodyColor) 70%, transparent);
    }

    /* Prompts inside a folder sit indented under its header. */
    ${L}.pdo-headers-on > li[data-pdo-folder] { margin-left: 14px !important; width: calc(100% - 14px) !important; }
    /* While headers show, SillyTavern's drag is off: dim its handles to say so. */
    ${L}.pdo-headers-on > li .drag-handle { opacity: .3; }

    /* Brief highlight pulse after "show in prompt list" */
    @keyframes pdo-flash-pulse {
      0%, 50% { box-shadow: 0 0 0 2px var(--SmartThemeQuoteColor) inset; background: color-mix(in oklab, var(--SmartThemeQuoteColor) 30%, transparent); }
      100%    { box-shadow: 0 0 0 0 transparent inset; background: transparent; }
    }
    ${L} > li.pdo-flash { animation: pdo-flash-pulse 1.6s ease-out; }

    /* While searching: only matching prompts and their folder headers show. */
    ${L}.pdo-search-active > li[data-pm-identifier]:not(.pdo-search-hit) { display: none !important; }
    ${L}.pdo-search-active > .pdo-folder-header:not(.pdo-search-folder-active) { display: none !important; }
  `;

  parent$(parentDoc.head).append(`<style id="${PDO_STYLE_ID}">${css}</style>`);
  parent$(parentDoc.head).append(`<style id="${PDO_COLLAPSE_STYLE_ID}"></style>`);
}

function pdoUpdateCollapseRules(cfg) {
  const styleEl = parentDoc.getElementById(PDO_COLLAPSE_STYLE_ID);
  if (!styleEl) return;
  styleEl.textContent = Object.keys(cfg.folders || {}).map(folderId => {
    const c = pdoCollapsedClass(folderId);
    const m = pdoMemberClass(folderId);
    return [
      `#completion_prompt_manager_list.${c} > .${m}{display:none!important;}`,
      `#completion_prompt_manager_list.pdo-search-active.${c} > .${m}.pdo-search-hit{display:revert!important;}`,
    ].join('\n');
  }).join('\n');
}
