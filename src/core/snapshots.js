// ─── Core operations ──────────────────────────────────────────────────────

function psmSave(presetName) {
  const $input = parent$('#psm-snap-input', parentDoc);
  const name   = ($input.val() || '').trim();
  if (!name) { $input.trigger('focus'); return; }
  const prompts = readPrompts();
  const states  = {};
  prompts.forEach(p => { states[p.id] = p.enabled; });
  const db      = dbLoad();
  if (!db[presetName]) db[presetName] = {};
  const onCount = Object.values(states).filter(Boolean).length;
  const meta    = onCount + '/' + prompts.length + ' on';
  db[presetName][name] = { states, savedAt: Date.now(), meta };
  dbSave(db);
  $input.val('');
  LOG('save: "' + name + '" (' + meta + ') — preset: "' + presetName + '"');
  renderDetail();
  showToast('Saved "' + name + '"');
}

async function psmApply(presetName, snapName) {
  // Mutex: if another operation is already running, drop this one.
  // Two concurrent applies would race each other regardless of chat state.
  if (!psmAcquire()) {
    LOG('psmApply blocked — another operation in progress');
    showToast('⏳ Previous operation still running — please wait');
    return;
  }

  const db   = dbLoad();
  const snap = db[presetName]?.[snapName];
  if (!snap) { ERR('Snapshot not found:', snapName, 'in preset:', presetName); psmRelease(); return; }

  // Pre-flight queue: if the chat is currently loading (from a previous
  // preset switch, a manual "reload regex now" button press, or anything
  // else), hold here until the DOM is fully stable. We do NOT drop the
  // operation — the user pressed apply and expects it to happen.
  if (!isChatReady()) {
    showToast('⏳ Waiting for chat to finish loading…');
  }
  await waitForChatReady();

  if (presetName !== currentPreset()) {
    // Cross-preset path: trigger the switch and return.
    // psmApplyStates will be called from OAI_PRESET_CHANGED_AFTER.
    // The mutex is held here and released inside psmApplyStates finally{}.
    pendingApply   = { presetName, snapName };
    const switched = loadPreset(presetName);
    if (!switched) { ERR('loadPreset failed:', presetName); pendingApply = null; psmRelease(); }
    return;
  }

  await psmApplyStates(presetName, snapName, snap);
  // psmRelease() called inside psmApplyStates finally{}
}

async function psmApplyStates(presetName, snapName, snap) {
  // Wait 1: block until any in-progress CHAT_CHANGED cycle is fully settled.
  // Covers: regex reload from a cross-preset switch, or any external reload
  // (e.g. "reload regex now") that fired between psmApply and here.
  await waitForChatReady();

  try {
    // ── CRITICAL: arm the busy state BEFORE calling updatePresetWith ──
    //
    // updatePresetWith({ render:'immediate' }) triggers its own full re-render
    // of all chat messages. This fires CHARACTER_MESSAGE_RENDERED,
    // USER_MESSAGE_RENDERED, and MESSAGE_IFRAME_RENDER_ENDED events per message.
    //
    // Without markChatBusy() here:
    //   _chatReady is still TRUE at this point (Wait 1 just resolved it).
    //   _onRenderActivity() has `if (_chatReady) return` so every render
    //   event from updatePresetWith is silently ignored.
    //   The stability counter never resets. Wait 2 resolves instantly.
    //   The guard does nothing. Corruption is still possible.
    //
    // With markChatBusy() here:
    //   _chatReady = false BEFORE updatePresetWith fires any event.
    //   Every render event resets the stability counter.
    //   Wait 2 only resolves when the DOM has been stable for 1.6 s with
    //   zero render events — meaning every iframe has finished executing.
    markChatBusy();

    await updatePresetWith('in_use', preset => {
      preset.prompts.forEach(p => {
        if (snap.states[p.id] !== undefined) p.enabled = snap.states[p.id];
      });
      return preset;
    }, { render: 'immediate' });

    // Wait 2: block until the re-render triggered by updatePresetWith is
    // fully settled. Every message painted, every iframe done executing.
    // Only resolves when DOM .mes count has been identical for 1.6 s with
    // zero render events of any kind — including MESSAGE_IFRAME_RENDER_ENDED.
    await waitForChatReady();

    confirmingSnaps.delete(snapKey(presetName, snapName));
    LOG('apply: "' + snapName + '" (' + snap.meta + ') — preset: "' + presetName + '"');
    renderView();
    showToast('Snapshot applied successfully · ' + snapName);
  } catch(e) {
    ERR('psmApplyStates:', e);
  } finally {
    // Always release the mutex — even if updatePresetWith threw.
    psmRelease();
  }
}

function psmDelete(presetName, snapName) {
  const db = dbLoad();
  if (db[presetName]) { delete db[presetName][snapName]; dbSave(db); }
  confirmingSnaps.delete(snapKey(presetName, snapName));
  deletingSnaps.delete(snapKey(presetName, snapName));
  LOG('delete: "' + snapName + '" — preset: "' + presetName + '"');
  renderDetail();
  showToast('Deleted "' + snapName + '"');
}
