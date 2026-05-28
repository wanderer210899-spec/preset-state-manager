// Prompt Folders storage. This file is the only writer to pdo_* localStorage.

const PDO_STORE_KEY          = 'pdo_v1';
const PDO_COLLAPSE_KEY       = 'pdo_v1_collapse';
const PDO_POS_KEY            = 'pdo_v1_pos';
const PDO_HIDDEN_KEY         = 'pdo_v1_hidden';
const PDO_STYLE_ID           = 'pdo-styles';
const PDO_COLLAPSE_STYLE_ID  = 'pdo-collapse-rules';
const PDO_DEFAULT_ICON       = String.fromCodePoint(0x1F4C1);

function pdoDefaultDb() {
  return { version: 1, perPreset: {}, templates: {} };
}

function pdoClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function pdoNormalizeFolder(folder) {
  const f = folder && typeof folder === 'object' ? folder : {};
  return {
    name: String(f.name || 'Folder'),
    icon: String(f.icon || PDO_DEFAULT_ICON),
    defaultCollapsed: !!f.defaultCollapsed,
  };
}

function pdoNormalizePresetConfig(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  const folders = {};
  Object.entries(c.folders || {}).forEach(([id, folder]) => {
    if (/^f-[a-z0-9]{5}$/i.test(id)) folders[id] = pdoNormalizeFolder(folder);
  });

  const folderOrder = Array.isArray(c.folderOrder) ? c.folderOrder.filter(id => folders[id]) : [];
  Object.keys(folders).forEach(id => {
    if (!folderOrder.includes(id)) folderOrder.push(id);
  });

  const assignments = {};
  Object.entries(c.assignments || {}).forEach(([promptId, folderId]) => {
    if (folders[folderId]) assignments[String(promptId)] = folderId;
  });

  return { folderOrder, folders, assignments };
}

function pdoNormalizeTemplate(tpl) {
  const t = tpl && typeof tpl === 'object' ? tpl : {};
  const cfg = pdoNormalizePresetConfig(t);
  const assignmentsByName = {};
  Object.entries(t.assignmentsByName || {}).forEach(([name, folderId]) => {
    if (cfg.folders[folderId]) assignmentsByName[String(name)] = folderId;
  });
  return { folderOrder: cfg.folderOrder, folders: cfg.folders, assignmentsByName };
}

function pdoNormalizeDb(raw) {
  const db = raw && typeof raw === 'object' ? raw : pdoDefaultDb();
  const out = pdoDefaultDb();
  Object.entries(db.perPreset || {}).forEach(([presetName, cfg]) => {
    out.perPreset[String(presetName)] = pdoNormalizePresetConfig(cfg);
  });
  Object.entries(db.templates || {}).forEach(([name, tpl]) => {
    out.templates[String(name)] = pdoNormalizeTemplate(tpl);
  });
  return out;
}

function pdoDbLoad() {
  try { return pdoNormalizeDb(JSON.parse(localStorage.getItem(PDO_STORE_KEY) || 'null')); }
  catch { return pdoDefaultDb(); }
}

function pdoAfterStoreWrite(opts = {}) {
  const repaint = opts.repaint !== false;
  const panel   = opts.panel !== false;
  if (repaint && typeof schedulePdoRepaint === 'function') schedulePdoRepaint();
  if (panel && typeof renderPdoPanel === 'function' && pdoPanelOpen) renderPdoPanel();
}

function pdoDbSave(db, opts = {}) {
  localStorage.setItem(PDO_STORE_KEY, JSON.stringify(pdoNormalizeDb(db)));
  pdoAfterStoreWrite(opts);
}

function pdoGetPresetConfig(presetName) {
  const db = pdoDbLoad();
  return pdoNormalizePresetConfig(db.perPreset[presetName]);
}

function pdoEnsurePresetConfig(db, presetName) {
  db.perPreset[presetName] = pdoNormalizePresetConfig(db.perPreset[presetName]);
  return db.perPreset[presetName];
}

function pdoWithPresetConfig(presetName, updater, opts = {}) {
  const db = pdoDbLoad();
  const cfg = pdoEnsurePresetConfig(db, presetName);
  updater(cfg, db);
  pdoDbSave(db, opts);
}

function pdoCollapseLoad() {
  try {
    const c = JSON.parse(localStorage.getItem(PDO_COLLAPSE_KEY) || '{}');
    return c && typeof c === 'object' ? c : {};
  } catch { return {}; }
}

function pdoCollapseSave(collapse, opts = {}) {
  localStorage.setItem(PDO_COLLAPSE_KEY, JSON.stringify(collapse || {}));
  pdoAfterStoreWrite(opts);
}

function pdoCollapseKey(presetName, folderId) {
  return String(presetName) + '::' + String(folderId);
}

function pdoIsCollapsed(presetName, folderId, folder) {
  const collapse = pdoCollapseLoad();
  const key = pdoCollapseKey(presetName, folderId);
  return Object.prototype.hasOwnProperty.call(collapse, key)
    ? !!collapse[key]
    : !!folder?.defaultCollapsed;
}

function pdoSetCollapsed(presetName, folderId, collapsed, opts = {}) {
  const collapse = pdoCollapseLoad();
  collapse[pdoCollapseKey(presetName, folderId)] = !!collapsed;
  pdoCollapseSave(collapse, opts);
}

function pdoClearCollapseForPreset(presetName, folderIds = null) {
  const collapse = pdoCollapseLoad();
  const prefix = String(presetName) + '::';
  Object.keys(collapse).forEach(key => {
    if (!key.startsWith(prefix)) return;
    if (!folderIds || folderIds.includes(key.slice(prefix.length))) delete collapse[key];
  });
  pdoCollapseSave(collapse, { repaint: false, panel: false });
}

