// ─── Follow SillyTavern's own preset rename (D9-5, D9-6) ──────────────────
//
// PSM has no rename button. SillyTavern's pencil renames the preset file;
// PSM only moves its own data (all keyed by preset name) to the new name:
// snapshots, notes, "last applied" mark, preset folder spot, prompt folders.
// Overwrite (the new name already existed): the renamed preset's data
// replaces the old one's, like the file does. Preset files are never touched.
//
// SillyTavern's rename selects the new name, which is a real preset change
// (regex / Tavern Helper react to it), so it gets the same guard as a switch:
//   rename starting → wait for PSM's mutex and a calm chat, mark chat busy
//   renamed         → move data, release once the chat is calm again
// SillyTavern awaits each listener, so waiting here holds its rename back.
//
// SillyTavern renames whatever preset is selected when the wait ends. If a
// PSM switch was still running and changed the selection, PSM selects the
// preset the user chose to rename again first (guarded like any switch).

const RENAME_KEY          = '\u0000rename'; // busy-strip key; cannot be typed as a snapshot name
const RENAME_LOCK_WAIT_MS = 200000;         // stop waiting for another PSM operation (longer than its own limits)
const RENAME_DONE_MS      = 30000;          // release if "renamed" never comes (rename failed)

let _renameHeld  = false;
let _renameTimer = null;

function psmInitRenameListeners() {
  try {
    eventOn(tavern_events.PRESET_RENAMED_BEFORE, psmOnRenameStart);
    eventOn(tavern_events.PRESET_RENAMED,        psmOnRenamed);
  } catch(e) { ERR('rename eventOn failed:', e); }
}

async function psmOnRenameStart({ apiId, oldName, newName } = {}) {
  if (apiId !== 'openai') return;
  const until = Date.now() + RENAME_LOCK_WAIT_MS;
  while (!psmAcquire()) {
    if (Date.now() > until) { ERR('rename: PSM still busy — rename goes ahead unguarded'); return; }
    await new Promise(r => setTimeout(r, 100));
  }
  _renameHeld = true;
  LOG('rename "' + oldName + '" → "' + newName + '": guarding');
  psmBusyBegin(newName, RENAME_KEY);
  await waitForChatReady();
  if (currentPreset() !== oldName) await psmReselectForRename(oldName);
  // Arm the guard before SillyTavern selects the new name (its step 2).
  markChatBusy();
  clearTimeout(_renameTimer);
  _renameTimer = setTimeout(() => {
    LOG('rename: no "renamed" signal — releasing');
    psmRenameRelease();
  }, RENAME_DONE_MS);
}

async function psmReselectForRename(oldName) {
  LOG('rename: selection moved to "' + currentPreset() + '" — selecting "' + oldName + '" again');
  markChatBusy();
  let switched = false;
  try { switched = loadPreset(oldName); } catch(e) { ERR('loadPreset:', e); }
  const until = Date.now() + RENAME_DONE_MS;
  while (switched && currentPreset() !== oldName && Date.now() < until) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (currentPreset() !== oldName) ERR('rename: could not select "' + oldName + '" again');
  await waitForChatReady();
}

function psmOnRenamed({ apiId, oldName, newName } = {}) {
  if (apiId !== 'openai') return;
  let msg = null;
  if (oldName && newName && oldName !== newName) {
    try {
      if (psmMovePresetData(oldName, newName)) msg = ['ok', psmT('toast_renamed', newName)];
      LOG('rename: PSM data moved "' + oldName + '" → "' + newName + '"');
    } catch(e) {
      ERR('rename: moving PSM data failed:', e);
      msg = ['err', psmT('rename_move_failed')];
    }
    psmFollowRenameInUi(oldName, newName);
  }
  psmRenameRelease(() => {
    if (msg) psmSay(msg[0], msg[1]);
    if (panelOpen) psmRender();
    psmRefreshEntryRow();
  });
}

// The mutex is released only once the chat is calm again.
function psmRenameRelease(after) {
  clearTimeout(_renameTimer);
  _renameTimer = null;
  if (!_renameHeld) { if (after) after(); return; }
  _renameHeld = false;
  waitForChatReady().then(() => {
    psmRelease();
    if (after) after();
  });
}

// Moves every PSM record from oldName to newName, replacing what newName had.
// Returns true if oldName had any PSM data.
function psmMovePresetData(oldName, newName) {
  const has = (obj, k) => !!obj && Object.prototype.hasOwnProperty.call(obj, k);
  // obj[oldName] → obj[newName]; newName's own entry goes either way.
  // Returns true if obj changed.
  const take = (obj) => {
    if (!obj) return false;
    const hadOld = has(obj, oldName), hadNew = has(obj, newName);
    if (hadOld) obj[newName] = obj[oldName]; else delete obj[newName];
    delete obj[oldName];
    return hadOld || hadNew;
  };
  let hadData = false;

  const db = dbLoad();
  if (has(db, oldName)) hadData = true;
  if (take(db)) dbSave(db);

  const m = metaLoad();
  let metaChanged = false;
  if (has(m.presetNotes, oldName) || has(m.activeSnaps, oldName)) hadData = true;
  if (take(m.presetNotes)) metaChanged = true;
  if (take(m.activeSnaps)) metaChanged = true;
  Object.values(m.folders).forEach(f => {
    const list = f.presets || [];
    if (!list.includes(oldName) && !list.includes(newName)) return;
    if (list.includes(oldName)) hadData = true;
    f.presets = list.filter(p => p !== newName).map(p => (p === oldName ? newName : p));
    metaChanged = true;
  });
  if (metaChanged) metaSave(m);

  const pdb = pdoDbLoad();
  if (has(pdb.perPreset, oldName)) hadData = true;
  if (take(pdb.perPreset)) pdoDbSave(pdb, { panel: false });

  const collapse = pdoCollapseLoad();
  const oldPre = oldName + '::', newPre = newName + '::';
  let collapseChanged = false;
  const nextCollapse = {};
  Object.entries(collapse).forEach(([k, v]) => {
    if (k.startsWith(newPre)) { collapseChanged = true; return; }
    if (k.startsWith(oldPre)) { collapseChanged = true; nextCollapse[newPre + k.slice(oldPre.length)] = v; return; }
    nextCollapse[k] = v;
  });
  if (collapseChanged) pdoCollapseSave(nextCollapse, { panel: false });

  return hadData;
}

// Panel state that names a preset follows the rename too.
function psmFollowRenameInUi(oldName, newName) {
  if (psmUi.pagePreset === oldName) psmUi.pagePreset = newName;
  if (psmUi.noteEdit === oldName) psmUi.noteEdit = newName;
  if (expandedNotes.delete(oldName)) expandedNotes.add(newName);
  if (psmUi.sel?.kind === 'preset' && psmUi.sel.ids.delete(oldName)) psmUi.sel.ids.add(newName);
  confirmingSnaps.clear();
  psmUi.confirm = null;
  psmUi.menu = null;
}
