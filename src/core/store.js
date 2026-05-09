// ─── Constants ────────────────────────────────────────────────────────────

const STORE_KEY = 'psm_v1';
const META_KEY  = 'psm_v1_meta';
const POS_KEY   = 'psm_v1_pos';
const STYLE_ID  = 'psm-styles';

// ─── Storage ──────────────────────────────────────────────────────────────

function dbLoad() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}
function dbSave(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)); }

function metaLoad() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || '{"folders":{},"presetNotes":{}}');
    // Ensure folderOrder exists for backward-compatibility
    if (!m.folderOrder) m.folderOrder = Object.keys(m.folders || {});
    return m;
  } catch { return { folders: {}, presetNotes: {}, folderOrder: [] }; }
}
function metaSave(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }

function posLoad()           { try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { return null; } }
function posSave(top, left)  { localStorage.setItem(POS_KEY, JSON.stringify({ top, left })); }

// ─── View state ───────────────────────────────────────────────────────────

let panelOpen           = false;
let currentView         = 'browser';  // 'browser' | 'detail' | 'note'
let detailPreset        = '';
let notePreset          = '';
const expandedFolders   = new Set();
const expandedNotes     = new Set();
let filterText          = '';
const confirmingSnaps   = new Set();  // key = "presetName::snapName"
const deletingSnaps     = new Set();  // key = "presetName::snapName"
let renamingFolder      = null;       // folder name currently being renamed
let pendingApply        = null;       // { presetName, snapName } awaiting OAI_PRESET_CHANGED_AFTER
