// ─── Styles ───────────────────────────────────────────────────────────────
// One stylesheet for the PSM window, the entry row under the preset menu and
// the bar above SillyTavern's prompt list. All colours come from the user's
// SillyTavern theme (--SmartTheme*), so the UI follows theme changes live.
// Two fixed colours stay the same in every theme: green #1D9E75, red #E24B4A.
// --psm-ctl (v9) outlines controls. It mixes the theme's border colour with
// its text colour, so buttons and switches keep an outline even on themes
// whose border colour is nearly invisible.
//
// Sizes: the plain rules are the desktop (mouse) sizes from the design.
// `.psm-touch` (phone sheet, or any touch screen) raises tap targets to 44px.

function injectStyles() {
  if (parent$('#' + STYLE_ID, parentDoc).length > 0) return;

  const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';
  const P = '#psm-panel';
  const T = '#psm-panel.psm-touch';

  const css = `
    /* ── Theme tokens ─────────────────────────────────────────────────── */
    #psm-panel, #psm-entry-row, #pdo-search-bar {
      --psm-bg: var(--SmartThemeBlurTintColor);
      --psm-fg: var(--SmartThemeBodyColor);
      --psm-bd: var(--SmartThemeBorderColor);
      --psm-q: var(--SmartThemeQuoteColor);
      --psm-shadow: var(--SmartThemeShadowColor);
      --psm-green: #1D9E75;
      --psm-red: #E24B4A;
    }
    /* Panels are made fully solid so text stays readable on see-through themes. */
    @supports (color: oklch(from red l c h / 1)) {
      #psm-panel, #psm-entry-row, #pdo-search-bar {
        --psm-bg: oklch(from var(--SmartThemeBlurTintColor) l c h / 1);
      }
    }
    #psm-panel, #psm-entry-row, #pdo-search-bar {
      --psm-ctl: color-mix(in oklab, var(--psm-bd) 55%, var(--psm-fg));
      --psm-muted: color-mix(in oklab, var(--psm-fg) 70%, var(--psm-bg));
      --psm-hair: color-mix(in oklab, var(--psm-ctl) 35%, var(--psm-bg));
      --psm-hover: color-mix(in oklab, var(--psm-fg) 7%, var(--psm-bg));
      --psm-on: color-mix(in oklab, var(--psm-fg) 11%, var(--psm-bg));
    }

    /* ── Shared atoms (panel, entry row, prompt-list bar) ──────────────────── */
    .psm-i { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; display: block; }
    .psm-i.f { fill: currentColor; stroke: none; }
    .psm-i.mut { color: var(--psm-muted); }
    .psm-i.hide { visibility: hidden; }
    .psm-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: 32px; padding: 0 12px; margin: 0; border: 1px solid var(--psm-ctl); border-radius: 6px;
      background: var(--psm-bg); color: var(--psm-fg); font-family: inherit; font-size: 13px; line-height: 1.2;
      cursor: pointer; white-space: nowrap; flex-shrink: 0; box-sizing: border-box; min-width: 0;
    }
    .psm-btn:disabled { opacity: .45; cursor: not-allowed; }
    .psm-btn.psm-go { border-color: var(--psm-green); background: color-mix(in oklab, var(--psm-green) 16%, var(--psm-bg)); font-weight: 600; }
    .psm-btn.psm-go .psm-i { color: var(--psm-green); }
    .psm-btn.psm-danger { border-color: var(--psm-red); background: color-mix(in oklab, var(--psm-red) 13%, var(--psm-bg)); font-weight: 600; }
    .psm-btn.psm-danger .psm-i, .psm-btn.psm-danger-o .psm-i { color: var(--psm-red); }
    .psm-btn.psm-danger-o { border-color: var(--psm-red); }
    .psm-btn.psm-quiet { border-color: transparent; background: none; }
    .psm-btn.psm-sm { height: 28px; padding: 0 10px; }
    .psm-btn.psm-wide { flex: 1; }
    .psm-btn.psm-full { width: 100%; }
    .psm-btn.psm-busy { cursor: default; }
    .psm-ib {
      width: 32px; height: 32px; display: inline-grid; place-items: center; margin: 0; padding: 0;
      border: none; border-radius: 6px; background: none; color: var(--psm-fg); cursor: pointer; flex-shrink: 0;
    }
    .psm-ib.psm-sm { width: 28px; height: 28px; }
    .psm-ib.mut { color: var(--psm-muted); }
    .psm-ib.psm-on { background: var(--psm-on); color: var(--psm-fg); }
    .psm-ib:disabled { opacity: .4; cursor: not-allowed; }
    @media (hover: hover) {
      .psm-btn:not(:disabled):hover, .psm-ib:not(:disabled):hover { background: var(--psm-hover); }
      .psm-btn.psm-go:not(:disabled):hover { background: color-mix(in oklab, var(--psm-green) 24%, var(--psm-bg)); }
      .psm-btn.psm-danger:not(:disabled):hover { background: color-mix(in oklab, var(--psm-red) 20%, var(--psm-bg)); }
      .psm-ib.mut:not(:disabled):hover { color: var(--psm-fg); }
    }
    .psm-inp {
      height: 36px; padding: 0 10px; margin: 0; border: 1px solid var(--psm-ctl); border-radius: 6px;
      background: var(--psm-bg); color: var(--psm-fg); font-family: inherit; font-size: 16px;
      min-width: 0; width: 100%; outline: none; box-sizing: border-box; box-shadow: none;
    }
    .psm-inp::placeholder { color: var(--psm-muted); opacity: 1; }
    .psm-inp:focus { border-color: var(--psm-q); box-shadow: 0 0 0 2px color-mix(in oklab, var(--psm-q) 35%, transparent); }
    .psm-srch { position: relative; display: flex; align-items: center; flex: 1; min-width: 0; }
    .psm-srch > .psm-i { position: absolute; left: 10px; color: var(--psm-muted); pointer-events: none; }
    .psm-srch .psm-inp { padding-left: 34px; padding-right: 36px; }
    .psm-srch .psm-ib { position: absolute; right: 4px; }
    .psm-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .psm-cap { font-size: 13px; color: var(--psm-muted); margin: 0; }
    .psm-nm { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }

    /* ── Entry row under the preset dropdown (its own row) ──────────────── */
    #psm-entry-row {
      display: flex; gap: 8px; width: 100%; box-sizing: border-box;
      padding: 6px 0 2px; margin: 0; font-family: ${bodyFont}; contain: inline-size;
    }
    #psm-entry-row[hidden] { display: none !important; }
    #psm-entry-row .psm-btn { flex: 1 1 0; height: 34px; font-size: 13px; background: transparent; }
    #psm-entry-row .psm-btn span { overflow: hidden; text-overflow: ellipsis; }
    @media (pointer: coarse) { #psm-entry-row .psm-btn { height: 44px; font-size: 14px; } }

    /* ── Window ───────────────────────────────────────────────────────── */
    ${P} {
      position: fixed !important; z-index: 99998 !important; display: none !important;
      flex-direction: column !important; box-sizing: border-box !important;
      background: var(--psm-bg) !important; color: var(--psm-fg) !important;
      border: 1px solid var(--psm-bd) !important; padding: 0 !important; margin: 0 !important;
      overflow: hidden !important; font-family: ${bodyFont} !important;
      font-size: 16px; line-height: 1.4; text-align: left;
    }
    ${P}.open { display: flex !important; }
    ${P}:focus { outline: none !important; }
    ${P} *, #psm-entry-row *, #pdo-search-bar * { box-sizing: border-box; }
    ${P} button, ${P} input, ${P} textarea { font-family: inherit; }
    ${P} p { margin: 0; }
    /* Desktop: width, height and place are set by toolbar.js (move + resize). */
    ${P}.psm-float {
      border-radius: 12px; box-shadow: 0 10px 32px var(--psm-shadow) !important;
    }
    ${P} .psm-rsz {
      position: absolute; right: 1px; bottom: 1px; width: 18px; height: 18px; z-index: 30;
      cursor: nwse-resize; touch-action: none; opacity: .7; border-bottom-right-radius: 11px;
      background: linear-gradient(135deg, transparent 52%, var(--psm-ctl) 52%, var(--psm-ctl) 60%, transparent 60%, transparent 72%, var(--psm-ctl) 72%, var(--psm-ctl) 80%, transparent 80%);
    }
    ${P}.psm-sheet .psm-rsz { display: none; }
    /* Phone: a sheet whose height the user sets with the handle (toolbar.js). */
    ${P}.psm-sheet {
      left: 0 !important; right: 0 !important; bottom: auto !important; width: auto !important;
      border-radius: 16px 16px 0 0; border-bottom: none !important;
      box-shadow: 0 -6px 28px var(--psm-shadow) !important;
      transition: top .2s ease, height .2s ease;
    }
    ${P}.psm-sheet.psm-sheet-drag { transition: none; }
    .psm-grabz { display: none; place-items: center; width: 100%; height: 24px; margin: 0; padding: 0; border: none; background: none; cursor: ns-resize; touch-action: none; flex-shrink: 0; }
    ${P}.psm-sheet .psm-grabz { display: grid; }
    .psm-grab { width: 44px; height: 5px; border-radius: 3px; background: var(--psm-ctl); opacity: .55; }
    /* While the sheet is open over the AI settings drawer, the drawer can
       scroll its content up above the sheet. */
    body.psm-sheet-pad #left-nav-panel .scrollableInner { padding-bottom: var(--psm-sheet-pad, 0px) !important; }

    /* Header */
    ${P} .psm-h { display: flex; align-items: center; gap: 2px; padding: 6px 4px 6px 2px; border-bottom: 1px solid var(--psm-hair); flex-shrink: 0; }
    ${P}.psm-float .psm-h { cursor: move; touch-action: none; }
    ${P}.psm-float .psm-h button { cursor: pointer; }
    ${P} .psm-drag { width: 20px; height: 32px; display: grid; place-items: center; color: var(--psm-muted); flex-shrink: 0; }
    ${P}.psm-sheet .psm-drag { display: none; }
    ${P} .psm-tabs { display: flex; gap: 2px; flex: 1; min-width: 0; overflow: hidden; }
    ${P} .psm-tab:first-child { flex-shrink: 0; }
    ${P} .psm-tab {
      display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 7px; margin: 0; min-width: 0;
      border: none; border-radius: 6px; background: none; font-size: 13px; font-weight: 600;
      color: var(--psm-muted); cursor: pointer; white-space: nowrap;
    }
    ${P} .psm-tab span { overflow: hidden; text-overflow: ellipsis; }
    ${P} .psm-tab.psm-on { background: var(--psm-on); color: var(--psm-fg); }
    @media (hover: hover) { ${P} .psm-tab:hover { background: var(--psm-hover); color: var(--psm-fg); } }
    ${P} .psm-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; padding-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Status strip */
    ${P} .psm-strip { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 12px; font-size: 13px; border-bottom: 1px solid var(--psm-hair); flex-shrink: 0; min-height: 40px; }
    ${P} .psm-strip-t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    ${P} .psm-strip.busy { background: color-mix(in oklab, var(--psm-q) 11%, var(--psm-bg)); }
    ${P} .psm-strip.ok { background: color-mix(in oklab, var(--psm-green) 13%, var(--psm-bg)); }
    ${P} .psm-strip.ok .psm-i { color: var(--psm-green); }
    ${P} .psm-strip.err { background: color-mix(in oklab, var(--psm-red) 13%, var(--psm-bg)); }
    ${P} .psm-strip.err .psm-i.st { color: var(--psm-red); }
    ${P} .psm-strip.info { background: var(--psm-hover); }
    .psm-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--psm-hair); border-top-color: var(--psm-q); animation: psmspin .8s linear infinite; flex-shrink: 0; }
    @keyframes psmspin { to { transform: rotate(360deg); } }

    /* Body */
    ${P} .psm-main { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
    ${P} .psm-body {
      flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch; padding: 12px; display: flex; flex-direction: column; gap: 12px;
      user-select: none; -webkit-user-select: none;
    }
    ${P}.psm-sheet .psm-body { padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
    ${P} input, ${P} textarea { user-select: text; -webkit-user-select: text; }
    ${P} .psm-sec { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    ${P} .psm-hr { border: none; border-top: 1px solid var(--psm-hair); margin: 0; width: 100%; height: 0; background: none; }
    ${P} .psm-lbl { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--psm-muted); margin: 0; }
    ${P} .psm-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; padding: 1px 6px; border-radius: 4px; border: 1px solid var(--psm-hair); color: var(--psm-muted); white-space: nowrap; flex-shrink: 0; max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
    ${P} .psm-tag > span { overflow: hidden; text-overflow: ellipsis; }
    ${P} .psm-tag.q { border-color: var(--psm-q); color: var(--psm-fg); }
    ${P} .psm-tag .psm-i { width: 12px; height: 12px; }
    ${P} .psm-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--psm-green); flex-shrink: 0; }
    ${P} .psm-dot.off { background: transparent; }
    ${P} .psm-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    ${P} .psm-act { flex: 1; min-width: 0; justify-content: flex-start; padding: 0 8px; }
    ${P} .psm-crumb { display: flex; align-items: flex-start; gap: 4px; margin: -4px 0 0 -6px; }
    ${P} .psm-crumb h3 { margin: 5px 0 0; font-size: 16px; font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; flex: 1; min-width: 0; color: var(--psm-fg); }

    /* Folder and preset rows */
    ${P} .psm-fl { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    ${P} .psm-fblock { position: relative; display: flex; flex-direction: column; min-width: 0; }
    ${P} .psm-frow, ${P} .psm-prow { position: relative; display: flex; align-items: center; gap: 2px; min-height: 40px; border-radius: 6px; min-width: 0; }
    @media (hover: hover) { ${P} .psm-frow:hover, ${P} .psm-prow:hover, ${P} .psm-pfr:hover { background: var(--psm-hover); } }
    ${P} .psm-grip { width: 18px; align-self: stretch; display: grid; place-items: center; color: var(--psm-muted); cursor: grab; flex-shrink: 0; touch-action: none; }
    ${P} .psm-grip .psm-i { width: 14px; height: 14px; }
    ${P} .psm-fbtn, ${P} .psm-pbtn {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 4px; margin: 0;
      border: none; background: none; color: var(--psm-fg); cursor: pointer; text-align: left; font-size: 16px;
    }
    ${P} .psm-chev { color: var(--psm-muted); transition: transform .15s; }
    ${P} .psm-chev.open { transform: rotate(90deg); }
    ${P} .psm-fname { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    ${P} .psm-cnt { font-size: 13px; color: var(--psm-muted); font-variant-numeric: tabular-nums; flex-shrink: 0; padding-right: 4px; }
    ${P} .psm-frow.tgt { background: color-mix(in oklab, var(--psm-q) 14%, var(--psm-bg)); }
    ${P} .psm-prow.sel { gap: 10px; padding: 0 6px; cursor: pointer; font-size: 16px; margin: 0; }
    /* Tick boxes drawn here: SillyTavern restyles every checkbox (filled with
       the text colour), which reads as solid black on light themes. */
    ${P} .psm-prow.sel input, ${P} .psm-pk-r input {
      -webkit-appearance: none; appearance: none; display: grid; place-items: center; position: relative;
      width: 16px; height: 16px; margin: 0; padding: 0; flex-shrink: 0; transform: none; overflow: hidden;
      border: 1.5px solid var(--psm-ctl); border-radius: 3px; outline: none; box-shadow: none;
      background: var(--psm-bg); cursor: pointer;
    }
    ${P} .psm-prow.sel input::before, ${P} .psm-pk-r input::before {
      content: ""; width: 10px; height: 10px; transform: scale(0); transition: transform .1s; box-shadow: inset 1em 1em #fff;
      clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
    }
    ${P} .psm-prow.sel input:checked, ${P} .psm-pk-r input:checked { background: var(--psm-green); border-color: var(--psm-green); }
    ${P} .psm-prow.sel input:checked::before, ${P} .psm-pk-r input:checked::before { transform: scale(1); }
    ${P} .psm-prow.sel input:disabled, ${P} .psm-pk-r input:disabled { opacity: .45; cursor: default; }
    ${P} .psm-prow.sel input:focus-visible, ${P} .psm-pk-r input:focus-visible { outline: 2px solid var(--psm-q); outline-offset: 1px; }
    ${P} .psm-kids { display: flex; flex-direction: column; gap: 2px; margin-left: 18px; padding: 2px 0 6px 8px; border-left: 1px solid var(--psm-hair); min-width: 0; }
    ${P} .psm-plist { display: flex; flex-direction: column; gap: 2px; min-width: 0; min-height: 0; }
    ${P} .psm-pitem { display: flex; flex-direction: column; min-width: 0; }
    ${P} .psm-note { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin: 0 0 6px 26px; padding: 8px 10px; font-size: 13px; border-radius: 6px; background: var(--psm-hover); min-width: 0; }
    ${P} .psm-note span, ${P} .psm-notetext { white-space: pre-wrap; overflow-wrap: anywhere; }
    ${P} .psm-notetext { margin: 0; font-size: 13px; }
    ${P} .psm-link { border: none; background: none; padding: 0; margin: 0; font-size: 13px; text-decoration: underline; cursor: pointer; color: var(--psm-fg); }
    ${P} .psm-addrow {
      display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 8px; margin: 2px 0 0; width: 100%;
      border: 1px dashed var(--psm-hair); border-radius: 6px; background: none; color: var(--psm-muted);
      font-size: 13px; cursor: pointer; text-align: left;
    }
    @media (hover: hover) { ${P} .psm-addrow:hover { color: var(--psm-fg); border-color: var(--psm-ctl); } }
    ${P} .psm-ug-lbl { padding: 6px 4px 2px; }

    /* Drag and drop */
    ${P} .psm-sortable-ghost { opacity: .35; }
    ${P} .psm-sortable-chosen { background: var(--psm-hover); }
    /* A closed folder accepts drops on its own row, so nothing shifts when a drag starts. */
    ${P} .psm-plist.psm-closed { position: absolute; left: 0; right: 0; top: 0; height: 40px; overflow: hidden; opacity: 0; pointer-events: none; z-index: 1; }
    ${P}.psm-dragging-p .psm-plist.psm-closed { pointer-events: auto; }
    /* The touch drag copy must never catch the finger (it holds a closed list too). */
    ${P} .sortable-fallback, ${P} .sortable-fallback * { pointer-events: none !important; }
    ${P} .psm-drag-spacer { pointer-events: none; }
    ${P} .psm-fblock.psm-drag-over > .psm-frow { background: var(--psm-on); outline: 1px solid var(--psm-q); outline-offset: -1px; }
    ${P} .psm-ug-zone { display: none; }
    ${P}.psm-dragging-p .psm-ug-zone { display: block; }
    ${P}.psm-dragging-p .psm-plist[data-folder=""] { min-height: 40px; border: 1px dashed var(--psm-hair); border-radius: 6px; }

    /* Menus */
    ${P} .psm-menu {
      position: absolute; right: 0; top: calc(100% - 2px); z-index: 12; min-width: 200px; max-width: 100%;
      padding: 4px; background: var(--psm-bg); border: 1px solid var(--psm-ctl); border-radius: 8px;
      box-shadow: 0 8px 24px var(--psm-shadow); display: flex; flex-direction: column;
    }
    ${P} .psm-menu.full { left: 0; right: 0; min-width: 0; }
    ${P} .psm-mi {
      display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px; margin: 0; min-width: 0;
      border: none; border-radius: 6px; background: none; color: var(--psm-fg); font-size: 14px;
      cursor: pointer; text-align: left; white-space: nowrap;
    }
    ${P} .psm-mi > span { overflow: hidden; text-overflow: ellipsis; }
    @media (hover: hover) { ${P} .psm-mi:hover { background: var(--psm-hover); } }
    ${P} .psm-mi .psm-i { color: var(--psm-muted); }
    ${P} .psm-mi.red .psm-i { color: var(--psm-red); }
    ${P} .psm-fldw { position: relative; }
    ${P} .psm-fsel { width: 100%; justify-content: flex-start; height: 36px; font-size: 14px; }

    /* Inline confirm boxes */
    ${P} .psm-cf { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--psm-ctl); border-radius: 8px; background: color-mix(in oklab, var(--psm-fg) 4%, var(--psm-bg)); min-width: 0; }
    ${P} .psm-cf.red { border-color: var(--psm-red); }
    ${P} .psm-cf-t { margin: 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
    ${P} .psm-cf .psm-cap { overflow-wrap: anywhere; }
    ${P} .psm-cf-b { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
    ${P} .psm-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 16px 12px; border: 1px dashed var(--psm-hair); border-radius: 8px; }

    /* Snapshot cards */
    ${P} .psm-snaps { display: flex; flex-direction: column; gap: 8px; }
    ${P} .psm-snap { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 8px 8px 8px 12px; border: 1px solid var(--psm-hair); border-radius: 6px; min-width: 0; background: color-mix(in oklab, var(--psm-fg) 3%, var(--psm-bg)); }
    ${P} .psm-snap.cur { border-color: var(--psm-q); background: color-mix(in oklab, var(--psm-q) 9%, var(--psm-bg)); }
    ${P} .psm-snap-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
    ${P} .psm-snap-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    ${P} .psm-snap-name { font-size: 16px; line-height: 1.3; overflow-wrap: break-word; word-break: normal; }
    ${P} .psm-snap .psm-menu { top: 44px; right: 6px; }
    ${P} .psm-wk { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--psm-muted); height: 32px; padding: 0 4px; flex-shrink: 0; }

    /* Prompt states */
    ${P} .psm-disc { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0; margin: 0; border: none; background: none; color: var(--psm-fg); cursor: pointer; width: 100%; text-align: left; }
    ${P} .psm-pst { display: flex; flex-direction: column; gap: 2px; }
    ${P} .psm-pst-r { display: flex; align-items: center; gap: 8px; font-size: 13px; min-height: 22px; overflow-wrap: anywhere; }
    ${P} .psm-sd { width: 6px; height: 6px; border-radius: 50%; background: var(--psm-green); flex-shrink: 0; }
    ${P} .psm-sd.off { background: transparent; box-shadow: inset 0 0 0 1.5px var(--psm-ctl); }

    /* Switch rows */
    ${P} .psm-swr { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 36px; padding: 4px 0; margin: 0; border: none; background: none; color: var(--psm-fg); cursor: pointer; text-align: left; font-size: 14px; }
    ${P} .psm-swr:disabled { cursor: not-allowed; opacity: .55; }
    ${P} .psm-swr-t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    ${P} .psm-sw { width: 36px; height: 20px; border-radius: 10px; border: 1.5px solid var(--psm-ctl); background: color-mix(in oklab, var(--psm-fg) 9%, var(--psm-bg)); position: relative; flex-shrink: 0; }
    ${P} .psm-sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: var(--psm-ctl); transition: transform .15s; }
    ${P} .psm-sw.on { background: color-mix(in oklab, var(--psm-green) 30%, var(--psm-bg)); border-color: var(--psm-green); }
    ${P} .psm-sw.on::after { transform: translateX(16px); background: var(--psm-green); }
    ${P} .psm-seg { display: flex; border: 1px solid var(--psm-ctl); border-radius: 6px; overflow: hidden; }
    ${P} .psm-seg button { flex: 1; min-width: 0; height: 32px; margin: 0; padding: 0 6px; border: none; border-left: 1px solid var(--psm-ctl); background: none; color: var(--psm-fg); font-size: 13px; cursor: pointer; }
    ${P} .psm-seg button:first-child { border-left: none; }
    ${P} .psm-seg button.psm-on { background: color-mix(in oklab, var(--psm-fg) 13%, var(--psm-bg)); font-weight: 600; }

    /* Tick mode ("Add to folder"): a sticky bar on top of the list */
    ${P} .psm-selbar {
      position: sticky; top: -12px; z-index: 6; margin: -12px -12px 0; padding: 8px 12px;
      display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--psm-hair);
      background: color-mix(in oklab, var(--psm-q) 13%, var(--psm-bg));
    }
    ${P} .psm-selbar-t { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    ${P} .psm-selbar-t .psm-cf-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    ${P} .psm-pk-r { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 6px; margin: 0; border-radius: 6px; cursor: pointer; font-size: 14px; min-width: 0; }
    @media (hover: hover) { ${P} .psm-pk-r:hover, ${P} .psm-prow.sel:hover { background: var(--psm-hover); } }

    /* Prompt folders */
    ${P} .psm-icg { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 4px; }
    ${P} .psm-icn { height: 36px; margin: 0; padding: 0; border: 1px solid var(--psm-hair); border-radius: 6px; background: none; font-size: 18px; cursor: pointer; color: var(--psm-fg); }
    ${P} .psm-icn.psm-on { border-color: var(--psm-q); background: color-mix(in oklab, var(--psm-q) 12%, var(--psm-bg)); }
    ${P} .psm-emo { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; line-height: 1; }
    ${P} .psm-pfr { display: flex; align-items: center; gap: 2px; min-height: 34px; padding-left: 6px; border-radius: 6px; font-size: 14px; min-width: 0; }

    /* ── Touch sizes (phone sheet, or a touch screen) ───────────────────── */
    ${T} { font-size: 14px; }
    ${T} .psm-i { width: 18px; height: 18px; }
    ${T} .psm-tag .psm-i { width: 12px; height: 12px; }
    ${T} .psm-grip .psm-i { width: 14px; height: 14px; }
    ${T} .psm-dot { width: 7px; height: 7px; }
    ${T} .psm-h { gap: 2px; padding: 0 4px 4px 6px; }
    ${T}.psm-float .psm-h { padding: 4px 4px 4px 2px; }
    ${T} .psm-tab { height: 44px; border-radius: 8px; font-size: 14px; }
    ${T} .psm-ib, ${T} .psm-ib.psm-sm { width: 44px; height: 44px; border-radius: 8px; }
    ${T} .psm-btn { height: 44px; padding: 0 14px; font-size: 14px; }
    ${T} .psm-btn.psm-sm { height: 40px; padding: 0 12px; }
    ${T} .psm-inp { height: 44px; padding: 0 12px; }
    ${T} .psm-srch > .psm-i { left: 12px; }
    ${T} .psm-srch .psm-inp { padding-left: 38px; padding-right: 46px; }
    ${T} .psm-srch .psm-ib { right: 0; }
    ${T} .psm-crumb { gap: 2px; margin: -6px 0 0 -10px; }
    ${T} .psm-crumb h3 { margin-top: 11px; }
    ${T} .psm-frow, ${T} .psm-prow { gap: 0; min-height: 48px; border-radius: 8px; }
    ${T} .psm-grip { width: 26px; }
    ${T} .psm-fbtn, ${T} .psm-pbtn { height: 48px; font-size: 15px; }
    ${T} .psm-kids { margin-left: 24px; padding: 2px 0 6px 6px; }
    ${T} .psm-plist.psm-closed { height: 48px; }
    ${T} .psm-note { margin-left: 30px; }
    ${T} .psm-link { padding: 0; min-height: 44px; }
    ${T} .psm-addrow { height: 44px; padding: 0 10px; font-size: 14px; }
    ${T} .psm-menu { min-width: 220px; border-radius: 10px; top: calc(100% - 4px); }
    ${T} .psm-mi { gap: 12px; height: 48px; padding: 0 12px; font-size: 15px; border-radius: 8px; }
    ${T} .psm-cf { padding: 12px; }
    ${T} .psm-cf-t { font-size: 15px; }
    ${T} .psm-cf-b .psm-btn { flex: 1; }
    ${T} .psm-snap { padding: 8px 4px 8px 12px; }
    ${T} .psm-snap-top { gap: 4px; }
    ${T} .psm-snap-name { font-size: 15px; }
    ${T} .psm-snap .psm-menu { top: 54px; right: 4px; }
    ${T} .psm-wk { height: 44px; }
    ${T} .psm-spin { width: 16px; height: 16px; }
    ${T} .psm-strip { padding: 2px 2px 2px 12px; min-height: 48px; }
    ${T} .psm-disc { height: 44px; }
    ${T} .psm-pst-r { min-height: 24px; }
    ${T} .psm-sd { width: 7px; height: 7px; }
    ${T} .psm-swr { min-height: 48px; font-size: 15px; }
    ${T} .psm-sw { width: 46px; height: 28px; border-radius: 14px; }
    ${T} .psm-sw::after { top: 3px; left: 3px; width: 19px; height: 19px; }
    ${T} .psm-sw.on::after { transform: translateX(18px); }
    ${T} .psm-seg button { height: 44px; font-size: 14px; }
    ${T} .psm-pk-r { gap: 12px; min-height: 48px; font-size: 15px; }
    ${T} .psm-prow.sel { gap: 12px; padding: 0 8px; font-size: 15px; }
    ${T} .psm-prow.sel input, ${T} .psm-pk-r input { width: 20px; height: 20px; }
    ${T} .psm-prow.sel input::before, ${T} .psm-pk-r input::before { width: 13px; height: 13px; }
    ${T} .psm-tag { max-width: 120px; }
    ${T} .psm-rsz { width: 28px; height: 28px; }
    ${T} .psm-icg { gap: 6px; }
    ${T} .psm-icn { height: 44px; border-radius: 8px; font-size: 20px; }
    ${T} .psm-emo { font-size: 16px; width: 22px; }
    ${T} .psm-pfr { gap: 0; min-height: 44px; }
    ${T} .psm-fsel { height: 44px; font-size: 15px; }
  `;
  parent$(parentDoc.head).append(`<style id="${STYLE_ID}">${css}</style>`);
}
