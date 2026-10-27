// Prompt Folders bootstrap.

function initDivs() {
  if (parentDoc._pdoObserver) {
    schedulePdoRepaint();
    return;
  }

  injectDivStyles();
  initPdoDecorator();

  try {
    eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
      if (psmUi.sel?.kind === 'prompt') psmUi.sel = null;
      psmUi.iconFor = null;
      psmUi.pfOpen.clear();
      const searchInput = parentDoc.querySelector('#pdo-search-input');
      if (searchInput) searchInput.value = '';
      parentDoc.querySelector('#pdo-search-clear')?.setAttribute('hidden', '');
      pdoApplySearch('');
      schedulePdoRepaint();
      if (panelOpen) psmRender();
    });
  } catch(e) { ERR('pdo eventOn failed:', e); }

  $(window).on('pagehide', () => {
    try { parentDoc._pdoObserver?.disconnect(); } catch (_) {}
    delete parentDoc._pdoObserver;
    parent$('#pdo-search-bar, #' + PDO_STYLE_ID + ', #' + PDO_COLLAPSE_STYLE_ID, parentDoc).remove();
  });

  LOG('Prompt Folders ready');
}

setTimeout(initDivs, 800);
