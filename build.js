'use strict';
const fs   = require('fs');
const path = require('path');

// Bump this when you want new dist filenames (e.g. v6 → v7).
const OUTPUT_VERSION = 'v6';

// ─── Source files in load order ───────────────────────────────────────────
// Order matters: each file can only call functions declared before it or in
// files that appear earlier in this list.
const srcFiles = [
  'src/core/store.js',      // constants, db helpers, shared state
  'src/utils/helpers.js',   // TavernAPI wrappers, DOM utils, position helpers
  'src/ui/styles.js',       // PSM_SCALE + injectStyles()
  'src/core/snapshots.js',  // psmSave / psmApply / psmDelete
  'src/ui/panel.js',        // all three panel views + event bindings
  'src/ui/toolbar.js',      // showToast, createAndInjectUI, drag, open/close
  'src/index.js',           // init()
];

// ─── IIFE shell ───────────────────────────────────────────────────────────
// This is the outer wrapper that SillyTavern's script runner evaluates.
// ERR / LOG / parentDoc / parent$ are declared here so every source file
// can reference them freely.
const HEADER = `$((() => {
  const ERR = (...a) => console.error('[PSM ERROR]', ...a);
  const LOG = (...a) => console.log('[PSM]', ...a);

  let parentDoc, parent$;
  try {
    parentDoc = window.parent.document;
    parent$   = window.parent.$;
  } catch(e) { ERR('Failed to access parent:', e); return; }

  if (parent$('#psm-btn', parentDoc).length > 0) return;

`;

const FOOTER = `
  setTimeout(init, 500);
}))();
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
    info:    'Floating draggable overlay to save and apply prompt on/off state snapshots per preset.',
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
