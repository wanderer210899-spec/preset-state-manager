// ─── Init ─────────────────────────────────────────────────────────────────

function init() {
  injectStyles();
  createAndInjectUI();
  bindPanelInteractionIsolation();
  bindPanelEvents();
  injectExtensionMenu();
  scheduleInjectEntryRow();

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
        if (pendingApply?.original) {
          const { presetName, asSwitch } = pendingApply;
          pendingApply = null;
          psmFinishOriginalSwitch(presetName, asSwitch);
        } else if (pendingApply) {
          const { presetName, snapName } = pendingApply;
          pendingApply = null;
          const snap = (dbLoad()[presetName] || {})[snapName];
          // psmApplyStates calls waitForChatReady() internally — it will
          // block until the chat-ready state machine clears the load.
          if (snap) psmApplyStates(presetName, snapName, snap);
          else {
            ERR('Snapshot vanished during switch:', snapName);
            psmSay('err', psmT('apply_failed', snapName));
            psmRelease();
          }
        } else {
          // A switch from outside PSM: drop any half-finished confirm.
          confirmingSnaps.clear();
        }
        // Stay on the same page; just show the new state.
        if (panelOpen) psmRender();
        psmRefreshEntryRow();
      });
    } catch(e) { ERR('eventOn failed:', e); }

    $(window).on('pagehide', () => {
      parent$('#psm-panel, #' + STYLE_ID + ', #psm-wand-item, #' + PSM_ENTRY_ROW_ID, parentDoc).remove();
      parent$('#extensionsMenu .psm-ext-container', parentDoc).remove();
      psmSetDrawerPad(0);
    });

    window.parent.addEventListener('resize', () => {
      if (panelOpen) psmPlacePanel();
    });

    const n = snapCountFor(currentPreset());
    LOG('ready — preset: "' + currentPreset() + '", ' + n + ' snapshots');
  });
}
