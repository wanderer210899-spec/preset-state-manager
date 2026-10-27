'use strict';
const fs   = require('fs');
const path = require('path');

// Bump this when you want new dist filenames (e.g. v6 → v7).
const OUTPUT_VERSION = 'v10';

// ─── Source files in load order ───────────────────────────────────────────
// Order matters: each file can only call functions declared before it or in
// files that appear earlier in this list.
const srcFiles = [
  'src/utils/i18n.js',      // locale detection + psmT() string table (must load first)
  'src/core/store.js',      // constants, db helpers, settings, shared UI state
  'src/utils/helpers.js',   // TavernAPI wrappers, chat-ready guard, mutex
  'src/ui/icons.js',        // inline SVG icons
  'src/ui/styles.js',       // injectStyles(): window, entry row, shared atoms
  'src/core/snapshots.js',  // psmSave / psmApply / psmRename / psmDelete
  'src/core/original.js',   // original (disk) state row: psmApplyOriginal
  'src/core/rename.js',     // PSM data follows SillyTavern's own preset rename
  'src/ui/panel.js',        // rendering, Presets tab, settings, picker, events
  'src/ui/toolbar.js',      // status strip, entry points, open/close, placement
  'src/index.js',           // init()
  'src/divs/divs-store.js',
  'src/divs/divs-helpers.js',
  'src/divs/divs-styles.js',
  'src/divs/divs-decorator.js',
  'src/divs/divs-panel.js', // Prompt folders tab + templates
  'src/divs/divs-index.js',
];

// ─── IIFE shell ───────────────────────────────────────────────────────────
// This is the outer wrapper that SillyTavern's script runner evaluates.
// ERR / LOG / parentDoc / parent$ are declared here so every source file
// can reference them freely.
const HEADER = `(() => {
  const ERR = (...a) => console.error('[PSM ERROR]', ...a);
  const LOG = (...a) => console.log('[PSM]', ...a);

  let parentDoc, parent$;
  try {
    parentDoc = window.parent.document;
    parent$   = window.parent.$;
  } catch(e) { ERR('Failed to access parent:', e); return; }

  const PSM_ALREADY_LOADED = parent$('#psm-panel, #psm-wand-item, #psm-entry-row', parentDoc).length > 0;

`;

const FOOTER = `
  if (!PSM_ALREADY_LOADED) {
    setTimeout(init, 500);
  } else {
    LOG('PSM chrome already exists; skipped duplicate PSM init');
  }
})();
`;

// ─── Build ────────────────────────────────────────────────────────────────
function build() {
  const body = srcFiles
    .map(f => {
      const label = `  // ${'─'.repeat(3)} ${path.basename(f)} ${'─'.repeat(Math.max(0, 60 - path.basename(f).length))}`;
      const code  = fs.readFileSync(f, 'utf8')
        .split('\n')
        .map(line => '  ' + line)   // indent two spaces inside the IIFE
        .join('\n');
      return label + '\n\n' + code;
    })
    .join('\n\n');

  const js = HEADER + body + FOOTER;

  // ── Output 1: plain .js (for testing / diffing) ────────────────────────
  fs.mkdirSync('dist', { recursive: true });
  const outJs   = `dist/preset-state-manager-${OUTPUT_VERSION}.js`;
  const outJson = `dist/preset-state-manager-${OUTPUT_VERSION}.json`;
  fs.writeFileSync(outJs, js, 'utf8');

  // ── Output 2: importable JSON script (TavernHelper metadata below) ────
  const scriptJson = JSON.stringify({
    type:    'script',
    enabled: true,
    name:    'Preset State Manager',
    id:      'preset-state-manager',
    info:    OUTPUT_VERSION + ' Snapshots of prompt on/off states per preset, preset folders, prompt folders and prompt search.',
    button:  { enabled: false, buttons: [] },
    data:    {},
    content: js,
  }, null, 2);
  fs.writeFileSync(outJson, scriptJson, 'utf8');

  const lines = js.split('\n').length;
  console.log(`Build complete (${lines} lines)`);
  console.log(`  → ${outJs}   (raw JS for testing)`);
  console.log(`  → ${outJson} (script import)`);
}

build();
