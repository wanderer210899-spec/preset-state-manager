// ─── Constants ────────────────────────────────────────────────────────────

const STORE_KEY    = 'psm_v1';
const META_KEY     = 'psm_v1_meta';
const POS_KEY      = 'psm_v1_pos';
const SETTINGS_KEY = 'psm_v1_settings';
const STYLE_ID     = 'psm-styles';

// ─── Storage ──────────────────────────────────────────────────────────────

function dbLoad() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}
function dbSave(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)); }

function metaLoad() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || '{"folders":{},"presetNotes":{}}');
    if (!m.folders) m.folders = {};
    if (!m.presetNotes) m.presetNotes = {};
    // Ensure folderOrder exists for backward-compatibility
    if (!m.folderOrder) m.folderOrder = Object.keys(m.folders || {});
    return m;
  } catch { return { folders: {}, presetNotes: {}, folderOrder: [] }; }
}
function metaSave(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

// Desktop window place and size: { top, left } (v6+), plus { w, h } (v9).
// Older versions read top/left only and ignore w/h.
function posLoad() { try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { return null; } }
function posSave(patch) {
  try { localStorage.setItem(POS_KEY, JSON.stringify({ ...(posLoad() || {}), ...patch })); } catch(e) { ERR('posSave:', e); }
}

// Settings (v8): which tools and entry points show, and the export choice.
// Missing keys fall back to the defaults, so older data needs no migration.
const SETTINGS_DEFAULT = {
  tools:      { presets: true, folders: true, search: true },
  entries:    { drawer: true, ext: true },
  exportWhat: 'both',
};

function settingsLoad() {
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch { raw = {}; }
  return {
    tools:      { ...SETTINGS_DEFAULT.tools,   ...(raw.tools   || {}) },
    entries:    { ...SETTINGS_DEFAULT.entries, ...(raw.entries || {}) },
    exportWhat: ['snapshots', 'folders', 'both'].includes(raw.exportWhat) ? raw.exportWhat : 'both',
  };
}
function settingsSave(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

// ─── View state ───────────────────────────────────────────────────────────

let panelOpen           = false;
const expandedFolders   = new Set();
const expandedNotes     = new Set();
let filterText          = '';
const confirmingSnaps   = new Set();  // key = "presetName::snapName" — the one awaiting Confirm
let pendingApply        = null;       // { presetName, snapName } awaiting OAI_PRESET_CHANGED_AFTER

// Everything else the panel shows. Reset parts of it when views change.
const psmUi = {
  tab:        'presets',  // 'presets' | 'folders'
  view:       'list',     // presets tab: 'list' | 'page'
  pagePreset: '',
  settings:   false,      // settings page open
  sel:        null,       // tick mode "add to folder": { kind: 'preset'|'prompt', folder, ids: Set }
  selq:       '',         // filter in prompt tick mode
  fview:      'list',     // folders tab: 'list' | 'templates'
  menu:       null,       // key of the open ⋯ menu
  confirm:    null,       // { kind, id, title, body, ok, danger, run }
  renaming:   null,       // 'f:<folder>' | 's:<snap>' | 'p:<folderId>'
  renameVal:  '',
  newFolder:  null,       // string while the "new folder" row is open
  newFolderPg:null,
  noteEdit:   null,       // preset name whose note is being edited
  noteDraft:  '',
  saveName:   '',
  statesOpen: false,
  showOff:    false,
  pfOpen:     new Set(),  // open prompt folders in the panel
  iconFor:    null,
  customIcon: '',
  newPF:      null,
  tplName:    '',
  status:     null,       // { kind: 'ok'|'info'|'err', text, retry }
  busy:       null,       // { label, presetName, snapName, since }
  // Phone sheet height as a share of the screen, one per tab (this session only).
  sheetH:     { presets: 620 / 844, folders: 400 / 844 },
  sheetDrag:  false,      // the sheet's handle is being dragged
};
