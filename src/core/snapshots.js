// ─── Core operations ──────────────────────────────────────────────────────

const SNAP_SWITCH_MS = 60000; // give up if OAI_PRESET_CHANGED_AFTER never fires
let _snapSwitchTimer = null;

// Case-insensitive lookup, so "Clean" and "clean" count as the same name.
function findSnapKey(presetName, name) {
  const key = String(name || '').trim().toLowerCase();
  return Object.keys(dbLoad()[presetName] || {}).find(k => k.toLowerCase() === key) || null;
}

function currentStates() {
  const states = {};
  readPrompts().forEach(p => { states[p.id] = p.enabled; });
  return states;
}

function statesMeta(states) {
  const vals = Object.values(states);
  return vals.filter(Boolean).length + '/' + vals.length + ' on';
}

// Saves the current on/off pattern. An existing name (any case) is replaced
// in place, keeping its spelling and its position in the list.
function psmSave(presetName, rawName) {
  const name = String(rawName || '').trim();
  if (!name) return false;
  const states = currentStates();
  const meta   = statesMeta(states);
  const key    = findSnapKey(presetName, name) || name;
  try {
    const db = dbLoad();
    if (!db[presetName]) db[presetName] = {};
    db[presetName][key] = { states, savedAt: Date.now(), meta };
    dbSave(db);
  } catch(e) {
    ERR('save:', e);
    psmSay('err', psmT('save_failed'));
    return false;
  }
  LOG('save: "' + key + '" (' + meta + ') — preset: "' + presetName + '"');
  psmSay('ok', psmT('toast_saved', key));
  return true;
}

// Renames a snapshot, keeping its place in the list and the "last applied" mark.
function psmRename(presetName, oldName, rawName) {
  const name = String(rawName || '').trim();
  if (!name || name === oldName) return true;
  const clash = findSnapKey(presetName, name);
  if (clash && clash !== oldName) { psmSay('err', psmT('snap_exists')); return false; }
  const db = dbLoad();
  const snaps = db[presetName] || {};
  if (!snaps[oldName]) return false;
  const next = {};
  Object.keys(snaps).forEach(k => { next[k === oldName ? name : k] = snaps[k]; });
  db[presetName] = next;
  const m = metaLoad();
  try {
    dbSave(db);
    if (m.activeSnaps?.[presetName] === oldName) { m.activeSnaps[presetName] = name; metaSave(m); }
  } catch(e) { ERR('rename:', e); psmSay('err', psmT('save_failed')); return false; }
  LOG('rename: "' + oldName + '" → "' + name + '" — preset: "' + presetName + '"');
  return true;
}

async function psmApply(presetName, snapName) {
  // Mutex: if another operation is already running, drop this one.
  // Two concurrent applies would race each other regardless of chat state.
  if (!psmAcquire()) {
    LOG('psmApply blocked — another operation in progress');
    psmSay('info', psmT('toast_busy'));
    return;
  }

  const db   = dbLoad();
  const snap = db[presetName]?.[snapName];
  if (!snap) {
    ERR('Snapshot not found:', snapName, 'in preset:', presetName);
    psmSay('err', psmT('apply_failed', snapName));
    psmRelease();
    return;
  }
  psmBusyBegin(presetName, snapName);

  // Pre-flight queue: if the chat is currently loading (from a previous
  // preset switch, a manual "reload regex now" button press, or anything
  // else), hold here until the DOM is fully stable. We do NOT drop the
  // operation — the user pressed apply and expects it to happen.
  await waitForChatReady();

  if (presetName !== currentPreset()) {
    // Cross-preset path: trigger the switch and return.
    // psmApplyStates will be called from OAI_PRESET_CHANGED_AFTER.
    // The mutex is held here and released inside psmApplyStates finally{}.
    pendingApply = { presetName, snapName };
    let switched = false;
    try { switched = loadPreset(presetName); } catch(e) { ERR('loadPreset:', e); }
    if (!switched) {
      ERR('loadPreset failed:', presetName);
      pendingApply = null;
      psmSayRetry('switch_failed', presetName, presetName, snapName);
      psmRelease();
      return;
    }
    clearTimeout(_snapSwitchTimer);
    _snapSwitchTimer = setTimeout(() => {
      if (!pendingApply || pendingApply.original || pendingApply.presetName !== presetName) return;
      ERR('psmApply: preset change never arrived for', presetName);
      pendingApply = null;
      psmSayRetry('switch_failed', presetName, presetName, snapName);
      psmRelease();
    }, SNAP_SWITCH_MS);
    return;
  }

  await psmApplyStates(presetName, snapName, snap);
  // psmRelease() called inside psmApplyStates finally{}
}

async function psmApplyStates(presetName, snapName, snap) {
  clearTimeout(_snapSwitchTimer);
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
    if (snapName === ORIGINAL_KEY) {
      psmClearLastApplied(presetName);
      LOG('reset: saved state (' + snap.meta + ') — preset: "' + presetName + '"');
      psmSay('ok', psmT('toast_reset'));
    } else {
      // The prompts are already applied. A full storage must not hide that,
      // so the marker write is best-effort.
      try {
        const m = metaLoad();
        if (!m.activeSnaps) m.activeSnaps = {};
        m.activeSnaps[presetName] = snapName;
        metaSave(m);
      } catch(e) { ERR('psmApplyStates: marker not saved:', e); }
      LOG('apply: "' + snapName + '" (' + snap.meta + ') — preset: "' + presetName + '"');
      psmSay('ok', psmT('toast_applied', snapName));
    }
  } catch(e) {
    ERR('psmApplyStates:', e);
    psmSayRetry('apply_failed', snapLabel(snapName), presetName, snapName);
  } finally {
    // Always release the mutex — even if updatePresetWith threw.
    psmRelease();
  }
}

function psmDelete(presetName, snapName) {
  const db = dbLoad();
  if (db[presetName]) { delete db[presetName][snapName]; dbSave(db); }
  const m = metaLoad();
  if (m.activeSnaps?.[presetName] === snapName) {
    delete m.activeSnaps[presetName];
    metaSave(m);
  }
  confirmingSnaps.delete(snapKey(presetName, snapName));
  LOG('delete: "' + snapName + '" — preset: "' + presetName + '"');
  psmSay('ok', psmT('toast_deleted', snapName));
}
