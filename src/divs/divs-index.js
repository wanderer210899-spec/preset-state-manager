// Prompt Folders bootstrap.

function initDivs() {
  if (parentDoc._pdoObserver) {
    scheduleInjectPdoToolbar();
    schedulePdoRepaint();
    return;
  }

  injectDivStyles();
  initPdoDecorator();
  scheduleInjectPdoToolbar();

  try {
    eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
      pdoMassFolder = null;
      pdoTemplateConfirm = null;
      if (pdoPanelOpen) renderPdoPanel();
      schedulePdoRepaint();
    });
  } catch(e) { ERR('pdo eventOn failed:', e); }

  window.parent.addEventListener('resize', () => {
    if (pdoPanelOpen) pdoClampPanelToViewport();
  });

  $(window).on('pagehide', () => {
    try { parentDoc._pdoObserver?.disconnect(); } catch (_) {}
    delete parentDoc._pdoObserver;
    parent$('#pdo-config-btn, #pdo-panel, #' + PDO_STYLE_ID + ', #' + PDO_COLLAPSE_STYLE_ID, parentDoc).remove();
    parent$('.pdo-popup, .pdo-template-panel', parentDoc).remove();
  });

  LOG('Prompt Folders ready');
}

setTimeout(initDivs, 800);
