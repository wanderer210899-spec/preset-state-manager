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
