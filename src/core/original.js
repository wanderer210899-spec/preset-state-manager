// ─── Switch / reset to the saved preset (disk state) ──────────────────────
//
// One button on every preset page (v9; v7–v8 used an "Original state" row):
//   • Other preset  → "Switch to this preset": plain loadPreset(). SillyTavern
//                     loads the saved copy, so PSM writes no prompt states.
//   • Active preset → "Reset to saved state": psmApplyStates() with the saved
//                     copy's states, exactly like applying a snapshot.
// Afterwards no snapshot is "last applied" on that preset, so the marker in
// psm_v1_meta.activeSnaps is removed. Nothing else is stored.
//
// Both paths go through the same mutex + chat-ready guard as psmApply.

const ORIGINAL_KEY       = '\u0000original'; // internal key for this operation; cannot be typed as a snapshot name
const ORIGINAL_SWITCH_MS = 60000;            // give up if OAI_PRESET_CHANGED_AFTER never fires

let _originalSwitchTimer = null;

// Display name for a snapshot key (the saved state has no stored name).
function snapLabel(snapName) {
  return snapName === ORIGINAL_KEY ? psmT('reset_saved') : snapName;
}

// Best-effort: the switch or reset already happened, so a full storage must
// not hide that. v7–v8 could leave an ORIGINAL_KEY marker; it goes too.
function psmClearLastApplied(presetName) {
  try {
    const m = metaLoad();
    if (m.activeSnaps && presetName in m.activeSnaps) { delete m.activeSnaps[presetName]; metaSave(m); }
  } catch(e) { ERR('psmClearLastApplied:', e); }
}

// Prompt on/off states of the preset as last saved. null if unreadable.
function originalStatesFor(presetName) {
  try {
    const prompts = getPreset(presetName).prompts;
    const states  = {};
    prompts.forEach(p => { states[p.id] = p.enabled; });
    const onCount = Object.values(states).filter(Boolean).length;
    return { states, meta: onCount + '/' + prompts.length + ' on' };
  } catch(e) { ERR('originalStatesFor:', presetName, e); return null; }
}

// asSwitch: another preset ("Switch to this preset"). Otherwise the active
// preset is reset. Same steps; only the messages differ.
async function psmApplyOriginal(presetName, asSwitch = false) {
  if (!psmAcquire()) {
    LOG('psmApplyOriginal blocked — another operation in progress');
    psmSay('info', psmT('toast_busy'));
    return;
  }

  const orig = originalStatesFor(presetName);
  if (!orig) {
    psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
    psmRelease();
    return;
  }
  psmBusyBegin(presetName, asSwitch ? null : ORIGINAL_KEY);

  await waitForChatReady();

  if (presetName === currentPreset()) {
    await psmApplyStates(presetName, ORIGINAL_KEY, orig);
    // psmRelease() called inside psmApplyStates finally{}
    return;
  }

  // Cross-preset: arm the guard BEFORE switching. The switch can make the
  // regex extension reload the whole chat; markChatBusy makes every render
  // event of that reload reset the stability counter, so the finish step
  // only runs once the chat is calm again.
  pendingApply = { presetName, snapName: ORIGINAL_KEY, original: true, asSwitch };
  markChatBusy();
  let switched = false;
  try { switched = loadPreset(presetName); } catch(e) { ERR('loadPreset:', e); }
  if (!switched) {
    ERR('loadPreset failed:', presetName);
    pendingApply = null;
    psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
    psmRelease();
    return;
  }

  _originalSwitchTimer = setTimeout(() => {
    if (!pendingApply?.original) return;
    ERR('psmApplyOriginal: preset change never arrived for', presetName);
    pendingApply = null;
    psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
    psmRelease();
  }, ORIGINAL_SWITCH_MS);
  // psmFinishOriginalSwitch is called from OAI_PRESET_CHANGED_AFTER.
}

async function psmFinishOriginalSwitch(presetName, asSwitch = false) {
  clearTimeout(_originalSwitchTimer);
  try {
    await waitForChatReady();
    confirmingSnaps.delete(snapKey(presetName, ORIGINAL_KEY));
    if (currentPreset() !== presetName) {
      ERR('psmFinishOriginalSwitch: active preset is "' + currentPreset() + '", expected "' + presetName + '"');
      psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
      return;
    }
    psmClearLastApplied(presetName);
    LOG('switch: saved state — preset: "' + presetName + '"');
    psmSay('ok', psmT('toast_switched', presetName));
  } catch(e) {
    ERR('psmFinishOriginalSwitch:', e);
  } finally {
    psmRelease();
  }
}
