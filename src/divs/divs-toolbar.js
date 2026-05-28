// Prompt Folders toolbar button beside the PSM OpenAI preset shortcut.

function injectPdoConfigButton() {
  if (parent$('#pdo-config-btn', parentDoc).length > 0) return true;
  const $wrap = parent$('#psm-openai-preset-shortcut-wrap', parentDoc);
  if (!$wrap.length) return false;
  const $btn = $('<button/>', {
    type: 'button',
    id: 'pdo-config-btn',
    class: 'menu_button menu_button_icon',
    title: psmT('folders_shortcut_title'),
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
