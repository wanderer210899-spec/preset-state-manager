// ─── Init ─────────────────────────────────────────────────────────────────

function init() {
  injectStyles();
  createAndInjectUI();
  bindHeaderDrag();
  injectExtensionMenu();

  loadSortable(() => {
    // Register the permanent chat-ready state machine listeners.
    // These run for the lifetime of the script and track whether it is
    // safe to write — independently of any preset switch.
    initChatReadyListeners();

    try {
      eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
        const pn = currentPreset();
        const n  = snapCountFor(pn);
        LOG('preset changed → "' + pn + '", ' + n + ' snapshots');
        confirmingSnaps.clear();
        deletingSnaps.clear();
        if (pendingApply) {
          const { presetName, snapName } = pendingApply;
          pendingApply = null;
          const snap = (dbLoad()[presetName] || {})[snapName];
          // psmApplyStates calls waitForChatReady() internally — it will
          // block until the chat-ready state machine clears the load.
          if (snap) psmApplyStates(presetName, snapName, snap);
        }
        if (panelOpen) { currentView = 'browser'; renderView(); }
      });
    } catch(e) { ERR('eventOn failed:', e); }

    $(window).on('pagehide', () => {
      parent$('#psm-panel, .psm-toast, #' + STYLE_ID + ', #psm-wand-item', parentDoc).remove();
    });

    window.parent.addEventListener('resize', () => {
      if (panelOpen) clampPanelToViewport();
    });

    const n = snapCountFor(currentPreset());
    LOG('ready — preset: "' + currentPreset() + '", ' + n + ' snapshots');
  });
}
