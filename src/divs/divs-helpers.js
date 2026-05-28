// Prompt Folders helpers. These read SillyTavern/PSM state but do not write it.

const PDO_GLYPHS = {
  drag: '\u2195',
  down: '\u25BC',
  right: '\u25B6',
  remove: '\u2296',
  close: '\u00D7',
  info: '\u24D8',
  search: String.fromCodePoint(0x1F50D),
  eye: String.fromCodePoint(0x1F441, 0xFE0E),
  eyeOff: String.fromCodePoint(0x1F6AB,0xFE0E),
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
