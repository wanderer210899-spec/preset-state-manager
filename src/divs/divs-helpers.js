// Prompt Folders helpers. These read SillyTavern/PSM state but do not write it.

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

function pdoStopBubble(el) {
  if (!el || el.dataset.pdoIsolate === '1') return;
  el.dataset.pdoIsolate = '1';
  ['mousedown', 'pointerdown', 'click', 'touchstart', 'focusin', 'keydown'].forEach(type => {
    el.addEventListener(type, ev => { ev.stopPropagation(); }, false);
  });
}
