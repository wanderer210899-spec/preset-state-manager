// Prompt Folders styles, sharing PSM scale and SillyTavern theme variables.

function injectDivStyles() {
  if (parent$('#' + PDO_STYLE_ID, parentDoc).length > 0) return;

  const b = PSM_SCALE.base;
  const px = k => `${Math.round(b * PSM_SCALE[k])}px`;
  const sp = n => `${Math.round(b * PSM_SCALE.pad * n)}px`;
  const fluid = k => {
    const hi = Math.round(b * PSM_SCALE[k]);
    const lo = Math.max(14, Math.round(hi * 0.875));
    if (lo === hi) return `${hi}px`;
    const slope = ((hi - lo) / 649 * 100).toFixed(2);
    const offset = (lo - parseFloat(slope) / 100 * 375).toFixed(2);
    return `clamp(${lo}px, ${slope}vw + ${offset}px, ${hi}px)`;
  };

  const bg = 'oklch(from var(--SmartThemeBlurTintColor) l c h / 1)';
  const border = 'var(--SmartThemeBorderColor)';
  const muted = 'var(--SmartThemeBodyColor)';
  const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';

  const css = `
    #pdo-config-btn {
      min-width: 32px !important;
    }

    #pdo-panel {
      position: fixed !important; z-index: 99999 !important;
      width: min(330px, calc(100vw - 24px)) !important;
      max-height: 82vh !important; overflow: hidden !important;
      display: none !important; flex-direction: column !important;
      background: ${bg} !important; border: 1px solid ${border} !important;
      border-radius: 12px !important; padding: 0 !important;
      font-size: ${fluid('body')} !important; color: ${muted} !important;
      font-family: ${bodyFont} !important; box-sizing: border-box !important;
    }
    #pdo-panel.open { display: flex !important; }
    #pdo-panel-inner {
      flex: 1 1 auto !important; min-height: 0 !important;
      display: flex !important; flex-direction: column !important;
      overflow: hidden !important;
    }
    #pdo-panel button, #pdo-panel input, #pdo-panel select {
      font-family: inherit !important; color: ${muted};
    }
    #pdo-panel input, #pdo-panel select, .pdo-row-btn, .pdo-add-folder button, .pdo-popup-actions button,
    .pdo-template-row button {
      border: 1px solid ${border}; background: ${bg}; color: ${muted};
    }

    .pdo-header {
      flex: 0 0 auto;
      display: flex; align-items: center; gap: ${sp(0.75)};
      padding: ${sp(1.25)} ${sp(1.5)}; border-bottom: 1px solid ${border};
      background: ${bg}; cursor: move;
    }
    .pdo-header-title {
      flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: ${px('label')}; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;
    }
    .pdo-ghost {
      background: none !important; border: none !important; padding: ${sp(0.25)} ${sp(0.625)};
      border-radius: 4px; line-height: 1; cursor: pointer;
    }
    .pdo-header-btn { font-size: ${px('iconSm')} !important; flex: 0 0 auto; }
    .pdo-body {
      flex: 1 1 auto; min-height: 0; overflow-y: auto;
      padding: ${sp(1.25)} ${sp(1.5)}; user-select: none; -webkit-user-select: none;
    }
    #pdo-panel input, #pdo-panel select { user-select: text !important; -webkit-user-select: text !important; }

    #pdo-folder-list { display: flex; flex-direction: column; gap: ${sp(0.375)}; }
    .pdo-folder-block { display: block; }
    .pdo-folder-row {
      display: grid; grid-template-columns: 24px 28px 30px minmax(0, 1fr) auto 28px 34px;
      align-items: center; gap: ${sp(0.375)}; min-height: 36px;
      padding: ${sp(0.25)} 0; box-sizing: border-box;
    }
    .pdo-drag-handle {
      cursor: grab; color: ${border}; text-align: center; touch-action: none;
      font-size: ${px('body')}; line-height: 1;
    }
    .pdo-drag-handle:active { cursor: grabbing; }
    .pdo-row-btn {
      min-width: 28px; height: 28px; padding: 0; border-radius: 5px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; line-height: 1;
      font-size: ${px('caption')} !important;
    }
    .pdo-icon-btn { font-size: ${px('body')} !important; }
    .pdo-folder-name {
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: ${px('label')}; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
      cursor: text;
    }
    .pdo-rename-input {
      width: 100%; min-width: 0; box-sizing: border-box; border-radius: 5px; outline: none;
      padding: ${sp(0.375)} ${sp(0.625)}; font-size: ${px('label')} !important;
      font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
    }
    .pdo-count {
      background: none !important; border: none !important; white-space: nowrap; cursor: pointer;
      padding: ${sp(0.25)} ${sp(0.375)}; font-size: ${px('caption')} !important;
    }
    .pdo-folder-del.confirming {
      width: auto; min-width: 58px; border-color: #E24B4A !important; color: #E24B4A !important;
      padding: 0 ${sp(0.5)};
    }
    .pdo-member-list {
      margin: 0 0 ${sp(0.375)} 82px; padding: ${sp(0.25)} 0 ${sp(0.5)};
      border-left: 1px solid ${border};
    }
    .pdo-member-line {
      display: grid; grid-template-columns: minmax(0, 1fr) 28px; align-items: center; gap: ${sp(0.5)};
      padding: ${sp(0.25)} 0 ${sp(0.25)} ${sp(0.75)};
      font-size: ${px('caption')};
    }
    .pdo-member-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .pdo-add-folder {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: ${sp(0.625)};
      margin-top: ${sp(1.25)};
    }
    .pdo-add-folder input {
      min-width: 0; box-sizing: border-box; border-radius: 6px; outline: none;
      padding: ${sp(0.625)} ${sp(1)}; font-size: ${fluid('body')} !important;
    }
    .pdo-add-folder button {
      border-radius: 6px; padding: ${sp(0.625)} ${sp(1.25)}; cursor: pointer;
      font-size: ${fluid('body')} !important; white-space: nowrap;
    }

    .pdo-empty {
      text-align: center; font-size: ${px('caption')}; padding: ${sp(1.25)};
      border: 1px dashed ${border}; border-radius: 6px;
    }
    .pdo-toast {
      position: absolute !important; bottom: ${sp(0.75)} !important; left: 50% !important;
      transform: translateX(-50%) !important; background: ${bg} !important; border: 1px solid ${border} !important;
      border-radius: 7px; padding: ${sp(0.75)} ${sp(1.25)}; font-size: ${px('caption')};
      color: ${muted} !important; opacity: 0; pointer-events: none; transition: opacity .2s;
      z-index: 5 !important; max-width: calc(100% - ${sp(2)}) !important; text-align: center !important;
      box-shadow: 0 2px 10px oklch(0 0 0 / 0.2);
    }
    .pdo-toast.show { opacity: 1 !important; }

    .pdo-popup {
      position: fixed; z-index: 100000; width: min(320px, calc(100vw - 24px));
      max-height: min(520px, calc(100vh - 24px)); overflow: hidden; display: flex; flex-direction: column;
      background: ${bg}; border: 1px solid ${border}; border-radius: 10px; color: ${muted};
      box-shadow: 0 12px 30px oklch(0 0 0 / 0.35); font-family: ${bodyFont};
    }
    .pdo-popup > .pdo-popup-header {
      display: flex; align-items: center; gap: ${sp(0.75)}; padding: ${sp(1)} ${sp(1.25)};
      border-bottom: 1px solid ${border}; font-size: ${px('label')}; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
      cursor: move; touch-action: none; user-select: none; -webkit-user-select: none; flex: 0 0 auto;
    }
    .pdo-popup-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pdo-popup-body {
      padding: ${sp(1)} ${sp(1.25)}; overflow: hidden; min-height: 0;
      display: flex; flex: 1 1 auto; flex-direction: column;
    }
    .pdo-popup-filter {
      flex: 0 0 auto;
      width: 100%; box-sizing: border-box; border-radius: 6px; outline: none;
      padding: ${sp(0.625)} ${sp(1)}; margin-bottom: ${sp(0.75)}; font-size: ${fluid('body')} !important;
    }
    #pdo-mass-list {
      min-height: 74px; overflow-y: auto; padding-right: ${sp(0.25)};
      flex: 1 1 auto; -webkit-overflow-scrolling: touch;
    }
    .pdo-prompt-choice {
      display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: ${sp(0.5)};
      padding: ${sp(0.375)} 0; font-size: ${px('caption')};
    }
    .pdo-prompt-choice-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pdo-marker {
      border: 1px solid ${border}; border-radius: 4px; padding: 1px ${sp(0.375)};
      font-size: ${px('label')}; opacity: .85;
    }
    .pdo-popup-actions, .pdo-template-row {
      display: flex; gap: ${sp(0.625)}; margin-top: ${sp(0.875)};
    }
    .pdo-popup-actions {
      flex: 0 0 auto; padding-top: ${sp(0.75)}; border-top: 1px solid ${border};
    }
    .pdo-popup-actions button, .pdo-template-row button {
      flex: 1; border-radius: 6px; padding: ${sp(0.5)} ${sp(0.75)}; cursor: pointer;
      font-size: ${px('caption')} !important; white-space: nowrap;
    }

    .pdo-icon-popover {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: ${sp(0.375)};
      margin: ${sp(0.25)} 0 ${sp(0.75)} 82px; padding: ${sp(0.625)};
      border: 1px solid ${border}; border-radius: 8px;
    }
    .pdo-icon-popover button { font-size: ${px('body')} !important; }
    .pdo-icon-custom { grid-column: 1 / -1; width: 100%; box-sizing: border-box; }

    .pdo-template-panel {
      position: fixed; z-index: 100000; width: min(330px, calc(100vw - 24px));
      background: ${bg}; border: 1px solid ${border}; border-radius: 10px; color: ${muted};
      box-shadow: 0 12px 30px oklch(0 0 0 / 0.35); font-family: ${bodyFont};
    }
    .pdo-template-body { padding: ${sp(1)} ${sp(1.25)}; }
    .pdo-template-label {
      display: block; margin: ${sp(0.5)} 0; font-size: ${px('label')};
      text-transform: uppercase; letter-spacing: .06em;
    }
    .pdo-template-row input, .pdo-template-row select {
      flex: 1; min-width: 0; box-sizing: border-box; border-radius: 6px; outline: none;
      padding: ${sp(0.5)} ${sp(0.75)}; font-size: ${px('caption')} !important;
    }
    .pdo-confirm-row {
      display: flex; align-items: center; gap: ${sp(0.625)}; margin: ${sp(0.5)} 0;
      padding: ${sp(0.625)}; border: 1px solid #E24B4A; border-radius: 6px; color: #E24B4A;
      font-size: ${px('caption')};
    }
    .pdo-confirm-row span { flex: 1; min-width: 0; }

    .pdo-sortable-ghost { opacity: 0.35; }
    .pdo-sortable-chosen { background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.1); }

    .pdo-hidden-notice {
      text-align: center; font-size: ${px('caption')}; padding: ${sp(0.75)} ${sp(1)};
      margin-bottom: ${sp(0.75)};
      border: 1px dashed ${border}; border-radius: 6px;
      opacity: 0.85;
    }

    #completion_prompt_manager_list > .pdo-folder-header {
      display: flex !important; align-items: center !important; gap: 8px !important;
      grid-template-columns: none !important; list-style: none;
      min-height: 28px; box-sizing: border-box; padding: 4px 7.5px !important;
      border: 1px solid ${border} !important; border-radius: 4px;
      margin: 4px 0 7.5px !important;
      background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.08);
      user-select: none; -webkit-user-select: none; cursor: pointer;
      transition: background-color .12s ease;
    }
    #completion_prompt_manager_list > .pdo-folder-header:hover,
    #completion_prompt_manager_list > .pdo-folder-header:focus-visible {
      background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.18);
      outline: none;
    }
    #completion_prompt_manager_list > .pdo-folder-header .pdo-native-chevron {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; flex: 0 0 auto;
      font-size: ${px('caption')}; line-height: 1;
    }
    #completion_prompt_manager_list > .pdo-folder-header .pdo-native-icon {
      flex: 0 0 auto; font-size: ${px('body')}; line-height: 1;
    }
    #completion_prompt_manager_list > .pdo-folder-header .pdo-native-title {
      flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-weight: 600; font-size: ${px('caption')};
    }
    #completion_prompt_manager_list > .pdo-folder-header .pdo-native-count {
      flex: 0 0 auto; opacity: 0.75; font-size: ${px('caption')};
    }
    #completion_prompt_manager_list > li[class*="pdo-member-"] {
      transition: opacity .08s ease;
    }

    @media (max-width: 480px) {
      .pdo-folder-row { grid-template-columns: 22px 26px 28px minmax(0, 1fr) auto 27px 32px; }
      .pdo-member-list, .pdo-icon-popover { margin-left: 70px; }
    }
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
    return `#completion_prompt_manager_list.${c} > .${m}{display:none!important;}`;
  }).join('\n');
}