function pdoPosLoad() {
  try { return JSON.parse(localStorage.getItem(PDO_POS_KEY) || 'null'); }
  catch { return null; }
}

function pdoPosSave(top, left) {
  localStorage.setItem(PDO_POS_KEY, JSON.stringify({ top, left }));
}

function pdoCreateFolder(presetName, name) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  let created = null;
  pdoWithPresetConfig(presetName, cfg => {
    if (pdoFindFolderIdByName(cfg, clean)) return;
    const id = pdoNewFolderId(cfg);
    cfg.folders[id] = { name: clean, icon: PDO_DEFAULT_ICON, defaultCollapsed: false };
    cfg.folderOrder.push(id);
    created = id;
  });
  return created;
}

function pdoRenameFolder(presetName, folderId, name) {
  const clean = String(name || '').trim();
  if (!clean) return false;
  let ok = false;
  pdoWithPresetConfig(presetName, cfg => {
    if (!cfg.folders[folderId]) return;
    const existing = pdoFindFolderIdByName(cfg, clean);
    if (existing && existing !== folderId) return;
    cfg.folders[folderId].name = clean;
    ok = true;
  });
  return ok;
}

function pdoSetFolderIcon(presetName, folderId, icon) {
  const clean = Array.from(String(icon || '').trim())[0] || PDO_DEFAULT_ICON;
  pdoWithPresetConfig(presetName, cfg => {
    if (cfg.folders[folderId]) cfg.folders[folderId].icon = clean;
  });
}

function pdoDeleteFolder(presetName, folderId) {
  pdoWithPresetConfig(presetName, cfg => {
    if (!cfg.folders[folderId]) return;
    delete cfg.folders[folderId];
    cfg.folderOrder = cfg.folderOrder.filter(id => id !== folderId);
    Object.keys(cfg.assignments).forEach(promptId => {
      if (cfg.assignments[promptId] === folderId) delete cfg.assignments[promptId];
    });
  });
  pdoClearCollapseForPreset(presetName, [folderId]);
}

function pdoSetFolderOrder(presetName, order) {
  pdoWithPresetConfig(presetName, cfg => {
    const seen = new Set();
    cfg.folderOrder = (order || []).filter(id => {
      if (!cfg.folders[id] || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    Object.keys(cfg.folders).forEach(id => {
      if (!seen.has(id)) cfg.folderOrder.push(id);
    });
  });
}

function pdoAssignPrompts(presetName, folderId, promptIds) {
  pdoWithPresetConfig(presetName, cfg => {
    if (!cfg.folders[folderId]) return;
    (promptIds || []).forEach(promptId => {
      if (promptId) cfg.assignments[String(promptId)] = folderId;
    });
  });
}

function pdoUnassignPrompt(presetName, promptId) {
  pdoWithPresetConfig(presetName, cfg => {
    delete cfg.assignments[String(promptId)];
  });
}

function pdoSaveTemplate(name) {
  const templateName = String(name || '').trim();
  if (!templateName) return false;
  const presetName = currentPreset();
  const cfg = pdoGetPresetConfig(presetName);
  const prompts = pdoReadPrompts();
  const assignmentsByName = {};
  const seenNames = new Set();
  let duplicate = false;

  prompts.forEach(prompt => {
    const promptName = prompt.name || prompt.id;
    if (seenNames.has(promptName)) duplicate = true;
    seenNames.add(promptName);
    const folderId = cfg.assignments[prompt.id];
    if (folderId && cfg.folders[folderId]) assignmentsByName[promptName] = folderId;
  });

  const db = pdoDbLoad();
  db.templates[templateName] = {
    folderOrder: cfg.folderOrder.slice(),
    folders: pdoClone(cfg.folders),
    assignmentsByName,
  };
  pdoDbSave(db, { repaint: false });
  if (duplicate) pdoNotify(psmT('notify_tpl_dup'));
  return true;
}

function pdoApplyTemplate(name) {
  const templateName = String(name || '').trim();
  const db = pdoDbLoad();
  const template = db.templates[templateName];
  if (!template) return false;

  const presetName = currentPreset();
  const prompts = pdoReadPrompts();
  const nextDb = pdoDbLoad();
  const tpl = pdoNormalizeTemplate(template);

  const nextCfg = {
    folderOrder: tpl.folderOrder.slice(),
    folders: pdoClone(tpl.folders),
    assignments: {},
  };
  prompts.forEach(prompt => {
    const folderId = tpl.assignmentsByName[prompt.name];
    if (folderId && nextCfg.folders[folderId]) nextCfg.assignments[prompt.id] = folderId;
  });
  nextDb.perPreset[presetName] = nextCfg;
  pdoClearCollapseForPreset(presetName);

  pdoDbSave(nextDb);
  return true;
}

function pdoDeleteTemplate(name) {
  const templateName = String(name || '').trim();
  const db = pdoDbLoad();
  if (!db.templates[templateName]) return false;
  delete db.templates[templateName];
  pdoDbSave(db, { repaint: false });
  return true;
}

function pdoIsHidden() {
  try { return localStorage.getItem(PDO_HIDDEN_KEY) === '1'; }
  catch { return false; }
}

function pdoSetHidden(hidden) {
  try { localStorage.setItem(PDO_HIDDEN_KEY, hidden ? '1' : '0'); }
  catch { /* ignore */ }
  if (typeof schedulePdoRepaint === 'function') schedulePdoRepaint();
}
