(() => {
  const ERR = (...a) => console.error('[PSM ERROR]', ...a);
  const LOG = (...a) => console.log('[PSM]', ...a);

  let parentDoc, parent$;
  try {
    parentDoc = window.parent.document;
    parent$   = window.parent.$;
  } catch(e) { ERR('Failed to access parent:', e); return; }

  const PSM_ALREADY_LOADED = parent$('#psm-panel, #psm-wand-item, #psm-openai-preset-shortcut-wrap', parentDoc).length > 0;

  // ─── store.js ────────────────────────────────────────────────────

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
  

  // ─── helpers.js ──────────────────────────────────────────────────

  // ─── TavernHelper wrappers ────────────────────────────────────────────────
  
  function currentPreset()  { try { return getLoadedPresetName(); }     catch(e) { ERR('getLoadedPresetName:', e); return 'unknown'; } }
  function readPrompts()    { try { return getPreset('in_use').prompts; } catch(e) { ERR('getPreset:', e); return []; } }
  function allPresetNames() { try { return getPresetNames(); }           catch(e) { ERR('getPresetNames:', e); return []; } }
  
  // ─── Position helpers ─────────────────────────────────────────────────────
  
  function defaultPanelPos() {
    const panelEl = parent$('#psm-panel', parentDoc)[0];
    const pw = panelEl ? panelEl.offsetWidth  : 320;
    const ph = panelEl ? panelEl.offsetHeight : 400;
    return {
      top:  Math.round((window.parent.innerHeight - ph) / 2),
      left: Math.round((window.parent.innerWidth  - pw) / 2),
    };
  }
  
  // ─── DOM / utility helpers ────────────────────────────────────────────────
  
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  
  function attr(el, key) {
    return $(el).attr('data-' + key) ?? '';
  }
  
  function toggleSet(set, key) { set.has(key) ? set.delete(key) : set.add(key); }
  function snapKey(preset, snap) { return preset + '::' + snap; }
  
  function getFolderForPreset(presetName) {
    const meta = metaLoad();
    for (const [fname, fdata] of Object.entries(meta.folders || {})) {
      if ((fdata.presets || []).includes(presetName)) return fname;
    }
    return null;
  }
  
  function snapCountFor(presetName) {
    return Object.keys((dbLoad()[presetName] || {})).length;
  }
  
  function clampPanelToViewport() {
    const panelEl = parent$('#psm-panel', parentDoc)[0];
    if (!panelEl) return;
    const margin = 10, pw = panelEl.offsetWidth, ph = panelEl.offsetHeight;
    const top  = Math.min(Math.max(margin, parseFloat(panelEl.style.top)  || 0), window.parent.innerHeight - ph - margin);
    const left = Math.min(Math.max(margin, parseFloat(panelEl.style.left) || 0), window.parent.innerWidth  - pw - margin);
    panelEl.style.setProperty('top',  top  + 'px', 'important');
    panelEl.style.setProperty('left', left + 'px', 'important');
  }
  
  function ensureFolder(name) {
    const m = metaLoad();
    if (!m.folders[name]) {
      m.folders[name] = { presets: [] };
      if (!m.folderOrder.includes(name)) m.folderOrder.push(name);
    }
    metaSave(m);
    return m;
  }
  
  // ─── Chat-ready state machine ─────────────────────────────────────────────
  //
  // WHY PREVIOUS EVENT-ONLY APPROACHES FAILED:
  //
  // Events are not a reliable physical check. On a 9 MB JSONL:
  //   • CHAT_CHANGED fires at the START of loading, not the end.
  //   • CHARACTER_MESSAGE_RENDERED / USER_MESSAGE_RENDERED fire as messages
  //     are parsed, but can be missed or delayed through the iframe bridge.
  //   • MESSAGE_IFRAME_RENDER_ENDED fires after each message iframe completes
  //     executing its JS — which can trigger ST writes. Missing even one of
  //     these means our guard clears while writes are still happening.
  //   • A pure event debounce has no way to verify the DOM is actually stable.
  //
  // THE CORRECT APPROACH: DOM polling as primary truth, events as veto.
  //
  //   "The chat is ready when the #chat .mes count in the DOM has been
  //    PHYSICALLY IDENTICAL for CHAT_STABLE_NEEDED consecutive polls
  //    AND no render event of any kind fired during that same window."
  //
  // Both conditions must hold simultaneously. A single render event (including
  // MESSAGE_IFRAME_RENDER_ENDED) resets the stability counter even if the DOM
  // count hasn't changed. This correctly handles the case where iframes are
  // still executing JS after all messages are visually present.
  //
  // ARCHITECTURE:
  //   • initChatReadyListeners() — called ONCE from init().
  //   • CHAT_CHANGED → _chatReady = false, start DOM poll + ceiling timer.
  //   • DOM poll every CHAT_DOM_POLL_MS: check parent #chat .mes count.
  //     If count unchanged AND no render event fired → increment stable counter.
  //     If count changed OR render event fired → reset stable counter.
  //     When stable counter reaches CHAT_STABLE_NEEDED → _chatReady = true.
  //   • Any render event (CHARACTER_MESSAGE_RENDERED, USER_MESSAGE_RENDERED,
  //     MORE_MESSAGES_LOADED, MESSAGE_IFRAME_RENDER_ENDED) → reset stable counter.
  //   • CHAT_SETTLE_CEILING_MS absolute ceiling → unblock regardless (safety).
  //   • isChatReady() — synchronous check for hard-block in psmApply.
  //   • waitForChatReady() — async wait, queues until ready.
  
  const CHAT_DOM_POLL_MS       = 150;    // physical DOM check every 150 ms
  const CHAT_STABLE_NEEDED     = 11;     // 11 × 150 ms = 1650 ms of total silence
                                         // Must cover ST's deferred async writes that
                                         // fire after MESSAGE_IFRAME_RENDER_ENDED.
                                         // The event fires when iframe JS finishes
                                         // synchronously, but that JS schedules async
                                         // setTimeout write chains that run for up to
                                         // ~1–3 s afterward. 750 ms was too short;
                                         // 1600–1650 ms is the proven safe minimum.
  const CHAT_SETTLE_CEILING_MS = 120000; // 2 min absolute ceiling (empty chats etc.)
  
  let _chatReady        = true;  // assume ready at startup (chat already open)
  let _chatReadyWaiters = [];    // queued resolve() fns from waitForChatReady()
  let _chatPollTimer    = null;
  let _chatCeilingTimer = null;
  let _chatStableRuns   = 0;     // consecutive polls with identical DOM count
  let _chatLastMesCount = -1;    // DOM .mes count from previous poll
  let _chatRenderFired  = false; // did a render event fire since last poll?
  
  // Called ONCE from init(). All listeners are permanent for the script lifetime.
  function initChatReadyListeners() {
    eventOn(tavern_events.CHAT_CHANGED,                _onChatLoadBegins);
    eventOn(tavern_events.CHARACTER_MESSAGE_RENDERED,  _onRenderActivity);
    eventOn(tavern_events.USER_MESSAGE_RENDERED,       _onRenderActivity);
    eventOn(tavern_events.MORE_MESSAGES_LOADED,        _onRenderActivity);
    // MESSAGE_IFRAME_RENDER_ENDED is the critical one: iframes inside messages
    // execute JS AFTER the .mes DOM element exists. On a large chat each iframe
    // can trigger ST internal writes. We must hold the block until every single
    // iframe in the chat has fully completed. This event fires once per iframe.
    eventOn(iframe_events.MESSAGE_IFRAME_RENDER_ENDED, _onRenderActivity);
    LOG('chatReady: listeners registered');
  }
  
  function isChatReady()  { return _chatReady; }
  
  // CHAT_CHANGED = a new chat is starting to load. Block all writes immediately.
  function _onChatLoadBegins() {
    _chatReady        = false;
    _chatStableRuns   = 0;
    _chatLastMesCount = -1;
    _chatRenderFired  = false;
    clearTimeout(_chatPollTimer);
    clearTimeout(_chatCeilingTimer);
    LOG('chatReady: CHAT_CHANGED — loading started, writes blocked');
  
    // Absolute ceiling in case the chat is empty or events never fire.
    _chatCeilingTimer = setTimeout(() => {
      LOG('chatReady: ceiling reached — unblocking');
      _markChatReady();
    }, CHAT_SETTLE_CEILING_MS);
  
    _schedulePoll();
  }
  
  // Any render event resets the stability counter, even if DOM count is unchanged.
  // This is what makes MESSAGE_IFRAME_RENDER_ENDED effective: an iframe completing
  // resets the window, forcing us to wait for a full stable period after it.
  function _onRenderActivity() {
    if (_chatReady) return;
    _chatRenderFired = true; // polled and cleared by _doPoll
  }
  
  function _schedulePoll() {
    _chatPollTimer = setTimeout(_doPoll, CHAT_DOM_POLL_MS);
  }
  
  function _doPoll() {
    if (_chatReady) return;
  
    const count = parent$('#chat .mes', parentDoc).length;
  
    // Both conditions must hold: DOM count unchanged AND no render event fired.
    if (count === _chatLastMesCount && !_chatRenderFired) {
      _chatStableRuns++;
    } else {
      _chatStableRuns   = 0;
      _chatLastMesCount = count;
    }
    _chatRenderFired = false; // consume the flag each poll
  
    if (_chatStableRuns >= CHAT_STABLE_NEEDED) {
      LOG('chatReady: DOM stable at ' + count + ' .mes — all iframes settled — safe to proceed');
      _markChatReady();
      return;
    }
  
    _schedulePoll();
  }
  
  function _markChatReady() {
    clearTimeout(_chatPollTimer);
    clearTimeout(_chatCeilingTimer);
    _chatReady      = true;
    _chatStableRuns = 0;
    const waiters   = _chatReadyWaiters.splice(0);
    if (waiters.length) LOG('chatReady: unblocking ' + waiters.length + ' queued operation(s)');
    waiters.forEach(r => r());
  }
  
  // Async gate: resolves immediately if ready, otherwise queues until ready.
  // Call this before any operation that writes to or re-renders the chat.
  function waitForChatReady() {
    if (_chatReady) return Promise.resolve();
    LOG('chatReady: chat not ready — operation queued until stable');
    return new Promise(resolve => _chatReadyWaiters.push(resolve));
  }
  
  // Public: call BEFORE any operation that will trigger its own re-render
  // (e.g. updatePresetWith with render:'immediate'). Without this, _chatReady
  // is still true when updatePresetWith fires render events, so _onRenderActivity
  // returns early, the stability counter never resets, and Wait 2 resolves
  // instantly without waiting for anything.
  //
  // Unlike _onChatLoadBegins (which resets _chatLastMesCount to -1 because a real
  // CHAT_CHANGED will change the message count), markChatBusy snapshots the CURRENT
  // DOM count. updatePresetWith re-renders messages but does not add or remove them,
  // so the count stays the same. Setting -1 would cause a false "count changed" on
  // the very first poll, burning one 150 ms cycle for no reason.
  function markChatBusy() {
    _chatReady        = false;
    _chatStableRuns   = 0;
    _chatLastMesCount = parent$('#chat .mes', parentDoc).length; // snapshot, not -1
    _chatRenderFired  = false;
    clearTimeout(_chatPollTimer);
    clearTimeout(_chatCeilingTimer);
    LOG('chatReady: manually marked busy (pre-write)');
    _chatCeilingTimer = setTimeout(() => {
      LOG('chatReady: ceiling reached — unblocking');
      _markChatReady();
    }, CHAT_SETTLE_CEILING_MS);
    _schedulePoll();
  }
  
  // ─── Operation mutex ──────────────────────────────────────────────────────
  // Prevents two concurrent psmApply calls (e.g. rapid double-click).
  // Without this, both calls pass the waitForChatReady() gate before either
  // has called markChatBusy(), and two writes race each other.
  
  let _psmBusy = false;
  
  function psmAcquire() {
    if (_psmBusy) return false;
    _psmBusy = true;
    return true;
  }
  
  function psmRelease() { _psmBusy = false; }
  

  // ─── styles.js ───────────────────────────────────────────────────

  // ─── Scale config ─────────────────────────────────────────────────────────
  // Change PSM_SCALE.base to resize the entire UI. All sizes derive from it.
  const PSM_SCALE = {
    base:    16,     // body/input font size in px — the one value to edit
    body:    1,      // preset names, body text            → 16px
    caption: 0.8125, // secondary text, notes, snap meta   → 13px
    label:   0.75,   // folder/section labels (uppercase)  → 12px
    iconSm:  1,      // small toolbar icons: ℹ ✕ ← +       → 16px
    iconMd:  1.5,    // main ⚙ button icon                 → 24px
    pad:     0.5,    // spacing unit                       → 8px
  };
  
  // ─── Styles ───────────────────────────────────────────────────────────────
  
  function waitForThemeAndInjectStyles({ interval = 50, timeout = 5000 } = {}) {
    const start = Date.now();
    const cs    = () => window.parent.getComputedStyle(parentDoc.documentElement);
  
    function attempt() {
      const tint   = cs().getPropertyValue('--SmartThemeBlurTintColor').trim();
      const border = cs().getPropertyValue('--SmartThemeBorderColor').trim();
      const body   = cs().getPropertyValue('--SmartThemeBodyColor').trim();
  
      if (tint && border && body) {
        // All variables resolved — inject normally
        injectStyles();
      } else if (Date.now() - start < timeout) {
        setTimeout(attempt, interval);
      } else {
        // Timed out — if ANY variable failed to resolve, force ALL three to safe
        // black-and-white defaults. A partial resolve (e.g. bg resolves but text
        // doesn't) risks invisible text like white-on-white, so it's all or nothing.
        const anyFailed = !tint || !border || !body;
        injectStyles(anyFailed ? {
          bgFallback:     '#ffffff',
          borderFallback: '#000000',
          mutedFallback:  '#000000',
        } : {});
      }
    }
  
    attempt();
  }
  
  function injectStyles({ bgFallback = null, borderFallback = null, mutedFallback = null } = {}) {
    if (parent$('#' + STYLE_ID, parentDoc).length > 0) return;
  
    const b    = PSM_SCALE.base;
    const px   = k => `${Math.round(b * PSM_SCALE[k])}px`;
    const sp   = n => `${Math.round(b * PSM_SCALE.pad * n)}px`;
    const fluid = k => {
      const hi = Math.round(b * PSM_SCALE[k]);
      const lo = Math.max(14, Math.round(hi * 0.875));
      if (lo === hi) return `${hi}px`;
      const slope  = ((hi - lo) / 649 * 100).toFixed(2);
      const offset = (lo - parseFloat(slope) / 100 * 375).toFixed(2);
      return `clamp(${lo}px, ${slope}vw + ${offset}px, ${hi}px)`;
    };
  
    const bg     = bgFallback     ?? 'oklch(from var(--SmartThemeBlurTintColor) l c h / 1)';
    const border = borderFallback ?? 'var(--SmartThemeBorderColor)';
    const muted  = mutedFallback  ?? 'var(--SmartThemeBodyColor)';
    const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';
  
    const css = `
      #psm-panel {
        position: fixed !important; z-index: 99998 !important;
        width: min(320px, calc(100vw - 24px)) !important;
        max-height: 80vh !important; overflow: hidden !important;
        display: none !important; flex-direction: column !important;
        background: ${bg} !important; border: 1px solid ${border} !important;
        border-radius: 12px !important; padding: 0 !important;
        font-size: ${fluid('body')} !important; color: ${muted} !important;
        font-family: ${bodyFont} !important;
        box-sizing: border-box !important;
      }
      #psm-panel.open { display: flex !important; }
      #psm-panel-inner {
        flex: 1 1 auto !important; min-height: 0 !important;
        overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;
      }
      #psm-panel button, #psm-panel input, #psm-panel select, #psm-panel textarea {
        font-family: inherit !important; color: ${muted};
      }
      .psm-filter,
      .psm-save-row input, .psm-save-row button,
      .psm-snap-apply,
      .psm-snap-del.confirming,
      .psm-form-select, .psm-form-input, .psm-form-textarea,
      .psm-new-folder-row input, .psm-new-folder-row button,
      .psm-btn-row button, .psm-data-row button {
        border: 1px solid ${border}; background: ${bg}; color: ${muted};
      }
  
      .psm-header {
        display: flex; align-items: center; gap: ${sp(0.75)};
        padding: ${sp(1.25)} ${sp(1.5)}; border-bottom: 1px solid ${border};
        position: sticky; top: 0; background: ${bg}; z-index: 1;
        cursor: move;
      }
      .psm-header button { cursor: pointer; }
      .psm-header-title {
        flex: 1; font-size: ${px('label')}; font-weight: 600;
        text-transform: uppercase; letter-spacing: .07em;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .psm-ghost { background: none; border: none; cursor: pointer; }
      .psm-header-btn {
        font-size: ${px('iconSm')}; padding: ${sp(0.25)} ${sp(0.625)}; border-radius: 4px; line-height: 1; flex-shrink: 0;
      }
      .psm-active-link { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: ${px('caption')} !important; }
  
      .psm-body { padding: ${sp(1.25)} ${sp(1.5)}; }
  
      .psm-filter {
        width: 100%; box-sizing: border-box; border-radius: 6px;
        padding: ${sp(0.625)} ${sp(1.125)}; font-size: ${fluid('body')} !important;
        outline: none; margin-bottom: ${sp(1)}; display: block;
      }
  
      .psm-folder-row {
        display: flex; align-items: center; gap: 0;
        padding: 0 0; cursor: pointer; user-select: none;
        overflow: hidden; position: relative;
      }
      /* ── Folder row inner layout (swipe-to-reveal) ─────────────── */
      .psm-folder-row-content {
        display: flex; width: 100%;
        transform: translateX(0); transition: transform 0.18s ease;
        will-change: transform;
      }
      .psm-folder-row.swipe-open .psm-folder-row-content { transform: translateX(-175px); }
      .psm-folder-main {
        flex-shrink: 0; width: 100%;
        display: flex; align-items: center; gap: ${sp(0.625)};
        padding: ${sp(1)} ${sp(0.25)};
      }
      .psm-folder-swipe-actions {
        flex-shrink: 0; width: 175px;
        display: flex; align-items: center; gap: ${sp(0.375)}; padding: 0 ${sp(0.75)};
        border-left: 1px solid ${border};
      }
      .psm-folder-swipe-actions button { flex: 1; padding: ${sp(0.375)} 0; border-radius: 4px;
        font-size: ${px('caption')} !important; cursor: pointer; white-space: nowrap; }
      .psm-folder-add, .psm-folder-rename-btn { background: none !important; border: 1px solid ${border} !important; }
      .psm-folder-del.swipe { background: none !important; border: 1px solid #E24B4A !important; color: #E24B4A !important; }
  
      @media (hover: hover) {
        .psm-folder-row { overflow: visible; }
        .psm-folder-swipe-actions {
          position: absolute; right: 0; top: 0; bottom: 0; width: auto;
          background: ${bg}; border-left: 1px solid ${border};
          opacity: 0; pointer-events: none;
          transition: opacity 0.1s 0s;
        }
        .psm-folder-row:hover:not(.dragging) .psm-folder-swipe-actions {
          opacity: 1; pointer-events: auto;
          transition: opacity 0.15s 0.4s;
        }
      }
  
      .psm-folder-arrow { font-size: ${px('label')}; width: ${px('label')}; flex-shrink: 0; }
      .psm-folder-label {
        flex: 1; font-size: ${px('label')}; font-weight: 600;
        text-transform: uppercase; letter-spacing: .06em;
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .psm-folder-rename-input {
        flex: 1; background: ${bg}; border: none; border-bottom: 1px solid ${border};
        outline: none; padding: 0; min-width: 0;
        font-size: ${px('label')}; font-weight: 600;
        text-transform: uppercase; letter-spacing: .06em;
      }
  
      .psm-preset-row {
        display: flex; align-items: center; gap: ${sp(0.5)};
        padding: ${sp(0.875)} 0 ${sp(0.875)} ${sp(1.75)};
        user-select: none; -webkit-user-select: none;
      }
      .psm-preset-row.ungrouped { padding-left: ${sp(0.25)}; }
      .psm-active-dot { width: 5px; height: 5px; border-radius: 50%; background: #1D9E75; flex-shrink: 0; }
      .psm-inactive-spacer { width: 5px; flex-shrink: 0; }
      .psm-preset-name-btn {
        flex: 1; font-size: ${fluid('body')} !important; text-align: left;
        padding: ${sp(0.25)} ${sp(0.625)}; border-radius: 4px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .psm-info-btn {
        font-size: ${px('iconSm')}; padding: ${sp(0.375)} ${sp(0.75)}; border-radius: 3px; flex-shrink: 0;
        min-width: ${px('iconSm')}; text-align: center;
      }
  
      .psm-note-inline {
        padding: ${sp(0.375)} ${sp(0.75)} ${sp(0.625)} ${sp(2.5)};
        font-size: ${px('caption')}; white-space: pre-wrap; word-break: break-word;
        border-left: 2px solid ${border}; margin: 1px 0 ${sp(0.5)} ${sp(1.75)};
      }
      .psm-note-inline.ungrouped { margin-left: ${sp(0.25)}; }
      .psm-edit-link {
        text-decoration: underline;
        font-size: ${px('caption')}; margin-left: ${sp(0.5)}; padding: 1px ${sp(0.5)}; border-radius: 3px;
      }
  
      .psm-folder-dropdown {
        position: fixed; z-index: 999999;
        background: ${bg}; border: 1px solid ${border}; color: ${muted};
        font-family: var(--mainFontFamily);
        border-radius: 8px; padding: ${sp(0.5)} 0; min-width: 180px;
        max-width: calc(100vw - 16px);
        font-size: ${fluid('body')}; max-height: 200px; overflow-y: auto;
      }
      .psm-fd-item {
        padding: ${sp(0.625)} ${sp(1.5)}; cursor: pointer; white-space: nowrap;
        display: flex; align-items: baseline; gap: ${sp(0.75)};
      }
  
      .psm-save-row { display: flex; gap: ${sp(0.75)}; margin-bottom: ${sp(1.25)}; }
      .psm-save-row input {
        flex: 1; border-radius: 6px; outline: none; min-width: 0;
        padding: ${sp(0.625)} ${sp(1.125)}; font-size: ${fluid('body')} !important;
      }
      .psm-save-row button {
        padding: ${sp(0.625)} ${sp(1.625)}; border-radius: 6px; cursor: pointer;
        font-size: ${fluid('body')} !important; white-space: nowrap;
      }
  
      .psm-empty {
        text-align: center; font-size: ${px('caption')}; padding: ${sp(1.25)};
        border: 1px dashed ${border}; border-radius: 6px;
      }
  
      .psm-snap {
        display: flex; align-items: center; gap: ${sp(0.625)};
        padding: ${sp(0.625)} ${sp(1)};
        border: 1px solid ${border}; border-radius: 6px; margin-bottom: ${sp(0.5)};
      }
      .psm-snap:last-child { margin-bottom: 0; }
      .psm-snap--active {
        border-color: var(--SmartThemeQuoteColor);
        background: oklch(from var(--SmartThemeQuoteColor, #888) l c h / 0.08);
      }
      .psm-snap-name { flex: 1; min-width: 0; font-size: ${fluid('body')} !important; word-break: break-all; cursor: pointer; }
      .psm-snap-meta { font-size: ${px('caption')}; white-space: nowrap; flex-shrink: 0; }
      .psm-snap-apply {
        padding: ${sp(0.25)} ${sp(1)}; border-radius: 4px; cursor: pointer;
        font-size: ${px('caption')}; white-space: nowrap; flex-shrink: 0;
      }
      .psm-snap-apply.confirming { border-color: #1D9E75; color: #1D9E75; }
      .psm-snap-cancel {
        padding: ${sp(0.25)} ${sp(0.625)}; border-radius: 4px;
        font-size: ${px('caption')}; white-space: nowrap; flex-shrink: 0;
      }
      .psm-snap-cancel:hover { color: #E24B4A; }
      .psm-snap-del {
        font-size: ${px('caption')}; padding: ${sp(0.25)} ${sp(0.5)}; border-radius: 3px; line-height: 1; flex-shrink: 0;
      }
      .psm-snap-del:hover { color: #E24B4A; }
      .psm-snap-del.confirming {
        padding: ${sp(0.25)} ${sp(1)}; border-radius: 4px;
        border-color: #E24B4A; color: #E24B4A; white-space: nowrap;
      }
  
      .psm-divider { border: none; border-top: 1px solid ${border}; margin: ${sp(1)} 0; }
  
      details.psm-details summary {
        cursor: pointer; font-size: ${px('label')};
        text-transform: uppercase; letter-spacing: .07em;
        padding: ${sp(0.5)} 0; list-style: none;
        display: flex; align-items: center; gap: ${sp(0.625)};
      }
      details.psm-details summary::before { content: '▶'; font-size: ${px('label')}; }
      details.psm-details[open] summary::before { content: '▼'; }
      details.psm-details summary::-webkit-details-marker { display: none; }
  
      .psm-show-disabled {
        display: flex; align-items: center; gap: ${sp(0.625)};
        font-size: ${px('caption')}; padding: ${sp(0.5)} 0 ${sp(0.75)}; cursor: pointer;
      }
      .psm-prompt-row { display: flex; align-items: center; gap: ${sp(0.75)}; padding: ${sp(0.25)} 0; }
      .psm-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
      .psm-dot.on  { background: #1D9E75; }
      .psm-dot.off { background: ${border}; }
      .psm-pname { font-size: ${px('caption')}; }
  
      .psm-form-label {
        font-size: ${px('label')}; text-transform: uppercase;
        letter-spacing: .07em; margin-bottom: ${sp(0.5)}; display: block;
      }
      .psm-form-select, .psm-form-input, .psm-form-textarea {
        width: 100%; box-sizing: border-box; border-radius: 6px; outline: none;
        padding: ${sp(0.625)} ${sp(1.125)}; font-size: ${fluid('body')} !important;
        display: block; margin-bottom: ${sp(1)};
      }
      .psm-form-textarea { min-height: 72px; resize: vertical; }
  
      .psm-new-folder-row { display: flex; gap: ${sp(0.625)}; margin-bottom: ${sp(1)}; }
      .psm-new-folder-row input {
        flex: 1; border-radius: 6px; outline: none; min-width: 0;
        padding: ${sp(0.5)} ${sp(1)}; font-size: ${fluid('body')} !important;
      }
      .psm-new-folder-row button {
        padding: ${sp(0.5)} ${sp(1.25)}; border-radius: 5px; cursor: pointer;
        font-size: ${fluid('body')} !important; white-space: nowrap;
      }
  
      .psm-btn-row { display: flex; gap: ${sp(0.75)}; margin-top: ${sp(1)}; }
      .psm-btn-row button {
        flex: 1; padding: ${sp(0.625)} 0; border-radius: 6px;
        font-size: ${fluid('body')} !important; cursor: pointer;
      }
  
      .psm-data-row {
        display: flex; gap: ${sp(0.75)}; padding-top: ${sp(1)};
        border-top: 1px solid ${border}; margin-top: ${sp(0.5)};
      }
      .psm-data-row button {
        flex: 1; padding: ${sp(0.375)} 0; border-radius: 5px; cursor: pointer;
        font-size: ${px('caption')} !important;
      }
      .psm-data-row .psm-danger { border-color: #E24B4A !important; color: #E24B4A !important; }
      .psm-data-row .psm-danger:hover { background: oklch(from #E24B4A l c h / 0.08) !important; }
  
      .psm-toast {
        position: absolute !important; bottom: ${sp(0.75)} !important; left: 50% !important;
        transform: translateX(-50%) !important;
        background: ${bg} !important; border: 1px solid ${border} !important;
        border-radius: 7px; padding: ${sp(0.75)} ${sp(1.25)}; font-size: ${px('caption')};
        color: ${muted} !important; opacity: 0; pointer-events: none; transition: opacity .2s;
        z-index: 3 !important; max-width: calc(100% - ${sp(2)}) !important;
        white-space: normal !important; text-align: center !important; line-height: 1.35 !important;
        box-shadow: 0 2px 10px oklch(0 0 0 / 0.2);
      }
      .psm-toast.show { opacity: 1 !important; }
  
      /* ── Text selection prevention ──────────────────────────────── */
      .psm-body { user-select: none; -webkit-user-select: none; }
      #psm-panel input, #psm-panel textarea, #psm-panel select {
        user-select: text !important; -webkit-user-select: text !important;
      }
  
      /* ── Folder block + preset sublist ─────────────────────────── */
      .psm-folder-block { display: block; }
      /* psm-preset-item is the SortableJS draggable unit — wraps both the
         preset row AND its inline note so they travel together as one piece. */
      .psm-preset-item  { display: block; }
      .psm-preset-list  { display: block; min-height: 2px; }
      /* Collapsed lists: zero height normally, inflated to a full touch target
         during drag so mobile users can drop into them. The list is empty (no
         presets rendered) so the 44px zone is invisible but hittable. On a
         successful drop, onEnd auto-expands the folder. */
      .psm-preset-list--collapsed { height: 0; overflow: hidden; min-height: 0; }
      .psm-drag-active .psm-preset-list--collapsed { min-height: 44px; height: 44px; }
      .psm-preset-list--collapsed * { transition: none !important; transform: none !important; }
  
      /* ── Drag handle ────────────────────────────────────────────── */
      .psm-drag-handle {
        cursor: grab; flex-shrink: 0;
        padding: 0 ${sp(0.5)}; color: ${border};
        font-size: ${px('body')}; line-height: 1;
        touch-action: none;
        user-select: none; -webkit-user-select: none;
      }
      .psm-drag-handle:active { cursor: grabbing; }
  
      /* ── SortableJS feedback ────────────────────────────────────── */
      .psm-sortable-ghost  { opacity: 0.35; }
      .psm-sortable-chosen { background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.1); }
  
      /* ── Folder drag-over highlight ─────────────────────────────── */
      .psm-folder-block.psm-folder-drag-over > .psm-folder-row .psm-folder-main {
        background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.18);
        border-radius: 4px;
        outline: 1px solid oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.55);
        outline-offset: -1px;
      }
    `;
    parent$(parentDoc.head).append(`<style id="${STYLE_ID}">${css}</style>`);
  }
  

  // ─── snapshots.js ────────────────────────────────────────────────

  // ─── Core operations ──────────────────────────────────────────────────────
  
  function psmSave(presetName) {
    const $input = parent$('#psm-snap-input', parentDoc);
    const name   = ($input.val() || '').trim();
    if (!name) { $input.trigger('focus'); return; }
    const prompts = readPrompts();
    const states  = {};
    prompts.forEach(p => { states[p.id] = p.enabled; });
    const db      = dbLoad();
    if (!db[presetName]) db[presetName] = {};
    const onCount = Object.values(states).filter(Boolean).length;
    const meta    = onCount + '/' + prompts.length + ' on';
    db[presetName][name] = { states, savedAt: Date.now(), meta };
    dbSave(db);
    $input.val('');
    LOG('save: "' + name + '" (' + meta + ') — preset: "' + presetName + '"');
    renderDetail();
    showToast('Saved "' + name + '"');
  }
  
  async function psmApply(presetName, snapName) {
    // Mutex: if another operation is already running, drop this one.
    // Two concurrent applies would race each other regardless of chat state.
    if (!psmAcquire()) {
      LOG('psmApply blocked — another operation in progress');
      showToast('⏳ Previous operation still running — please wait');
      return;
    }
  
    const db   = dbLoad();
    const snap = db[presetName]?.[snapName];
    if (!snap) { ERR('Snapshot not found:', snapName, 'in preset:', presetName); psmRelease(); return; }
  
    // Pre-flight queue: if the chat is currently loading (from a previous
    // preset switch, a manual "reload regex now" button press, or anything
    // else), hold here until the DOM is fully stable. We do NOT drop the
    // operation — the user pressed apply and expects it to happen.
    if (!isChatReady()) {
      showToast('⏳ Waiting for chat to finish loading…');
    }
    await waitForChatReady();
  
    if (presetName !== currentPreset()) {
      // Cross-preset path: trigger the switch and return.
      // psmApplyStates will be called from OAI_PRESET_CHANGED_AFTER.
      // The mutex is held here and released inside psmApplyStates finally{}.
      pendingApply   = { presetName, snapName };
      const switched = loadPreset(presetName);
      if (!switched) { ERR('loadPreset failed:', presetName); pendingApply = null; psmRelease(); }
      return;
    }
  
    await psmApplyStates(presetName, snapName, snap);
    // psmRelease() called inside psmApplyStates finally{}
  }
  
  async function psmApplyStates(presetName, snapName, snap) {
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
      const m = metaLoad();
      if (!m.activeSnaps) m.activeSnaps = {};
      m.activeSnaps[presetName] = snapName;
      metaSave(m);
      LOG('apply: "' + snapName + '" (' + snap.meta + ') — preset: "' + presetName + '"');
      renderView();
      showToast('Snapshot applied successfully · ' + snapName);
    } catch(e) {
      ERR('psmApplyStates:', e);
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
    deletingSnaps.delete(snapKey(presetName, snapName));
    LOG('delete: "' + snapName + '" — preset: "' + presetName + '"');
    renderDetail();
    showToast('Deleted "' + snapName + '"');
  }
  

  // ─── panel.js ────────────────────────────────────────────────────

  // ─── Shared header HTML ───────────────────────────────────────────────────
  
  function headerHtml(title, showBack, extraBtns = '') {
    return `<div class="psm-header">
      ${showBack ? '<button class="psm-ghost psm-header-btn" id="psm-back">←</button>' : ''}
      <span class="psm-header-title">${title}</span>
      ${extraBtns}
      <button class="psm-ghost psm-header-btn" id="psm-close">✕</button>
    </div>`;
  }
  
  function psmContentRoot() {
    return parent$('#psm-panel-inner', parentDoc);
  }
  
  // ─── Render dispatcher ────────────────────────────────────────────────────
  
  const VIEWS = { browser: renderBrowser, detail: renderDetail, note: renderNoteEdit };
  function renderView() { VIEWS[currentView]?.(); }
  
  // ─── View 1: Browser ─────────────────────────────────────────────────────
  
  function buildListHtml() {
    const meta        = metaLoad();
    const active      = currentPreset();
    const all         = allPresetNames().filter(p => p !== 'in_use');
    const allSet      = new Set(all);
    const filter      = filterText.trim().toLowerCase();
    const folders     = meta.folders || {};
    const folderOrder = (meta.folderOrder || Object.keys(folders)).filter(f => folders[f]);
    const notes       = meta.presetNotes || {};
    const inFolders   = new Set(Object.values(folders).flatMap(f => f.presets || []));
  
    let folderHtml = '';
  
    folderOrder.forEach(fname => {
      const fdata   = folders[fname];
      const presets = (fdata.presets || []).filter(p =>
        allSet.has(p) && (!filter || p.toLowerCase().includes(filter))
      );
      if (filter && !presets.length && !fname.toLowerCase().includes(filter)) return;
      const open       = expandedFolders.has(fname);
      const isRenaming = renamingFolder === fname;
      const swipeActions =
        `<button class="psm-ghost psm-folder-add" data-folder-add="${esc(fname)}">Add</button>
         <button class="psm-ghost psm-folder-rename-btn" data-folder-rename-btn="${esc(fname)}">Rename</button>
         <button class="psm-folder-del swipe" data-folder-del="${esc(fname)}">Delete</button>`;
  
      folderHtml += `<div class="psm-folder-block" data-folder="${esc(fname)}">
        <div class="psm-folder-row" data-folder="${esc(fname)}">
          <div class="psm-folder-row-content">
            <div class="psm-folder-main">
              <span class="psm-drag-handle" title="Drag to reorder">⠿</span>
              <span class="psm-folder-arrow">${open ? '▼' : '▶'}</span>
              ${isRenaming
                ? `<input class="psm-folder-rename-input" data-folder-rename="${esc(fname)}" value="${esc(fname)}" />`
                : `<span class="psm-folder-label">${esc(fname)}</span>`}
            </div>
            <div class="psm-folder-swipe-actions">${swipeActions}</div>
          </div>
        </div>
        <div class="psm-preset-list${open ? '' : ' psm-preset-list--collapsed'}" data-folder="${esc(fname)}">`;
      if (open) {
        presets.forEach(pn => { folderHtml += presetRowHtml(pn, active, false, notes, fname); });
      }
      folderHtml += `</div></div>`;
    });
  
    const ungrouped = all.filter(p => !inFolders.has(p) && (!filter || p.toLowerCase().includes(filter)));
    const ungroupedHtml = ungrouped.map(pn => presetRowHtml(pn, active, true, notes, '')).join('');
  
    return `
      <div id="psm-folder-sortable">${folderHtml}</div>
      <div id="psm-ungrouped-list" class="psm-preset-list" data-folder="">${ungroupedHtml}</div>
      ${!all.length ? '<div class="psm-empty">No presets found</div>' : ''}
    `;
  }
  
  function renderList() {
    const $panel = parent$('#psm-panel', parentDoc);
    $panel.find('#psm-list').html(buildListHtml());
    bindListEvents($panel);
    if (renamingFolder) {
      const $ri = $panel.find('.psm-folder-rename-input');
      if ($ri.length) { $ri[0].focus(); $ri[0].select(); }
    }
  }
  
  function renderBrowser() {
    const active    = currentPreset();
    const extraBtns = `<button class="psm-ghost psm-header-btn psm-active-link" id="psm-active-link" title="Go to active preset">${esc(active)}</button>`;
    psmContentRoot().html(
      headerHtml('PSM', false, extraBtns) +
      `<div class="psm-body">
        <input class="psm-filter" id="psm-filter" type="text" placeholder="🔍 filter presets…" value="${esc(filterText)}" />
        <div class="psm-new-folder-row">
          <input id="psm-new-folder-input" type="text" placeholder="New folder name…" />
          <button id="psm-new-folder-btn">+ Folder</button>
        </div>
        <div id="psm-list">${buildListHtml()}</div>
        <div class="psm-data-row">
          <button id="psm-export">Export</button>
          <button id="psm-import">Import</button>
          <button id="psm-reset" class="psm-danger">Reset</button>
        </div>
      </div>`
    );
    bindBrowserEvents();
  }
  
  function presetRowHtml(pn, active, ungrouped, notes, folder) {
    const isActive = pn === active;
    const noteOpen = expandedNotes.has(pn);
    const note     = notes[pn] || '';
    const cls      = ungrouped ? ' ungrouped' : '';
    // psm-preset-item is the draggable unit — it wraps BOTH the row and the note
    // so SortableJS moves them together. Previously the note was a sibling and
    // got left behind when the row was dragged, orphaning it under the wrong preset.
    return `<div class="psm-preset-item" data-preset="${esc(pn)}" data-preset-folder="${esc(folder || '')}">
      <div class="psm-preset-row${cls}">
        <span class="psm-drag-handle" title="Drag to reorder">⠿</span>
        ${isActive ? '<span class="psm-active-dot"></span>' : '<span class="psm-inactive-spacer"></span>'}
        <button class="psm-ghost psm-preset-name-btn" data-goto="${esc(pn)}">${esc(pn)}</button>
        <button class="psm-ghost psm-info-btn${noteOpen ? ' open' : ''}" data-info="${esc(pn)}" title="Note">ℹ</button>
      </div>
      ${noteOpen ? `<div class="psm-note-inline${cls}">
        ${note ? esc(note) : '<em>No note.</em>'}
        <span class="psm-ghost psm-edit-link" data-edit-note="${esc(pn)}">[edit]</span>
      </div>` : ''}
    </div>`;
  }
  
  function closeSwipedFolders($p) {
    ($p || parent$('#psm-panel', parentDoc)).find('.psm-folder-row.swipe-open').removeClass('swipe-open');
  }
  
  function isDragActive() {
    return !!parent$('#psm-list', parentDoc)[0]?.classList.contains('psm-drag-active');
  }
  
  function bindListEvents($p) {
    // Folder expand/collapse — click the main row area only
    $p.find('.psm-folder-main').on('click', function(e) {
      if (isDragActive()) return;
      if ($(e.target).closest('.psm-folder-rename-input').length) return;
      if (renamingFolder) return;
      const fname = attr($(this).closest('.psm-folder-row')[0], 'folder');
      closeSwipedFolders($p);
      toggleSet(expandedFolders, fname);
      renderList();
    });
  
    // Rename via button in swipe panel
    $p.find('[data-folder-rename-btn]').on('click', function(e) {
      e.stopPropagation();
      renamingFolder = attr(this, 'folder-rename-btn');
      closeSwipedFolders($p);
      renderList();
    });
  
    // Rename input
    $p.find('[data-folder-rename]').on('keydown', function(e) {
      if (e.key === 'Enter')  { e.preventDefault(); confirmRename(attr(this, 'folder-rename'), $(this).val().trim()); }
      if (e.key === 'Escape') { renamingFolder = null; renderList(); }
    }).on('blur', function() {
      if (renamingFolder) confirmRename(attr(this, 'folder-rename'), $(this).val().trim());
    }).on('click', e => e.stopPropagation());
  
    // Add preset to folder (dropdown)
    $p.find('[data-folder-add]').on('click', function(e) {
      e.stopPropagation();
      showFolderDropdown(attr(this, 'folder-add'), this);
    });
  
    // Delete — native confirm, no re-render needed for confirmation state
    $p.find('[data-folder-del]').on('click', function(e) {
      e.stopPropagation();
      const fname = attr(this, 'folder-del');
      if (!window.parent.confirm(`Delete folder "${fname}"?\nPresets inside will become ungrouped.`)) return;
      const m = metaLoad();
      delete m.folders[fname];
      m.folderOrder = (m.folderOrder || []).filter(f => f !== fname);
      metaSave(m);
      expandedFolders.delete(fname);
      renderList();
    });
  
    // Preset navigation
    $p.find('[data-goto]').on('click', function() {
      if (isDragActive()) return;
      detailPreset = attr(this, 'goto');
      currentView  = 'detail';
      renderView();
    });
  
    $p.find('[data-info]').on('click', function() {
      const pn = attr(this, 'info');
      toggleSet(expandedNotes, pn);
      renderList();
    });
  
    $p.find('[data-edit-note]').on('click', function() {
      notePreset  = attr(this, 'edit-note');
      currentView = 'note';
      renderView();
    });
  
    // Drag handle clicks must not bubble to folder-main or preset row click handlers
    $p.find('.psm-drag-handle').on('click', e => e.stopPropagation());
  
    bindFolderSwipe($p);
    initSortables();
  }
  
  function bindBrowserEvents() {
    const $p = parent$('#psm-panel', parentDoc);
  
    $p.find('#psm-close').on('click', closePanel);
    $p.find('#psm-active-link').on('click', () => {
      detailPreset = currentPreset();
      currentView  = 'detail';
      renderView();
    });
    $p.find('#psm-export').on('click', exportData);
    $p.find('#psm-import').on('click', importData);
    $p.find('#psm-reset').on('click', resetData);
  
    $p.find('#psm-new-folder-btn').on('click', () => {
      const name = ($p.find('#psm-new-folder-input').val() || '').trim();
      if (!name) return;
      ensureFolder(name);
      expandedFolders.add(name);
      $p.find('#psm-new-folder-input').val('');
      renderList();
    });
    $p.find('#psm-new-folder-input').on('keydown', function(e) {
      if (e.key === 'Enter') $p.find('#psm-new-folder-btn').trigger('click');
    });
  
    $p.find('#psm-filter').on('input', function() {
      filterText = $(this).val();
      renderList();
    });
  
    bindListEvents($p);
  }
  
  // ─── Folder swipe-to-reveal ───────────────────────────────────────────────
  
  function bindFolderSwipe($p) {
    parent$(parentDoc).off('pointerdown.psmswipe');
  
    $p.find('.psm-folder-main').on('pointerdown', function(e) {
      if (isDragActive()) return;
      if (e.pointerType === 'mouse') return; // mouse users get hover-reveal via CSS
      if ($(e.target).closest('.psm-folder-rename-input').length) return;
      const el       = this;
      const $row     = $(this).closest('.psm-folder-row');
      const $content = $row.find('.psm-folder-row-content')[0];
      const isOpen   = $row.hasClass('swipe-open');
      const startX   = e.clientX, startY = e.clientY;
      let swipeDir   = null, swiping = false;
      const pid      = e.pointerId;
  
      function onMove(ev) {
        if (isDragActive()) return; // drag took over, abort swipe
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!swipeDir && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          swipeDir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
        }
        if (swipeDir !== 'h') return;
        swiping = true;
        ev.preventDefault();
        const offset  = isOpen ? -140 + dx : dx;
        const clamped = Math.min(0, Math.max(-140, offset));
        $content.style.transition = 'none';
        $content.style.transform  = `translateX(${clamped}px)`;
      }
      function onUp(ev) {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup',   onUp);
        el.removeEventListener('pointercancel', onUp);
        $content.style.transition = '';
        $content.style.transform  = '';
        if (!swiping) return;
        const dx = ev.clientX - startX;
        if (isOpen) {
          // Any swipe > 40px (either direction) closes the panel
          if (Math.abs(dx) > 40) $row.removeClass('swipe-open');
          else                    $row.addClass('swipe-open');
        } else {
          // Must swipe left at least 60px to open
          if (dx < -60) { closeSwipedFolders($p); $row.addClass('swipe-open'); }
        }
      }
      try { el.setPointerCapture(pid); } catch(_) {}
      el.addEventListener('pointermove', onMove, { passive: false });
      el.addEventListener('pointerup',   onUp);
      el.addEventListener('pointercancel', onUp);
    });
  
    parent$(parentDoc).on('pointerdown.psmswipe', function(e) {
      if (!$(e.target).closest('.psm-folder-row').length) {
        closeSwipedFolders($p);
      }
    });
  }
  
  // ─── Drag and drop (SortableJS) ───────────────────────────────────────────
  
  function initSortables() {
    const Sortable = window.parent.Sortable;
    if (!Sortable) return;
  
    const listEl = parent$('#psm-list', parentDoc)[0];
    if (!listEl) return;
  
    // Destroy stale instances from the previous renderList() call.
    // Without this, old instances pile up on detached DOM nodes and fire errors.
    if (listEl._psmSortables) {
      listEl._psmSortables.forEach(s => { try { s.destroy(); } catch (_) {} });
    }
    listEl._psmSortables = [];
  
    const folderEl = listEl.querySelector('#psm-folder-sortable');
  
    const isMobile = ('ontouchstart' in window.parent)
      || ((window.parent.navigator?.maxTouchPoints ?? 0) > 0);
  
    function setDragActive(on) {
      listEl.classList.toggle('psm-drag-active', on);
    }
  
    // Track which folder block is currently highlighted during drag so we can
    // clear it cleanly on every move without scanning the full DOM each time.
    let dragOverFolder = null;
    function setDragOver(fname) {
      if (dragOverFolder === fname) return;
      if (dragOverFolder !== null) {
        Array.from(listEl.querySelectorAll('.psm-folder-block'))
          .find(el => el.dataset.folder === dragOverFolder)
          ?.classList.remove('psm-folder-drag-over');
      }
      dragOverFolder = fname;
      if (fname !== null) {
        Array.from(listEl.querySelectorAll('.psm-folder-block'))
          .find(el => el.dataset.folder === fname)
          ?.classList.add('psm-folder-drag-over');
      }
    }
  
    // Merge DOM-visible preset order with hidden (filtered) presets.
    // `exclude` prevents a just-moved preset from being re-added to its source
    // folder as a "hidden" item (SortableJS has already removed it from the DOM
    // but the saved data still lists it).
    function mergePresets(domListEl, existingPresets, exclude) {
      // Each draggable is now a .psm-preset-item wrapper that carries data-preset.
      const domOrder = [...domListEl.querySelectorAll(':scope > .psm-preset-item')]
        .map(el => el.dataset.preset).filter(Boolean);
      const domSet = new Set(domOrder);
      const hidden = (existingPresets || []).filter(p => !domSet.has(p) && p !== exclude);
      return [...domOrder, ...hidden];
    }
  
    // Shared base options.
    // forceFallback / fallbackOnBody are intentionally absent — SortableJS's
    // fallback mode captures ALL pointer events, which collides directly with
    // bindFolderSwipe's pointerdown/pointermove handlers on mobile.
    const base = {
      animation:           150,
      delay:               isMobile ? 200 : 0,
      delayOnTouchOnly:    true,
      touchStartThreshold: 5,
      ghostClass:          'psm-sortable-ghost',
      chosenClass:         'psm-sortable-chosen',
    };
  
    // ── Folder reorder ────────────────────────────────────────────────────────
    if (folderEl) {
      const inst = Sortable.create(folderEl, {
        ...base,
        group:    { name: 'psm-folders', pull: false, put: false },
        draggable: '.psm-folder-block',
        handle:    '.psm-folder-row .psm-drag-handle',
        onStart:   () => setDragActive(true),
        onEnd() {
          setDragActive(false);
          const m = metaLoad();
          m.folderOrder = [...folderEl.querySelectorAll(':scope > .psm-folder-block')]
            .map(el => el.dataset.folder).filter(Boolean);
          metaSave(m);
        }
      });
      listEl._psmSortables.push(inst);
    }
  
    // ── Preset lists: reorder within folder + cross-folder drag ───────────────
    listEl.querySelectorAll('.psm-preset-list').forEach(el => {
      const inst = Sortable.create(el, {
        ...base,
        // Every list — including collapsed — accepts drops. Collapsed lists are
        // inflated to 44px during drag (via CSS .psm-drag-active) so they form a
        // reachable touch target on mobile. On successful drop, onEnd auto-expands
        // the destination folder so the item is immediately visible.
        group:                { name: 'psm-presets', pull: true, put: true },
        draggable:            '.psm-preset-item',   // drag the wrapper, not just the row
        handle:               '.psm-drag-handle',
        emptyInsertThreshold: 8,
        onStart: () => setDragActive(true),
        onMove(evt) {
          // Highlight whichever folder block the dragged item is currently over.
          const block = (evt.related ?? evt.to)?.closest?.('.psm-folder-block[data-folder]');
          setDragOver(block?.dataset.folder ?? null);
        },
        onEnd(evt) {
          setDragOver(null);
          setDragActive(false);
  
          const fromFolder  = evt.from.dataset.folder ?? '';
          const toFolder    = evt.to.dataset.folder   ?? '';
          const movedPreset = evt.item.dataset.preset;
  
          if (evt.from === evt.to && evt.oldIndex === evt.newIndex) return;
  
          const m = metaLoad();
  
          if (toFolder && m.folders[toFolder]) {
            m.folders[toFolder].presets = mergePresets(evt.to, m.folders[toFolder].presets);
          }
          if (fromFolder && fromFolder !== toFolder && m.folders[fromFolder]) {
            m.folders[fromFolder].presets = mergePresets(
              evt.from, m.folders[fromFolder].presets, movedPreset
            );
          }
  
          metaSave(m);
  
          if (fromFolder !== toFolder) {
            // Expand destination so the dropped preset is immediately visible.
            // Delay matches animation duration so SortableJS finishes its drop
            // animation before we replace the DOM node it is still animating.
            if (toFolder) expandedFolders.add(toFolder);
            setTimeout(renderList, 170);
          } else {
            evt.item.dataset.presetFolder = toFolder;
          }
        }
      });
      listEl._psmSortables.push(inst);
    });
  }
  
  // ─── Data reset ───────────────────────────────────────────────────────────
  
  function resetData() {
    if (!window.parent.confirm(
      'Reset ALL PSM data?\n\nThis will permanently delete all folders, preset assignments, notes, and snapshots.\nThis cannot be undone.'
    )) return;
    dbSave({});
    metaSave({ folders: {}, presetNotes: {}, folderOrder: [] });
    expandedFolders.clear();
    expandedNotes.clear();
    filterText    = '';
    renamingFolder = null;
    showToast('Data reset');
    renderView();
  }
  
  // ─── Data export / import ─────────────────────────────────────────────────
  
  function exportData() {
    const payload = { version: 1, exported: new Date().toISOString(),
      snapshots: dbLoad(), meta: metaLoad() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = window.parent.URL.createObjectURL(blob);
    const a    = parentDoc.createElement('a');
    a.href = url; a.download = 'psm-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    parentDoc.body.appendChild(a); a.click();
    parentDoc.body.removeChild(a); window.parent.URL.revokeObjectURL(url);
    showToast('Exported');
  }
  
  function importData() {
    const input = parentDoc.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = function(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new window.parent.FileReader();
      reader.onload = function(ev) {
        try {
          const d = JSON.parse(ev.target.result);
          if (!d.snapshots || !d.meta) { showToast('Invalid backup file'); return; }
          if (!window.parent.confirm('Overwrite all PSM data with this backup?')) return;
          dbSave(d.snapshots); metaSave(d.meta);
          showToast('Imported'); renderView();
        } catch { showToast('Failed to read file'); }
      };
      reader.readAsText(file);
    };
    parentDoc.body.appendChild(input); input.click(); parentDoc.body.removeChild(input);
  }
  
  // ─── Folder operations ────────────────────────────────────────────────────
  
  function confirmRename(oldName, newName) {
    renamingFolder = null;
    if (!newName || newName === oldName) { renderList(); return; }
    const m = metaLoad();
    if (m.folders[newName]) { showToast('Folder name already exists'); renderList(); return; }
    m.folders[newName] = m.folders[oldName];
    delete m.folders[oldName];
    const idx = (m.folderOrder || []).indexOf(oldName);
    if (idx !== -1) m.folderOrder[idx] = newName;
    metaSave(m);
    if (expandedFolders.has(oldName)) { expandedFolders.delete(oldName); expandedFolders.add(newName); }
    renderList();
  }
  
  function showFolderDropdown(folderName, anchorEl) {
    parent$('.psm-folder-dropdown', parentDoc).remove();
  
    const meta        = metaLoad();
    const inAnyFolder = new Set(Object.values(meta.folders).flatMap(f => f.presets || []));
    const available   = allPresetNames().filter(p => p !== 'in_use' && !inAnyFolder.has(p));
  
    if (!available.length) { showToast('All presets already in folders'); return; }
  
    const $drop = $('<div/>', { class: 'psm-folder-dropdown' });
    available.forEach(pn => {
      $drop.append($('<div/>', { class: 'psm-fd-item', 'data-move': pn }).text(pn));
    });
  
    const rect = anchorEl.getBoundingClientRect();
    parent$('body', parentDoc).append($drop);
    const dw = $drop[0].offsetWidth, dh = $drop[0].offsetHeight;
    const vw = window.parent.innerWidth,  vh = window.parent.innerHeight;
    let top  = rect.bottom + 4, left = rect.left;
    if (left + dw > vw - 8) left = Math.max(8, vw - dw - 8);
    if (top  + dh > vh - 8) top  = Math.max(8, rect.top - dh - 4);
    $drop.css({ top: top + 'px', left: left + 'px' });
  
    $drop.find('[data-move]').on('click', function() {
      const pn = attr(this, 'move');
      const m  = metaLoad();
      Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(x => x !== pn); });
      if (!m.folders[folderName]) m.folders[folderName] = { presets: [] };
      m.folders[folderName].presets.push(pn);
      metaSave(m);
      $drop.remove();
      renderBrowser();
    });
  
    setTimeout(() => { parent$(parentDoc).one('click', () => $drop.remove()); }, 0);
  }
  
  // ─── View 2: Preset detail ────────────────────────────────────────────────
  
  function renderDetail() {
    const db       = dbLoad();
    const active   = currentPreset();
    const pn       = detailPreset;
    const snaps    = db[pn] || {};
    const keys     = Object.keys(snaps);
    const isActive = pn === active;
  
    const activeSnap = (metaLoad().activeSnaps || {})[pn];
  
    const snapHtml = keys.length
      ? keys.map(name => {
          const s          = snaps[name];
          const cKey       = snapKey(pn, name);
          const confirming = confirmingSnaps.has(cKey);
          const deleting   = deletingSnaps.has(cKey);
          const isActiveSn = name === activeSnap;
          return `<div class="psm-snap${isActiveSn ? ' psm-snap--active' : ''}">
            <span class="psm-snap-name">${esc(name)}</span>
            <span class="psm-snap-meta">${esc(s.meta)}</span>
            ${confirming
              ? `<button class="psm-snap-apply confirming" data-confirm="${esc(name)}">Confirm</button>
                 <button class="psm-ghost psm-snap-cancel" data-cancel="${esc(name)}">Cancel</button>`
              : `<button class="psm-snap-apply" data-apply="${esc(name)}">Apply</button>`}
            ${deleting
              ? `<button class="psm-snap-del confirming" data-del-confirm="${esc(name)}">Delete?</button>
                 <button class="psm-ghost psm-snap-cancel" data-del-cancel="${esc(name)}">Cancel</button>`
              : `<button class="psm-ghost psm-snap-del" data-del="${esc(name)}" title="Delete">✕</button>`}
          </div>`;
        }).join('')
      : '<div class="psm-empty">No snapshots yet</div>';
  
    psmContentRoot().html(
      headerHtml(esc(pn), true, '<button class="psm-ghost psm-header-btn" id="psm-detail-info" title="Note">ℹ</button>') +
      `<div class="psm-body">
        ${isActive ? `<div class="psm-save-row">
          <input id="psm-snap-input" type="text" placeholder="Name this snapshot…" />
          <button id="psm-save-btn">Save</button>
        </div>` : ''}
        ${snapHtml}
        ${isActive ? `<hr class="psm-divider">
          <details class="psm-details">
            <summary>Prompt states</summary>
            <label class="psm-show-disabled"><input type="checkbox" id="psm-show-off"> show disabled</label>
            <div id="psm-prompt-list"></div>
          </details>` : ''}
      </div>`
    );
  
    if (isActive) renderPromptList(false);
    bindDetailEvents(pn, isActive);
  }
  
  function renderPromptList(showDisabled) {
    const prompts = readPrompts();
    const visible = showDisabled ? prompts : prompts.filter(p => p.enabled);
    parent$('#psm-prompt-list', parentDoc).html(
      visible.length
        ? visible.map(p =>
            `<div class="psm-prompt-row">
              <span class="psm-dot ${p.enabled ? 'on' : 'off'}"></span>
              <span class="psm-pname ${p.enabled ? 'on' : 'off'}">${esc(p.name)}</span>
            </div>`
          ).join('')
        : '<div class="psm-empty">All prompts disabled</div>'
    );
  }
  
  function bindDetailEvents(pn, isActive) {
    const $p = parent$('#psm-panel', parentDoc);
  
    $p.find('#psm-back').on('click', () => { currentView = 'browser'; renderView(); });
    $p.find('#psm-close').on('click', closePanel);
    $p.find('#psm-detail-info').on('click', () => {
      notePreset  = pn;
      currentView = 'note';
      renderView();
    });
  
    if (isActive) {
      $p.find('#psm-save-btn').on('click', () => psmSave(pn));
      $p.find('#psm-snap-input').on('keydown', e => { if (e.key === 'Enter') psmSave(pn); });
      $p.find('#psm-show-off').on('change', function() { renderPromptList(this.checked); });
      $p.find('.psm-snap-name').on('click', function() {
        $p.find('#psm-snap-input').val($(this).text());
      });
    }
  
    $p.find('[data-apply]').on('click', function() {
      confirmingSnaps.add(snapKey(pn, attr(this, 'apply')));
      renderDetail();
    });
    $p.find('[data-confirm]').on('click', function() { psmApply(pn, attr(this, 'confirm')); });
    $p.find('[data-cancel]').on('click', function() {
      confirmingSnaps.delete(snapKey(pn, attr(this, 'cancel')));
      renderDetail();
    });
    $p.find('[data-del]').on('click', function() {
      deletingSnaps.add(snapKey(pn, attr(this, 'del')));
      renderDetail();
    });
    $p.find('[data-del-confirm]').on('click', function() { psmDelete(pn, attr(this, 'del-confirm')); });
    $p.find('[data-del-cancel]').on('click', function() {
      deletingSnaps.delete(snapKey(pn, attr(this, 'del-cancel')));
      renderDetail();
    });
  }
  
  // ─── View 3: Note edit ────────────────────────────────────────────────────
  
  function renderNoteEdit() {
    const meta    = metaLoad();
    const note    = (meta.presetNotes || {})[notePreset] || '';
    const folders = Object.keys(meta.folders || {});
    const current = getFolderForPreset(notePreset) || '';
  
    const folderOpts = `<option value="">— ungrouped —</option>` +
      folders.map(f => `<option value="${esc(f)}"${f === current ? ' selected' : ''}>${esc(f)}</option>`).join('');
  
    psmContentRoot().html(
      headerHtml(esc(notePreset) + ' · note', true) +
      `<div class="psm-body">
        <label class="psm-form-label">Folder</label>
        <select class="psm-form-select" id="psm-folder-sel">${folderOpts}</select>
        <div class="psm-new-folder-row">
          <input id="psm-new-folder-input" type="text" placeholder="New folder name…" />
          <button id="psm-new-folder-btn">Create</button>
        </div>
        <label class="psm-form-label">Note</label>
        <textarea class="psm-form-textarea" id="psm-note-text">${esc(note)}</textarea>
        <div class="psm-btn-row">
          <button id="psm-note-save">Save</button>
          <button id="psm-note-cancel">Cancel</button>
        </div>
      </div>`
    );
    bindNoteEvents();
  }
  
  function bindNoteEvents() {
    const $p = parent$('#psm-panel', parentDoc);
  
    $p.find('#psm-back, #psm-note-cancel').on('click', () => {
      currentView = detailPreset ? 'detail' : 'browser';
      renderView();
    });
    $p.find('#psm-close').on('click', closePanel);
  
    $p.find('#psm-new-folder-btn').on('click', () => {
      const name = ($p.find('#psm-new-folder-input').val() || '').trim();
      if (!name) return;
      ensureFolder(name);
      renderNoteEdit();
      parent$('#psm-folder-sel', parentDoc).val(name);
    });
  
    $p.find('#psm-note-save').on('click', () => {
      const m              = metaLoad();
      const noteText       = ($p.find('#psm-note-text').val() || '').trim();
      const selectedFolder = $p.find('#psm-folder-sel').val() || '';
  
      if (!m.presetNotes) m.presetNotes = {};
      m.presetNotes[notePreset] = noteText;
  
      Object.values(m.folders).forEach(f => {
        f.presets = (f.presets || []).filter(x => x !== notePreset);
      });
      if (selectedFolder && m.folders[selectedFolder]) {
        if (!m.folders[selectedFolder].presets.includes(notePreset)) {
          m.folders[selectedFolder].presets.push(notePreset);
        }
      }
      metaSave(m);
      showToast('Note saved');
      currentView = detailPreset ? 'detail' : 'browser';
      renderView();
    });
  }
  

  // ─── toolbar.js ──────────────────────────────────────────────────

  // ─── Toast ────────────────────────────────────────────────────────────────
  
  let toastTimer;
  function showToast(msg) {
    const $t = parent$('.psm-toast', parentDoc);
    $t.text(msg).addClass('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $t.removeClass('show'), 2200);
  }
  
  // ─── SortableJS loader ────────────────────────────────────────────────────
  
  function loadSortable(cb) {
    if (window.parent.Sortable) { cb(); return; }
    const s = parentDoc.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js';
    s.onload = cb;
    s.onerror = () => ERR('Failed to load SortableJS — drag/drop will be unavailable');
    parentDoc.head.appendChild(s);
  }
  
  // ─── Initial DOM injection ────────────────────────────────────────────────
  
  function createAndInjectUI() {
    const $panel = $('<div/>', { id: 'psm-panel' });
    const $inner = $('<div/>', { id: 'psm-panel-inner' });
    const $toast = $('<div/>', { class: 'psm-toast', 'aria-live': 'polite', role: 'status' });
    $panel.append($inner).append($toast);
    parent$('body', parentDoc).append($panel);
  }
  
  // Stop pointer/focus/key bubbling so SillyTavern's AI drawer does not treat
  // interaction with PSM as an outside click / blur and auto-close.
  function bindPanelInteractionIsolation() {
    const el = parent$('#psm-panel', parentDoc)[0];
    if (!el || el.dataset.psmIsolate === '1') return;
    el.dataset.psmIsolate = '1';
    ['mousedown', 'pointerdown', 'click', 'touchstart', 'focusin', 'keydown'].forEach(type => {
      el.addEventListener(type, ev => { ev.stopPropagation(); }, false);
    });
  }
  
  // ─── Extension menu entry ─────────────────────────────────────────────────
  
  function injectExtensionMenu() {
    if (parent$('#psm-wand-item', parentDoc).length > 0) return;
    const $container = $('<div/>', { class: 'extension_container interactable', tabindex: 0 });
    const $item = $('<div/>', {
      id:       'psm-wand-item',
      class:    'list-group-item flex-container flexGap5 interactable',
      tabindex: 0,
      role:     'listitem',
      title:    'Preset State Manager',
    }).html('<div class="fa-fw fa-solid fa-sliders extensionsMenuExtensionButton"></div><span>Preset State Manager</span>');
    $container.append($item);
    parent$('#extensionsMenu', parentDoc).append($container);
    $item.on('click', () => {
      panelOpen ? closePanel() : openPanel();
    });
  }
  
  const PSM_OPENAI_PRESET_WRAP_ID = 'psm-openai-preset-shortcut-wrap';
  
  function injectOpenaiRangePresetShortcut() {
    if (parent$('#' + PSM_OPENAI_PRESET_WRAP_ID, parentDoc).length > 0) return true;
    const $rb = parent$('#range_block_openai', parentDoc);
    if (!$rb.length) return false;
    const $nth = $rb.children().eq(9);
    if (!$nth.length) return false;
    const $wrap = $('<div/>', {
      id:    PSM_OPENAI_PRESET_WRAP_ID,
      class: 'flex-container flexGap5 alignItemsCenter wide100p',
    }).css({ marginBottom: '6px' });
    const $btn = $('<button/>', {
      type:  'button',
      id:    'psm-openai-preset-shortcut-btn',
      class: 'menu_button menu_button_icon',
      title: 'Snapshots for current preset',
      html:  '<i class="fa-fw fa-solid fa-layer-group"></i>',
    });
    $btn.on('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openPanel({ openDetailForPreset: true });
    });
    $wrap.append($btn);
    $nth.prepend($wrap);
    return true;
  }
  
  function scheduleInjectOpenaiRangePresetShortcut() {
    [0, 400, 1200, 2800].forEach(ms => {
      window.parent.setTimeout(() => { injectOpenaiRangePresetShortcut(); }, ms);
    });
  }
  
  // ─── Panel open / close ───────────────────────────────────────────────────
  
  function openPanel(opts = {}) {
    panelOpen = true;
    if (opts.openDetailForPreset) {
      detailPreset = currentPreset();
      currentView  = 'detail';
    } else {
      currentView = 'browser';
    }
    parent$('#psm-panel', parentDoc).addClass('open');
    renderView();
    window.parent.requestAnimationFrame(() => {
      const panelEl = parent$('#psm-panel', parentDoc)[0];
      const saved   = posLoad();
      const pos     = saved || defaultPanelPos();
      panelEl.style.setProperty('top',  pos.top  + 'px', 'important');
      panelEl.style.setProperty('left', pos.left + 'px', 'important');
      clampPanelToViewport();
    });
  }
  
  function closePanel() {
    panelOpen      = false;
    renamingFolder = null;
    parent$('#psm-panel', parentDoc).removeClass('open');
    confirmingSnaps.clear();
    deletingSnaps.clear();
  }
  
  // ─── Header drag ──────────────────────────────────────────────────────────
  
  function bindHeaderDrag() {
    const panelEl = parent$('#psm-panel', parentDoc)[0];
  
    parent$('#psm-panel', parentDoc).on('mousedown touchstart', '.psm-header', function(e) {
      if ($(e.target).closest('button').length) return;
      const src       = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
      const startX    = src.clientX, startY = src.clientY;
      const startTop  = parseFloat(panelEl.style.top)  || 0;
      const startLeft = parseFloat(panelEl.style.left) || 0;
      let moved = false;
  
      function onMove(e) {
        const src = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
        const dx = src.clientX - startX, dy = src.clientY - startY;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
        if (!moved) return;
        const margin = 10;
        const pw = panelEl.offsetWidth, ph = panelEl.offsetHeight;
        const innerW = window.parent.innerWidth, innerH = window.parent.innerHeight;
        panelEl.style.setProperty('top',  Math.min(Math.max(margin, startTop  + dy), innerH - ph - margin) + 'px', 'important');
        panelEl.style.setProperty('left', Math.min(Math.max(margin, startLeft + dx), innerW - pw - margin) + 'px', 'important');
      }
      function onUp() {
        parent$(parentDoc).off('mousemove touchmove', onMove).off('mouseup touchend', onUp);
        if (moved) posSave(parseFloat(panelEl.style.top), parseFloat(panelEl.style.left));
      }
      parent$(parentDoc).on('mousemove touchmove', onMove).on('mouseup touchend', onUp);
    });
  }
  

  // ─── index.js ────────────────────────────────────────────────────

  // ─── Init ─────────────────────────────────────────────────────────────────
  
  function init() {
    injectStyles();
    createAndInjectUI();
    bindPanelInteractionIsolation();
    bindHeaderDrag();
    injectExtensionMenu();
    scheduleInjectOpenaiRangePresetShortcut();
  
    loadSortable(() => {
      // Register the permanent chat-ready state machine listeners.
      // These run for the lifetime of the script and track whether it is
      // safe to write — independently of any preset switch.
      initChatReadyListeners();
  
      try {
        eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
          const pn = currentPreset();
          const n  = snapCountFor(pn);
          LOG('preset changed → "' + pn + '", ' + n + ' snapshots');
          confirmingSnaps.clear();
          deletingSnaps.clear();
          if (pendingApply) {
            const { presetName, snapName } = pendingApply;
            pendingApply = null;
            const snap = (dbLoad()[presetName] || {})[snapName];
            // psmApplyStates calls waitForChatReady() internally — it will
            // block until the chat-ready state machine clears the load.
            if (snap) psmApplyStates(presetName, snapName, snap);
          }
          if (panelOpen) { currentView = 'browser'; renderView(); }
        });
      } catch(e) { ERR('eventOn failed:', e); }
  
      $(window).on('pagehide', () => {
        parent$('#psm-panel, #' + STYLE_ID + ', #psm-wand-item, #psm-openai-preset-shortcut-wrap', parentDoc).remove();
      });
  
      window.parent.addEventListener('resize', () => {
        if (panelOpen) clampPanelToViewport();
      });
  
      const n = snapCountFor(currentPreset());
      LOG('ready — preset: "' + currentPreset() + '", ' + n + ' snapshots');
    });
  }
  

  // ─── divs-store.js ───────────────────────────────────────────────

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
    if (duplicate) pdoNotify('Template saved; duplicate prompt names used the later match');
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
  

  // ─── divs-helpers.js ─────────────────────────────────────────────

  // Prompt Folders helpers. These read SillyTavern/PSM state but do not write it.
  
  const PDO_GLYPHS = {
    drag: '\u2195',
    down: '\u25BC',
    right: '\u25B6',
    remove: '\u2296',
    close: '\u00D7',
    info: '\u24D8',
    search: String.fromCodePoint(0x1F50D),
    eye: String.fromCodePoint(0x1F441),
    eyeOff: String.fromCodePoint(0x1F648),
  };
  
  const PDO_ICON_PALETTE = [
    0x1F4C1, 0x1F3AD, 0x2699, 0x1F9D9, 0x1F3B2, 0x1F4A1,
    0x1F4DA, 0x1F5C2, 0x2B50, 0x1F527, 0x1F4DD, 0x1F680,
  ].map(cp => String.fromCodePoint(cp));
  
  function pdoListEl() {
    return parentDoc.querySelector('#completion_prompt_manager_list');
  }
  
  function pdoPromptId(prompt) {
    return String(prompt?.identifier ?? prompt?.id ?? '');
  }
  
  function pdoPromptName(prompt, fallback) {
    return String(prompt?.name ?? prompt?.title ?? fallback ?? pdoPromptId(prompt));
  }
  
  function pdoPromptNameFromRow(row) {
    const nameEl = row.querySelector('[data-pm-name]');
    if (nameEl?.getAttribute('data-pm-name')) return nameEl.getAttribute('data-pm-name');
    const titleEl = row.querySelector('.prompt-manager-inspect-action, [title]');
    if (titleEl?.getAttribute('title')) return titleEl.getAttribute('title');
    return (nameEl || row).textContent.replace(/\s+/g, ' ').trim();
  }
  
  function pdoReadPromptSource() {
    try {
      const prompts = readPrompts();
      return Array.isArray(prompts) ? prompts.filter(Boolean) : [];
    } catch(e) {
      ERR('pdo readPrompts:', e);
      return [];
    }
  }
  
  function pdoReadPrompts() {
    const source = pdoReadPromptSource();
    const byId = new Map();
    source.forEach(prompt => {
      const ids = [prompt?.identifier, prompt?.id].filter(Boolean).map(String);
      ids.forEach(id => byId.set(id, prompt));
    });
  
    const list = pdoListEl();
    const rows = list ? [...list.querySelectorAll(':scope > li[data-pm-identifier]')] : [];
    const seen = new Set();
    const out = rows.map(row => {
      const id = row.getAttribute('data-pm-identifier') || '';
      const prompt = byId.get(id);
      seen.add(id);
      return {
        id,
        name: pdoPromptName(prompt, pdoPromptNameFromRow(row)),
        enabled: prompt?.enabled ?? !row.classList.contains('completion_prompt_manager_prompt_disabled'),
        marker: !!prompt?.marker || row.classList.contains('completion_prompt_manager_marker'),
      };
    }).filter(prompt => prompt.id);
  
    source.forEach(prompt => {
      const id = pdoPromptId(prompt);
      if (!id || seen.has(id)) return;
      out.push({
        id,
        name: pdoPromptName(prompt, id),
        enabled: !!prompt.enabled,
        marker: !!prompt.marker,
      });
    });
  
    return out;
  }
  
  function pdoPromptMap() {
    return new Map(pdoReadPrompts().map(prompt => [prompt.id, prompt]));
  }
  
  function pdoNameKey(name) {
    return String(name || '').trim().toLowerCase();
  }
  
  function pdoFindFolderIdByName(cfg, name) {
    const key = pdoNameKey(name);
    return Object.entries(cfg.folders || {}).find(([, folder]) => pdoNameKey(folder.name) === key)?.[0] || null;
  }
  
  function pdoNewFolderId(cfg) {
    let id;
    do {
      id = 'f-' + Math.random().toString(36).slice(2, 7).padEnd(5, '0');
    } while (cfg.folders?.[id]);
    return id;
  }
  
  function pdoMemberClass(folderId) {
    return 'pdo-member-' + folderId;
  }
  
  function pdoCollapsedClass(folderId) {
    return 'pdo-collapsed-' + folderId;
  }
  
  function pdoFolderCounts(cfg, prompts = pdoReadPrompts()) {
    const promptIds = new Set(prompts.map(prompt => prompt.id));
    const counts = {};
    Object.keys(cfg.folders || {}).forEach(id => { counts[id] = 0; });
    Object.entries(cfg.assignments || {}).forEach(([promptId, folderId]) => {
      if (promptIds.has(promptId) && counts[folderId] !== undefined) counts[folderId]++;
    });
    return counts;
  }
  
  function pdoPromptsForFolder(cfg, folderId, prompts = pdoReadPrompts()) {
    return prompts.filter(prompt => cfg.assignments[prompt.id] === folderId);
  }
  
  function pdoUnassignedPrompts(cfg, prompts = pdoReadPrompts()) {
    return prompts.filter(prompt => !cfg.assignments[prompt.id] || !cfg.folders[cfg.assignments[prompt.id]]);
  }
  
  function pdoDefaultPanelPos() {
    const panelEl = parentDoc.querySelector('#pdo-panel');
    const pw = panelEl ? panelEl.offsetWidth : 320;
    const ph = panelEl ? panelEl.offsetHeight : 420;
    return {
      top: Math.max(10, Math.round((window.parent.innerHeight - ph) / 2)),
      left: Math.max(10, Math.round((window.parent.innerWidth - pw) / 2)),
    };
  }
  
  function pdoClampPanelToViewport() {
    const panelEl = parentDoc.querySelector('#pdo-panel');
    if (!panelEl) return;
    const margin = 10;
    const pw = panelEl.offsetWidth;
    const ph = panelEl.offsetHeight;
    const top = Math.min(Math.max(margin, parseFloat(panelEl.style.top) || 0), Math.max(margin, window.parent.innerHeight - ph - margin));
    const left = Math.min(Math.max(margin, parseFloat(panelEl.style.left) || 0), Math.max(margin, window.parent.innerWidth - pw - margin));
    panelEl.style.setProperty('top', top + 'px', 'important');
    panelEl.style.setProperty('left', left + 'px', 'important');
  }
  
  function pdoNotify(msg) {
    if (typeof pdoShowToast === 'function' && parentDoc.querySelector('#pdo-panel')) {
      pdoShowToast(msg);
    } else if (window.parent.toastr?.info) {
      window.parent.toastr.info(msg);
    } else {
      LOG('Prompt Folders:', msg);
    }
  }
  
  function pdoStopBubble(el) {
    if (!el || el.dataset.pdoIsolate === '1') return;
    el.dataset.pdoIsolate = '1';
    ['mousedown', 'pointerdown', 'click', 'touchstart', 'focusin', 'keydown'].forEach(type => {
      el.addEventListener(type, ev => { ev.stopPropagation(); }, false);
    });
  }
  
  function pdoButtonHtml(cls, attrs, label, title = '') {
    const titleAttr = title ? ` title="${esc(title)}"` : '';
    return `<button type="button" class="${cls}"${titleAttr} ${attrs}>${label}</button>`;
  }
  

  // ─── divs-styles.js ──────────────────────────────────────────────

  // Prompt Folders styles, sharing PSM scale and SillyTavern theme variables.
  
  function injectDivStyles() {
    if (parent$('#' + PDO_STYLE_ID, parentDoc).length > 0) return;
  
    const b = PSM_SCALE.base;
    const px = k => `${Math.round(b * PSM_SCALE[k])}px`;
    const sp = n => `${Math.round(b * PSM_SCALE.pad * n)}px`;
    const fluid = k => {
      const hi = Math.round(b * PSM_SCALE[k]);
      const lo = Math.max(14, Math.round(hi * 0.875));
      if (lo === hi) return `${hi}px`;
      const slope = ((hi - lo) / 649 * 100).toFixed(2);
      const offset = (lo - parseFloat(slope) / 100 * 375).toFixed(2);
      return `clamp(${lo}px, ${slope}vw + ${offset}px, ${hi}px)`;
    };
  
    const bg = 'oklch(from var(--SmartThemeBlurTintColor) l c h / 1)';
    const border = 'var(--SmartThemeBorderColor)';
    const muted = 'var(--SmartThemeBodyColor)';
    const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';
  
    const css = `
      #pdo-config-btn {
        min-width: 32px !important;
      }
  
      #pdo-panel {
        position: fixed !important; z-index: 99999 !important;
        width: min(330px, calc(100vw - 24px)) !important;
        max-height: 82vh !important; overflow: hidden !important;
        display: none !important; flex-direction: column !important;
        background: ${bg} !important; border: 1px solid ${border} !important;
        border-radius: 12px !important; padding: 0 !important;
        font-size: ${fluid('body')} !important; color: ${muted} !important;
        font-family: ${bodyFont} !important; box-sizing: border-box !important;
      }
      #pdo-panel.open { display: flex !important; }
      #pdo-panel-inner {
        flex: 1 1 auto !important; min-height: 0 !important;
        display: flex !important; flex-direction: column !important;
        overflow: hidden !important;
      }
      #pdo-panel button, #pdo-panel input, #pdo-panel select {
        font-family: inherit !important; color: ${muted};
      }
      #pdo-panel input, #pdo-panel select, .pdo-row-btn, .pdo-add-folder button, .pdo-popup-actions button,
      .pdo-template-row button {
        border: 1px solid ${border}; background: ${bg}; color: ${muted};
      }
  
      .pdo-header {
        flex: 0 0 auto;
        display: flex; align-items: center; gap: ${sp(0.75)};
        padding: ${sp(1.25)} ${sp(1.5)}; border-bottom: 1px solid ${border};
        background: ${bg}; cursor: move;
      }
      .pdo-header-title {
        flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-size: ${px('label')}; font-weight: 600; text-transform: uppercase; letter-spacing: .07em;
      }
      .pdo-ghost {
        background: none !important; border: none !important; padding: ${sp(0.25)} ${sp(0.625)};
        border-radius: 4px; line-height: 1; cursor: pointer;
      }
      .pdo-header-btn { font-size: ${px('iconSm')} !important; flex: 0 0 auto; }
      .pdo-body {
        flex: 1 1 auto; min-height: 0; overflow-y: auto;
        padding: ${sp(1.25)} ${sp(1.5)}; user-select: none; -webkit-user-select: none;
      }
      #pdo-panel input, #pdo-panel select { user-select: text !important; -webkit-user-select: text !important; }
  
      #pdo-folder-list { display: flex; flex-direction: column; gap: ${sp(0.375)}; }
      .pdo-folder-block { display: block; }
      .pdo-folder-row {
        display: grid; grid-template-columns: 24px 28px 30px minmax(0, 1fr) auto 28px 34px;
        align-items: center; gap: ${sp(0.375)}; min-height: 36px;
        padding: ${sp(0.25)} 0; box-sizing: border-box;
      }
      .pdo-drag-handle {
        cursor: grab; color: ${border}; text-align: center; touch-action: none;
        font-size: ${px('body')}; line-height: 1;
      }
      .pdo-drag-handle:active { cursor: grabbing; }
      .pdo-row-btn {
        min-width: 28px; height: 28px; padding: 0; border-radius: 5px; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; line-height: 1;
        font-size: ${px('caption')} !important;
      }
      .pdo-icon-btn { font-size: ${px('body')} !important; }
      .pdo-folder-name {
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-size: ${px('label')}; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
        cursor: text;
      }
      .pdo-rename-input {
        width: 100%; min-width: 0; box-sizing: border-box; border-radius: 5px; outline: none;
        padding: ${sp(0.375)} ${sp(0.625)}; font-size: ${px('label')} !important;
        font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
      }
      .pdo-count {
        background: none !important; border: none !important; white-space: nowrap; cursor: pointer;
        padding: ${sp(0.25)} ${sp(0.375)}; font-size: ${px('caption')} !important;
      }
      .pdo-folder-del.confirming {
        width: auto; min-width: 58px; border-color: #E24B4A !important; color: #E24B4A !important;
        padding: 0 ${sp(0.5)};
      }
      .pdo-member-list {
        margin: 0 0 ${sp(0.375)} 82px; padding: ${sp(0.25)} 0 ${sp(0.5)};
        border-left: 1px solid ${border};
      }
      .pdo-member-line {
        display: grid; grid-template-columns: minmax(0, 1fr) 28px; align-items: center; gap: ${sp(0.5)};
        padding: ${sp(0.25)} 0 ${sp(0.25)} ${sp(0.75)};
        font-size: ${px('caption')};
      }
      .pdo-member-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  
      .pdo-add-folder {
        display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: ${sp(0.625)};
        margin-top: ${sp(1.25)};
      }
      .pdo-add-folder input {
        min-width: 0; box-sizing: border-box; border-radius: 6px; outline: none;
        padding: ${sp(0.625)} ${sp(1)}; font-size: ${fluid('body')} !important;
      }
      .pdo-add-folder button {
        border-radius: 6px; padding: ${sp(0.625)} ${sp(1.25)}; cursor: pointer;
        font-size: ${fluid('body')} !important; white-space: nowrap;
      }
  
      .pdo-empty {
        text-align: center; font-size: ${px('caption')}; padding: ${sp(1.25)};
        border: 1px dashed ${border}; border-radius: 6px;
      }
      .pdo-toast {
        position: absolute !important; bottom: ${sp(0.75)} !important; left: 50% !important;
        transform: translateX(-50%) !important; background: ${bg} !important; border: 1px solid ${border} !important;
        border-radius: 7px; padding: ${sp(0.75)} ${sp(1.25)}; font-size: ${px('caption')};
        color: ${muted} !important; opacity: 0; pointer-events: none; transition: opacity .2s;
        z-index: 5 !important; max-width: calc(100% - ${sp(2)}) !important; text-align: center !important;
        box-shadow: 0 2px 10px oklch(0 0 0 / 0.2);
      }
      .pdo-toast.show { opacity: 1 !important; }
  
      .pdo-popup {
        position: fixed; z-index: 100000; width: min(320px, calc(100vw - 24px));
        max-height: min(520px, calc(100vh - 24px)); overflow: hidden; display: flex; flex-direction: column;
        background: ${bg}; border: 1px solid ${border}; border-radius: 10px; color: ${muted};
        box-shadow: 0 12px 30px oklch(0 0 0 / 0.35); font-family: ${bodyFont};
      }
      .pdo-popup > .pdo-popup-header {
        display: flex; align-items: center; gap: ${sp(0.75)}; padding: ${sp(1)} ${sp(1.25)};
        border-bottom: 1px solid ${border}; font-size: ${px('label')}; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
        cursor: move; touch-action: none; user-select: none; -webkit-user-select: none; flex: 0 0 auto;
      }
      .pdo-popup-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pdo-popup-body {
        padding: ${sp(1)} ${sp(1.25)}; overflow: hidden; min-height: 0;
        display: flex; flex: 1 1 auto; flex-direction: column;
      }
      .pdo-popup-filter {
        flex: 0 0 auto;
        width: 100%; box-sizing: border-box; border-radius: 6px; outline: none;
        padding: ${sp(0.625)} ${sp(1)}; margin-bottom: ${sp(0.75)}; font-size: ${fluid('body')} !important;
      }
      #pdo-mass-list {
        min-height: 74px; overflow-y: auto; padding-right: ${sp(0.25)};
        flex: 1 1 auto; -webkit-overflow-scrolling: touch;
      }
      .pdo-prompt-choice {
        display: grid; grid-template-columns: 22px minmax(0, 1fr) auto; align-items: center; gap: ${sp(0.5)};
        padding: ${sp(0.375)} 0; font-size: ${px('caption')};
      }
      .pdo-prompt-choice-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pdo-marker {
        border: 1px solid ${border}; border-radius: 4px; padding: 1px ${sp(0.375)};
        font-size: ${px('label')}; opacity: .85;
      }
      .pdo-popup-actions, .pdo-template-row {
        display: flex; gap: ${sp(0.625)}; margin-top: ${sp(0.875)};
      }
      .pdo-popup-actions {
        flex: 0 0 auto; padding-top: ${sp(0.75)}; border-top: 1px solid ${border};
      }
      .pdo-popup-actions button, .pdo-template-row button {
        flex: 1; border-radius: 6px; padding: ${sp(0.5)} ${sp(0.75)}; cursor: pointer;
        font-size: ${px('caption')} !important; white-space: nowrap;
      }
  
      .pdo-icon-popover {
        display: grid; grid-template-columns: repeat(6, 1fr); gap: ${sp(0.375)};
        margin: ${sp(0.25)} 0 ${sp(0.75)} 82px; padding: ${sp(0.625)};
        border: 1px solid ${border}; border-radius: 8px;
      }
      .pdo-icon-popover button { font-size: ${px('body')} !important; }
      .pdo-icon-custom { grid-column: 1 / -1; width: 100%; box-sizing: border-box; }
  
      .pdo-template-panel {
        position: fixed; z-index: 100000; width: min(330px, calc(100vw - 24px));
        background: ${bg}; border: 1px solid ${border}; border-radius: 10px; color: ${muted};
        box-shadow: 0 12px 30px oklch(0 0 0 / 0.35); font-family: ${bodyFont};
      }
      .pdo-template-body { padding: ${sp(1)} ${sp(1.25)}; }
      .pdo-template-label {
        display: block; margin: ${sp(0.5)} 0; font-size: ${px('label')};
        text-transform: uppercase; letter-spacing: .06em;
      }
      .pdo-template-row input, .pdo-template-row select {
        flex: 1; min-width: 0; box-sizing: border-box; border-radius: 6px; outline: none;
        padding: ${sp(0.5)} ${sp(0.75)}; font-size: ${px('caption')} !important;
      }
      .pdo-confirm-row {
        display: flex; align-items: center; gap: ${sp(0.625)}; margin: ${sp(0.5)} 0;
        padding: ${sp(0.625)}; border: 1px solid #E24B4A; border-radius: 6px; color: #E24B4A;
        font-size: ${px('caption')};
      }
      .pdo-confirm-row span { flex: 1; min-width: 0; }
  
      .pdo-sortable-ghost { opacity: 0.35; }
      .pdo-sortable-chosen { background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.1); }
  
      .pdo-hidden-notice {
        text-align: center; font-size: ${px('caption')}; padding: ${sp(0.75)} ${sp(1)};
        margin-bottom: ${sp(0.75)};
        border: 1px dashed ${border}; border-radius: 6px;
        opacity: 0.85;
      }
  
      #completion_prompt_manager_list > .pdo-folder-header {
        display: flex !important; align-items: center !important; gap: 8px !important;
        grid-template-columns: none !important; list-style: none;
        min-height: 28px; box-sizing: border-box; padding: 4px 7.5px !important;
        border: 1px solid ${border} !important; border-radius: 4px;
        margin: 4px 0 7.5px !important;
        background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.08);
        user-select: none; -webkit-user-select: none; cursor: pointer;
        transition: background-color .12s ease;
      }
      #completion_prompt_manager_list > .pdo-folder-header:hover,
      #completion_prompt_manager_list > .pdo-folder-header:focus-visible {
        background: oklch(from var(--SmartThemeBorderColor, #ccc) l c h / 0.18);
        outline: none;
      }
      #completion_prompt_manager_list > .pdo-folder-header .pdo-native-chevron {
        display: inline-flex; align-items: center; justify-content: center;
        width: 18px; flex: 0 0 auto;
        font-size: ${px('caption')}; line-height: 1;
      }
      #completion_prompt_manager_list > .pdo-folder-header .pdo-native-icon {
        flex: 0 0 auto; font-size: ${px('body')}; line-height: 1;
      }
      #completion_prompt_manager_list > .pdo-folder-header .pdo-native-title {
        flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        font-weight: 600; font-size: ${px('caption')};
      }
      #completion_prompt_manager_list > .pdo-folder-header .pdo-native-count {
        flex: 0 0 auto; opacity: 0.75; font-size: ${px('caption')};
      }
      #completion_prompt_manager_list > li[class*="pdo-member-"] {
        transition: opacity .08s ease;
      }
  
      @media (max-width: 480px) {
        .pdo-folder-row { grid-template-columns: 22px 26px 28px minmax(0, 1fr) auto 27px 32px; }
        .pdo-member-list, .pdo-icon-popover { margin-left: 70px; }
      }
    `;
  
    parent$(parentDoc.head).append(`<style id="${PDO_STYLE_ID}">${css}</style>`);
    parent$(parentDoc.head).append(`<style id="${PDO_COLLAPSE_STYLE_ID}"></style>`);
  }
  
  function pdoUpdateCollapseRules(cfg) {
    const styleEl = parentDoc.getElementById(PDO_COLLAPSE_STYLE_ID);
    if (!styleEl) return;
    styleEl.textContent = Object.keys(cfg.folders || {}).map(folderId => {
      const c = pdoCollapsedClass(folderId);
      const m = pdoMemberClass(folderId);
      return `#completion_prompt_manager_list.${c} > .${m}{display:none!important;}`;
    }).join('\n');
  }
  

  // ─── divs-decorator.js ───────────────────────────────────────────

  // Decorates SillyTavern's native prompt list without moving native prompt rows.
  
  let pdoRepaintQueued = false;
  let pdoApplyingDecorations = false;
  
  function schedulePdoRepaint() {
    if (pdoRepaintQueued) return;
    pdoRepaintQueued = true;
    const raf = window.parent.requestAnimationFrame || window.requestAnimationFrame;
    raf(() => {
      pdoRepaintQueued = false;
      applyDecorations();
    });
  }
  
  function pdoIgnorableMutation(mutation) {
    // Treat as ignorable (don't repaint) when:
    //  (1) it originates inside one of our own header rows (chevron.textContent etc.)
    //  (2) it sits inside an individual prompt <li> — ST's own per-row updates
    //      (token counts, enabled toggles, edit states). The list-structure mutations
    //      that we DO care about (full re-render, prompt added/removed) target the
    //      list/container itself, not a prompt-row interior.
    //  (3) addedNodes are all pdo-* nodes we inserted.
    const targetEl = mutation.target?.nodeType === 1
      ? mutation.target
      : mutation.target?.parentElement;
    if (targetEl?.closest?.('.pdo-folder-header')) return true;
    if (targetEl && targetEl.id !== 'completion_prompt_manager_list'
        && targetEl.id !== 'completion_prompt_manager'
        && targetEl.closest?.('li[data-pm-identifier]')) {
      return true;
    }
    const added = [...mutation.addedNodes || []].filter(node => node.nodeType === 1);
    if (!added.length) return false;
    return added.every(node => {
      const el = /** @type {Element} */ (node);
      return [...el.classList || []].some(cls => cls.startsWith('pdo-'))
        || !!el.querySelector?.('[class*="pdo-"]');
    });
  }
  
  function pdoCleanPromptRow(row) {
    [...row.classList].forEach(cls => {
      if (cls.startsWith('pdo-member-')) row.classList.remove(cls);
    });
    row.removeAttribute('data-pdo-folder');
  }
  
  function pdoCleanListClasses(list) {
    [...list.classList].forEach(cls => {
      if (cls.startsWith('pdo-collapsed-')) list.classList.remove(cls);
    });
  }
  
  function pdoNativeHeader(folderId, folder, count, collapsed) {
    const li = parentDoc.createElement('li');
    li.className = 'pdo-folder-header pdo-folder-header-' + folderId;
    li.dataset.pdoFolder = folderId;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.innerHTML = `
      <span class="pdo-native-chevron" aria-hidden="true">${collapsed ? PDO_GLYPHS.right : PDO_GLYPHS.down}</span>
      <span class="pdo-native-icon">${esc(folder.icon || PDO_DEFAULT_ICON)}</span>
      <span class="pdo-native-title">${esc(folder.name)}</span>
      <span class="pdo-native-count">(${count})</span>
    `;
    const toggle = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const presetName = currentPreset();
      const next = !pdoIsCollapsed(presetName, folderId, folder);
      pdoSetCollapsed(presetName, folderId, next, { panel: true, repaint: false });
      const list = pdoListEl();
      if (list) list.classList.toggle(pdoCollapsedClass(folderId), next);
      const liveChevron = list?.querySelector('.pdo-folder-header-' + folderId + ' .pdo-native-chevron');
      if (liveChevron) liveChevron.textContent = next ? PDO_GLYPHS.right : PDO_GLYPHS.down;
    };
    li.addEventListener('click', toggle);
    li.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') toggle(ev);
    });
    // Prevent jQuery UI Sortable from capturing pointer events on folder headers
    ['mousedown', 'pointerdown', 'touchstart'].forEach(type => {
      li.addEventListener(type, ev => { ev.stopPropagation(); }, false);
    });
    return li;
  }
  
  function pdoManageSortable() {
    try {
      const $list = parent$('#completion_prompt_manager_list', parentDoc);
      if (!$list.length || !$list.sortable('instance')) return;
      if (pdoIsHidden()) {
        $list.sortable('enable');
      } else {
        $list.sortable('disable');
      }
    } catch (_) { /* sortable not initialized yet */ }
  }
  
  function applyDecorations() {
    const list = pdoListEl();
    if (!list) return;
  
    if (pdoIsHidden()) {
      list.querySelectorAll(':scope > .pdo-folder-header').forEach(h => h.remove());
      pdoCleanListClasses(list);
      [...list.querySelectorAll(':scope > li[data-pm-identifier]')].forEach(pdoCleanPromptRow);
      pdoManageSortable();
      return;
    }
  
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const rows = [...list.querySelectorAll(':scope > li[data-pm-identifier]')];
    const rowIds = new Set(rows.map(row => row.getAttribute('data-pm-identifier')).filter(Boolean));
    const prompts = pdoReadPrompts().filter(prompt => rowIds.has(prompt.id));
    const counts = pdoFolderCounts(cfg, prompts);
    const inserted = new Set();
  
    pdoUpdateCollapseRules(cfg);
  
    pdoApplyingDecorations = true;
    try {
      list.querySelectorAll(':scope > .pdo-folder-header').forEach(header => header.remove());
      pdoCleanListClasses(list);
      rows.forEach(pdoCleanPromptRow);
  
      cfg.folderOrder.forEach(folderId => {
        const folder = cfg.folders[folderId];
        if (!folder) return;
        const collapsed = pdoIsCollapsed(presetName, folderId, folder);
        list.classList.toggle(pdoCollapsedClass(folderId), collapsed);
      });
  
      rows.forEach(row => {
        const promptId = row.getAttribute('data-pm-identifier');
        const folderId = cfg.assignments[promptId];
        const folder = cfg.folders[folderId];
        if (!folder) return;
  
        row.classList.add(pdoMemberClass(folderId));
        row.dataset.pdoFolder = folderId;
  
        if (!inserted.has(folderId)) {
          const header = pdoNativeHeader(
            folderId,
            folder,
            counts[folderId] || 0,
            pdoIsCollapsed(presetName, folderId, folder)
          );
          list.insertBefore(header, row);
          inserted.add(folderId);
        }
      });
  
      cfg.folderOrder.forEach(folderId => {
        if (inserted.has(folderId)) return;
        const folder = cfg.folders[folderId];
        if (!folder) return;
        list.appendChild(pdoNativeHeader(
          folderId,
          folder,
          counts[folderId] || 0,
          pdoIsCollapsed(presetName, folderId, folder)
        ));
        inserted.add(folderId);
      });
      pdoManageSortable();
    } finally {
      pdoApplyingDecorations = false;
    }
  }
  
  function initPdoDecorator() {
    if (parentDoc._pdoObserver) {
      schedulePdoRepaint();
      return;
    }
  
    const root = parentDoc.querySelector('#completion_prompt_manager') || parentDoc.body;
    const observer = new window.parent.MutationObserver(mutations => {
      if (pdoApplyingDecorations) return;
      if (mutations.length && mutations.every(pdoIgnorableMutation)) return;
      schedulePdoRepaint();
    });
    observer.observe(root, { childList: true, subtree: true });
    parentDoc._pdoObserver = observer;
    schedulePdoRepaint();
  }
  

  // ─── divs-panel.js ───────────────────────────────────────────────

  // Prompt Folders panel, popovers, and inline interactions.
  
  let pdoPanelOpen = false;
  let pdoToastTimer = null;
  const pdoExpandedPanelFolders = new Set();
  const pdoDeletingFolders = new Map();
  let pdoRenamingFolder = null;
  let pdoIconPickerFolder = null;
  let pdoMassFolder = null;
  let pdoMassFilter = '';
  let pdoMassChecked = new Set();
  let pdoMassPopupPos = null;
  let pdoTemplatesOpen = false;
  let pdoTemplateConfirm = null;
  let pdoTemplateSaveName = '';
  let pdoTemplateApplyName = '';
  let pdoTemplateDeleteName = '';
  
  function pdoShowToast(msg) {
    const toast = parentDoc.querySelector('#pdo-panel .pdo-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(pdoToastTimer);
    pdoToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  
  function ensurePdoPanel() {
    let panel = parentDoc.querySelector('#pdo-panel');
    if (panel) return panel;
    panel = parentDoc.createElement('div');
    panel.id = 'pdo-panel';
    panel.innerHTML = '<div id="pdo-panel-inner"></div><div class="pdo-toast" aria-live="polite" role="status"></div>';
    parentDoc.body.appendChild(panel);
    pdoStopBubble(panel);
    bindPdoPanelDrag();
    return panel;
  }
  
  function pdoOpenPanel() {
    pdoPanelOpen = true;
    ensurePdoPanel().classList.add('open');
    renderPdoPanel();
    window.parent.requestAnimationFrame(() => {
      const panelEl = parentDoc.querySelector('#pdo-panel');
      const saved = pdoPosLoad();
      const pos = saved || pdoDefaultPanelPos();
      panelEl.style.setProperty('top', pos.top + 'px', 'important');
      panelEl.style.setProperty('left', pos.left + 'px', 'important');
      pdoClampPanelToViewport();
    });
  }
  
  function pdoClosePanel() {
    pdoPanelOpen = false;
    pdoRenamingFolder = null;
    pdoIconPickerFolder = null;
    pdoMassFolder = null;
    pdoMassPopupPos = null;
    pdoTemplatesOpen = false;
    parentDoc.querySelector('#pdo-panel')?.classList.remove('open');
    parent$('.pdo-popup, .pdo-template-panel', parentDoc).remove();
  }
  
  function pdoFolderRowHtml(presetName, cfg, folderId, prompts, counts) {
    const folder = cfg.folders[folderId];
    if (!folder) return '';
    const expanded = pdoExpandedPanelFolders.has(folderId);
    const renaming = pdoRenamingFolder === folderId;
    const deleting = pdoDeletingFolders.has(folderId);
    const members = pdoPromptsForFolder(cfg, folderId, prompts);
    const count = counts[folderId] || 0;
  
    const memberHtml = expanded ? `<div class="pdo-member-list" data-folder-members="${esc(folderId)}">${
      members.length ? members.map(prompt => `
        <div class="pdo-member-line">
          <span class="pdo-member-name">${esc(prompt.name)}</span>
          ${pdoButtonHtml('pdo-row-btn pdo-unassign', `data-pdo-unassign="${esc(prompt.id)}"`, PDO_GLYPHS.remove, 'Remove from folder')}
        </div>
      `).join('') : '<div class="pdo-member-line"><span class="pdo-member-name">No assigned prompts</span><span></span></div>'
    }</div>` : '';
  
    const iconPicker = pdoIconPickerFolder === folderId ? `
      <div class="pdo-icon-popover" data-icon-popover="${esc(folderId)}">
        ${PDO_ICON_PALETTE.map(icon => pdoButtonHtml('pdo-row-btn pdo-icon-choice', `data-pdo-icon-choice="${esc(icon)}"`, esc(icon), 'Use icon')).join('')}
        <input class="pdo-icon-custom" data-pdo-icon-custom="${esc(folderId)}" maxlength="8" placeholder="Custom icon" />
      </div>` : '';
  
    return `<div class="pdo-folder-block" data-folder-id="${esc(folderId)}">
      <div class="pdo-folder-row">
        <span class="pdo-drag-handle" title="Drag to reorder">${PDO_GLYPHS.drag}</span>
        ${pdoButtonHtml('pdo-row-btn pdo-collapse-btn', `data-pdo-panel-expand="${esc(folderId)}"`, expanded ? PDO_GLYPHS.down : PDO_GLYPHS.right, expanded ? 'Hide folder prompts' : 'Show folder prompts')}
        ${pdoButtonHtml('pdo-row-btn pdo-icon-btn', `data-pdo-icon="${esc(folderId)}"`, esc(folder.icon || PDO_DEFAULT_ICON), 'Change icon')}
        ${renaming
          ? `<input class="pdo-rename-input" data-pdo-rename="${esc(folderId)}" value="${esc(folder.name)}" />`
          : `<span class="pdo-folder-name" data-pdo-rename-start="${esc(folderId)}">${esc(folder.name)}</span>`}
        <span class="pdo-count" title="Prompts in this folder">(${count})</span>
        ${pdoButtonHtml('pdo-row-btn pdo-add-prompts', `data-pdo-mass="${esc(folderId)}"`, '+', 'Add prompts')}
        ${pdoButtonHtml('pdo-row-btn pdo-folder-del' + (deleting ? ' confirming' : ''), `data-pdo-delete="${esc(folderId)}"`, deleting ? 'Sure? ' + PDO_GLYPHS.close : PDO_GLYPHS.close, 'Delete folder')}
      </div>
      ${iconPicker}
      ${memberHtml}
    </div>`;
  }
  
  function renderPdoPanel() {
    if (!pdoPanelOpen) return;
    const panel = ensurePdoPanel();
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const prompts = pdoReadPrompts();
    const counts = pdoFolderCounts(cfg, prompts);
    const folderHtml = cfg.folderOrder.length
      ? cfg.folderOrder.map(folderId => pdoFolderRowHtml(presetName, cfg, folderId, prompts, counts)).join('')
      : '<div class="pdo-empty">No folders yet</div>';
  
    const hidden = pdoIsHidden();
    const hiddenBanner = hidden
      ? '<div class="pdo-hidden-notice">Folders hidden — drag reorder enabled in prompt list</div>'
      : '';
  
    panel.querySelector('#pdo-panel-inner').innerHTML = `
      <div class="pdo-header">
        <span class="pdo-header-title">Prompt Folders &middot; ${esc(presetName)}</span>
        ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-hide-toggle"', hidden ? PDO_GLYPHS.eyeOff : PDO_GLYPHS.eye, hidden ? 'Show folders in prompt list' : 'Hide folders from prompt list')}
        ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-templates-btn"', PDO_GLYPHS.info, 'Templates')}
        ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-close"', PDO_GLYPHS.close, 'Close')}
      </div>
      <div class="pdo-body">
        ${hiddenBanner}
        <div id="pdo-folder-list">${folderHtml}</div>
        <div class="pdo-add-folder">
          <input id="pdo-new-folder-input" type="text" placeholder="New folder name..." />
          <button id="pdo-new-folder-btn" type="button">Add</button>
        </div>
      </div>`;
  
    bindPdoPanelEvents();
    initPdoFolderSortable();
    if (pdoRenamingFolder) {
      const input = panel.querySelector('.pdo-rename-input');
      if (input) { input.focus(); input.select(); }
    }
    if (pdoMassFolder) renderPdoMassPopup();
    else parent$('.pdo-popup', parentDoc).remove();
    if (pdoTemplatesOpen) renderPdoTemplatesPopover();
    else parent$('.pdo-template-panel', parentDoc).remove();
  }
  
  function bindPdoPanelEvents() {
    const $p = parent$('#pdo-panel', parentDoc);
    $p.find('#pdo-close').on('click', pdoClosePanel);
    $p.find('#pdo-hide-toggle').on('click', function() {
      pdoSetHidden(!pdoIsHidden());
      renderPdoPanel();
    });
    $p.find('#pdo-templates-btn').on('click', function(e) {
      e.stopPropagation();
      pdoTemplatesOpen = !pdoTemplatesOpen;
      pdoTemplateConfirm = null;
      renderPdoPanel();
    });
  
    $p.find('#pdo-new-folder-btn').on('click', () => {
      const input = parentDoc.querySelector('#pdo-new-folder-input');
      const name = input?.value.trim() || '';
      if (!name) { input?.focus(); return; }
      const id = pdoCreateFolder(currentPreset(), name);
      if (!id) pdoShowToast('Folder name already exists');
    });
    $p.find('#pdo-new-folder-input').on('keydown', e => {
      if (e.key === 'Enter') $p.find('#pdo-new-folder-btn').trigger('click');
    });
  
    $p.find('[data-pdo-panel-expand]').on('click', function() {
      const folderId = attr(this, 'pdo-panel-expand');
      toggleSet(pdoExpandedPanelFolders, folderId);
      renderPdoPanel();
    });
  
    $p.find('[data-pdo-icon]').on('click', function() {
      const folderId = attr(this, 'pdo-icon');
      pdoIconPickerFolder = pdoIconPickerFolder === folderId ? null : folderId;
      renderPdoPanel();
    });
    $p.find('[data-pdo-icon-choice]').on('click', function() {
      if (!pdoIconPickerFolder) return;
      pdoSetFolderIcon(currentPreset(), pdoIconPickerFolder, attr(this, 'pdo-icon-choice'));
      pdoIconPickerFolder = null;
    });
    $p.find('[data-pdo-icon-custom]').on('keydown blur', function(e) {
      if (e.type === 'keydown' && e.key !== 'Enter') return;
      const val = $(this).val();
      if (val) pdoSetFolderIcon(currentPreset(), attr(this, 'pdo-icon-custom'), val);
      pdoIconPickerFolder = null;
    }).on('click', e => e.stopPropagation());
  
    $p.find('[data-pdo-rename-start]').on('dblclick', function() {
      pdoRenamingFolder = attr(this, 'pdo-rename-start');
      renderPdoPanel();
    });
    $p.find('[data-pdo-rename]').on('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const ok = pdoRenameFolder(currentPreset(), attr(this, 'pdo-rename'), $(this).val());
        if (!ok) pdoShowToast('Folder name already exists');
        pdoRenamingFolder = null;
      }
      if (e.key === 'Escape') { pdoRenamingFolder = null; renderPdoPanel(); }
    }).on('blur', function() {
      if (!pdoRenamingFolder) return;
      const ok = pdoRenameFolder(currentPreset(), attr(this, 'pdo-rename'), $(this).val());
      if (!ok) pdoShowToast('Folder name already exists');
      pdoRenamingFolder = null;
    }).on('click', e => e.stopPropagation());
  
    $p.find('[data-pdo-unassign]').on('click', function() {
      pdoUnassignPrompt(currentPreset(), attr(this, 'pdo-unassign'));
    });
    $p.find('[data-pdo-mass]').on('click', function() {
      pdoMassFolder = attr(this, 'pdo-mass');
      pdoMassFilter = '';
      pdoMassChecked = new Set();
      pdoMassPopupPos = null;
      renderPdoPanel();
    });
  
    $p.find('[data-pdo-delete]').on('click', function() {
      const folderId = attr(this, 'pdo-delete');
      if (pdoDeletingFolders.has(folderId)) {
        clearTimeout(pdoDeletingFolders.get(folderId));
        pdoDeletingFolders.delete(folderId);
        pdoDeleteFolder(currentPreset(), folderId);
        return;
      }
      const timer = setTimeout(() => {
        pdoDeletingFolders.delete(folderId);
        renderPdoPanel();
      }, 3000);
      pdoDeletingFolders.set(folderId, timer);
      renderPdoPanel();
    });
  }
  
  function initPdoFolderSortable() {
    const listEl = parentDoc.querySelector('#pdo-folder-list');
    const Sortable = window.parent.Sortable;
    if (!listEl || !Sortable) return;
    if (listEl._pdoSortable) {
      try { listEl._pdoSortable.destroy(); } catch (_) {}
    }
    listEl._pdoSortable = Sortable.create(listEl, {
      animation: 150,
      draggable: '.pdo-folder-block',
      handle: '.pdo-drag-handle',
      ghostClass: 'pdo-sortable-ghost',
      chosenClass: 'pdo-sortable-chosen',
      onEnd() {
        const order = [...listEl.querySelectorAll(':scope > .pdo-folder-block')]
          .map(el => el.dataset.folderId).filter(Boolean);
        pdoSetFolderOrder(currentPreset(), order);
      },
    });
  }
  
  function pdoPopupPos(anchorSelector) {
    const anchor = parentDoc.querySelector(anchorSelector);
    const rect = anchor?.getBoundingClientRect();
    const top = rect ? rect.bottom + 6 : 80;
    const left = rect ? rect.left : 80;
    return { top, left };
  }
  
  function pdoClampFloatingPos(el, top, left) {
    const margin = 12;
    const maxHeight = Math.max(180, window.parent.innerHeight - margin * 2);
    el.style.maxHeight = maxHeight + 'px';
    const width = Math.min(el.offsetWidth || 320, window.parent.innerWidth - margin * 2);
    const height = Math.min(el.offsetHeight || maxHeight, maxHeight);
    return {
      top: Math.min(Math.max(margin, top), Math.max(margin, window.parent.innerHeight - height - margin)),
      left: Math.min(Math.max(margin, left), Math.max(margin, window.parent.innerWidth - width - margin)),
    };
  }
  
  function pdoPlaceFloatingEl(el, pos) {
    const next = pdoClampFloatingPos(el, pos.top, pos.left);
    el.style.top = next.top + 'px';
    el.style.left = next.left + 'px';
    return next;
  }
  
  function bindPdoFloatingDrag(el, handleSelector, onMoved) {
    if (!el || el.dataset.pdoFloatingDrag === '1') return;
    el.dataset.pdoFloatingDrag = '1';
    parent$(el).on('mousedown touchstart', handleSelector, function(e) {
      if (parent$(e.target).closest('button, input, select, label').length) return;
      const src = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
      const startX = src.clientX;
      const startY = src.clientY;
      const startTop = parseFloat(el.style.top) || 0;
      const startLeft = parseFloat(el.style.left) || 0;
      let moved = false;
  
      function onMove(ev) {
        const raw = ev.originalEvent || ev;
        const p = raw.touches ? raw.touches[0] : raw;
        const dx = p.clientX - startX;
        const dy = p.clientY - startY;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
        if (!moved) return;
        if (ev.cancelable) ev.preventDefault();
        const next = pdoPlaceFloatingEl(el, { top: startTop + dy, left: startLeft + dx });
        if (onMoved) onMoved(next);
      }
  
      function onUp() {
        parentDoc.removeEventListener('mousemove', onMove);
        parentDoc.removeEventListener('touchmove', onMove);
        parentDoc.removeEventListener('mouseup', onUp);
        parentDoc.removeEventListener('touchend', onUp);
        parentDoc.removeEventListener('touchcancel', onUp);
      }
  
      parentDoc.addEventListener('mousemove', onMove);
      parentDoc.addEventListener('touchmove', onMove, { passive: false });
      parentDoc.addEventListener('mouseup', onUp);
      parentDoc.addEventListener('touchend', onUp);
      parentDoc.addEventListener('touchcancel', onUp);
    });
  }
  
  function renderPdoMassPopup() {
    parent$('.pdo-popup', parentDoc).remove();
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const folder = cfg.folders[pdoMassFolder];
    if (!folder) { pdoMassFolder = null; pdoMassPopupPos = null; return; }
    const filter = pdoMassFilter.trim().toLowerCase();
    const unassigned = pdoUnassignedPrompts(cfg);
    const visible = unassigned.filter(prompt => !filter || prompt.name.toLowerCase().includes(filter));
    const pos = pdoMassPopupPos || pdoPopupPos(`[data-pdo-mass="${pdoMassFolder}"]`);
  
    const popup = parentDoc.createElement('div');
    popup.className = 'pdo-popup';
    popup.style.top = Math.max(12, pos.top) + 'px';
    popup.style.left = Math.max(12, pos.left) + 'px';
    popup.innerHTML = `
      <div class="pdo-popup-header">
        <span class="pdo-popup-title">Add to &middot; ${esc(folder.icon)} ${esc(folder.name)}</span>
        ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-mass-close"', PDO_GLYPHS.close, 'Close')}
      </div>
      <div class="pdo-popup-body">
        <input class="pdo-popup-filter" id="pdo-mass-filter" value="${esc(pdoMassFilter)}" placeholder="${esc(PDO_GLYPHS.search)} filter..." />
        <div id="pdo-mass-list">${
          visible.length ? visible.map(prompt => `
            <label class="pdo-prompt-choice">
              <input type="checkbox" data-pdo-check="${esc(prompt.id)}"${pdoMassChecked.has(prompt.id) ? ' checked' : ''} />
              <span class="pdo-prompt-choice-name">${esc(prompt.name)}</span>
              ${prompt.marker ? '<span class="pdo-marker">marker</span>' : '<span></span>'}
            </label>`).join('') : '<div class="pdo-empty">No unassigned prompts</div>'
        }</div>
        <div class="pdo-popup-actions">
          <button id="pdo-select-visible" type="button">Select all</button>
          <button id="pdo-mass-add" type="button">Add</button>
          <button id="pdo-mass-cancel" type="button">Cancel</button>
        </div>
        </div>`;
    parentDoc.body.appendChild(popup);
    pdoMassPopupPos = pdoPlaceFloatingEl(popup, pos);
    bindPdoFloatingDrag(popup, '.pdo-popup-header', next => { pdoMassPopupPos = next; });
    pdoStopBubble(popup);
  
    parent$('#pdo-mass-filter', parentDoc).on('input', function() {
      pdoMassFilter = $(this).val();
      renderPdoMassPopup();
    }).trigger('focus');
    parent$('[data-pdo-check]', popup).on('change', function() {
      const id = attr(this, 'pdo-check');
      this.checked ? pdoMassChecked.add(id) : pdoMassChecked.delete(id);
    });
    parent$('#pdo-select-visible', popup).on('click', () => {
      const allSelected = visible.length && visible.every(prompt => pdoMassChecked.has(prompt.id));
      visible.forEach(prompt => allSelected ? pdoMassChecked.delete(prompt.id) : pdoMassChecked.add(prompt.id));
      renderPdoMassPopup();
    });
    parent$('#pdo-mass-add', popup).on('click', () => {
      pdoAssignPrompts(presetName, pdoMassFolder, [...pdoMassChecked]);
      pdoMassFolder = null;
      pdoMassChecked = new Set();
      pdoMassPopupPos = null;
    });
    parent$('#pdo-mass-close, #pdo-mass-cancel', popup).on('click', () => {
      pdoMassFolder = null;
      pdoMassChecked = new Set();
      pdoMassPopupPos = null;
      renderPdoPanel();
    });
  }
  
  function renderPdoTemplatesPopover() {
    parent$('.pdo-template-panel', parentDoc).remove();
    const templates = Object.keys(pdoDbLoad().templates || {}).sort((a, b) => a.localeCompare(b));
    if (!pdoTemplateApplyName && templates.length) pdoTemplateApplyName = templates[0];
    if (!pdoTemplateDeleteName && templates.length) pdoTemplateDeleteName = templates[0];
    const pos = pdoPopupPos('#pdo-templates-btn');
    const panel = parentDoc.createElement('div');
    panel.className = 'pdo-template-panel';
    panel.style.top = Math.max(12, pos.top) + 'px';
    panel.style.left = Math.max(12, pos.left) + 'px';
    const confirm = pdoTemplateConfirm ? `
      <div class="pdo-confirm-row">
        <span>${esc(pdoTemplateConfirm.label)}</span>
        <button type="button" id="pdo-template-confirm-yes">Yes</button>
        <button type="button" id="pdo-template-confirm-cancel">Cancel</button>
      </div>` : '';
  
    const opts = templates.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
    panel.innerHTML = `
      <div class="pdo-popup-header">
        <span class="pdo-popup-title">Templates</span>
        ${pdoButtonHtml('pdo-ghost pdo-header-btn', 'id="pdo-template-close"', PDO_GLYPHS.close, 'Close')}
      </div>
      <div class="pdo-template-body">
        ${confirm}
        <label class="pdo-template-label">Save current preset</label>
        <div class="pdo-template-row">
          <input id="pdo-template-save-name" value="${esc(pdoTemplateSaveName)}" placeholder="Name..." />
          <button id="pdo-template-save" type="button">Save</button>
        </div>
        <label class="pdo-template-label">Apply template</label>
        <div class="pdo-template-row">
          <select id="pdo-template-apply">${opts}</select>
          <button id="pdo-template-replace" type="button">Apply</button>
        </div>
        <label class="pdo-template-label">Delete template</label>
        <div class="pdo-template-row">
          <select id="pdo-template-delete">${opts}</select>
          <button id="pdo-template-delete-btn" type="button">Delete</button>
        </div>
      </div>`;
    parentDoc.body.appendChild(panel);
    pdoStopBubble(panel);
    parent$('#pdo-template-apply', panel).val(pdoTemplateApplyName);
    parent$('#pdo-template-delete', panel).val(pdoTemplateDeleteName);
  
    parent$('#pdo-template-close', panel).on('click', () => {
      pdoTemplatesOpen = false;
      pdoTemplateConfirm = null;
      renderPdoPanel();
    });
    parent$('#pdo-template-save-name', panel).on('input', function() { pdoTemplateSaveName = $(this).val(); });
    parent$('#pdo-template-apply', panel).on('change', function() { pdoTemplateApplyName = $(this).val(); });
    parent$('#pdo-template-delete', panel).on('change', function() { pdoTemplateDeleteName = $(this).val(); });
  
    parent$('#pdo-template-save', panel).on('click', () => {
      const name = (parent$('#pdo-template-save-name', panel).val() || '').trim();
      if (!name) return;
      if (pdoDbLoad().templates[name] && pdoTemplateConfirm?.action !== 'save') {
        pdoTemplateConfirm = { action: 'save', name, label: `Overwrite "${name}"?` };
        renderPdoTemplatesPopover();
        return;
      }
      pdoSaveTemplate(name);
      pdoTemplateSaveName = '';
      pdoTemplateConfirm = null;
      pdoShowToast('Template saved');
      renderPdoPanel();
    });
    parent$('#pdo-template-replace', panel).on('click', () => pdoAskTemplateApply());
    parent$('#pdo-template-delete-btn', panel).on('click', () => {
      const name = parent$('#pdo-template-delete', panel).val();
      if (!name) return;
      pdoTemplateConfirm = { action: 'delete', name, label: `Delete "${name}"?` };
      renderPdoTemplatesPopover();
    });
    parent$('#pdo-template-confirm-cancel', panel).on('click', () => {
      pdoTemplateConfirm = null;
      renderPdoTemplatesPopover();
    });
    parent$('#pdo-template-confirm-yes', panel).on('click', () => {
      const c = pdoTemplateConfirm;
      if (!c) return;
      if (c.action === 'save') pdoSaveTemplate(c.name);
      if (c.action === 'replace') pdoApplyTemplate(c.name);
      if (c.action === 'delete') pdoDeleteTemplate(c.name);
      pdoTemplateConfirm = null;
      pdoShowToast('Template updated');
      renderPdoPanel();
    });
  }
  
  function pdoAskTemplateApply() {
    const name = parent$('#pdo-template-apply', parentDoc).val();
    if (!name) return;
    pdoTemplateConfirm = {
      action: 'replace',
      name,
      label: `Apply "${name}" — replace current folders?`,
    };
    renderPdoTemplatesPopover();
  }
  
  function bindPdoPanelDrag() {
    const panelEl = parentDoc.querySelector('#pdo-panel');
    if (!panelEl || panelEl.dataset.pdoDrag === '1') return;
    panelEl.dataset.pdoDrag = '1';
    parent$('#pdo-panel', parentDoc).on('mousedown touchstart', '.pdo-header', function(e) {
      if ($(e.target).closest('button, input, select').length) return;
      const src = e.originalEvent?.touches ? e.originalEvent.touches[0] : e;
      const startX = src.clientX;
      const startY = src.clientY;
      const startTop = parseFloat(panelEl.style.top) || 0;
      const startLeft = parseFloat(panelEl.style.left) || 0;
      let moved = false;
      function onMove(ev) {
        const p = ev.originalEvent?.touches ? ev.originalEvent.touches[0] : ev;
        const dx = p.clientX - startX;
        const dy = p.clientY - startY;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
        if (!moved) return;
        const margin = 10;
        const pw = panelEl.offsetWidth;
        const ph = panelEl.offsetHeight;
        panelEl.style.setProperty('top', Math.min(Math.max(margin, startTop + dy), window.parent.innerHeight - ph - margin) + 'px', 'important');
        panelEl.style.setProperty('left', Math.min(Math.max(margin, startLeft + dx), window.parent.innerWidth - pw - margin) + 'px', 'important');
      }
      function onUp() {
        parent$(parentDoc).off('mousemove.pdodrag touchmove.pdodrag', onMove).off('mouseup.pdodrag touchend.pdodrag', onUp);
        if (moved) pdoPosSave(parseFloat(panelEl.style.top), parseFloat(panelEl.style.left));
      }
      parent$(parentDoc).on('mousemove.pdodrag touchmove.pdodrag', onMove).on('mouseup.pdodrag touchend.pdodrag', onUp);
    });
  }
  

  // ─── divs-toolbar.js ─────────────────────────────────────────────

  // Prompt Folders toolbar button beside the PSM OpenAI preset shortcut.
  
  function injectPdoConfigButton() {
    if (parent$('#pdo-config-btn', parentDoc).length > 0) return true;
    const $wrap = parent$('#psm-openai-preset-shortcut-wrap', parentDoc);
    if (!$wrap.length) return false;
    const $btn = $('<button/>', {
      type: 'button',
      id: 'pdo-config-btn',
      class: 'menu_button menu_button_icon',
      title: 'Prompt folders for current preset',
      html: '<i class="fa-fw fa-solid fa-folder-tree"></i>',
    });
    $btn.on('click', e => {
      e.preventDefault();
      e.stopPropagation();
      pdoPanelOpen ? pdoClosePanel() : pdoOpenPanel();
    });
    $wrap.append($btn);
    return true;
  }
  
  function scheduleInjectPdoToolbar() {
    [0, 300, 800, 1600, 3200, 5200].forEach(ms => {
      window.parent.setTimeout(() => { injectPdoConfigButton(); }, ms);
    });
  }
  

  // ─── divs-index.js ───────────────────────────────────────────────

  // Prompt Folders bootstrap.
  
  function initDivs() {
    if (parentDoc._pdoObserver) {
      scheduleInjectPdoToolbar();
      schedulePdoRepaint();
      return;
    }
  
    injectDivStyles();
    initPdoDecorator();
    scheduleInjectPdoToolbar();
  
    try {
      eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
        pdoMassFolder = null;
        pdoTemplateConfirm = null;
        if (pdoPanelOpen) renderPdoPanel();
        schedulePdoRepaint();
      });
    } catch(e) { ERR('pdo eventOn failed:', e); }
  
    window.parent.addEventListener('resize', () => {
      if (pdoPanelOpen) pdoClampPanelToViewport();
    });
  
    $(window).on('pagehide', () => {
      try { parentDoc._pdoObserver?.disconnect(); } catch (_) {}
      delete parentDoc._pdoObserver;
      parent$('#pdo-config-btn, #pdo-panel, #' + PDO_STYLE_ID + ', #' + PDO_COLLAPSE_STYLE_ID, parentDoc).remove();
      parent$('.pdo-popup, .pdo-template-panel', parentDoc).remove();
    });
  
    LOG('Prompt Folders ready');
  }
  
  setTimeout(initDivs, 800);
  
  if (!PSM_ALREADY_LOADED) {
    setTimeout(init, 500);
  } else {
    LOG('PSM chrome already exists; skipped duplicate PSM init');
  }
})();
