// ─── Icons ────────────────────────────────────────────────────────────────
// Stroke icons from the v8 design. All use currentColor, so they follow the
// theme's text colour. psmIcon(name, cls) returns an inline <svg> string.

const PSM_ICON_PATHS = {
  layers:   '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  folder:   '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x:        '<path d="M18 6 6 18M6 6l12 12"/>',
  collapse: '<path d="m7 10 5-5 5 5M7 19l5-5 5 5"/>',
  expand:   '<path d="m7 5 5 5 5-5M7 14l5 5 5-5"/>',
  chevR:    '<path d="m9 6 6 6-6 6"/>',
  chevD:    '<path d="m6 9 6 6 6-6"/>',
  grip:     '<circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>',
  kebab:    '<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>',
  gear:     '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  check:    '<path d="m5 12.5 4.5 4.5L19 7"/>',
  alert:    '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  plus:     '<path d="M12 5v14M5 12h14"/>',
  pencil:   '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:    '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  note:     '<path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6"/>',
  back:     '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  restore:  '<path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5"/><path d="M4 4v4.5h4.5"/>',
  swap:     '<path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4"/>',
  copy:     '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  locate:   '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  smile:    '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5v.01M15 9.5v.01"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload:   '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
};

// Filled icons (dots) use fill instead of stroke.
const PSM_ICON_FILLED = new Set(['grip', 'kebab']);

function psmIcon(name, cls = '') {
  const filled = PSM_ICON_FILLED.has(name) ? ' f' : '';
  return `<svg class="psm-i${filled}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${PSM_ICON_PATHS[name] || ''}</svg>`;
}
