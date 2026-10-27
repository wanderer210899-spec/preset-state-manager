(() => {
  const ERR = (...a) => console.error('[PSM ERROR]', ...a);
  const LOG = (...a) => console.log('[PSM]', ...a);

  let parentDoc, parent$;
  try {
    parentDoc = window.parent.document;
    parent$   = window.parent.$;
  } catch(e) { ERR('Failed to access parent:', e); return; }

  const PSM_ALREADY_LOADED = parent$('#psm-panel, #psm-wand-item, #psm-entry-row', parentDoc).length > 0;

  // ─── i18n.js ─────────────────────────────────────────────────────

  // ─── Localization ─────────────────────────────────────────────────────────
  // Matches SillyTavern's configured UI language for visible labels only.
  // Detection: getContext().getCurrentLocale() (lowercased, e.g. 'zh-cn'),
  // falling back to <html lang>, the 'language' localStorage key, then navigator.
  // Any locale starting with 'zh' uses the Simplified Chinese set; everything
  // else falls back to English.
  
  function psmDetectLang() {
    let loc = '';
    try { loc = window.parent.SillyTavern?.getContext?.()?.getCurrentLocale?.() || ''; } catch (_) {}
    if (!loc) { try { loc = window.parent.document.documentElement.lang || ''; } catch (_) {} }
    if (!loc) { try { loc = window.parent.localStorage.getItem('language') || ''; } catch (_) {} }
    if (!loc) { try { loc = navigator.language || ''; } catch (_) {} }
    return String(loc).toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }
  
  const PSM_LANG = psmDetectLang();
  
  const PSM_I18N = {
    // ── Common ──────────────────────────────────────────────────────────────
    close:            { en: 'Close',    zh: '关闭' },
    cancel:           { en: 'Cancel',   zh: '取消' },
    save:             { en: 'Save',     zh: '保存' },
    add:              { en: 'Add',      zh: '添加' },
    apply:            { en: 'Apply',    zh: '应用' },
    del:              { en: 'Delete',   zh: '删除' },
    rename:           { en: 'Rename',   zh: '重命名' },
    create:           { en: 'Create',   zh: '创建' },
    edit:             { en: 'Edit',     zh: '编辑' },
    done:             { en: 'Done',     zh: '完成' },
    back:             { en: 'Back',     zh: '返回' },
    use:              { en: 'Use',      zh: '使用' },
    replace:          { en: 'Replace',  zh: '替换' },
    overwrite:        { en: 'Overwrite', zh: '覆盖' },
    confirm_btn:      { en: 'Confirm',  zh: '确认' },
    try_again:        { en: 'Try again', zh: '重试' },
    more:             { en: 'More',     zh: '更多' },
    marker:           { en: 'marker',   zh: '标记' },
    settings:         { en: 'Settings', zh: '设置' },
    dismiss:          { en: 'Dismiss message', zh: '关闭提示' },
    drag_move:        { en: 'Drag to move', zh: '拖动以移动' },
    drag_reorder:     { en: 'Drag to reorder', zh: '拖动以排序' },
    drag_reorder_move:{ en: 'Drag to reorder or move', zh: '拖动以排序或移动' },
    folder_actions:   { en: 'Folder actions', zh: '文件夹操作' },
    actions_for:      { en: 'Actions for folder {0}', zh: '文件夹“{0}”的操作' },
    n_of_m:           { en: '{0} of {1}', zh: '{0}/{1}' },
    folder_name:      { en: 'Folder name', zh: '文件夹名称' },
    new_folder:       { en: 'New folder', zh: '新建文件夹' },
    delete_folder:    { en: 'Delete folder', zh: '删除文件夹' },
    del_folder_q:     { en: 'Delete folder “{0}”?', zh: '删除文件夹“{0}”？' },
    toast_folder_exists: { en: 'Folder name already exists', zh: '文件夹名称已存在' },
  
    // ── Entry points ────────────────────────────────────────────────────────
    brand:            { en: 'Preset State Manager', zh: '预设状态管理器' },
    entry_snapshots:  { en: 'Snapshots', zh: '快照' },
    tab_presets:      { en: 'Presets', zh: '预设' },
    tab_folders:      { en: 'Prompt folders', zh: '提示词文件夹' },
  
    // ── Presets: list ───────────────────────────────────────────────────────
    filter_presets:   { en: 'Filter presets', zh: '筛选预设' },
    clear_filter:     { en: 'Clear filter', zh: '清除筛选' },
    active:           { en: 'Active', zh: '当前' },
    active_sr:        { en: '(active)', zh: '（当前）' },
    open_active:      { en: 'Open the active preset', zh: '打开当前预设' },
    no_preset_folders: { en: 'No preset folders yet.', zh: '还没有预设文件夹。' },
    add_presets:      { en: 'Add presets', zh: '添加预设' },
    folder_empty:     { en: 'Empty', zh: '空' },
    ungrouped:        { en: 'Ungrouped', zh: '未分组' },
    no_presets_match: { en: 'No presets match “{0}”.', zh: '没有匹配“{0}”的预设。' },
    no_presets:       { en: 'No presets found', zh: '未找到预设' },
    show_note:        { en: 'Show note', zh: '显示备注' },
    show_note_for:    { en: 'Show note for {0}', zh: '显示“{0}”的备注' },
    edit_note:        { en: 'Edit note', zh: '编辑备注' },
    open_snapshots:   { en: 'Open', zh: '打开' },
    open_x:           { en: 'Open {0}', zh: '打开“{0}”' },
    del_folder_body:   { en: 'Its presets become ungrouped.', zh: '其中的预设将变为未分组。' },
  
    // ── Presets: preset page ────────────────────────────────────────────────
    back_all:         { en: 'Back to all presets', zh: '返回预设列表' },
    active_preset:    { en: 'Active preset', zh: '当前预设' },
    folder_label:     { en: 'Folder', zh: '文件夹' },
    note_label:       { en: 'Note', zh: '备注' },
    add_note:         { en: 'Add note', zh: '添加备注' },
    save_note:        { en: 'Save note', zh: '保存备注' },
    toast_note_saved: { en: 'Note saved', zh: '备注已保存' },
    snapshots_lbl:    { en: 'Snapshots', zh: '快照' },
    name_snapshot_ph: { en: 'Name this snapshot…', zh: '为此快照命名…' },
    new_snap_name:    { en: 'New snapshot name', zh: '新快照名称' },
    replace_dots:     { en: 'Replace…', zh: '替换…' },
    replace_q:        { en: 'Replace “{0}”?', zh: '替换“{0}”？' },
    switch_to:        { en: 'Switch to this preset', zh: '切换到此预设' },
    reset_saved:      { en: 'Reset to saved state', zh: '恢复到已保存状态' },
    reset_saved_q:    { en: 'Reset to saved state?', zh: '恢复到已保存状态？' },
    reset_saved_body: { en: 'Unsaved on/off changes are lost.', zh: '未保存的开关更改会丢失。' },
    reset_btn:        { en: 'Reset', zh: '恢复' },
    resetting_wait:   { en: 'Resetting… waiting for the chat to load', zh: '正在恢复…等待聊天加载' },
    switching_wait:   { en: 'Switching… waiting for the chat to load', zh: '正在切换…等待聊天加载' },
    resetting_wait_s: { en: 'Resetting… waiting for the chat', zh: '正在恢复…等待聊天' },
    switching_wait_s: { en: 'Switching… waiting for the chat', zh: '正在切换…等待聊天' },
    last_applied:     { en: 'Last applied', zh: '上次应用' },
    applying:         { en: 'Applying', zh: '应用中' },
    more_for:         { en: 'More actions for {0}', zh: '“{0}”的更多操作' },
    replace_current:  { en: 'Replace with current on/off', zh: '用当前开关状态替换' },
    replace_cur_q:    { en: 'Replace “{0}” with current on/off?', zh: '用当前开关状态替换“{0}”？' },
    apply_q:          { en: 'Apply “{0}”?', zh: '应用“{0}”？' },
    apply_other:      { en: 'Switches to this preset first. The chat may reload.', zh: '会先切换到此预设。聊天可能会重新加载。' },
    apply_changes:    { en: 'Turns {0} on, {1} off.', zh: '将开启 {0} 个，关闭 {1} 个。' },
    apply_same:       { en: 'Nothing changes.', zh: '不会有任何变化。' },
    del_q:            { en: 'Delete “{0}”?', zh: '删除“{0}”？' },
    save_name:        { en: 'Save name', zh: '保存名称' },
    snap_name:        { en: 'Snapshot name', zh: '快照名称' },
    snap_exists:      { en: 'Name already used', zh: '名称已被使用' },
    no_snaps:         { en: 'No snapshots yet.', zh: '还没有快照。' },
    prompt_states:    { en: 'Prompt states', zh: '提示词状态' },
    include_off:      { en: 'Include off prompts', zh: '包括已关闭的提示词' },
    all_disabled:     { en: 'All prompts disabled', zh: '所有提示词均已禁用' },
    on_count:         { en: '{0}/{1} on', zh: '{0}/{1} 开启' },
    today_at:         { en: 'Today {0}', zh: '今天 {0}' },
    diff_on:          { en: '+{0}\u00a0on', zh: '+{0}\u00a0开' },
    diff_off:         { en: '−{0}\u00a0off', zh: '−{0}\u00a0关' },
    same_now:         { en: 'same as\u00a0now', zh: '与当前相同' },
  
    // ── Status strip ────────────────────────────────────────────────────────
    toast_saved:      { en: 'Saved “{0}”', zh: '已保存“{0}”' },
    toast_deleted:    { en: 'Deleted “{0}”', zh: '已删除“{0}”' },
    toast_applied:    { en: 'Applied “{0}”', zh: '已应用“{0}”' },
    toast_switched:   { en: 'Switched to {0}', zh: '已切换到 {0}' },
    toast_reset:      { en: 'Reset to saved state', zh: '已恢复到已保存状态' },
    resetting:        { en: 'Resetting', zh: '正在恢复' },
    toast_busy:       { en: 'Previous action still running. Please wait.', zh: '上一个操作仍在进行，请稍候。' },
    applying_x:       { en: 'Applying “{0}”', zh: '正在应用“{0}”' },
    switching_x:      { en: 'Switching to {0}', zh: '正在切换到 {0}' },
    renaming_x:       { en: 'Renaming to {0}', zh: '正在重命名为 {0}' },
    toast_renamed:    { en: 'Snapshots and folders moved to {0}', zh: '快照和文件夹已移到 {0}' },
    rename_move_failed: { en: 'Could not move snapshots to the new name. Browser storage may be full.', zh: '无法将快照移到新名称，浏览器存储空间可能已满。' },
    waiting_chat:     { en: 'waiting for the chat', zh: '等待聊天' },
    switch_failed:    { en: 'Could not switch preset. Nothing changed.', zh: '无法切换预设，未做任何更改。' },
    apply_failed:     { en: 'Could not apply. Nothing changed.', zh: '无法应用，未做任何更改。' },
    save_failed:      { en: 'Could not save. Browser storage may be full.', zh: '无法保存，浏览器存储空间可能已满。' },
  
    // ── Prompt folders ──────────────────────────────────────────────────────
    folders_for:      { en: 'Folders for {0}', zh: '{0} 的文件夹' },
    templates:        { en: 'Templates', zh: '模板' },
    show_headers:     { en: 'Show folders in the prompt list', zh: '在提示词列表中显示文件夹' },
    no_prompt_folders: { en: 'No prompt folders yet.', zh: '还没有提示词文件夹。' },
    new_pf_name:      { en: 'New prompt folder name', zh: '新提示词文件夹名称' },
    add_prompts:      { en: 'Add prompts', zh: '添加提示词' },
    change_icon:      { en: 'Change icon', zh: '更改图标' },
    own_emoji:        { en: 'Your own emoji', zh: '自定义表情' },
    custom_icon:      { en: 'Custom icon', zh: '自定义图标' },
    use_icon:         { en: 'Use {0}', zh: '使用 {0}' },
    n_prompts:        { en: '{0} prompts', zh: '{0} 个提示词' },
    show_in_list:     { en: 'Show in prompt list', zh: '在提示词列表中显示' },
    show_x_in_list:   { en: 'Show “{0}” in the prompt list', zh: '在提示词列表中显示“{0}”' },
    remove_from_folder:{ en: 'Remove from folder', zh: '从文件夹移除' },
    remove_x:         { en: 'Remove “{0}” from this folder', zh: '把“{0}”移出此文件夹' },
    del_pf_body:      { en: 'Its prompts stay in the list.', zh: '其中的提示词仍留在列表中。' },
    back_pf:          { en: 'Back to prompt folders', zh: '返回提示词文件夹' },
    prompt_not_found: { en: 'Prompt not in current preset', zh: '当前预设中没有该提示词' },
  
    // ── Templates ───────────────────────────────────────────────────────────
    tpl_save_lbl:     { en: 'Save current layout', zh: '保存当前布局' },
    tpl_name:         { en: 'Template name', zh: '模板名称' },
    overwrite_dots:   { en: 'Overwrite…', zh: '覆盖…' },
    tpl_over_q:       { en: 'Overwrite “{0}”?', zh: '覆盖“{0}”？' },
    saved_tpls:       { en: 'Saved templates', zh: '已保存的模板' },
    tpl_info:         { en: '{0} folders · {1} prompts', zh: '{0} 个文件夹 · {1} 个提示词' },
    tpl_apply_q:      { en: 'Replace current folders with “{0}”?', zh: '用“{0}”替换当前文件夹？' },
    del_tpl:          { en: 'Delete template', zh: '删除模板' },
    del_tpl_x:        { en: 'Delete template {0}', zh: '删除模板“{0}”' },
    del_tpl_q:        { en: 'Delete template “{0}”?', zh: '删除模板“{0}”？' },
    no_tpls:          { en: 'No templates yet.', zh: '还没有模板。' },
    toast_tpl_saved:  { en: 'Template saved', zh: '模板已保存' },
    toast_tpl_updated:{ en: 'Template updated', zh: '模板已更新' },
    notify_tpl_dup:   { en: 'Template saved; duplicate prompt names used the later match', zh: '模板已保存；重复的提示词名称使用了较后的匹配项' },
  
    // ── Add-to-folder picker ────────────────────────────────────────────────
    add_to:           { en: 'Add to “{0}”', zh: '添加到“{0}”' },
    add_to_icon:      { en: 'Add to {0} “{1}”', zh: '添加到 {0}“{1}”' },
    filter_prompts:   { en: 'Filter prompts', zh: '筛选提示词' },
    n_selected:       { en: '{0} selected', zh: '已选 {0} 个' },
    add_n:            { en: 'Add {0}', zh: '添加 {0} 个' },
    added_n:          { en: 'Added {0} to “{1}”', zh: '已添加 {0} 个到“{1}”' },
  
    // ── Settings ────────────────────────────────────────────────────────────
    tools:            { en: 'Tools', zh: '工具' },
    tool_presets:     { en: 'Snapshots & preset folders', zh: '快照和预设文件夹' },
    tool_search:      { en: 'Prompt search bar', zh: '提示词搜索栏' },
    open_from:        { en: 'Open PSM from', zh: '打开 PSM 的入口' },
    entry_drawer:     { en: 'Buttons under the preset menu', zh: '预设菜单下的按钮' },
    entry_ext:        { en: 'Extensions menu', zh: '扩展菜单' },
    backup:           { en: 'Backup', zh: '备份' },
    export_what:      { en: 'What to export', zh: '导出内容' },
    export_snapshots: { en: 'Snapshots', zh: '快照' },
    export_folders:   { en: 'Folders', zh: '文件夹' },
    export_both:      { en: 'Both', zh: '两者' },
    export:           { en: 'Export', zh: '导出' },
    import_btn:       { en: 'Import', zh: '导入' },
    import_all_body:      { en: 'Replaces snapshots, preset folders and notes.', zh: '将替换快照、预设文件夹和备注。' },
    import_snaps_body:{ en: 'Replaces snapshots.', zh: '将替换快照。' },
    import_meta_body: { en: 'Replaces preset folders and notes.', zh: '将替换预设文件夹和备注。' },
    import_q: { en: 'Overwrite with this backup?', zh: '用此备份覆盖？' },
    toast_exported:   { en: 'Exported', zh: '已导出' },
    toast_imported:   { en: 'Imported', zh: '已导入' },
    toast_invalid_backup: { en: 'Invalid backup file', zh: '备份文件无效' },
    toast_read_fail:  { en: 'Failed to read file', zh: '读取文件失败' },
    danger_zone:      { en: 'Danger zone', zh: '危险操作' },
    reset_all:        { en: 'Reset all PSM data', zh: '重置所有 PSM 数据' },
    reset_q:          { en: 'Reset all PSM data?', zh: '重置所有 PSM 数据？' },
    reset_body:       { en: 'Deletes every snapshot, preset folder and note.', zh: '删除所有快照、预设文件夹和备注。' },
    reset_ok:         { en: 'Reset everything', zh: '全部重置' },
    toast_data_reset: { en: 'Data reset', zh: '数据已重置' },
  
    // ── Bar above SillyTavern's prompt list ─────────────────────────────────
    search_prompts_short:{ en: 'Search prompts', zh: '搜索提示词' },
    search_prompts_label: { en: 'Search prompts by name or content', zh: '按名称或内容搜索提示词' },
    clear_search:     { en: 'Clear search', zh: '清除搜索' },
    collapse_all:     { en: 'Collapse all folders', zh: '折叠所有文件夹' },
    expand_all:       { en: 'Expand all folders', zh: '展开所有文件夹' },
  
    // ── Window ──────────────────────────────────────────────────────────────
    sheet_handle:     { en: 'Resize panel: drag, or tap to change size', zh: '调整面板大小：拖动，或点按切换大小' },
    drag_resize:      { en: 'Drag to resize', zh: '拖动以调整大小' },
  };
  
  function psmT(key, ...args) {
    const entry = PSM_I18N[key];
    let s = entry ? (entry[PSM_LANG] ?? entry.en ?? key) : key;
    if (args.length) {
      args.forEach((val, i) => { s = s.split('{' + i + '}').join(String(val)); });
    }
    return s;
  }
  

  // ─── store.js ────────────────────────────────────────────────────

  // ─── Constants ────────────────────────────────────────────────────────────
  
  const STORE_KEY    = 'psm_v1';
  const META_KEY     = 'psm_v1_meta';
  const POS_KEY      = 'psm_v1_pos';
  const SETTINGS_KEY = 'psm_v1_settings';
  const STYLE_ID     = 'psm-styles';
  
  // ─── Storage ──────────────────────────────────────────────────────────────
  
  function dbLoad() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
  }
  function dbSave(d) { localStorage.setItem(STORE_KEY, JSON.stringify(d)); }
  
  function metaLoad() {
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) || '{"folders":{},"presetNotes":{}}');
      if (!m.folders) m.folders = {};
      if (!m.presetNotes) m.presetNotes = {};
      // Ensure folderOrder exists for backward-compatibility
      if (!m.folderOrder) m.folderOrder = Object.keys(m.folders || {});
      return m;
    } catch { return { folders: {}, presetNotes: {}, folderOrder: [] }; }
  }
  function metaSave(m) { localStorage.setItem(META_KEY, JSON.stringify(m)); }
  
  // Desktop window place and size: { top, left } (v6+), plus { w, h } (v9).
  // Older versions read top/left only and ignore w/h.
  function posLoad() { try { return JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { return null; } }
  function posSave(patch) {
    try { localStorage.setItem(POS_KEY, JSON.stringify({ ...(posLoad() || {}), ...patch })); } catch(e) { ERR('posSave:', e); }
  }
  
  // Settings (v8): which tools and entry points show, and the export choice.
  // Missing keys fall back to the defaults, so older data needs no migration.
  const SETTINGS_DEFAULT = {
    tools:      { presets: true, folders: true, search: true },
    entries:    { drawer: true, ext: true },
    exportWhat: 'both',
  };
  
  function settingsLoad() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch { raw = {}; }
    return {
      tools:      { ...SETTINGS_DEFAULT.tools,   ...(raw.tools   || {}) },
      entries:    { ...SETTINGS_DEFAULT.entries, ...(raw.entries || {}) },
      exportWhat: ['snapshots', 'folders', 'both'].includes(raw.exportWhat) ? raw.exportWhat : 'both',
    };
  }
  function settingsSave(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
  
  // ─── View state ───────────────────────────────────────────────────────────
  
  let panelOpen           = false;
  const expandedFolders   = new Set();
  const expandedNotes     = new Set();
  let filterText          = '';
  const confirmingSnaps   = new Set();  // key = "presetName::snapName" — the one awaiting Confirm
  let pendingApply        = null;       // { presetName, snapName } awaiting OAI_PRESET_CHANGED_AFTER
  
  // Everything else the panel shows. Reset parts of it when views change.
  const psmUi = {
    tab:        'presets',  // 'presets' | 'folders'
    view:       'list',     // presets tab: 'list' | 'page'
    pagePreset: '',
    settings:   false,      // settings page open
    sel:        null,       // tick mode "add to folder": { kind: 'preset'|'prompt', folder, ids: Set }
    selq:       '',         // filter in prompt tick mode
    fview:      'list',     // folders tab: 'list' | 'templates'
    menu:       null,       // key of the open ⋯ menu
    confirm:    null,       // { kind, id, title, body, ok, danger, run }
    renaming:   null,       // 'f:<folder>' | 's:<snap>' | 'p:<folderId>'
    renameVal:  '',
    newFolder:  null,       // string while the "new folder" row is open
    newFolderPg:null,
    noteEdit:   null,       // preset name whose note is being edited
    noteDraft:  '',
    saveName:   '',
    statesOpen: false,
    showOff:    false,
    pfOpen:     new Set(),  // open prompt folders in the panel
    iconFor:    null,
    customIcon: '',
    newPF:      null,
    tplName:    '',
    status:     null,       // { kind: 'ok'|'info'|'err', text, retry }
    busy:       null,       // { label, presetName, snapName, since }
    // Phone sheet height as a share of the screen, one per tab (this session only).
    sheetH:     { presets: 620 / 844, folders: 400 / 844 },
    sheetDrag:  false,      // the sheet's handle is being dragged
  };
  

  // ─── helpers.js ──────────────────────────────────────────────────

  // ─── TavernHelper wrappers ────────────────────────────────────────────────
  
  function currentPreset()  { try { return getLoadedPresetName(); }     catch(e) { ERR('getLoadedPresetName:', e); return 'unknown'; } }
  function readPrompts()    { try { return getPreset('in_use').prompts; } catch(e) { ERR('getPreset:', e); return []; } }
  function allPresetNames() { try { return getPresetNames(); }           catch(e) { ERR('getPresetNames:', e); return []; } }
  
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
  //   • #chat emptied (load start) → _chatReady = false, load pending until
  //     CHAT_CHANGED (or CHAT_LOAD_PENDING_MAX_MS); polls can't count as stable.
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
  const CHAT_LOAD_PENDING_MAX_MS = 30000; // max wait for CHAT_CHANGED after #chat was emptied
  
  let _chatReady        = true;  // assume ready at startup (chat already open)
  let _chatReadyWaiters = [];    // queued resolve() fns from waitForChatReady()
  let _chatPollTimer    = null;
  let _chatCeilingTimer = null;
  let _chatStableRuns   = 0;     // consecutive polls with identical DOM count
  let _chatLastMesCount = -1;    // DOM .mes count from previous poll
  let _chatRenderFired  = false; // did a render event fire since last poll?
  
  // LOAD START DETECTION:
  // In SillyTavern 1.17+ CHAT_CHANGED is emitted at the END of a chat load
  // (getChatResult, after printMessages). Before it, clearChat() empties #chat
  // and the in-memory chat while the file is still being fetched. Without this,
  // isChatReady() stays true for that whole window. Every load (open, switch,
  // reloadCurrentChat) empties #chat first, so an emptied #chat is the physical
  // start signal; the matching CHAT_CHANGED ends the pending state.
  let _chatLoadPending      = false;
  let _chatLoadPendingSince = 0;
  let _chatDomObserver      = null;
  
  // Called ONCE from init(). All listeners are permanent for the script lifetime.
  function initChatReadyListeners() {
    _watchChatEmptied();
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
  
  function _watchChatEmptied() {
    const chatEl = parentDoc.getElementById('chat');
    if (!chatEl) { ERR('chatReady: #chat not found — load-start detection off'); return; }
    _chatDomObserver = new MutationObserver(() => {
      if (_chatLoadPending || chatEl.querySelector('.mes')) return;
      _chatLoadPending      = true;
      _chatLoadPendingSince = Date.now();
      LOG('chatReady: #chat emptied — load in progress, writes blocked');
      _startChatBusy();
    });
    _chatDomObserver.observe(chatEl, { childList: true });
    window.addEventListener('pagehide', () => _chatDomObserver?.disconnect());
  }
  
  // CHAT_CHANGED = a chat load reached its render stage. Block all writes immediately.
  function _onChatLoadBegins() {
    _chatLoadPending = false;
    _startChatBusy();
    LOG('chatReady: CHAT_CHANGED — loading started, writes blocked');
  }
  
  function _startChatBusy() {
    _chatReady        = false;
    _chatStableRuns   = 0;
    _chatLastMesCount = -1;
    _chatRenderFired  = false;
    clearTimeout(_chatPollTimer);
    clearTimeout(_chatCeilingTimer);
  
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
  
    // While the chat file is still being fetched the empty DOM looks "stable".
    const loadPending = _chatLoadPending && Date.now() - _chatLoadPendingSince < CHAT_LOAD_PENDING_MAX_MS;
  
    // Both conditions must hold: DOM count unchanged AND no render event fired.
    if (count === _chatLastMesCount && !_chatRenderFired && !loadPending) {
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
    _chatReady       = true;
    _chatLoadPending = false;
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
  
  function psmRelease() {
    _psmBusy = false;
    // UI only: clear the "working" strip once the operation is over.
    if (typeof psmBusyFinish === 'function') psmBusyFinish();
  }
  
  function psmIsBusy() { return _psmBusy; }
  

  // ─── icons.js ────────────────────────────────────────────────────

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
  

  // ─── styles.js ───────────────────────────────────────────────────

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
  

  // ─── snapshots.js ────────────────────────────────────────────────

  // ─── Core operations ──────────────────────────────────────────────────────
  
  const SNAP_SWITCH_MS = 60000; // give up if OAI_PRESET_CHANGED_AFTER never fires
  let _snapSwitchTimer = null;
  
  // Case-insensitive lookup, so "Clean" and "clean" count as the same name.
  function findSnapKey(presetName, name) {
    const key = String(name || '').trim().toLowerCase();
    return Object.keys(dbLoad()[presetName] || {}).find(k => k.toLowerCase() === key) || null;
  }
  
  function currentStates() {
    const states = {};
    readPrompts().forEach(p => { states[p.id] = p.enabled; });
    return states;
  }
  
  function statesMeta(states) {
    const vals = Object.values(states);
    return vals.filter(Boolean).length + '/' + vals.length + ' on';
  }
  
  // Saves the current on/off pattern. An existing name (any case) is replaced
  // in place, keeping its spelling and its position in the list.
  function psmSave(presetName, rawName) {
    const name = String(rawName || '').trim();
    if (!name) return false;
    const states = currentStates();
    const meta   = statesMeta(states);
    const key    = findSnapKey(presetName, name) || name;
    try {
      const db = dbLoad();
      if (!db[presetName]) db[presetName] = {};
      db[presetName][key] = { states, savedAt: Date.now(), meta };
      dbSave(db);
    } catch(e) {
      ERR('save:', e);
      psmSay('err', psmT('save_failed'));
      return false;
    }
    LOG('save: "' + key + '" (' + meta + ') — preset: "' + presetName + '"');
    psmSay('ok', psmT('toast_saved', key));
    return true;
  }
  
  // Renames a snapshot, keeping its place in the list and the "last applied" mark.
  function psmRename(presetName, oldName, rawName) {
    const name = String(rawName || '').trim();
    if (!name || name === oldName) return true;
    const clash = findSnapKey(presetName, name);
    if (clash && clash !== oldName) { psmSay('err', psmT('snap_exists')); return false; }
    const db = dbLoad();
    const snaps = db[presetName] || {};
    if (!snaps[oldName]) return false;
    const next = {};
    Object.keys(snaps).forEach(k => { next[k === oldName ? name : k] = snaps[k]; });
    db[presetName] = next;
    const m = metaLoad();
    try {
      dbSave(db);
      if (m.activeSnaps?.[presetName] === oldName) { m.activeSnaps[presetName] = name; metaSave(m); }
    } catch(e) { ERR('rename:', e); psmSay('err', psmT('save_failed')); return false; }
    LOG('rename: "' + oldName + '" → "' + name + '" — preset: "' + presetName + '"');
    return true;
  }
  
  async function psmApply(presetName, snapName) {
    // Mutex: if another operation is already running, drop this one.
    // Two concurrent applies would race each other regardless of chat state.
    if (!psmAcquire()) {
      LOG('psmApply blocked — another operation in progress');
      psmSay('info', psmT('toast_busy'));
      return;
    }
  
    const db   = dbLoad();
    const snap = db[presetName]?.[snapName];
    if (!snap) {
      ERR('Snapshot not found:', snapName, 'in preset:', presetName);
      psmSay('err', psmT('apply_failed', snapName));
      psmRelease();
      return;
    }
    psmBusyBegin(presetName, snapName);
  
    // Pre-flight queue: if the chat is currently loading (from a previous
    // preset switch, a manual "reload regex now" button press, or anything
    // else), hold here until the DOM is fully stable. We do NOT drop the
    // operation — the user pressed apply and expects it to happen.
    await waitForChatReady();
  
    if (presetName !== currentPreset()) {
      // Cross-preset path: trigger the switch and return.
      // psmApplyStates will be called from OAI_PRESET_CHANGED_AFTER.
      // The mutex is held here and released inside psmApplyStates finally{}.
      pendingApply = { presetName, snapName };
      let switched = false;
      try { switched = loadPreset(presetName); } catch(e) { ERR('loadPreset:', e); }
      if (!switched) {
        ERR('loadPreset failed:', presetName);
        pendingApply = null;
        psmSayRetry('switch_failed', presetName, presetName, snapName);
        psmRelease();
        return;
      }
      clearTimeout(_snapSwitchTimer);
      _snapSwitchTimer = setTimeout(() => {
        if (!pendingApply || pendingApply.original || pendingApply.presetName !== presetName) return;
        ERR('psmApply: preset change never arrived for', presetName);
        pendingApply = null;
        psmSayRetry('switch_failed', presetName, presetName, snapName);
        psmRelease();
      }, SNAP_SWITCH_MS);
      return;
    }
  
    await psmApplyStates(presetName, snapName, snap);
    // psmRelease() called inside psmApplyStates finally{}
  }
  
  async function psmApplyStates(presetName, snapName, snap) {
    clearTimeout(_snapSwitchTimer);
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
      if (snapName === ORIGINAL_KEY) {
        psmClearLastApplied(presetName);
        LOG('reset: saved state (' + snap.meta + ') — preset: "' + presetName + '"');
        psmSay('ok', psmT('toast_reset'));
      } else {
        // The prompts are already applied. A full storage must not hide that,
        // so the marker write is best-effort.
        try {
          const m = metaLoad();
          if (!m.activeSnaps) m.activeSnaps = {};
          m.activeSnaps[presetName] = snapName;
          metaSave(m);
        } catch(e) { ERR('psmApplyStates: marker not saved:', e); }
        LOG('apply: "' + snapName + '" (' + snap.meta + ') — preset: "' + presetName + '"');
        psmSay('ok', psmT('toast_applied', snapName));
      }
    } catch(e) {
      ERR('psmApplyStates:', e);
      psmSayRetry('apply_failed', snapLabel(snapName), presetName, snapName);
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
    LOG('delete: "' + snapName + '" — preset: "' + presetName + '"');
    psmSay('ok', psmT('toast_deleted', snapName));
  }
  

  // ─── original.js ─────────────────────────────────────────────────

  // ─── Switch / reset to the saved preset (disk state) ──────────────────────
  //
  // One button on every preset page (v9; v7–v8 used an "Original state" row):
  //   • Other preset  → "Switch to this preset": plain loadPreset(). SillyTavern
  //                     loads the saved copy, so PSM writes no prompt states.
  //   • Active preset → "Reset to saved state": psmApplyStates() with the saved
  //                     copy's states, exactly like applying a snapshot.
  // Afterwards no snapshot is "last applied" on that preset, so the marker in
  // psm_v1_meta.activeSnaps is removed. Nothing else is stored.
  //
  // Both paths go through the same mutex + chat-ready guard as psmApply.
  
  const ORIGINAL_KEY       = '\u0000original'; // internal key for this operation; cannot be typed as a snapshot name
  const ORIGINAL_SWITCH_MS = 60000;            // give up if OAI_PRESET_CHANGED_AFTER never fires
  
  let _originalSwitchTimer = null;
  
  // Display name for a snapshot key (the saved state has no stored name).
  function snapLabel(snapName) {
    return snapName === ORIGINAL_KEY ? psmT('reset_saved') : snapName;
  }
  
  // Best-effort: the switch or reset already happened, so a full storage must
  // not hide that. v7–v8 could leave an ORIGINAL_KEY marker; it goes too.
  function psmClearLastApplied(presetName) {
    try {
      const m = metaLoad();
      if (m.activeSnaps && presetName in m.activeSnaps) { delete m.activeSnaps[presetName]; metaSave(m); }
    } catch(e) { ERR('psmClearLastApplied:', e); }
  }
  
  // Prompt on/off states of the preset as last saved. null if unreadable.
  function originalStatesFor(presetName) {
    // Briefly true during SillyTavern's rename: the old file is gone before
    // PSM hears "renamed".
    if (!allPresetNames().includes(presetName)) return null;
    try {
      const prompts = getPreset(presetName).prompts;
      const states  = {};
      prompts.forEach(p => { states[p.id] = p.enabled; });
      const onCount = Object.values(states).filter(Boolean).length;
      return { states, meta: onCount + '/' + prompts.length + ' on' };
    } catch(e) { ERR('originalStatesFor:', presetName, e); return null; }
  }
  
  // asSwitch: another preset ("Switch to this preset"). Otherwise the active
  // preset is reset. Same steps; only the messages differ.
  async function psmApplyOriginal(presetName, asSwitch = false) {
    if (!psmAcquire()) {
      LOG('psmApplyOriginal blocked — another operation in progress');
      psmSay('info', psmT('toast_busy'));
      return;
    }
  
    const orig = originalStatesFor(presetName);
    if (!orig) {
      psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
      psmRelease();
      return;
    }
    psmBusyBegin(presetName, asSwitch ? null : ORIGINAL_KEY);
  
    await waitForChatReady();
  
    if (presetName === currentPreset()) {
      await psmApplyStates(presetName, ORIGINAL_KEY, orig);
      // psmRelease() called inside psmApplyStates finally{}
      return;
    }
  
    // Cross-preset: arm the guard BEFORE switching. The switch can make the
    // regex extension reload the whole chat; markChatBusy makes every render
    // event of that reload reset the stability counter, so the finish step
    // only runs once the chat is calm again.
    pendingApply = { presetName, snapName: ORIGINAL_KEY, original: true, asSwitch };
    markChatBusy();
    let switched = false;
    try { switched = loadPreset(presetName); } catch(e) { ERR('loadPreset:', e); }
    if (!switched) {
      ERR('loadPreset failed:', presetName);
      pendingApply = null;
      psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
      psmRelease();
      return;
    }
  
    _originalSwitchTimer = setTimeout(() => {
      if (!pendingApply?.original) return;
      ERR('psmApplyOriginal: preset change never arrived for', presetName);
      pendingApply = null;
      psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
      psmRelease();
    }, ORIGINAL_SWITCH_MS);
    // psmFinishOriginalSwitch is called from OAI_PRESET_CHANGED_AFTER.
  }
  
  async function psmFinishOriginalSwitch(presetName, asSwitch = false) {
    clearTimeout(_originalSwitchTimer);
    try {
      await waitForChatReady();
      confirmingSnaps.delete(snapKey(presetName, ORIGINAL_KEY));
      if (currentPreset() !== presetName) {
        ERR('psmFinishOriginalSwitch: active preset is "' + currentPreset() + '", expected "' + presetName + '"');
        psmSayRetry('switch_failed', presetName, presetName, ORIGINAL_KEY, asSwitch);
        return;
      }
      psmClearLastApplied(presetName);
      LOG('switch: saved state — preset: "' + presetName + '"');
      psmSay('ok', psmT('toast_switched', presetName));
    } catch(e) {
      ERR('psmFinishOriginalSwitch:', e);
    } finally {
      psmRelease();
    }
  }
  

  // ─── rename.js ───────────────────────────────────────────────────

  // ─── Follow SillyTavern's own preset rename (D9-5, D9-6) ──────────────────
  //
  // PSM has no rename button. SillyTavern's pencil renames the preset file;
  // PSM only moves its own data (all keyed by preset name) to the new name:
  // snapshots, notes, "last applied" mark, preset folder spot, prompt folders.
  // Overwrite (the new name already existed): the renamed preset's data
  // replaces the old one's, like the file does. Preset files are never touched.
  //
  // SillyTavern's rename selects the new name, which is a real preset change
  // (regex / Tavern Helper react to it), so it gets the same guard as a switch:
  //   rename starting → wait for PSM's mutex and a calm chat, mark chat busy
  //   renamed         → move data, release once the chat is calm again
  // SillyTavern awaits each listener, so waiting here holds its rename back.
  //
  // SillyTavern renames whatever preset is selected when the wait ends. If a
  // PSM switch was still running and changed the selection, PSM selects the
  // preset the user chose to rename again first (guarded like any switch).
  
  const RENAME_KEY          = '\u0000rename'; // busy-strip key; cannot be typed as a snapshot name
  const RENAME_LOCK_WAIT_MS = 200000;         // stop waiting for another PSM operation (longer than its own limits)
  const RENAME_DONE_MS      = 30000;          // release if "renamed" never comes (rename failed)
  
  let _renameHeld  = false;
  let _renameTimer = null;
  
  function psmInitRenameListeners() {
    try {
      eventOn(tavern_events.PRESET_RENAMED_BEFORE, psmOnRenameStart);
      eventOn(tavern_events.PRESET_RENAMED,        psmOnRenamed);
    } catch(e) { ERR('rename eventOn failed:', e); }
  }
  
  async function psmOnRenameStart({ apiId, oldName, newName } = {}) {
    if (apiId !== 'openai') return;
    const until = Date.now() + RENAME_LOCK_WAIT_MS;
    while (!psmAcquire()) {
      if (Date.now() > until) { ERR('rename: PSM still busy — rename goes ahead unguarded'); return; }
      await new Promise(r => setTimeout(r, 100));
    }
    _renameHeld = true;
    LOG('rename "' + oldName + '" → "' + newName + '": guarding');
    psmBusyBegin(newName, RENAME_KEY);
    await waitForChatReady();
    if (currentPreset() !== oldName) await psmReselectForRename(oldName);
    // Arm the guard before SillyTavern selects the new name (its step 2).
    markChatBusy();
    clearTimeout(_renameTimer);
    _renameTimer = setTimeout(() => {
      LOG('rename: no "renamed" signal — releasing');
      psmRenameRelease();
    }, RENAME_DONE_MS);
  }
  
  async function psmReselectForRename(oldName) {
    LOG('rename: selection moved to "' + currentPreset() + '" — selecting "' + oldName + '" again');
    markChatBusy();
    let switched = false;
    try { switched = loadPreset(oldName); } catch(e) { ERR('loadPreset:', e); }
    const until = Date.now() + RENAME_DONE_MS;
    while (switched && currentPreset() !== oldName && Date.now() < until) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (currentPreset() !== oldName) ERR('rename: could not select "' + oldName + '" again');
    await waitForChatReady();
  }
  
  function psmOnRenamed({ apiId, oldName, newName } = {}) {
    if (apiId !== 'openai') return;
    let msg = null;
    if (oldName && newName && oldName !== newName) {
      try {
        if (psmMovePresetData(oldName, newName)) msg = ['ok', psmT('toast_renamed', newName)];
        LOG('rename: PSM data moved "' + oldName + '" → "' + newName + '"');
      } catch(e) {
        ERR('rename: moving PSM data failed:', e);
        msg = ['err', psmT('rename_move_failed')];
      }
      psmFollowRenameInUi(oldName, newName);
    }
    psmRenameRelease(() => {
      if (msg) psmSay(msg[0], msg[1]);
      if (panelOpen) psmRender();
      psmRefreshEntryRow();
    });
  }
  
  // The mutex is released only once the chat is calm again.
  function psmRenameRelease(after) {
    clearTimeout(_renameTimer);
    _renameTimer = null;
    if (!_renameHeld) { if (after) after(); return; }
    _renameHeld = false;
    waitForChatReady().then(() => {
      psmRelease();
      if (after) after();
    });
  }
  
  // Moves every PSM record from oldName to newName, replacing what newName had.
  // Returns true if oldName had any PSM data.
  function psmMovePresetData(oldName, newName) {
    const has = (obj, k) => !!obj && Object.prototype.hasOwnProperty.call(obj, k);
    // obj[oldName] → obj[newName]; newName's own entry goes either way.
    // Returns true if obj changed.
    const take = (obj) => {
      if (!obj) return false;
      const hadOld = has(obj, oldName), hadNew = has(obj, newName);
      if (hadOld) obj[newName] = obj[oldName]; else delete obj[newName];
      delete obj[oldName];
      return hadOld || hadNew;
    };
    let hadData = false;
  
    const db = dbLoad();
    if (has(db, oldName)) hadData = true;
    if (take(db)) dbSave(db);
  
    const m = metaLoad();
    let metaChanged = false;
    if (has(m.presetNotes, oldName) || has(m.activeSnaps, oldName)) hadData = true;
    if (take(m.presetNotes)) metaChanged = true;
    if (take(m.activeSnaps)) metaChanged = true;
    Object.values(m.folders).forEach(f => {
      const list = f.presets || [];
      if (!list.includes(oldName) && !list.includes(newName)) return;
      if (list.includes(oldName)) hadData = true;
      f.presets = list.filter(p => p !== newName).map(p => (p === oldName ? newName : p));
      metaChanged = true;
    });
    if (metaChanged) metaSave(m);
  
    const pdb = pdoDbLoad();
    if (has(pdb.perPreset, oldName)) hadData = true;
    if (take(pdb.perPreset)) pdoDbSave(pdb, { panel: false });
  
    const collapse = pdoCollapseLoad();
    const oldPre = oldName + '::', newPre = newName + '::';
    let collapseChanged = false;
    const nextCollapse = {};
    Object.entries(collapse).forEach(([k, v]) => {
      if (k.startsWith(newPre)) { collapseChanged = true; return; }
      if (k.startsWith(oldPre)) { collapseChanged = true; nextCollapse[newPre + k.slice(oldPre.length)] = v; return; }
      nextCollapse[k] = v;
    });
    if (collapseChanged) pdoCollapseSave(nextCollapse, { panel: false });
  
    return hadData;
  }
  
  // Panel state that names a preset follows the rename too.
  function psmFollowRenameInUi(oldName, newName) {
    if (psmUi.pagePreset === oldName) psmUi.pagePreset = newName;
    if (psmUi.noteEdit === oldName) psmUi.noteEdit = newName;
    if (expandedNotes.delete(oldName)) expandedNotes.add(newName);
    if (psmUi.sel?.kind === 'preset' && psmUi.sel.ids.delete(oldName)) psmUi.sel.ids.add(newName);
    confirmingSnaps.clear();
    psmUi.confirm = null;
    psmUi.menu = null;
  }
  

  // ─── panel.js ────────────────────────────────────────────────────

  // ─── Panel rendering ──────────────────────────────────────────────────────
  // The whole window is redrawn from psmUi on every change (it is small).
  // Focus, caret and scroll position survive a redraw, so typing in a box that
  // redraws the list feels normal. Clicks, typing and keys are handled by one
  // delegated listener each (bindPanelEvents) through these tables:
  //   data-act="name"   → PSM_ACTS[name](el, ev)      clicks
  //   data-in="name"    → PSM_INPUTS[name](value, el) typing (after IME ends)
  //   data-enter="name" → PSM_ACTS[name](el, ev)      Enter in a text box
  // Prompt Folders (divs-panel.js) adds its own entries to the same tables.
  
  const PSM_ACTS   = {};
  const PSM_INPUTS = {};
  let psmDragging = false;       // a SortableJS drag is running: don't redraw
  let psmRenderPending = false;
  
  // ─── HTML helpers ─────────────────────────────────────────────────────────
  
  function hA(name, value) { return value === undefined || value === null ? '' : ` ${name}="${esc(value)}"`; }
  
  function btnHtml(label, act, o = {}) {
    return `<button type="button" class="psm-btn${o.cls ? ' ' + o.cls : ''}"${hA('data-act', act)}${hA('data-a', o.a)}${hA('data-b', o.b)}${hA('title', o.title)}${o.disabled ? ' disabled' : ''}${o.attrs || ''}>${o.icon ? psmIcon(o.icon) : ''}${label ? `<span>${esc(label)}</span>` : ''}</button>`;
  }
  
  function ibHtml(icon, act, label, o = {}) {
    return `<button type="button" class="psm-ib${o.cls ? ' ' + o.cls : ''}"${hA('data-act', act)}${hA('data-a', o.a)}${hA('data-b', o.b)} aria-label="${esc(label)}" title="${esc(o.title || label)}"${o.disabled ? ' disabled' : ''}${o.attrs || ''}>${psmIcon(icon)}</button>`;
  }
  
  function miHtml(icon, label, act, o = {}) {
    return `<button type="button" class="psm-mi${o.red ? ' red' : ''}" role="${o.role || 'menuitem'}"${hA('data-act', act)}${hA('data-a', o.a)}${hA('data-b', o.b)}${o.checked !== undefined ? ` aria-checked="${o.checked}"` : ''}>${psmIcon(icon, o.iconCls || '')}<span>${esc(label)}</span></button>`;
  }
  
  function swHtml(on, label, act, o = {}) {
    return `<button type="button" class="psm-swr" role="switch" aria-checked="${on}"${hA('data-act', act)}${hA('data-a', o.a)}${o.disabled ? ' disabled' : ''}>
      <span class="psm-swr-t">${esc(label)}</span>
      <span class="psm-sw${on ? ' on' : ''}" aria-hidden="true"></span></button>`;
  }
  
  function inpHtml(fk, value, o = {}) {
    return `<input type="text" class="psm-inp" data-fk="${esc(fk)}"${hA('data-in', o.input)}${hA('data-enter', o.enter)}${hA('data-esc', o.esc)}${hA('placeholder', o.ph)} aria-label="${esc(o.label || o.ph || '')}" value="${esc(value)}" autocomplete="off"${o.attrs || ''}>`;
  }
  
  function srchHtml(fk, value, ph, input, clearAct) {
    return `<div class="psm-srch">${psmIcon('search')}${inpHtml(fk, value, { ph, input })}
      ${value ? ibHtml('x', clearAct, psmT('clear_filter'), { cls: 'psm-sm mut' }) : ''}</div>`;
  }
  
  function crumbHtml(backAct, backLabel, title) {
    return `<div class="psm-crumb">${ibHtml('back', backAct, backLabel)}<h3>${esc(title)}</h3></div>`;
  }
  
  // Inline "name + Cancel + Create/Save" row. Phone: buttons go under the box.
  function nameRowHtml(fk, value, o) {
    const btns = `${btnHtml(psmT('cancel'), o.cancel)}${btnHtml(o.okLabel, o.ok, { cls: 'psm-go' })}`;
    const input = inpHtml(fk, value, { ph: o.ph, label: o.label, input: o.input, enter: o.ok, esc: o.cancel });
    return psmIsSheet()
      ? `<div class="psm-cf">${input}<div class="psm-cf-b">${btns}</div></div>`
      : `<div class="psm-row">${input}${btns}</div>`;
  }
  
  // Inline confirm box for psmUi.confirm, shown where the action started.
  function cfHtml(kind, id) {
    const c = psmUi.confirm;
    if (!c || c.kind !== kind || c.id !== id) return '';
    return `<div class="psm-cf${c.danger ? ' red' : ''}" role="alertdialog" aria-label="${esc(c.title)}">
      <p class="psm-cf-t">${esc(c.title)}</p>${c.body ? `<p class="psm-cap">${esc(c.body)}</p>` : ''}
      <div class="psm-cf-b">${btnHtml(psmT('cancel'), 'cfCancel')}${btnHtml(c.ok, 'cfOk', { cls: c.danger ? 'psm-danger' : 'psm-go' })}</div>
    </div>`;
  }
  
  function psmAsk(c) {
    psmUi.confirm = c;
    psmUi.menu = null;
    confirmingSnaps.clear();
    psmRender();
  }
  
  // ─── Render ───────────────────────────────────────────────────────────────
  
  function psmRender() {
    if (!panelOpen) return;
    if (psmDragging) { psmRenderPending = true; return; }
    const panel = parentDoc.getElementById('psm-panel');
    if (!panel) return;
  
    const s = settingsLoad();
    if (!s.tools.presets && psmUi.tab === 'presets') psmUi.tab = 'folders';
    if (!s.tools.folders && psmUi.tab === 'folders') psmUi.tab = 'presets';
    if (!s.tools.presets && !s.tools.folders) psmUi.settings = true;
  
    // Remember focus, caret and scroll.
    const ae = parentDoc.activeElement;
    const inPanel = ae && ae !== panel && panel.contains(ae);
    const fk = inPanel ? ae.dataset.fk : null;
    // A focused button: find the same button again after the redraw.
    const btnKey = inPanel && !fk && ae.dataset.act ? [ae.dataset.act, ae.dataset.a || ''] : null;
    let selS = null, selE = null;
    try { if (fk) { selS = ae.selectionStart; selE = ae.selectionEnd; } } catch (_) {}
    const oldBody = panel.querySelector('.psm-body');
    const viewKey = psmViewKey();
    const scroll = oldBody && psmUi._viewKey === viewKey ? oldBody.scrollTop : 0;
    psmUi._viewKey = viewKey;
  
    panel.innerHTML = psmPanelHtml(s);
  
    const body = panel.querySelector('.psm-body');
    if (body) body.scrollTop = scroll;
    const want = psmUi._focus || fk;
    psmUi._focus = null;
    if (want) {
      const el = panel.querySelector(`[data-fk="${want.replace(/"/g, '\\"')}"]`);
      if (el) {
        try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
        try {
          if (want === fk && selS !== null) el.setSelectionRange(selS, selE);
          else if (el.value) el.setSelectionRange(el.value.length, el.value.length);
        } catch (_) {}
      }
    }
    else if (btnKey) {
      const same = [...panel.querySelectorAll('[data-act]')].find(b => b.dataset.act === btnKey[0] && (b.dataset.a || '') === btnKey[1]);
      try { (same || panel).focus({ preventScroll: true }); } catch (_) {}
    } else if (inPanel) {
      try { panel.focus({ preventScroll: true }); } catch (_) {}
    }
    psmAfterRender(panel);
    psmPlacePanel();
    psmKeepInView(panel);
  }
  
  function psmViewKey() {
    const u = psmUi;
    if (u.settings) return 'settings';
    if (u.tab === 'presets') return u.view === 'page' ? 'page:' + u.pagePreset : 'list';
    return 'folders:' + u.fview;
  }
  
  // Scrolls the body so an open menu, confirm box or focused box is in view.
  function psmKeepInView(panel) {
    const body = panel.querySelector('.psm-body');
    if (!body) return;
    const target = (psmUi._reveal && panel.querySelector(psmUi._reveal)) || panel.querySelector('.psm-menu') || panel.querySelector('.psm-cf[role="alertdialog"]');
    psmUi._reveal = null;
    if (!target || !body.contains(target)) return;
    const br = body.getBoundingClientRect(), tr = target.getBoundingClientRect();
    if (tr.bottom > br.bottom - 4) body.scrollTop += Math.min(tr.bottom - br.bottom + 8, tr.top - br.top - 8);
    else if (tr.top < br.top) body.scrollTop -= br.top - tr.top + 8;
  }
  
  function psmAfterRender(panel) {
    if (!psmUi.settings && !psmUi.sel) {
      if (psmUi.tab === 'presets' && psmUi.view === 'list') initPresetSortables(panel);
      if (psmUi.tab === 'folders' && psmUi.fview === 'list' && typeof initPdoFolderSortable === 'function') initPdoFolderSortable(panel);
    }
  }
  
  function psmPanelHtml(s) {
    const u = psmUi;
    const tabs = !u.settings || s.tools.presets || s.tools.folders;
    const tabHtml = (key, icon, label) => {
      const on = !u.settings && u.tab === key;
      return `<button type="button" class="psm-tab${on ? ' psm-on' : ''}" data-act="tab" data-a="${key}"${on ? ' aria-current="page"' : ''}>${psmIcon(icon)}<span>${esc(label)}</span></button>`;
    };
    const header = `<button type="button" class="psm-grabz" data-grab="1" aria-label="${esc(psmT('sheet_handle'))}" title="${esc(psmT('sheet_handle'))}"><span class="psm-grab"></span></button>
      <header class="psm-h">
        <span class="psm-drag" title="${esc(psmT('drag_move'))}" aria-hidden="true">${psmIcon('grip')}</span>
        ${tabs ? `<nav class="psm-tabs" aria-label="${esc(psmT('brand'))}">
          ${s.tools.presets ? tabHtml('presets', 'layers', psmT('tab_presets')) : ''}
          ${s.tools.folders ? tabHtml('folders', 'folder', psmT('tab_folders')) : ''}
        </nav>` : `<span class="psm-title">${esc(psmT('brand'))}</span>`}
        ${ibHtml('gear', 'settings', psmT('settings'), { cls: u.settings ? 'psm-on' : '', attrs: ` aria-pressed="${!!u.settings}"` })}
        ${ibHtml('x', 'close', psmT('close'), { title: psmT('close') + ' (Esc)' })}
      </header>`;
  
    let body;
    if (u.settings) body = psmSettingsHtml(s);
    else if (u.tab === 'presets') body = u.view === 'page' && u.pagePreset ? psmPageHtml() : psmListHtml();
    else if (u.sel?.kind === 'prompt') body = pdoSelectHtml();
    else body = u.fview === 'templates' ? pdoTemplatesHtml() : pdoFoldersHtml();
  
    return `${header}<div id="psm-strip">${psmStripHtml()}</div>
      <div class="psm-main"><div class="psm-body">${body}</div></div>
      <span class="psm-rsz" data-rsz="1" title="${esc(psmT('drag_resize'))}" aria-hidden="true"></span>`;
  }
  
  // ─── Presets tab: list ────────────────────────────────────────────────────
  
  function psmPresetNames() { return allPresetNames().filter(p => p !== 'in_use'); }
  
  function psmFolderOrder(meta) {
    const folders = meta.folders || {};
    const order = (meta.folderOrder || []).filter(f => folders[f]);
    Object.keys(folders).forEach(f => { if (!order.includes(f)) order.push(f); });
    return order;
  }
  
  function psmListHtml() {
    const meta    = metaLoad();
    const active  = currentPreset();
    const all     = psmPresetNames();
    const allSet  = new Set(all);
    const q       = filterText.trim().toLowerCase();
    const match   = p => !q || p.toLowerCase().includes(q);
    const folders = meta.folders;
    const order   = psmFolderOrder(meta);
    const notes   = meta.presetNotes || {};
    const inFolder = new Set();
    order.forEach(f => (folders[f].presets || []).forEach(p => inFolder.add(p)));
    let anyMatch = false;
    // Tick mode: every row gets a checkbox; presets already in the target
    // folder are ticked and locked.
    const sel = psmUi.sel?.kind === 'preset' ? psmUi.sel : null;
    const target = sel ? new Set((folders[sel.folder]?.presets) || []) : null;
  
    const rowHtml = pn => {
      const isActive = pn === active;
      if (sel) {
        const locked = target.has(pn);
        return `<div class="psm-pitem" data-preset="${esc(pn)}">
          <label class="psm-prow sel"><input type="checkbox" data-sel="${esc(pn)}"${locked || sel.ids.has(pn) ? ' checked' : ''}${locked ? ' disabled' : ''}><span class="psm-dot${isActive ? '' : ' off'}"></span><span class="psm-nm" title="${esc(pn)}">${esc(pn)}</span>${isActive ? `<span class="psm-sr">${esc(psmT('active_sr'))}</span>` : ''}</label>
        </div>`;
      }
      const note = notes[pn] || '';
      const noteOpen = !!note && expandedNotes.has(pn);
      return `<div class="psm-pitem" data-preset="${esc(pn)}">
        <div class="psm-prow">
          <span class="psm-grip" title="${esc(psmT('drag_reorder_move'))}" aria-hidden="true">${psmIcon('grip')}</span>
          <button type="button" class="psm-pbtn" data-act="openPage" data-a="${esc(pn)}" title="${esc(pn)}"><span class="psm-dot${isActive ? '' : ' off'}"></span><span class="psm-nm">${esc(pn)}</span>${isActive ? `<span class="psm-sr">${esc(psmT('active_sr'))}</span>` : ''}</button>
          ${note ? ibHtml('note', 'toggleNote', psmT('show_note_for', pn), { a: pn, title: psmT('show_note'), cls: 'psm-sm ' + (noteOpen ? 'psm-on' : 'mut'), attrs: ` aria-pressed="${noteOpen}"` }) : ''}
          ${ibHtml('chevR', 'openPage', psmT('open_x', pn), { a: pn, title: psmT('open_snapshots'), cls: 'psm-sm mut' })}
        </div>
        ${noteOpen ? `<div class="psm-note"><span>${esc(note)}</span><button type="button" class="psm-link" data-act="editNoteFromList" data-a="${esc(pn)}">${esc(psmT('edit_note'))}</button></div>` : ''}
      </div>`;
    };
  
    let foldersHtml = '';
    order.forEach(fname => {
      const kids = (folders[fname].presets || []).filter(p => allSet.has(p));
      const vis  = kids.filter(match);
      if (q && !vis.length) return;
      if (vis.length) anyMatch = true;
      const open = q || sel ? true : expandedFolders.has(fname);
      const renaming = !sel && psmUi.renaming === 'f:' + fname;
      const menuOpen = !sel && psmUi.menu === 'f:' + fname;
      const count = q ? psmT('n_of_m', vis.length, kids.length) : String(kids.length);
      foldersHtml += `<div class="psm-fblock" data-folder="${esc(fname)}">
        ${renaming ? nameRowHtml('rename', psmUi.renameVal, { ph: psmT('folder_name'), label: psmT('folder_name'), input: 'renameVal', ok: 'renameOk', cancel: 'renameCancel', okLabel: psmT('save') }) : `
        <div class="psm-frow${sel && sel.folder === fname ? ' tgt' : ''}">
          <span class="psm-grip" title="${esc(psmT('drag_reorder'))}" aria-hidden="true">${psmIcon('grip')}</span>
          <button type="button" class="psm-fbtn" data-act="folderToggle" data-a="${esc(fname)}" aria-expanded="${open}">${psmIcon('chevR', 'psm-chev' + (open ? ' open' : ''))}${psmIcon('folder', 'mut')}<span class="psm-fname" title="${esc(fname)}">${esc(fname)}</span><span class="psm-cnt">${esc(count)}</span></button>
          ${!sel ? ibHtml('kebab', 'menu', psmT('actions_for', fname), { a: 'f:' + fname, title: psmT('folder_actions'), cls: 'psm-sm', attrs: ` aria-expanded="${menuOpen}"` }) : ''}
          ${menuOpen ? `<div class="psm-menu" role="menu">
            ${miHtml('plus', psmT('add_presets'), 'pickPresets', { a: fname })}
            ${miHtml('pencil', psmT('rename'), 'folderRename', { a: fname })}
            ${miHtml('trash', psmT('delete_folder'), 'folderDelete', { a: fname, red: true })}
          </div>` : ''}
        </div>`}
        ${cfHtml('delFolder', fname)}
        ${open ? `<div class="psm-kids">
          <div class="psm-plist" data-folder="${esc(fname)}">${vis.map(rowHtml).join('')}</div>
          ${!kids.length ? `<p class="psm-cap" style="padding: 6px 4px">${esc(psmT('folder_empty'))}</p>` : ''}
          ${!q && !sel ? `<button type="button" class="psm-addrow" data-act="pickPresets" data-a="${esc(fname)}">${psmIcon('plus')}<span>${esc(psmT('add_presets'))}</span></button>` : ''}
        </div>` : `<div class="psm-plist psm-closed" data-folder="${esc(fname)}"></div>`}
      </div>`;
    });
  
    const ungrouped = all.filter(p => !inFolder.has(p) && match(p));
    if (ungrouped.length) anyMatch = true;
    const nf = psmUi.newFolder;
  
    return `
      ${sel ? psmSelBarHtml() : ''}
      ${srchHtml('filter', filterText, psmT('filter_presets'), 'filter', 'clearFilter')}
      ${!sel ? `<div class="psm-row">
        <button type="button" class="psm-btn psm-quiet psm-act" data-act="openPage" data-a="${esc(active)}" title="${esc(psmT('open_active'))}"><span class="psm-dot"></span><span class="psm-cap">${esc(psmT('active'))}</span><span class="psm-nm">${esc(active)}</span>${psmIcon('chevR', 'mut')}</button>
        ${btnHtml(psmT('new_folder'), 'newFolder', { icon: 'plus' })}
      </div>` : ''}
      ${nf !== null && !sel ? nameRowHtml('newFolder', nf, { ph: psmT('folder_name'), label: psmT('new_folder'), input: 'newFolder', ok: 'newFolderOk', cancel: 'newFolderCancel', okLabel: psmT('create') }) : ''}
      ${!order.length && !q && !sel ? `<div class="psm-empty"><p class="psm-cap">${esc(psmT('no_preset_folders'))}</p>${btnHtml(psmT('new_folder'), 'newFolder', { icon: 'plus' })}</div>` : ''}
      <div class="psm-fl" id="psm-flist">${foldersHtml}</div>
      <div class="psm-fl">
        <p class="psm-lbl psm-ug-lbl${ungrouped.length ? '' : ' psm-ug-zone'}">${esc(psmT('ungrouped'))}</p>
        <div class="psm-plist" data-folder="">${ungrouped.map(rowHtml).join('')}</div>
      </div>
      ${q && !anyMatch ? `<p class="psm-cap">${esc(psmT('no_presets_match', filterText.trim()))}</p>` : ''}
      ${!all.length ? `<p class="psm-cap">${esc(psmT('no_presets'))}</p>` : ''}`;
  }
  
  // ─── Presets tab: preset page ─────────────────────────────────────────────
  
  function psmFmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const loc = PSM_LANG === 'zh' ? 'zh-CN' : 'en-GB';
    try {
      if (d.toDateString() === now.toDateString()) {
        return psmT('today_at', d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false }));
      }
      const opts = { day: 'numeric', month: 'short' };
      if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
      return d.toLocaleDateString(loc, opts);
    } catch (_) { return d.toISOString().slice(0, 10); }
  }
  
  function psmOnCount(states) {
    const vals = Object.values(states || {});
    return psmT('on_count', vals.filter(Boolean).length, vals.length);
  }
  
  // Prompts the snapshot would turn on (plus) and off (minus), compared to now.
  function psmDiff(snapStates, nowStates) {
    let plus = 0, minus = 0;
    Object.entries(snapStates || {}).forEach(([id, on]) => {
      if (!(id in nowStates)) return;
      if (on && !nowStates[id]) plus++;
      if (!on && nowStates[id]) minus++;
    });
    return { plus, minus };
  }
  
  function psmDiffText(d) {
    if (!d.plus && !d.minus) return psmT('same_now');
    const parts = [];
    if (d.plus) parts.push(psmT('diff_on', d.plus));
    if (d.minus) parts.push(psmT('diff_off', d.minus));
    return parts.join(' ');
  }
  
  function psmPageHtml() {
    const pn       = psmUi.pagePreset;
    const active   = currentPreset();
    const isActive = pn === active;
    const meta     = metaLoad();
    const folder   = getFolderForPreset(pn);
    const note     = (meta.presetNotes || {})[pn] || '';
    const snaps    = dbLoad()[pn] || {};
    const lastSnap = (meta.activeSnaps || {})[pn];
    const working  = !!psmUi.busy;
    // "Now" = the live on/off pattern for the active preset, the saved one otherwise.
    const nowStates = isActive ? currentStates() : (originalStatesFor(pn)?.states || {});
  
    // One button: switch to this preset, or reset the active one, to the saved
    // state. While it runs, the button shows the wait instead.
    const b = psmUi.busy;
    const actBusy = !!b && b.presetName === pn && (b.snapName === null || b.snapName === ORIGINAL_KEY);
    const short = psmIsSheet();
    let actSec;
    if (actBusy) {
      // The active preset changes halfway through a switch, so the label
      // follows the operation, not the page.
      const reset = b.snapName === ORIGINAL_KEY;
      actSec = `<div class="psm-btn psm-full psm-busy" role="status"><span class="psm-spin" aria-hidden="true"></span><span>${esc(psmT(reset ? (short ? 'resetting_wait_s' : 'resetting_wait') : (short ? 'switching_wait_s' : 'switching_wait')))}</span></div>`;
    } else if (psmUi.confirm?.kind === 'resetPreset' && psmUi.confirm.id === pn) {
      actSec = cfHtml('resetPreset', pn);
    } else {
      actSec = btnHtml(psmT(isActive ? 'reset_saved' : 'switch_to'), 'presetAct', { icon: isActive ? 'restore' : 'swap', cls: 'psm-full', disabled: working });
    }
  
    // Folder picker
    const fMenuOpen = psmUi.menu === 'pgf';
    const fOpts = [['', psmT('ungrouped')]].concat(psmFolderOrder(meta).map(f => [f, f]));
    const folderSec = `<div class="psm-sec">
      <p class="psm-lbl">${esc(psmT('folder_label'))}</p>
      <div class="psm-fldw">
        <button type="button" class="psm-btn psm-fsel" data-act="menu" data-a="pgf" aria-haspopup="menu" aria-expanded="${fMenuOpen}">${psmIcon('folder', 'mut')}<span class="psm-nm">${esc(folder || psmT('ungrouped'))}</span>${psmIcon('chevD', 'mut')}</button>
        ${fMenuOpen ? `<div class="psm-menu full" role="menu">
          ${fOpts.map(([id, label]) => miHtml('check', label, 'setFolder', { a: id, role: 'menuitemradio', checked: (folder || '') === id, iconCls: (folder || '') === id ? '' : 'hide' })).join('')}
          ${miHtml('plus', psmT('new_folder'), 'newFolderPg')}
        </div>` : ''}
      </div>
      ${psmUi.newFolderPg !== null ? nameRowHtml('newFolderPg', psmUi.newFolderPg, { ph: psmT('folder_name'), label: psmT('new_folder'), input: 'newFolderPg', ok: 'newFolderPgOk', cancel: 'newFolderPgCancel', okLabel: psmT('create') }) : ''}
    </div>`;
  
    // Note
    const editing = psmUi.noteEdit === pn;
    const noteSec = `<div class="psm-sec">
      <div class="psm-row"><p class="psm-lbl" style="flex: 1">${esc(psmT('note_label'))}</p>${!editing ? btnHtml(note ? psmT('edit') : psmT('add_note'), 'editNote', { icon: 'pencil', cls: 'psm-sm psm-quiet' }) : ''}</div>
      ${!editing && note ? `<p class="psm-notetext">${esc(note)}</p>` : ''}
      ${editing ? `<textarea class="psm-inp psm-ta" data-fk="note" data-in="noteDraft" aria-label="${esc(psmT('note_label'))}" style="height: auto; min-height: 88px; padding: 8px 10px; resize: vertical; line-height: 1.45">${esc(psmUi.noteDraft)}</textarea>
        <div class="psm-cf-b">${btnHtml(psmT('cancel'), 'noteCancel')}${btnHtml(psmT('save_note'), 'noteSave', { cls: 'psm-go' })}</div>` : ''}
    </div>`;
  
    // Save box (active preset only)
    const exists = psmUi.saveName.trim() ? findSnapKey(pn, psmUi.saveName) : null;
    const saveSec = isActive ? `
      <div class="psm-row">
        ${inpHtml('saveName', psmUi.saveName, { ph: psmT('name_snapshot_ph'), label: psmT('new_snap_name'), input: 'saveName', enter: 'saveSnap' })}
        ${btnHtml(exists ? psmT('replace_dots') : psmT('save'), 'saveSnap', { cls: exists ? 'psm-danger-o' : '', disabled: !psmUi.saveName.trim() || working })}
      </div>
      ${cfHtml('saveOver', 'save')}` : '';
  
    // Snapshot cards
    const card = key => {
      const sn = snaps[key];
      const isCur = lastSnap === key;
      const isWorking = working && psmUi.busy.presetName === pn && psmUi.busy.snapName === key;
      const confirming = !working && confirmingSnaps.has(snapKey(pn, key));
      const renaming = psmUi.renaming === 's:' + key;
      const menuOpen = psmUi.menu === 's:' + key;
      const d = psmDiff(sn.states, nowStates);
      const parts = [psmOnCount(sn.states)];
      if (sn.savedAt) parts.push(psmFmtDate(sn.savedAt));
      parts.push(psmDiffText(d));
      const applyText = !isActive ? psmT('apply_other')
        : (d.plus || d.minus) ? psmT('apply_changes', d.plus, d.minus) : psmT('apply_same');
  
      return `<div class="psm-snap${isCur ? ' cur' : ''}" data-snap="${esc(key)}">
        <div class="psm-snap-top">
          <div class="psm-snap-txt">
            ${renaming ? inpHtml('renameSnap', psmUi.renameVal, { label: psmT('snap_name'), input: 'renameVal', enter: 'renameOk', esc: 'renameCancel' }) : `<span class="psm-snap-name">${esc(key)}</span>`}
            <span class="psm-cap">${esc(parts.join(' · '))}</span>
            ${isCur ? `<span class="psm-tag q" style="align-self: flex-start">${psmIcon('check')}${esc(psmT('last_applied'))}</span>` : ''}
          </div>
          ${!confirming && !isWorking && !renaming ? btnHtml(psmT('apply'), 'applyAsk', { a: key, disabled: working }) : ''}
          ${isWorking ? `<span class="psm-wk"><span class="psm-spin" aria-hidden="true"></span>${esc(psmT('applying'))}</span>` : ''}
          ${!renaming ? ibHtml('kebab', 'menu', psmT('more_for', key), { a: 's:' + key, title: psmT('more'), cls: 'psm-sm', disabled: working, attrs: ` aria-expanded="${menuOpen}"` }) : ''}
          ${menuOpen ? `<div class="psm-menu" role="menu">
            ${miHtml('pencil', psmT('rename'), 'snapRename', { a: key })}
            ${isActive ? miHtml('restore', psmT('replace_current'), 'snapOverwrite', { a: key }) : ''}
            ${miHtml('trash', psmT('del'), 'snapDelete', { a: key, red: true })}
          </div>` : ''}
        </div>
        ${confirming ? `<div class="psm-cf" role="alertdialog" aria-label="${esc(psmT('apply_q', key))}">
          <p class="psm-cf-t">${esc(psmT('apply_q', key))}</p><p class="psm-cap">${esc(applyText)}</p>
          <div class="psm-cf-b">${btnHtml(psmT('cancel'), 'applyCancel', { a: key })}${btnHtml(psmT('confirm_btn'), 'applyOk', { a: key, cls: 'psm-go', icon: 'check' })}</div>
        </div>` : ''}
        ${cfHtml('delSnap', key)}${cfHtml('overSnap', key)}
        ${renaming ? `<div class="psm-cf-b">${btnHtml(psmT('cancel'), 'renameCancel')}${btnHtml(psmT('save_name'), 'renameOk', { cls: 'psm-go' })}</div>` : ''}
      </div>`;
    };
    const keys = Object.keys(snaps);
  
    // Prompt states
    const prompts = isActive ? readPrompts() : (() => { try { return getPreset(pn).prompts || []; } catch (_) { return []; } })();
    const shown = prompts.filter(p => (isActive && psmUi.showOff) || p.enabled);
    const statesSec = `<div class="psm-sec">
      <button type="button" class="psm-disc" data-act="toggleStates" aria-expanded="${psmUi.statesOpen}">${psmIcon('chevR', 'psm-chev' + (psmUi.statesOpen ? ' open' : ''))}<span class="psm-lbl">${esc(psmT('prompt_states'))}</span><span class="psm-cap" style="margin-left: auto">${esc(psmT('on_count', prompts.filter(p => p.enabled).length, prompts.length))}</span></button>
      ${psmUi.statesOpen ? `
        ${isActive ? swHtml(psmUi.showOff, psmT('include_off'), 'toggleShowOff') : ''}
        <div class="psm-pst">${shown.length ? shown.map(p => `<div class="psm-pst-r"><span class="psm-sd${p.enabled ? '' : ' off'}" aria-hidden="true"></span><span>${esc(p.name)}</span></div>`).join('') : `<p class="psm-cap">${esc(psmT('all_disabled'))}</p>`}</div>` : ''}
    </div>`;
  
    return `${crumbHtml('back', psmT('back_all'), pn)}
      ${isActive ? `<div class="psm-row" style="margin-top: -6px"><span class="psm-tag"><span class="psm-dot"></span>${esc(psmT('active_preset'))}</span></div>` : ''}
      ${actSec}
      ${folderSec}${noteSec}
      <hr class="psm-hr">
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('snapshots_lbl'))}</p>
        ${saveSec}
        <div class="psm-snaps">${keys.map(card).join('')}</div>
        ${!keys.length ? `<p class="psm-cap">${esc(psmT('no_snaps'))}</p>` : ''}
      </div>
      <hr class="psm-hr">
      ${statesSec}`;
  }
  
  // ─── Settings ─────────────────────────────────────────────────────────────
  
  function psmSettingsHtml(s) {
    const drawerShown = s.entries.drawer && (s.tools.presets || s.tools.folders);
    const tools = [
      ['presets', psmT('tool_presets')],
      ['folders', psmT('tab_folders')],
      ['search',  psmT('tool_search')],
    ];
    return `${crumbHtml('settings', psmT('back'), psmT('settings'))}
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('tools'))}</p>
        ${tools.map(([k, label]) => swHtml(s.tools[k], label, 'toolToggle', { a: k })).join('')}
      </div>
      <hr class="psm-hr">
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('open_from'))}</p>
        ${swHtml(s.entries.drawer, psmT('entry_drawer'), 'entryToggle', { a: 'drawer' })}
        ${swHtml(psmExtEntryShown(s), psmT('entry_ext'), 'entryToggle', { a: 'ext', disabled: !drawerShown })}
      </div>
      <hr class="psm-hr">
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('backup'))}</p>
        <div class="psm-seg" role="group" aria-label="${esc(psmT('export_what'))}">
          ${[['snapshots', psmT('export_snapshots')], ['folders', psmT('export_folders')], ['both', psmT('export_both')]].map(([k, l]) =>
            `<button type="button" class="${s.exportWhat === k ? 'psm-on' : ''}" data-act="exportWhat" data-a="${k}" aria-pressed="${s.exportWhat === k}">${esc(l)}</button>`).join('')}
        </div>
        <div class="psm-row">${btnHtml(psmT('export'), 'doExport', { icon: 'download', cls: 'psm-wide' })}${btnHtml(psmT('import_btn'), 'doImport', { icon: 'upload', cls: 'psm-wide' })}</div>
        ${cfHtml('import', 'import')}
      </div>
      <hr class="psm-hr">
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('danger_zone'))}</p>
        ${btnHtml(psmT('reset_all'), 'askReset', { icon: 'trash', cls: 'psm-danger-o', attrs: ' style="align-self: flex-start"' })}
        ${cfHtml('reset', 'reset')}
      </div>`;
  }
  
  // ─── Tick mode: "Add to folder" (preset and prompt folders) ───────────────
  // The list itself gets checkboxes and a sticky bar with Cancel / Add N.
  // Ticking an item that sits in another folder moves it here.
  // PSM_SELECT[kind] = { title(folder), add(folder, ids) }
  
  const PSM_SELECT = {
    preset: {
      title: f => psmT('add_to', f),
      add(folder, ids) {
        const m = metaLoad();
        if (!m.folders[folder]) return;
        Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(p => !ids.includes(p)); });
        ids.forEach(p => m.folders[folder].presets.push(p));
        try { metaSave(m); } catch (e) { ERR('add to folder:', e); psmSay('err', psmT('save_failed')); return; }
        expandedFolders.add(folder);
        psmSay('ok', psmT('added_n', ids.length, folder));
      },
    },
  };
  
  function psmStartSel(kind, folder) {
    Object.assign(psmUi, { sel: { kind, folder, ids: new Set() }, selq: '', menu: null, confirm: null, renaming: null,
      newFolder: null, newPF: null, iconFor: null });
    if (kind === 'preset') Object.assign(psmUi, { tab: 'presets', view: 'list' });
    else Object.assign(psmUi, { tab: 'folders', fview: 'list' });
    psmUi._reveal = null;
    psmRender();
    const body = parentDoc.querySelector('#psm-panel .psm-body');
    if (body) body.scrollTop = 0;
  }
  
  function psmSelBarHtml() {
    const k = psmUi.sel;
    const n = k.ids.size;
    const title = PSM_SELECT[k.kind].title(k.folder);
    return `<div class="psm-selbar">
      <div class="psm-selbar-t"><span class="psm-cf-t" title="${esc(title)}">${esc(title)}</span><span class="psm-cap">${esc(psmT('n_selected', n))}</span></div>
      ${btnHtml(psmT('cancel'), 'selCancel')}${btnHtml(n ? psmT('add_n', n) : psmT('add'), 'selAdd', { cls: 'psm-go', disabled: !n })}
    </div>`;
  }
  
  // ─── Drag and drop (SortableJS): preset folders ───────────────────────────
  
  function initPresetSortables(panel) {
    const Sortable = window.parent.Sortable;
    if (!Sortable) return;
    const flist = panel.querySelector('#psm-flist');
    if (!flist) return;
  
    const base = {
      animation:           150,
      delay:               psmIsTouch() ? 150 : 0,
      delayOnTouchOnly:    true,
      touchStartThreshold: 5,
      ghostClass:          'psm-sortable-ghost',
      chosenClass:         'psm-sortable-chosen',
      // Scroll only the panel's own list. Bubbling up would scroll SillyTavern's
      // page too, which shifts the phone sheet away from the finger.
      scroll:              panel.querySelector('.psm-body') || true,
      bubbleScroll:        false,
    };
    // kind 'p' = a preset drag: only then do closed folders take drops.
    const startDrag = kind => { psmDragging = true; panel.classList.add('psm-dragging'); if (kind) panel.classList.add('psm-dragging-' + kind); psmUi.menu = null; };
    const endDrag = () => {
      psmDragging = false;
      panel.classList.remove('psm-dragging', 'psm-dragging-p');
      panel.querySelectorAll('.psm-drag-over').forEach(el => el.classList.remove('psm-drag-over'));
      spacer.remove();
    };
    // While a preset hovers a closed folder it sits in that folder's hidden
    // list. A spacer keeps its old space, so the rows below don't slide up
    // under the pointer.
    const spacer = parentDoc.createElement('div');
    spacer.className = 'psm-drag-spacer';
    let origin = null;
    const redrawSoon = () => setTimeout(() => { psmRenderPending = false; psmRender(); }, 170);
  
    Sortable.create(flist, {
      ...base,
      group:     { name: 'psm-folders', pull: false, put: false },
      draggable: '.psm-fblock',
      handle:    '.psm-frow > .psm-grip',
      onStart:   () => startDrag(),
      onEnd() {
        endDrag();
        const m = metaLoad();
        const shown = [...flist.querySelectorAll(':scope > .psm-fblock')].map(el => el.dataset.folder);
        const hidden = psmFolderOrder(m).filter(f => !shown.includes(f));
        m.folderOrder = [...shown, ...hidden];
        metaSave(m);
        redrawSoon();
      },
    });
  
    // Merge the on-screen order with presets hidden by the filter (or deleted
    // from SillyTavern), so dragging never drops data that isn't shown.
    const mergePresets = (listEl, existing, exclude) => {
      const dom = [...listEl.querySelectorAll(':scope > .psm-pitem')].map(el => el.dataset.preset).filter(Boolean);
      const domSet = new Set(dom);
      return [...dom, ...(existing || []).filter(p => !domSet.has(p) && p !== exclude)];
    };
  
    panel.querySelectorAll('.psm-plist').forEach(el => {
      Sortable.create(el, {
        ...base,
        group:                { name: 'psm-presets', pull: true, put: true },
        draggable:            '.psm-pitem',
        handle:               '.psm-prow > .psm-grip',
        emptyInsertThreshold: 8,
        onStart(evt) {
          startDrag('p');
          origin = { list: evt.from, next: evt.item.nextElementSibling, h: evt.item.offsetHeight };
        },
        onMove(evt) {
          panel.querySelectorAll('.psm-drag-over').forEach(b => b.classList.remove('psm-drag-over'));
          const block = evt.to?.closest?.('.psm-fblock');
          const closed = !!block && evt.to.classList.contains('psm-closed');
          if (closed) block.classList.add('psm-drag-over');
          if (closed && origin && !spacer.isConnected) {
            spacer.style.height = origin.h + 'px';
            const next = origin.next?.parentNode === origin.list ? origin.next : null;
            origin.list.insertBefore(spacer, next);
          } else if (!closed) spacer.remove();
        },
        onEnd(evt) {
          endDrag();
          const from = evt.from.dataset.folder ?? '', to = evt.to.dataset.folder ?? '';
          const moved = evt.item.dataset.preset;
          if (evt.from === evt.to && evt.oldIndex === evt.newIndex) { redrawSoon(); return; }
          const m = metaLoad();
          if (to && m.folders[to]) m.folders[to].presets = mergePresets(evt.to, m.folders[to].presets);
          if (from && from !== to && m.folders[from]) m.folders[from].presets = mergePresets(evt.from, m.folders[from].presets, moved);
          metaSave(m);
          if (to && from !== to) expandedFolders.add(to);
          redrawSoon();
        },
      });
    });
  }
  
  // ─── Data reset / export / import ─────────────────────────────────────────
  
  function doExport(kind) {
    const payload = { version: 1, exported: new Date().toISOString(), kind };
    if (kind === 'snapshots' || kind === 'both') payload.snapshots = dbLoad();
    if (kind === 'folders'   || kind === 'both') payload.meta      = metaLoad();
  
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = window.parent.URL.createObjectURL(blob);
    const a    = parentDoc.createElement('a');
    const tag  = kind === 'snapshots' ? 'snapshots' : kind === 'folders' ? 'folders' : 'backup';
    a.href = url; a.download = 'psm-' + tag + '-' + new Date().toISOString().slice(0, 10) + '.json';
    parentDoc.body.appendChild(a); a.click();
    parentDoc.body.removeChild(a); window.parent.URL.revokeObjectURL(url);
    psmSay('ok', psmT('toast_exported'));
  }
  
  // Reads the file first, then asks inline before replacing anything.
  function importData() {
    const input = parentDoc.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = function(e) {
      const file = e.target.files[0]; if (!file) return;
      const reader = new window.parent.FileReader();
      reader.onload = function(ev) {
        let d;
        try { d = JSON.parse(ev.target.result); } catch { psmSay('err', psmT('toast_read_fail')); return; }
        const hasSnaps = !!d && typeof d.snapshots === 'object' && d.snapshots !== null;
        const hasMeta  = !!d && typeof d.meta      === 'object' && d.meta      !== null;
        if (!hasSnaps && !hasMeta) { psmSay('err', psmT('toast_invalid_backup')); return; }
        psmAsk({
          kind: 'import', id: 'import', danger: true, ok: psmT('overwrite'), title: psmT('import_q'),
          body: (hasSnaps && hasMeta) ? psmT('import_all_body') : hasSnaps ? psmT('import_snaps_body') : psmT('import_meta_body'),
          run() {
            try {
              if (hasSnaps) dbSave(d.snapshots);
              if (hasMeta)  metaSave(d.meta);
            } catch (err) { ERR('import:', err); psmSay('err', psmT('save_failed')); return; }
            psmSay('ok', psmT('toast_imported'));
          },
        });
      };
      reader.onerror = () => psmSay('err', psmT('toast_read_fail'));
      reader.readAsText(file);
    };
    parentDoc.body.appendChild(input); input.click(); parentDoc.body.removeChild(input);
  }
  
  // ─── Presets: folder operations ───────────────────────────────────────────
  
  function psmFolderExists(m, name, except) {
    const k = name.toLowerCase();
    return Object.keys(m.folders).some(f => f !== except && f.toLowerCase() === k);
  }
  
  function psmCreateFolder(rawName, assignPreset) {
    const name = String(rawName || '').trim();
    if (!name) return false;
    const m = metaLoad();
    if (psmFolderExists(m, name)) { psmSay('err', psmT('toast_folder_exists')); return false; }
    m.folders[name] = { presets: [] };
    m.folderOrder = psmFolderOrder(m).filter(f => f !== name).concat(name);
    if (assignPreset) {
      Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(p => p !== assignPreset); });
      m.folders[name].presets.push(assignPreset);
    }
    metaSave(m);
    expandedFolders.add(name);
    return true;
  }
  
  function confirmRename(oldName, rawName) {
    const newName = String(rawName || '').trim();
    if (!newName || newName === oldName) return true;
    const m = metaLoad();
    if (psmFolderExists(m, newName, oldName)) { psmSay('err', psmT('toast_folder_exists')); return false; }
    const order = psmFolderOrder(m);
    m.folders[newName] = m.folders[oldName];
    delete m.folders[oldName];
    m.folderOrder = order.map(f => f === oldName ? newName : f);
    metaSave(m);
    if (expandedFolders.has(oldName)) { expandedFolders.delete(oldName); expandedFolders.add(newName); }
    return true;
  }
  
  function psmSetPresetFolder(pn, folder) {
    const m = metaLoad();
    const was = getFolderForPreset(pn) || '';
    if (was === folder) return;
    Object.values(m.folders).forEach(f => { f.presets = (f.presets || []).filter(p => p !== pn); });
    if (folder && m.folders[folder]) m.folders[folder].presets.push(pn);
    try { metaSave(m); } catch (e) { ERR('set folder:', e); psmSay('err', psmT('save_failed')); }
  }
  
  // ─── Actions ──────────────────────────────────────────────────────────────
  
  function psmOpenPage(pn) {
    Object.assign(psmUi, { tab: 'presets', settings: false, sel: null, view: 'page', pagePreset: pn,
      menu: null, confirm: null, renaming: null, noteEdit: null, saveName: '', newFolderPg: null });
    confirmingSnaps.clear();
  }
  
  Object.assign(PSM_ACTS, {
    close: () => closePanel(),
    dismiss: () => { psmUi.status = null; psmRenderStrip(); },
    retry: () => psmRetry(),
    tab(el) {
      Object.assign(psmUi, { tab: el.dataset.a, settings: false, sel: null, menu: null, confirm: null, renaming: null, fview: 'list' });
      if (el.dataset.a === 'presets') psmUi.view = 'list';
      psmOnTabShown();
    },
    settings() { Object.assign(psmUi, { settings: !psmUi.settings, menu: null, confirm: null, sel: null, renaming: null }); },
    menu(el) {
      const k = el.dataset.a;
      psmUi.menu = psmUi.menu === k ? null : k;
      psmUi.confirm = null;
    },
    cfCancel() { psmUi.confirm = null; },
    cfOk() {
      const c = psmUi.confirm;
      psmUi.confirm = null;
      if (c?.run) c.run();
    },
  
    // list
    clearFilter() { filterText = ''; psmUi._focus = 'filter'; },
    openPage(el) { psmOpenPage(el.dataset.a); },
    toggleNote(el) { toggleSet(expandedNotes, el.dataset.a); },
    editNoteFromList(el) {
      const pn = el.dataset.a;
      psmOpenPage(pn);
      psmUi.noteEdit = pn;
      psmUi.noteDraft = (metaLoad().presetNotes || {})[pn] || '';
      psmUi._focus = 'note';
    },
    folderToggle(el) { if (!filterText.trim()) toggleSet(expandedFolders, el.dataset.a); },
    newFolder() { psmUi.newFolder = ''; psmUi.menu = null; psmUi._focus = 'newFolder'; psmUi._reveal = '[data-fk="newFolder"]'; },
    newFolderCancel() { psmUi.newFolder = null; },
    newFolderOk() { if (psmCreateFolder(psmUi.newFolder)) psmUi.newFolder = null; },
    folderRename(el) {
      Object.assign(psmUi, { renaming: 'f:' + el.dataset.a, renameVal: el.dataset.a, menu: null, _focus: 'rename', _reveal: '[data-fk="rename"]' });
    },
    folderDelete(el) {
      const fname = el.dataset.a;
      const all = new Set(psmPresetNames());
      const n = ((metaLoad().folders[fname] || {}).presets || []).filter(p => all.has(p)).length;
      psmAsk({
        kind: 'delFolder', id: fname, danger: true, ok: psmT('del'),
        title: psmT('del_folder_q', fname),
        body: n ? psmT('del_folder_body') : '',
        run() {
          const m = metaLoad();
          delete m.folders[fname];
          m.folderOrder = (m.folderOrder || []).filter(f => f !== fname);
          metaSave(m);
          expandedFolders.delete(fname);
          psmSay('ok', psmT('toast_deleted', fname));
        },
      });
      return false;
    },
    renameCancel() { psmUi.renaming = null; },
    renameOk() {
      const r = psmUi.renaming;
      if (!r) return;
      const kind = r.slice(0, 1), id = r.slice(2);
      let ok = true;
      if (kind === 'f') ok = confirmRename(id, psmUi.renameVal);
      else if (kind === 's') ok = psmRename(psmUi.pagePreset, id, psmUi.renameVal);
      else if (kind === 'p') ok = pdoRenameFromPanel(id, psmUi.renameVal);
      if (ok) psmUi.renaming = null;
    },
    pickPresets(el) { psmStartSel('preset', el.dataset.a); return false; },
  
    // page
    back() { Object.assign(psmUi, { view: 'list', menu: null, confirm: null, renaming: null }); confirmingSnaps.clear(); },
    setFolder(el) { psmUi.menu = null; psmSetPresetFolder(psmUi.pagePreset, el.dataset.a); },
    newFolderPg() { psmUi.menu = null; psmUi.newFolderPg = ''; psmUi._focus = 'newFolderPg'; psmUi._reveal = '[data-fk="newFolderPg"]'; },
    newFolderPgCancel() { psmUi.newFolderPg = null; },
    newFolderPgOk() { if (psmCreateFolder(psmUi.newFolderPg, psmUi.pagePreset)) psmUi.newFolderPg = null; },
    editNote() {
      psmUi.noteEdit = psmUi.pagePreset;
      psmUi.noteDraft = (metaLoad().presetNotes || {})[psmUi.pagePreset] || '';
      psmUi._focus = 'note';
    },
    noteCancel() { psmUi.noteEdit = null; },
    noteSave() {
      const m = metaLoad();
      m.presetNotes[psmUi.noteEdit] = psmUi.noteDraft.trim();
      try { metaSave(m); } catch (e) { ERR('note:', e); psmSay('err', psmT('save_failed')); return; }
      psmUi.noteEdit = null;
      psmSay('ok', psmT('toast_note_saved'));
    },
    saveSnap() {
      const pn = psmUi.pagePreset, name = psmUi.saveName.trim();
      if (!name || pn !== currentPreset() || psmUi.busy) return;
      const ex = findSnapKey(pn, name);
      if (ex) {
        psmAsk({ kind: 'saveOver', id: 'save', danger: true, ok: psmT('replace'), title: psmT('replace_q', ex), body: '',
          run() { if (psmSave(pn, ex)) psmUi.saveName = ''; } });
        return false;
      }
      if (psmSave(pn, name)) psmUi.saveName = '';
    },
    // Other preset: switch right away. Active preset: reset, after a confirm.
    presetAct() {
      const pn = psmUi.pagePreset;
      if (psmUi.busy) return;
      if (pn !== currentPreset()) { psmApplyOriginal(pn, true); return false; }
      psmAsk({ kind: 'resetPreset', id: pn, danger: true, ok: psmT('reset_btn'), title: psmT('reset_saved_q'), body: psmT('reset_saved_body'),
        run() { psmApplyOriginal(pn); } });
      return false;
    },
    applyAsk(el) {
      confirmingSnaps.clear();
      confirmingSnaps.add(snapKey(psmUi.pagePreset, el.dataset.a));
      psmUi.menu = null; psmUi.confirm = null;
    },
    applyCancel(el) { confirmingSnaps.delete(snapKey(psmUi.pagePreset, el.dataset.a)); },
    applyOk(el) { psmApply(psmUi.pagePreset, el.dataset.a); return false; },
    snapRename(el) { Object.assign(psmUi, { renaming: 's:' + el.dataset.a, renameVal: el.dataset.a, menu: null, _focus: 'renameSnap', _reveal: '.psm-snap [data-fk="renameSnap"]' }); },
    snapOverwrite(el) {
      const key = el.dataset.a, pn = psmUi.pagePreset;
      psmAsk({ kind: 'overSnap', id: key, danger: true, ok: psmT('replace'), title: psmT('replace_cur_q', key), body: '',
        run() { psmSave(pn, key); } });
      return false;
    },
    snapDelete(el) {
      const key = el.dataset.a, pn = psmUi.pagePreset;
      psmAsk({ kind: 'delSnap', id: key, danger: true, ok: psmT('del'), title: psmT('del_q', key), body: '',
        run() { psmDelete(pn, key); } });
      return false;
    },
    toggleStates() { psmUi.statesOpen = !psmUi.statesOpen; },
    toggleShowOff() { psmUi.showOff = !psmUi.showOff; },
  
    // tick mode
    selCancel() { psmUi.sel = null; },
    selAdd() {
      const k = psmUi.sel;
      if (!k || !k.ids.size) return;
      PSM_SELECT[k.kind].add(k.folder, [...k.ids]);
      psmUi.sel = null;
    },
  
    // settings
    toolToggle(el) {
      const s = settingsLoad();
      s.tools[el.dataset.a] = !s.tools[el.dataset.a];
      settingsSave(s);
      psmRefreshEntryRow();
      if (typeof schedulePdoRepaint === 'function') schedulePdoRepaint();
    },
    entryToggle(el) {
      const s = settingsLoad();
      const k = el.dataset.a;
      s.entries[k] = !s.entries[k];
      settingsSave(s);
      psmRefreshEntryRow();
    },
    exportWhat(el) { const s = settingsLoad(); s.exportWhat = el.dataset.a; settingsSave(s); },
    doExport() { doExport(settingsLoad().exportWhat); },
    doImport() { importData(); return false; },
    askReset() {
      psmAsk({ kind: 'reset', id: 'reset', danger: true, ok: psmT('reset_ok'), title: psmT('reset_q'), body: psmT('reset_body'),
        run() {
          dbSave({});
          metaSave({ folders: {}, presetNotes: {}, folderOrder: [] });
          expandedFolders.clear();
          expandedNotes.clear();
          filterText = '';
          psmSay('ok', psmT('toast_data_reset'));
        } });
      return false;
    },
  });
  
  Object.assign(PSM_INPUTS, {
    filter(v) { filterText = v; },
    newFolder(v) { psmUi.newFolder = v; return false; },
    newFolderPg(v) { psmUi.newFolderPg = v; return false; },
    renameVal(v) { psmUi.renameVal = v; return false; },
    noteDraft(v) { psmUi.noteDraft = v; return false; },
    saveName(v) { psmUi.saveName = v; if (psmUi.confirm?.kind === 'saveOver') psmUi.confirm = null; },
    selq(v) { psmUi.selq = v; },
  });
  
  // ─── Event wiring (once) ──────────────────────────────────────────────────
  
  function bindPanelEvents() {
    const panel = parentDoc.getElementById('psm-panel');
    if (!panel || panel.dataset.psmBound === '1') return;
    panel.dataset.psmBound = '1';
  
    panel.addEventListener('click', ev => {
      const el = ev.target.closest('[data-act]');
      // A click anywhere else closes an open ⋯ menu.
      let dirty = false;
      if (psmUi.menu && !ev.target.closest('.psm-menu') && !(el && el.dataset.act === 'menu')) { psmUi.menu = null; dirty = true; }
      if (el && panel.contains(el) && !el.disabled) {
        const fn = PSM_ACTS[el.dataset.act];
        if (fn) {
          ev.preventDefault();
          // An action returns false when it already redrew (or will redraw) itself.
          if (fn(el, ev) !== false) dirty = true;
        }
      }
      if (dirty) psmRender();
    });
  
    panel.addEventListener('change', ev => {
      const cb = ev.target.closest('[data-sel]');
      if (!cb || !psmUi.sel || cb.disabled) return;
      cb.checked ? psmUi.sel.ids.add(cb.dataset.sel) : psmUi.sel.ids.delete(cb.dataset.sel);
      psmRender();
    });
  
    const onInput = el => {
      const fn = PSM_INPUTS[el.dataset.in];
      if (fn && fn(el.value, el) !== false) psmRender();
    };
    // Chinese and other IME input: wait until the word is committed.
    panel.addEventListener('input', ev => {
      const el = ev.target.closest('[data-in]');
      if (!el || ev.isComposing || el._psmComposing) return;
      onInput(el);
    });
    panel.addEventListener('compositionstart', ev => { if (ev.target.dataset?.in) ev.target._psmComposing = true; });
    panel.addEventListener('compositionend', ev => {
      const el = ev.target.closest?.('[data-in]');
      if (!el) return;
      el._psmComposing = false;
      onInput(el);
    });
  
    panel.addEventListener('keydown', ev => {
      const t = ev.target;
      if (ev.key === 'Enter' && t.dataset?.enter && !ev.isComposing && !t._psmComposing) {
        ev.preventDefault();
        const fn = PSM_ACTS[t.dataset.enter];
        if (fn && fn(t, ev) !== false) psmRender();
        return;
      }
      if (ev.key !== 'Escape' || ev.isComposing) return;
      ev.preventDefault();
      if (t.dataset?.esc) { PSM_ACTS[t.dataset.esc]?.(t, ev); psmRender(); return; }
      psmEscape();
    });
  
    bindHeaderDrag(panel);
    bindResizeGrip(panel);
    bindSheetHandle(panel);
  
    // Escape also works when the focus is not inside the window.
    parentDoc.addEventListener('keydown', ev => {
      if (!panelOpen || ev.key !== 'Escape' || ev.isComposing) return;
      if (panel.contains(ev.target)) return;
      if (ev.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      ev.stopPropagation();
      psmEscape();
    }, true);
  }
  
  // Escape steps back one level: menu → confirm → rename → tick mode → close.
  function psmEscape() {
    const u = psmUi;
    if (u.menu) u.menu = null;
    else if (u.confirm) u.confirm = null;
    else if (confirmingSnaps.size) confirmingSnaps.clear();
    else if (u.renaming) u.renaming = null;
    else if (u.iconFor) u.iconFor = null;
    else if (u.sel) u.sel = null;
    else { closePanel(); return; }
    psmRender();
  }
  

  // ─── toolbar.js ──────────────────────────────────────────────────

  // ─── Status strip ─────────────────────────────────────────────────────────
  // One line under the header replaces the old floating toasts. "ok" and "info"
  // fade after 4 s; errors stay until dismissed. While an apply/switch runs, a
  // "working" line with a seconds counter shows instead.
  
  let _statusTimer = null;
  let _busyTicker  = null;
  
  function psmSay(kind, text, extra = {}) {
    clearTimeout(_statusTimer);
    psmUi.status = { kind, text, ...extra };
    if (kind === 'ok' || kind === 'info') {
      _statusTimer = setTimeout(() => { psmUi.status = null; psmRenderStrip(); }, 4000);
    }
    if (!panelOpen && kind === 'err' && window.parent.toastr?.error) window.parent.toastr.error(text);
    psmRenderStrip();
  }
  
  // Error with a "Try again" button that repeats the same apply/switch.
  function psmSayRetry(key, nameArg, presetName, snapName, asSwitch = false) {
    psmSay('err', psmT(key, nameArg), { retry: { presetName, snapName, asSwitch } });
  }
  
  function psmRetry() {
    const r = psmUi.status?.retry;
    if (!r) return;
    psmUi.status = null;
    if (r.snapName === ORIGINAL_KEY) psmApplyOriginal(r.presetName, r.asSwitch);
    else psmApply(r.presetName, r.snapName);
  }
  
  function psmBusyBegin(presetName, snapName) {
    clearTimeout(_statusTimer);
    clearInterval(_busyTicker);
    psmUi.status = null;
    psmUi.busy = { presetName, snapName, label: snapName && snapName !== ORIGINAL_KEY && snapName !== RENAME_KEY ? snapName : null, since: Date.now() };
    _busyTicker = setInterval(psmRenderStrip, 1000);
    psmRender();
  }
  
  // Called from psmRelease(): the operation is over, success or not.
  function psmBusyFinish() {
    clearInterval(_busyTicker);
    if (!psmUi.busy) return;
    psmUi.busy = null;
    confirmingSnaps.clear();
    psmRender();
    psmRefreshEntryRow();
  }
  
  function psmStripHtml() {
    const b = psmUi.busy;
    if (b) {
      const secs = Math.floor((Date.now() - b.since) / 1000);
      const what = b.label ? psmT('applying_x', b.label)
        : b.snapName === ORIGINAL_KEY ? psmT('resetting')
        : b.snapName === RENAME_KEY ? psmT('renaming_x', b.presetName) : psmT('switching_x', b.presetName);
      const text = secs < 1 ? what + '…'
        : what + (isChatReady() ? '' : ' · ' + psmT('waiting_chat')) + ' · ' + secs + 's';
      return `<div class="psm-strip busy" role="status"><span class="psm-spin" aria-hidden="true"></span><span class="psm-strip-t">${esc(text)}</span></div>`;
    }
    const s = psmUi.status;
    if (!s) return '';
    const icon = s.kind === 'ok' ? psmIcon('check', 'st') : s.kind === 'err' ? psmIcon('alert', 'st') : '';
    return `<div class="psm-strip ${esc(s.kind)}" role="status">${icon}<span class="psm-strip-t">${esc(s.text)}</span>
      ${s.retry ? `<button type="button" class="psm-btn psm-sm" data-act="retry">${esc(psmT('try_again'))}</button>` : ''}
      <button type="button" class="psm-ib psm-sm mut" data-act="dismiss" aria-label="${esc(psmT('dismiss'))}" title="${esc(psmT('dismiss'))}">${psmIcon('x')}</button>
    </div>`;
  }
  
  function psmRenderStrip() {
    const el = parentDoc.getElementById('psm-strip');
    if (el) el.innerHTML = psmStripHtml();
    psmPlacePanel();
  }
  
  // ─── SortableJS loader ────────────────────────────────────────────────────
  
  function loadSortable(cb) {
    if (window.parent.Sortable) { cb(); return; }
    const s = parentDoc.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js';
    s.onload = cb;
    s.onerror = () => { ERR('Failed to load SortableJS — drag/drop will be unavailable'); cb(); };
    parentDoc.head.appendChild(s);
  }
  
  // ─── Initial DOM injection ────────────────────────────────────────────────
  
  // No backdrop and no close on an outside click: the window stays usable next
  // to SillyTavern's prompt list (DECISIONS.md D9-1).
  function createAndInjectUI() {
    const panel = parentDoc.createElement('section');
    panel.id = 'psm-panel';
    panel.setAttribute('aria-label', psmT('brand'));
    panel.tabIndex = -1;
  
    parentDoc.body.append(panel);
    try { new window.parent.ResizeObserver(() => { if (panelOpen) psmPlacePanel(); }).observe(panel); } catch (_) {}
  }
  
  // Stop pointer/focus/key bubbling so SillyTavern's AI drawer does not treat
  // interaction with PSM as an outside click / blur and auto-close.
  function bindPanelInteractionIsolation() {
    ['#psm-panel'].forEach(sel => {
      const el = parentDoc.querySelector(sel);
      if (!el || el.dataset.psmIsolate === '1') return;
      el.dataset.psmIsolate = '1';
      ['mousedown', 'pointerdown', 'click', 'touchstart', 'focusin', 'keydown'].forEach(type => {
        el.addEventListener(type, ev => { ev.stopPropagation(); }, false);
      });
    });
  }
  
  // ─── Extension menu entry ─────────────────────────────────────────────────
  
  function injectExtensionMenu() {
    if (parent$('#psm-wand-item', parentDoc).length > 0) return;
    const $container = $('<div/>', { class: 'extension_container interactable psm-ext-container', tabindex: 0 });
    const $item = $('<div/>', {
      id:       'psm-wand-item',
      class:    'list-group-item flex-container flexGap5 interactable',
      tabindex: 0,
      role:     'listitem',
      title:    psmT('brand'),
    }).html('<div class="fa-fw fa-solid fa-layer-group extensionsMenuExtensionButton"></div><span>' + esc(psmT('brand')) + '</span>');
    $container.append($item);
    parent$('#extensionsMenu', parentDoc).append($container);
    $item.on('click', () => {
      const s = settingsLoad();
      openPanel({ tab: s.tools.presets ? 'presets' : 'folders' });
    });
    psmRefreshEntryRow();
  }
  
  // ─── Entry row under the preset dropdown ──────────────────────────────────
  // Its own <div>, inserted as a sibling right after SillyTavern's preset
  // <select> row. It never goes inside a SillyTavern element, so other
  // extensions that add to the same area don't collide with it.
  
  const PSM_ENTRY_ROW_ID = 'psm-entry-row';
  
  function injectEntryRow() {
    if (parentDoc.getElementById(PSM_ENTRY_ROW_ID)) { psmRefreshEntryRow(); return true; }
    const select = parentDoc.getElementById('settings_preset_openai');
    const selectRow = select?.closest('.flex-container');
    if (!selectRow || !selectRow.parentNode) return false;
    const row = parentDoc.createElement('div');
    row.id = PSM_ENTRY_ROW_ID;
    selectRow.insertAdjacentElement('afterend', row);
    row.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-entry]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      if (btn.dataset.entry === 'snapshots') openPanel({ tab: 'presets', page: currentPreset() });
      else openPanel({ tab: 'folders' });
    });
    psmRefreshEntryRow();
    return true;
  }
  
  function scheduleInjectEntryRow() {
    [0, 400, 1200, 2800, 5200].forEach(ms => {
      window.parent.setTimeout(() => { injectEntryRow(); }, ms);
    });
  }
  
  // Shows or hides the entry points after a settings change.
  function psmRefreshEntryRow() {
    const s = settingsLoad();
    const row = parentDoc.getElementById(PSM_ENTRY_ROW_ID);
    if (row) {
      const show = s.entries.drawer && (s.tools.presets || s.tools.folders);
      row.hidden = !show;
      row.innerHTML =
        (s.tools.presets ? `<button type="button" class="psm-btn" data-entry="snapshots" title="${esc(psmT('entry_snapshots'))}">${psmIcon('layers')}<span>${esc(psmT('entry_snapshots'))}</span></button>` : '') +
        (s.tools.folders ? `<button type="button" class="psm-btn" data-entry="folders" title="${esc(psmT('tab_folders'))}">${psmIcon('folder')}<span>${esc(psmT('tab_folders'))}</span></button>` : '');
    }
    parent$('#psm-wand-item', parentDoc).closest('.extension_container').toggle(psmExtEntryShown(s));
  }
  
  // The Extensions menu item stays when it is the only way left to open PSM.
  function psmExtEntryShown(s = settingsLoad()) {
    const drawerShown = s.entries.drawer && (s.tools.presets || s.tools.folders);
    return s.entries.ext || !drawerShown;
  }
  
  // ─── Panel open / close ───────────────────────────────────────────────────
  
  function psmIsSheet() { return window.parent.innerWidth <= 640; }
  function psmIsTouch() {
    return psmIsSheet() || !!window.parent.matchMedia?.('(pointer: coarse)').matches;
  }
  
  // opts.tab: 'presets' | 'folders'; opts.page: open this preset's page.
  function openPanel(opts = {}) {
    const s = settingsLoad();
    panelOpen = true;
    psmUi.settings = false;
    psmUi.sel      = null;
    psmUi.menu     = null;
    psmUi.confirm  = null;
    psmUi.renaming = null;
    psmUi.fview    = 'list';
    psmUi.tab      = opts.tab || psmUi.tab;
    if (psmUi.tab === 'presets') {
      psmUi.view       = opts.page ? 'page' : 'list';
      psmUi.pagePreset = opts.page || '';
      psmUi.saveName   = '';
      psmUi.noteEdit   = null;
    }
    if (!s.tools.presets && !s.tools.folders) psmUi.settings = true;
    const panel = parentDoc.getElementById('psm-panel');
    panel.classList.add('open');
    psmUi._placed = false;
    psmRender();
    psmWatchViewport(true);
    psmOnTabShown();
  }
  
  function closePanel() {
    panelOpen = false;
    psmUi.menu = null;
    psmUi.confirm = null;
    psmUi.renaming = null;
    psmUi.sel = null;
    confirmingSnaps.clear();
    parentDoc.getElementById('psm-panel')?.classList.remove('open');
    psmSetDrawerPad(0);
    psmWatchViewport(false);
  }
  
  // Phone: the Prompt folders tab is used next to SillyTavern's prompt list, so
  // it opens the AI settings drawer and scrolls the list into the space above
  // the sheet.
  function psmOnTabShown() {
    if (!panelOpen || !psmIsSheet() || psmUi.settings || psmUi.tab !== 'folders') return;
    const opened = typeof pdoOpenPromptDrawer === 'function' && pdoOpenPromptDrawer();
    setTimeout(() => {
      const el = parentDoc.getElementById('pdo-search-bar') || parentDoc.getElementById('completion_prompt_manager');
      if (el) psmScrollAboveSheet(el, 'top');
    }, opened ? 350 : 60);
  }
  
  // Scrolls el's scroll box so el shows in the free space above the phone
  // sheet: at its top, or centred.
  function psmScrollAboveSheet(el, where = 'center') {
    let box = el.parentElement;
    while (box && box !== parentDoc.body) {
      const oy = window.parent.getComputedStyle(box).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) break;
      box = box.parentElement;
    }
    if (!box || box === parentDoc.body) { el.scrollIntoView({ behavior: 'smooth', block: where === 'top' ? 'start' : 'center' }); return; }
    const panel = parentDoc.getElementById('psm-panel');
    const br = box.getBoundingClientRect(), er = el.getBoundingClientRect();
    let top = Math.max(br.top, psmTopBarBottom());
    // Things floating over the top of the scroll box (the drawer's
    // "Click slider numbers…" line) would cover el.
    [...(box.parentElement?.children || [])].forEach(c => {
      if (c === box || window.parent.getComputedStyle(c).position !== 'absolute') return;
      const r = c.getBoundingClientRect();
      if (r.height && r.top <= top + 4 && r.bottom > top) top = r.bottom;
    });
    const bottom = panelOpen && psmIsSheet() && panel ? Math.min(br.bottom, panel.getBoundingClientRect().top) : br.bottom;
    const rel = er.top - br.top + box.scrollTop;
    const offset = where === 'top' ? top - br.top + 8 : (top - br.top) + Math.max(0, (bottom - top - er.height) / 2);
    box.scrollTo({ top: Math.max(0, rel - offset), behavior: 'smooth' });
  }
  
  // ─── Placement ────────────────────────────────────────────────────────────
  // Desktop: a floating window. The user moves it by the header and resizes it
  // from the corner; place and size are saved in psm_v1_pos. It never runs off
  // the screen: a window lower down gets shorter and scrolls.
  // Phone (≤ 640 px wide): a bottom sheet. Its height is set with the handle,
  // one height per tab, and it stays above the on-screen keyboard.
  
  const PSM_WIN_W = 330, PSM_WIN_MIN_W = 300, PSM_WIN_MAX_W = 640, PSM_WIN_MIN_H = 220;
  
  function psmDefaultPos(pw) {
    const vw = window.parent.innerWidth;
    const drawer = parentDoc.getElementById('left-nav-panel');
    const r = drawer?.getBoundingClientRect();
    const drawerOpen = drawer && r && r.width > 0 && r.right > 0 && getComputedStyle(drawer).display !== 'none';
    if (drawerOpen && r.right + 10 + pw <= vw - 10) return { top: 44, left: Math.round(r.right + 10) };
    return { top: 44, left: Math.round((vw - pw) / 2) };
  }
  
  function psmClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  
  function psmPlacePanel() {
    const panel = parentDoc.getElementById('psm-panel');
    if (!panel || !panelOpen || psmUi._sizing) return;
    const sheet = psmIsSheet();
    panel.classList.toggle('psm-sheet', sheet);
    panel.classList.toggle('psm-float', !sheet);
    panel.classList.toggle('psm-touch', psmIsTouch());
  
    if (sheet) {
      psmPlaceSheet(panel);
      return;
    }
    psmSetDrawerPad(0);
    panel.style.removeProperty('bottom');
    const margin = 10;
    const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
    const saved = posLoad() || {};
    const w = psmClamp(saved.w || PSM_WIN_W, Math.min(PSM_WIN_MIN_W, vw - 2 * margin), Math.min(PSM_WIN_MAX_W, vw - 2 * margin));
    panel.style.setProperty('width', w + 'px', 'important');
    if (!psmUi._placed) {
      const pos = saved.top !== undefined && saved.left !== undefined ? saved : psmDefaultPos(w);
      panel.style.setProperty('top',  pos.top  + 'px', 'important');
      panel.style.setProperty('left', pos.left + 'px', 'important');
      psmUi._placed = true;
    }
    const top  = psmClamp(parseFloat(panel.style.top)  || 0, margin, Math.max(margin, vh - 120));
    const left = psmClamp(parseFloat(panel.style.left) || 0, margin, Math.max(margin, vw - w - margin));
    // Lower down there is less room: the window gets shorter, never off-screen.
    const room = vh - top - 8;
    panel.style.setProperty('top',  top  + 'px', 'important');
    panel.style.setProperty('left', left + 'px', 'important');
    panel.style.setProperty('max-height', room + 'px', 'important');
    if (saved.h) panel.style.setProperty('height', Math.min(Math.max(saved.h, PSM_WIN_MIN_H), room) + 'px', 'important');
    else panel.style.removeProperty('height');
  }
  
  // Bottom of SillyTavern's top bar: the sheet never covers it.
  function psmTopBarBottom() {
    let b = 0;
    ['top-settings-holder', 'top-bar'].forEach(id => {
      const r = parentDoc.getElementById(id)?.getBoundingClientRect();
      if (r && r.height > 0 && r.bottom < 150) b = Math.max(b, r.bottom);
    });
    return Math.round(b || 50);
  }
  
  // On phones SillyTavern's root element has no height and is the anchor for
  // fixed elements, so "bottom: 0" would land at the top of the screen. The
  // sheet is placed from the top, using the measured screen height.
  // The keyboard: Android with SillyTavern's "resizes-content" viewport shrinks
  // innerHeight (the tallest height seen at this width is the full screen);
  // iOS does not, so the visual viewport is read too.
  let _psmFullH = { w: 0, h: 0 };
  function psmSheetGeom() {
    const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
    if (_psmFullH.w !== vw) _psmFullH = { w: vw, h: vh };
    else _psmFullH.h = Math.max(_psmFullH.h, vh);
    let bottom = vh, kb = _psmFullH.h - vh;
    const vv = window.parent.visualViewport;
    if (vv) {
      const k = vh - vv.height - vv.offsetTop;
      if (k > 80) { bottom = Math.round(vv.height + vv.offsetTop); kb = Math.max(kb, k); }
    }
    return { bottom, kb: kb > 80 ? kb : 0, full: _psmFullH.h, topMin: psmTopBarBottom() };
  }
  
  // Sheet sizes as a share of the screen (from the 390 × 844 design).
  const PSM_SHEET_STEPS = [360 / 844, 620 / 844];
  const PSM_SHEET_DEFAULT = { presets: 620 / 844, folders: 400 / 844 };
  const PSM_SHEET_MIN = 140, PSM_SHEET_CLOSE = 200, PSM_SHEET_KB_MIN = 240;
  
  function psmSheetTab() { return psmUi.tab === 'folders' && !psmUi.settings ? 'folders' : 'presets'; }
  
  function psmSheetHeight(g = psmSheetGeom()) {
    const want = psmUi.sheetH[psmSheetTab()] * g.full;
    const h = g.kb ? Math.max(want - g.kb, PSM_SHEET_KB_MIN) : want;
    return Math.round(psmClamp(h, PSM_SHEET_MIN, g.bottom - g.topMin));
  }
  
  function psmPlaceSheet(panel, h) {
    const g = psmSheetGeom();
    if (h === undefined) h = psmSheetHeight(g);
    ['width', 'max-height'].forEach(k => panel.style.removeProperty(k));
    panel.style.setProperty('height', h + 'px', 'important');
    panel.style.setProperty('top', (g.bottom - h) + 'px', 'important');
    psmSetDrawerPad(h + 16);
  }
  
  // Lets SillyTavern's AI settings drawer scroll its content up above the sheet.
  function psmSetDrawerPad(px) {
    const body = parentDoc.body;
    body.classList.toggle('psm-sheet-pad', px > 0);
    if (px > 0) body.style.setProperty('--psm-sheet-pad', px + 'px');
    else body.style.removeProperty('--psm-sheet-pad');
  }
  
  let _vvWatching = false;
  function _onViewportChange() { if (panelOpen) psmPlacePanel(); }
  function psmWatchViewport(on) {
    const vv = window.parent.visualViewport;
    if (!vv || on === _vvWatching) return;
    _vvWatching = on;
    if (on) { vv.addEventListener('resize', _onViewportChange); vv.addEventListener('scroll', _onViewportChange); }
    else    { vv.removeEventListener('resize', _onViewportChange); vv.removeEventListener('scroll', _onViewportChange); }
  }
  
  // ─── Pointer drags: header (move), corner (resize), sheet handle ──────────
  
  function psmPointerDrag(e, onMove, onUp) {
    const end = ev => {
      parentDoc.removeEventListener('pointermove', onMove);
      parentDoc.removeEventListener('pointerup', end);
      parentDoc.removeEventListener('pointercancel', end);
      onUp(ev);
    };
    parentDoc.addEventListener('pointermove', onMove);
    parentDoc.addEventListener('pointerup', end);
    parentDoc.addEventListener('pointercancel', end);
  }
  
  function bindHeaderDrag(panel) {
    panel.addEventListener('pointerdown', e => {
      if (!panel.classList.contains('psm-float')) return;
      const head = e.target.closest('.psm-h');
      if (!head || e.target.closest('button, input')) return;
      if (e.button !== undefined && e.button !== 0) return;
      const startX = e.clientX, startY = e.clientY;
      const startTop = parseFloat(panel.style.top) || 0, startLeft = parseFloat(panel.style.left) || 0;
      let moved = false;
      psmPointerDrag(e, ev => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
        if (!moved) return;
        ev.preventDefault();
        const margin = 10, pw = panel.offsetWidth;
        const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
        panel.style.setProperty('top',  psmClamp(startTop  + dy, margin, Math.max(margin, vh - 120)) + 'px', 'important');
        panel.style.setProperty('left', psmClamp(startLeft + dx, margin, Math.max(margin, vw - pw - margin)) + 'px', 'important');
        psmPlacePanel();
      }, () => {
        if (moved) posSave({ top: parseFloat(panel.style.top), left: parseFloat(panel.style.left) });
      });
    });
  }
  
  function bindResizeGrip(panel) {
    panel.addEventListener('pointerdown', e => {
      if (!panel.classList.contains('psm-float') || !e.target.closest('[data-rsz]')) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const x0 = e.clientX, y0 = e.clientY, w0 = panel.offsetWidth, h0 = panel.offsetHeight;
      let size = null;
      psmUi._sizing = true;
      psmPointerDrag(e, ev => {
        ev.preventDefault();
        const vw = window.parent.innerWidth, vh = window.parent.innerHeight;
        const left = parseFloat(panel.style.left) || 0, top = parseFloat(panel.style.top) || 0;
        size = {
          w: Math.round(psmClamp(w0 + ev.clientX - x0, PSM_WIN_MIN_W, Math.min(PSM_WIN_MAX_W, vw - left - 4))),
          h: Math.round(psmClamp(h0 + ev.clientY - y0, PSM_WIN_MIN_H, vh - top - 8)),
        };
        panel.style.setProperty('width', size.w + 'px', 'important');
        panel.style.setProperty('height', size.h + 'px', 'important');
      }, () => { psmUi._sizing = false; if (size) posSave(size); psmPlacePanel(); });
    });
  }
  
  // Phone: drag the handle to resize (below 200 px closes); tap it to step
  // through the sizes.
  function bindSheetHandle(panel) {
    let moved = false;
    panel.addEventListener('pointerdown', e => {
      if (!panel.classList.contains('psm-sheet') || !e.target.closest('[data-grab]')) return;
      const y0 = e.clientY, h0 = panel.offsetHeight;
      let h = h0;
      moved = false;
      psmPointerDrag(e, ev => {
        const dy = ev.clientY - y0;
        if (!moved && Math.abs(dy) > 5) { moved = true; psmUi._sizing = true; panel.classList.add('psm-sheet-drag'); }
        if (!moved) return;
        ev.preventDefault();
        const g = psmSheetGeom();
        h = Math.round(psmClamp(h0 - dy, PSM_SHEET_MIN, g.bottom - g.topMin));
        psmPlaceSheet(panel, h);
      }, () => {
        panel.classList.remove('psm-sheet-drag');
        psmUi._sizing = false;
        if (!moved) return;
        const tab = psmSheetTab();
        if (h < PSM_SHEET_CLOSE) { psmUi.sheetH[tab] = PSM_SHEET_DEFAULT[tab]; closePanel(); return; }
        const g = psmSheetGeom();
        psmUi.sheetH[tab] = (h + g.kb) / g.full;
        psmPlacePanel();
      });
    });
    panel.addEventListener('click', e => {
      if (!e.target.closest('[data-grab]')) return;
      e.preventDefault();
      if (moved) { moved = false; return; }
      const g = psmSheetGeom();
      const cur = panel.offsetHeight + g.kb;
      const steps = [...PSM_SHEET_STEPS.map(f => f * g.full), g.full - g.topMin];
      const next = steps.find(x => x > cur + 10) || steps[0];
      psmUi.sheetH[psmSheetTab()] = next / g.full;
      psmPlacePanel();
    });
  }
  

  // ─── index.js ────────────────────────────────────────────────────

  // ─── Init ─────────────────────────────────────────────────────────────────
  
  function init() {
    injectStyles();
    createAndInjectUI();
    bindPanelInteractionIsolation();
    bindPanelEvents();
    injectExtensionMenu();
    scheduleInjectEntryRow();
  
    loadSortable(() => {
      // Register the permanent chat-ready state machine listeners.
      // These run for the lifetime of the script and track whether it is
      // safe to write — independently of any preset switch.
      initChatReadyListeners();
      psmInitRenameListeners();
  
      try {
        eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
          const pn = currentPreset();
          const n  = snapCountFor(pn);
          LOG('preset changed → "' + pn + '", ' + n + ' snapshots');
          if (pendingApply?.original) {
            const { presetName, asSwitch } = pendingApply;
            pendingApply = null;
            psmFinishOriginalSwitch(presetName, asSwitch);
          } else if (pendingApply) {
            const { presetName, snapName } = pendingApply;
            pendingApply = null;
            const snap = (dbLoad()[presetName] || {})[snapName];
            // psmApplyStates calls waitForChatReady() internally — it will
            // block until the chat-ready state machine clears the load.
            if (snap) psmApplyStates(presetName, snapName, snap);
            else {
              ERR('Snapshot vanished during switch:', snapName);
              psmSay('err', psmT('apply_failed', snapName));
              psmRelease();
            }
          } else {
            // A switch from outside PSM: drop any half-finished confirm.
            confirmingSnaps.clear();
          }
          // Stay on the same page; just show the new state.
          if (panelOpen) psmRender();
          psmRefreshEntryRow();
        });
      } catch(e) { ERR('eventOn failed:', e); }
  
      $(window).on('pagehide', () => {
        parent$('#psm-panel, #' + STYLE_ID + ', #psm-wand-item, #' + PSM_ENTRY_ROW_ID, parentDoc).remove();
        parent$('#extensionsMenu .psm-ext-container', parentDoc).remove();
        psmSetDrawerPad(0);
      });
  
      window.parent.addEventListener('resize', () => {
        if (panelOpen) psmPlacePanel();
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
    if (panel && panelOpen && psmUi.tab === 'folders') psmRender();
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
    // First whole character, so emoji like ✍️ or 👩‍💻 keep all their parts.
    const str = String(icon || '').trim();
    let first = '';
    try { first = [...new Intl.Segmenter().segment(str)][0]?.segment || ''; }
    catch (_) { first = Array.from(str)[0] || ''; }
    const clean = first || PDO_DEFAULT_ICON;
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
    return duplicate ? 'dup' : true;
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
  

  // ─── divs-styles.js ──────────────────────────────────────────────

  // Prompt Folders styles for what PSM adds to SillyTavern's prompt list: the
  // bar above it, folder headers and member rows. The bar
  // reuses the PSM atoms (.psm-btn, .psm-ib, .psm-inp) from src/ui/styles.js.
  
  function injectDivStyles() {
    if (parent$('#' + PDO_STYLE_ID, parentDoc).length > 0) return;
  
    const bodyFont = window.parent.getComputedStyle(parentDoc.body).fontFamily || 'var(--mainFontFamily)';
    const L = '#completion_prompt_manager_list';
  
    const css = `
      /* ── Bar above the prompt list: search + collapse/expand, one row ── */
      #pdo-search-bar {
        display: flex; align-items: center; gap: 2px; width: 100%; min-width: 0; max-width: 100%;
        padding: 0; margin: 0 0 8px;
        /* Never let long text or the buttons widen SillyTavern's settings column. */
        contain: inline-size;
        font-family: ${bodyFont}; font-size: 14px; color: var(--psm-fg); line-height: 1.4;
      }
      #pdo-search-bar #pdo-bar-row { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
      #pdo-search-bar #pdo-bar-row[hidden], #pdo-search-bar .psm-ib[hidden] { display: none; }
      #pdo-search-bar .psm-inp { background: transparent; }
      @media (pointer: coarse) {
        #pdo-search-bar, #pdo-search-bar #pdo-bar-row { gap: 0; }
        #pdo-search-bar .psm-i { width: 18px; height: 18px; }
        #pdo-search-bar .psm-ib, #pdo-search-bar .psm-ib.psm-sm { width: 44px; height: 44px; }
        #pdo-search-bar .psm-inp { height: 44px; padding-left: 38px; padding-right: 46px; }
        #pdo-search-bar .psm-srch > .psm-i { left: 12px; }
        #pdo-search-bar .psm-srch .psm-ib { right: 0; }
      }
  
      /* ── Folder headers inside the list ─────────────────────────────── */
      ${L} > .pdo-folder-header {
        display: flex !important; align-items: center !important; gap: 8px !important;
        grid-template-columns: none !important; list-style: none;
        min-height: 34px; box-sizing: border-box; padding: 0 6px !important; margin: 4px 0 6px !important;
        border: none !important; border-bottom: 1px solid color-mix(in oklab, var(--SmartThemeBorderColor) 32%, transparent) !important;
        border-radius: 0; background: none; color: var(--SmartThemeBodyColor);
        font-size: 14px; font-weight: 600; user-select: none; -webkit-user-select: none; cursor: pointer;
        contain: inline-size;
      }
      @media (pointer: coarse) { ${L} > .pdo-folder-header { min-height: 44px; } }
      @media (hover: hover) {
        ${L} > .pdo-folder-header:hover { background: color-mix(in oklab, var(--SmartThemeBodyColor) 7%, transparent); }
      }
      ${L} > .pdo-folder-header:focus-visible { outline: 1px solid var(--SmartThemeQuoteColor); outline-offset: -1px; }
      ${L} > .pdo-folder-header .pdo-native-chevron {
        width: 16px; height: 16px; flex: 0 0 auto; color: color-mix(in oklab, var(--SmartThemeBodyColor) 70%, transparent);
        transition: transform .15s;
      }
      ${L} > .pdo-folder-header .pdo-native-chevron.open { transform: rotate(90deg); }
      ${L} > .pdo-folder-header .pdo-native-icon { flex: 0 0 auto; width: 20px; text-align: center; font-size: 15px; line-height: 1; }
      ${L} > .pdo-folder-header .pdo-native-title { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      ${L} > .pdo-folder-header .pdo-native-count {
        flex: 0 0 auto; font-weight: 400; font-size: 13px; font-variant-numeric: tabular-nums;
        color: color-mix(in oklab, var(--SmartThemeBodyColor) 70%, transparent);
      }
  
      /* Prompts inside a folder sit indented under its header. */
      ${L}.pdo-headers-on > li[data-pdo-folder] { margin-left: 14px !important; width: calc(100% - 14px) !important; }
      /* While headers show, SillyTavern's drag is off: dim its handles to say so. */
      ${L}.pdo-headers-on > li .drag-handle { opacity: .3; }
  
      /* Brief highlight pulse after "show in prompt list" */
      @keyframes pdo-flash-pulse {
        0%, 50% { box-shadow: 0 0 0 2px var(--SmartThemeQuoteColor) inset; background: color-mix(in oklab, var(--SmartThemeQuoteColor) 30%, transparent); }
        100%    { box-shadow: 0 0 0 0 transparent inset; background: transparent; }
      }
      ${L} > li.pdo-flash { animation: pdo-flash-pulse 1.6s ease-out; }
  
      /* While searching: only matching prompts and their folder headers show. */
      ${L}.pdo-search-active > li[data-pm-identifier]:not(.pdo-search-hit) { display: none !important; }
      ${L}.pdo-search-active > .pdo-folder-header:not(.pdo-search-folder-active) { display: none !important; }
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
      return [
        `#completion_prompt_manager_list.${c} > .${m}{display:none!important;}`,
        `#completion_prompt_manager_list.pdo-search-active.${c} > .${m}.pdo-search-hit{display:revert!important;}`,
      ].join('\n');
    }).join('\n');
  }
  

  // ─── divs-decorator.js ───────────────────────────────────────────

  // Decorates SillyTavern's native prompt list without moving native prompt rows.
  
  let pdoRepaintQueued = false;
  let pdoApplyingDecorations = false;
  let pdoSearchQuery = '';
  let pdoSearchDebounce = null;
  
  // Folder headers stay off while the tool is off or the user hid them.
  // SillyTavern's own drag works only then.
  function pdoHeadersOff() {
    return pdoIsHidden() || !settingsLoad().tools.folders;
  }
  
  function schedulePdoRepaint() {
    if (pdoRepaintQueued) return;
    pdoRepaintQueued = true;
    // queueMicrotask, not requestAnimationFrame: RAF gets throttled (background tabs,
    // power-saver, devtools attached) which leaves pdoUpdateCollapseRules stale for
    // multi-second windows after the user creates a folder. Microtask fires before
    // any subsequent user interaction so the new folder's CSS rule is always current
    // by the time the user clicks its host-list header.
    const queue = window.parent.queueMicrotask || window.queueMicrotask || (cb => Promise.resolve().then(cb));
    queue(() => {
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
    if (targetEl?.closest?.('#pdo-search-bar')) return true;
    if (targetEl && targetEl.id !== 'completion_prompt_manager_list'
        && targetEl.id !== 'completion_prompt_manager'
        && targetEl.closest?.('li[data-pm-identifier]')) {
      return true;
    }
    const added = [...mutation.addedNodes || []].filter(node => node.nodeType === 1);
    const removed = [...mutation.removedNodes || []].filter(node => node.nodeType === 1);
    if (!added.length && !removed.length) return false;
    // Only PSM-OWNED removals are ignorable — specifically the .pdo-folder-header
    // rows that applyDecorations strips and re-inserts each pass. If we treat any
    // pdo-class node removal as ignorable we'd miss ST deleting a prompt row that
    // happened to carry a pdo-member-* class.
    const isPsmOwned = el => el.classList?.contains('pdo-folder-header') || el.id === 'pdo-search-bar';
    const isPsmAdded = el => [...el.classList || []].some(cls => cls.startsWith('pdo-'))
        || !!el.querySelector?.('[class*="pdo-"]');
    return added.every(isPsmAdded) && removed.every(isPsmOwned);
  }
  
  function pdoCleanPromptRow(row) {
    [...row.classList].forEach(cls => {
      if (cls.startsWith('pdo-member-')) row.classList.remove(cls);
    });
    row.classList.remove('pdo-search-hit');
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
    li.setAttribute('aria-expanded', String(!collapsed));
    li.innerHTML = `
      ${psmIcon('chevR', 'pdo-native-chevron' + (collapsed ? '' : ' open'))}
      <span class="pdo-native-icon" aria-hidden="true">${esc(folder.icon || PDO_DEFAULT_ICON)}</span>
      <span class="pdo-native-title">${esc(folder.name)}</span>
      <span class="pdo-native-count">${count}</span>
    `;
    const toggle = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const presetName = currentPreset();
      const next = !pdoIsCollapsed(presetName, folderId, folder);
      pdoSetCollapsed(presetName, folderId, next, { panel: true, repaint: false });
      const list = pdoListEl();
      if (list) list.classList.toggle(pdoCollapsedClass(folderId), next);
      pdoSetHeaderOpen(list, folderId, !next);
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
  
  function pdoSetHeaderOpen(list, folderId, open) {
    const header = list?.querySelector(':scope > .pdo-folder-header-' + folderId);
    if (!header) return;
    header.setAttribute('aria-expanded', String(open));
    header.querySelector('.pdo-native-chevron')?.classList.toggle('open', open);
  }
  
  function pdoManageSortable() {
    try {
      const $list = parent$('#completion_prompt_manager_list', parentDoc);
      if (!$list.length || !$list.sortable('instance')) return;
      if (pdoHeadersOff()) {
        $list.sortable('enable');
      } else {
        $list.sortable('disable');
      }
    } catch (_) { /* sortable not initialized yet */ }
  }
  
  function applyDecorations() {
    const list = pdoListEl();
    if (!list) return;
  
    pdoEnsureSearchBar();
  
    if (pdoHeadersOff()) {
      list.classList.remove('pdo-headers-on');
      list.querySelectorAll(':scope > .pdo-folder-header').forEach(h => h.remove());
      pdoCleanListClasses(list);
      list.classList.remove('pdo-search-active');
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
      list.classList.add('pdo-headers-on');
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
      // Defer the reset by one microtask. Mutations made above are delivered to
      // the observer as a microtask queued BEFORE this one (FIFO). That observer
      // tick must still see pdoApplyingDecorations === true so it returns early
      // instead of looping back via schedulePdoRepaint.
      const queue = window.parent.queueMicrotask || window.queueMicrotask || (cb => Promise.resolve().then(cb));
      queue(() => { pdoApplyingDecorations = false; });
    }
  
    if (pdoSearchQuery) pdoApplySearch(pdoSearchQuery);
    else list.classList.remove('pdo-search-active');
  }
  
  function initPdoDecorator() {
    if (parentDoc._pdoObserver) {
      pdoEnsureSearchBar();
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
    pdoEnsureSearchBar();
    schedulePdoRepaint();
  }
  
  function pdoGotoPrompt(promptId) {
    const list = pdoListEl();
    if (!list || !promptId) return;
    const selector = (window.parent.CSS && CSS.escape) ? CSS.escape(promptId) : promptId.replace(/"/g, '\\"');
    const row = list.querySelector(':scope > li[data-pm-identifier="' + selector + '"]');
    if (!row) { pdoNotify(psmT('prompt_not_found')); return; }
  
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const folderId = cfg.assignments[promptId];
    if (folderId && cfg.folders[folderId] && pdoIsCollapsed(presetName, folderId, cfg.folders[folderId])) {
      pdoSetCollapsed(presetName, folderId, false, { panel: true, repaint: false });
      list.classList.remove(pdoCollapsedClass(folderId));
      pdoSetHeaderOpen(list, folderId, true);
    }
  
    const raf = window.parent.requestAnimationFrame || window.requestAnimationFrame;
    raf(() => {
      psmScrollAboveSheet(row, 'center');
      row.classList.add('pdo-flash');
      setTimeout(() => row.classList.remove('pdo-flash'), 1700);
    });
  }
  
  // The bar above SillyTavern's prompt list: one row with the search box and
  // collapse/expand all. The search box is built once and kept, so typing is
  // never interrupted; the buttons are rebuilt only when the settings change.
  function pdoEnsureSearchBar() {
    const list = pdoListEl();
    if (!list || !list.parentNode) return;
    const s = settingsLoad();
    let bar = parentDoc.getElementById('pdo-search-bar');
  
    if (!s.tools.search) {
      bar?.remove();
      if (pdoSearchQuery) { pdoSearchQuery = ''; list.classList.remove('pdo-search-active'); }
      return;
    }
  
    if (!bar) {
      bar = parentDoc.createElement('div');
      bar.id = 'pdo-search-bar';
      bar.setAttribute('data-pdo-ignore', '1');
      bar.innerHTML =
        '<div class="psm-srch">' + psmIcon('search') +
          '<input type="text" id="pdo-search-input" class="psm-inp" placeholder="' + esc(psmT('search_prompts_short')) + '" aria-label="' + esc(psmT('search_prompts_label')) + '" autocomplete="off" />' +
          '<button type="button" id="pdo-search-clear" class="psm-ib psm-sm mut" aria-label="' + esc(psmT('clear_search')) + '" title="' + esc(psmT('clear_search')) + '" hidden>' + psmIcon('x') + '</button>' +
        '</div><span id="pdo-bar-row"></span>';
      list.parentNode.insertBefore(bar, list);
      pdoStopBubble(bar);
      pdoBindSearchBar(bar);
    } else if (bar.nextElementSibling !== list) {
      list.parentNode.insertBefore(bar, list);
    }
  
    const sig = [s.tools.folders, PSM_LANG].join('|');
    const row = bar.querySelector('#pdo-bar-row');
    if (row.dataset.sig !== sig) {
      row.dataset.sig = sig;
      row.hidden = !s.tools.folders;
      row.innerHTML = !s.tools.folders ? '' :
        ibHtml('collapse', null, psmT('collapse_all'), { cls: 'mut', attrs: ' data-bar="collapse"' }) +
        ibHtml('expand', null, psmT('expand_all'), { cls: 'mut', attrs: ' data-bar="expand"' });
    }
  }
  
  function pdoBindSearchBar(bar) {
    const input = bar.querySelector('#pdo-search-input');
    const clear = bar.querySelector('#pdo-search-clear');
    input.value = pdoSearchQuery;
    clear.hidden = !input.value;
    const run = () => {
      clear.hidden = !input.value;
      clearTimeout(pdoSearchDebounce);
      const val = input.value;
      pdoSearchDebounce = setTimeout(() => pdoApplySearch(val), 150);
    };
    input.addEventListener('input', e => { if (!e.isComposing) run(); });
    input.addEventListener('compositionend', run);
    clear.addEventListener('click', () => {
      clearTimeout(pdoSearchDebounce);
      input.value = '';
      clear.hidden = true;
      pdoApplySearch('');
      input.focus();
    });
    bar.addEventListener('click', ev => {
      const b = ev.target.closest('[data-bar]');
      if (!b) return;
      const what = b.dataset.bar;
      if (what === 'collapse') pdoSetAllFoldersCollapsed(true);
      if (what === 'expand') pdoSetAllFoldersCollapsed(false);
    });
  }
  
  function pdoSetAllFoldersCollapsed(collapsed) {
    const list = pdoListEl();
    if (!list) return;
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    Object.keys(cfg.folders || {}).forEach(folderId => {
      pdoSetCollapsed(presetName, folderId, collapsed, { panel: false, repaint: false });
      list.classList.toggle(pdoCollapsedClass(folderId), collapsed);
      pdoSetHeaderOpen(list, folderId, !collapsed);
    });
  }
  
  function pdoApplySearch(query) {
    pdoSearchQuery = String(query || '').trim().toLowerCase();
    const list = pdoListEl();
    if (!list) return;
  
    list.querySelectorAll(':scope > li[data-pm-identifier].pdo-search-hit')
        .forEach(r => r.classList.remove('pdo-search-hit'));
    list.querySelectorAll(':scope > .pdo-folder-header.pdo-search-folder-active')
        .forEach(h => h.classList.remove('pdo-search-folder-active'));
  
    if (!pdoSearchQuery) {
      list.classList.remove('pdo-search-active');
      return;
    }
  
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const source = pdoReadPromptSource();
    const hits = new Set();
    source.forEach(p => {
      const id = String(p?.identifier ?? p?.id ?? '');
      if (!id) return;
      const hay = (String(p?.name || '') + '\n' + String(p?.content || '')).toLowerCase();
      if (hay.includes(pdoSearchQuery)) hits.add(id);
    });
  
    const folderHits = new Set();
    list.querySelectorAll(':scope > li[data-pm-identifier]').forEach(row => {
      const id = row.getAttribute('data-pm-identifier');
      if (!id || !hits.has(id)) return;
      row.classList.add('pdo-search-hit');
      const fid = cfg.assignments[id];
      if (fid) folderHits.add(fid);
    });
    folderHits.forEach(fid => {
      const header = list.querySelector(':scope > .pdo-folder-header-' + fid);
      if (header) header.classList.add('pdo-search-folder-active');
    });
    list.classList.add('pdo-search-active');
  }
  

  // ─── divs-panel.js ───────────────────────────────────────────────

  // Prompt Folders tab of the PSM window: folder list, icon picker, templates,
  // tick mode for adding prompts and "show in prompt list". Rendering and event
  // wiring are shared with the Presets tab (see src/ui/panel.js).
  
  const PDO_PANEL_ICONS = ['📁', '✍️', '🔥', '🎭', '⚙️', '💬', '🧠', '🌙', '⭐', '🔒', '📌', '🧪'];
  
  function pdoNotify(msg) {
    if (panelOpen) psmSay('info', msg);
    else if (window.parent.toastr?.info) window.parent.toastr.info(msg);
    else LOG('Prompt Folders:', msg);
  }
  
  function pdoFoldersHtml() {
    const presetName = currentPreset();
    const cfg = pdoGetPresetConfig(presetName);
    const prompts = pdoReadPrompts();
    const counts = pdoFolderCounts(cfg, prompts);
    const shown = !pdoIsHidden();
    const u = psmUi;
  
    const blocks = cfg.folderOrder.map(id => {
      const f = cfg.folders[id];
      if (!f) return '';
      const open = u.pfOpen.has(id);
      const renaming = u.renaming === 'p:' + id;
      const menuOpen = u.menu === 'p:' + id;
      const items = pdoPromptsForFolder(cfg, id, prompts);
      const n = counts[id] || 0;
      const iconOpen = u.iconFor === id;
      return `<div class="psm-fblock" data-pf="${esc(id)}">
        ${renaming ? nameRowHtml('renamePF', u.renameVal, { ph: psmT('folder_name'), label: psmT('folder_name'), input: 'renameVal', ok: 'renameOk', cancel: 'renameCancel', okLabel: psmT('save') }) : `
        <div class="psm-frow">
          <span class="psm-grip" title="${esc(psmT('drag_reorder'))}" aria-hidden="true">${psmIcon('grip')}</span>
          <button type="button" class="psm-fbtn" data-act="pfToggle" data-a="${esc(id)}" aria-expanded="${open}">${psmIcon('chevR', 'psm-chev' + (open ? ' open' : ''))}<span class="psm-emo" aria-hidden="true">${esc(f.icon || PDO_DEFAULT_ICON)}</span><span class="psm-fname" title="${esc(f.name)}">${esc(f.name)}</span><span class="psm-cnt" aria-label="${esc(psmT('n_prompts', n))}">${n}</span></button>
          ${ibHtml('kebab', 'menu', psmT('actions_for', f.name), { a: 'p:' + id, title: psmT('folder_actions'), cls: 'psm-sm', attrs: ` aria-expanded="${menuOpen}"` })}
          ${menuOpen ? `<div class="psm-menu" role="menu">
            ${miHtml('plus', psmT('add_prompts'), 'pickPrompts', { a: id })}
            ${miHtml('pencil', psmT('rename'), 'pfRename', { a: id })}
            ${miHtml('smile', psmT('change_icon'), 'pfIcon', { a: id })}
            ${miHtml('trash', psmT('delete_folder'), 'pfDelete', { a: id, red: true })}
          </div>` : ''}
        </div>`}
        ${cfHtml('delPF', id)}
        ${iconOpen ? `<div class="psm-cf" data-reveal="1">
          <div class="psm-icg">${PDO_PANEL_ICONS.map(ic => `<button type="button" class="psm-icn${ic === f.icon ? ' psm-on' : ''}" data-act="pfIconPick" data-a="${esc(id)}" data-b="${esc(ic)}" aria-label="${esc(psmT('use_icon', ic))}" aria-pressed="${ic === f.icon}">${esc(ic)}</button>`).join('')}</div>
          <div class="psm-row">${inpHtml('customIcon', u.customIcon, { ph: psmT('own_emoji'), label: psmT('custom_icon'), input: 'customIcon', enter: 'pfIconCustom' })}${btnHtml(psmT('use'), 'pfIconCustom', { a: id })}</div>
          <div class="psm-cf-b">${btnHtml(psmT('done'), 'pfIconDone')}</div>
        </div>` : ''}
        ${open ? `<div class="psm-kids">
          ${items.map(p => `<div class="psm-pfr">
            <span class="psm-nm" title="${esc(p.name)}">${esc(p.name)}</span>
            ${p.marker ? `<span class="psm-tag">${esc(psmT('marker'))}</span>` : ''}
            ${ibHtml('locate', 'pfJump', psmT('show_x_in_list', p.name), { a: p.id, title: psmT('show_in_list'), cls: 'psm-sm mut' })}
            ${ibHtml('x', 'pfRemove', psmT('remove_x', p.name), { a: p.id, b: id, title: psmT('remove_from_folder'), cls: 'psm-sm mut' })}
          </div>`).join('')}
          ${!items.length ? `<p class="psm-cap" style="padding: 6px">${esc(psmT('folder_empty'))}</p>` : ''}
          <button type="button" class="psm-addrow" data-act="pickPrompts" data-a="${esc(id)}">${psmIcon('plus')}<span>${esc(psmT('add_prompts'))}</span></button>
        </div>` : ''}
      </div>`;
    }).join('');
  
    const caption = esc(psmT('folders_for', '\u0000')).replace('\u0000', `<strong style="color: var(--psm-fg); font-weight: 600">${esc(presetName)}</strong>`);
    return `<p class="psm-cap" style="overflow-wrap: anywhere">${caption}</p>
      <div class="psm-row">${btnHtml(psmT('new_folder'), 'newPF', { icon: 'plus', cls: 'psm-wide' })}${btnHtml(psmT('templates'), 'openTpl', { icon: 'copy', cls: 'psm-wide' })}</div>
      ${swHtml(shown, psmT('show_headers'), 'pfHeaders')}
      ${u.newPF !== null ? nameRowHtml('newPF', u.newPF, { ph: psmT('folder_name'), label: psmT('new_pf_name'), input: 'newPF', ok: 'newPFOk', cancel: 'newPFCancel', okLabel: psmT('create') }) : ''}
      ${!cfg.folderOrder.length ? `<div class="psm-empty"><p class="psm-cap">${esc(psmT('no_prompt_folders'))}</p>${btnHtml(psmT('new_folder'), 'newPF', { icon: 'plus' })}</div>` : ''}
      <div class="psm-fl" id="pdo-flist">${blocks}</div>`;
  }
  
  function pdoTemplatesHtml() {
    const tpls = pdoDbLoad().templates || {};
    const names = Object.keys(tpls).sort((a, b) => a.localeCompare(b));
    const typed = psmUi.tplName.trim();
    const ex = typed ? names.find(n => n.toLowerCase() === typed.toLowerCase()) : null;
    return `${crumbHtml('closeTpl', psmT('back_pf'), psmT('templates'))}
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('tpl_save_lbl'))}</p>
        <div class="psm-row">${inpHtml('tplName', psmUi.tplName, { ph: psmT('tpl_name'), input: 'tplName', enter: 'tplSave' })}${btnHtml(ex ? psmT('overwrite_dots') : psmT('save'), 'tplSave', { disabled: !typed })}</div>
        ${cfHtml('overTpl', 'save')}
      </div>
      <hr class="psm-hr">
      <div class="psm-sec">
        <p class="psm-lbl">${esc(psmT('saved_tpls'))}</p>
        ${names.map(n => {
          const t = tpls[n];
          const info = psmT('tpl_info', (t.folderOrder || []).length, Object.keys(t.assignmentsByName || {}).length);
          return `<div class="psm-snap">
            <div class="psm-snap-top">
              <div class="psm-snap-txt"><span class="psm-snap-name">${esc(n)}</span><span class="psm-cap">${esc(info)}</span></div>
              ${btnHtml(psmT('apply'), 'tplApply', { a: n })}
              ${ibHtml('trash', 'tplDelete', psmT('del_tpl_x', n), { a: n, title: psmT('del_tpl'), cls: 'psm-sm mut' })}
            </div>
            ${cfHtml('applyTpl', n)}${cfHtml('delTpl', n)}
          </div>`;
        }).join('')}
        ${!names.length ? `<p class="psm-cap">${esc(psmT('no_tpls'))}</p>` : ''}
      </div>`;
  }
  
  // ─── Tick mode: add prompts to a folder ───────────────────────────────────
  // Every prompt of the preset, in list order. Prompts in another folder show
  // that folder; ticking one moves it here.
  
  PSM_SELECT.prompt = {
    title(folderId) {
      const f = pdoGetPresetConfig(currentPreset()).folders[folderId];
      return f ? psmT('add_to_icon', f.icon || PDO_DEFAULT_ICON, f.name) : '';
    },
    add(folderId, ids) {
      const presetName = currentPreset();
      const f = pdoGetPresetConfig(presetName).folders[folderId];
      pdoAssignPrompts(presetName, folderId, ids);
      psmUi.pfOpen.add(folderId);
      psmSay('ok', psmT('added_n', ids.length, f ? f.name : ''));
    },
  };
  
  function pdoSelectHtml() {
    const k = psmUi.sel;
    const cfg = pdoGetPresetConfig(currentPreset());
    const q = psmUi.selq.trim().toLowerCase();
    const rows = pdoReadPrompts().filter(p => !q || p.name.toLowerCase().includes(q)).map(p => {
      const fid = cfg.assignments[p.id];
      const owner = fid && cfg.folders[fid] ? cfg.folders[fid] : null;
      const locked = fid === k.folder;
      const ownerLabel = owner && !locked ? (owner.icon || PDO_DEFAULT_ICON) + ' ' + owner.name : '';
      return `<label class="psm-pk-r"><input type="checkbox" data-sel="${esc(p.id)}"${locked || k.ids.has(p.id) ? ' checked' : ''}${locked ? ' disabled' : ''}><span class="psm-nm" title="${esc(p.name)}">${esc(p.name)}</span>${p.marker ? `<span class="psm-tag">${esc(psmT('marker'))}</span>` : ''}${ownerLabel ? `<span class="psm-tag" title="${esc(ownerLabel)}"><span>${esc(ownerLabel)}</span></span>` : ''}</label>`;
    });
    return `${psmSelBarHtml()}
      <div class="psm-srch">${psmIcon('search')}${inpHtml('selq', psmUi.selq, { ph: psmT('filter_prompts'), input: 'selq' })}</div>
      <div class="psm-fl">${rows.join('')}</div>`;
  }
  
  // ─── Show a prompt in SillyTavern's list ──────────────────────────────────
  
  function pdoOpenPromptDrawer() {
    const drawer = parentDoc.getElementById('left-nav-panel');
    if (!drawer || drawer.classList.contains('openDrawer')) return false;
    parentDoc.querySelector('#ai-config-button .drawer-toggle')?.click();
    return true;
  }
  
  // Phone: the sheet gets shorter (at most 340 of 844) and the prompt is
  // centred in the space above it. The sheet stays open.
  function pdoJumpFromPanel(promptId) {
    // A search could hide the row: clear it first.
    const input = parentDoc.getElementById('pdo-search-input');
    if (input) input.value = '';
    parentDoc.getElementById('pdo-search-clear')?.setAttribute('hidden', '');
    pdoApplySearch('');
    if (psmIsSheet()) {
      psmUi.sheetH.folders = Math.min(psmUi.sheetH.folders, 340 / 844);
      psmPlacePanel();
    }
    const opened = pdoOpenPromptDrawer();
    setTimeout(() => pdoGotoPrompt(promptId), opened ? 350 : 80);
  }
  
  function pdoRenameFromPanel(folderId, rawName) {
    const name = String(rawName || '').trim();
    if (!name) return true;
    if (!pdoRenameFolder(currentPreset(), folderId, name)) { psmSay('err', psmT('toast_folder_exists')); return false; }
    return true;
  }
  
  // ─── Drag and drop: prompt folder order ───────────────────────────────────
  
  function initPdoFolderSortable(panel) {
    const listEl = panel.querySelector('#pdo-flist');
    const Sortable = window.parent.Sortable;
    if (!listEl || !Sortable) return;
    Sortable.create(listEl, {
      animation: 150,
      delay: psmIsTouch() ? 150 : 0,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      draggable: '.psm-fblock',
      handle: '.psm-frow > .psm-grip',
      ghostClass: 'psm-sortable-ghost',
      chosenClass: 'psm-sortable-chosen',
      scroll: panel.querySelector('.psm-body') || true,
      bubbleScroll: false,
      onStart() { psmDragging = true; psmUi.menu = null; },
      onEnd() {
        psmDragging = false;
        const order = [...listEl.querySelectorAll(':scope > .psm-fblock')].map(el => el.dataset.pf).filter(Boolean);
        pdoSetFolderOrder(currentPreset(), order);
        setTimeout(() => { psmRenderPending = false; psmRender(); }, 170);
      },
    });
  }
  
  // ─── Actions ──────────────────────────────────────────────────────────────
  
  Object.assign(PSM_ACTS, {
    pfToggle(el) { toggleSet(psmUi.pfOpen, el.dataset.a); },
    newPF() { psmUi.newPF = ''; psmUi.menu = null; psmUi._focus = 'newPF'; psmUi._reveal = '[data-fk="newPF"]'; },
    newPFCancel() { psmUi.newPF = null; },
    newPFOk() {
      const name = String(psmUi.newPF || '').trim();
      if (!name) return;
      const id = pdoCreateFolder(currentPreset(), name);
      if (!id) { psmSay('err', psmT('toast_folder_exists')); return; }
      psmUi.pfOpen.add(id);
      psmUi.newPF = null;
    },
    pfHeaders() { pdoSetHidden(!pdoIsHidden()); },
    openTpl() { Object.assign(psmUi, { fview: 'templates', menu: null, confirm: null }); },
    closeTpl() { Object.assign(psmUi, { fview: 'list', confirm: null }); },
    pickPrompts(el) { psmStartSel('prompt', el.dataset.a); return false; },
    pfRename(el) {
      const f = pdoGetPresetConfig(currentPreset()).folders[el.dataset.a];
      if (!f) return;
      Object.assign(psmUi, { renaming: 'p:' + el.dataset.a, renameVal: f.name, menu: null, _focus: 'renamePF', _reveal: '[data-fk="renamePF"]' });
    },
    pfIcon(el) { Object.assign(psmUi, { iconFor: el.dataset.a, customIcon: '', menu: null, _reveal: '[data-reveal]' }); },
    pfIconPick(el) { pdoSetFolderIcon(currentPreset(), el.dataset.a, el.dataset.b); },
    pfIconCustom() {
      const v = psmUi.customIcon.trim();
      if (!v || !psmUi.iconFor) return;
      pdoSetFolderIcon(currentPreset(), psmUi.iconFor, v);
      psmUi.iconFor = null;
      psmUi.customIcon = '';
    },
    pfIconDone() { psmUi.iconFor = null; },
    pfDelete(el) {
      const id = el.dataset.a;
      const presetName = currentPreset();
      const cfg = pdoGetPresetConfig(presetName);
      const f = cfg.folders[id];
      if (!f) return;
      psmAsk({ kind: 'delPF', id, danger: true, ok: psmT('del'), title: psmT('del_folder_q', f.name), body: psmT('del_pf_body'),
        run() { pdoDeleteFolder(presetName, id); psmUi.pfOpen.delete(id); psmSay('ok', psmT('toast_deleted', f.name)); } });
      return false;
    },
    pfJump(el) { pdoJumpFromPanel(el.dataset.a); return false; },
    pfRemove(el) { pdoUnassignPrompt(currentPreset(), el.dataset.a); },
  
    // templates
    tplSave() {
      const typed = psmUi.tplName.trim();
      if (!typed) return;
      const names = Object.keys(pdoDbLoad().templates || {});
      const ex = names.find(n => n.toLowerCase() === typed.toLowerCase());
      const save = name => {
        const r = pdoSaveTemplate(name);
        if (!r) return;
        psmUi.tplName = '';
        psmSay(r === 'dup' ? 'info' : 'ok', r === 'dup' ? psmT('notify_tpl_dup') : (ex ? psmT('toast_tpl_updated') : psmT('toast_tpl_saved')));
      };
      if (ex) {
        psmAsk({ kind: 'overTpl', id: 'save', danger: true, ok: psmT('overwrite'), title: psmT('tpl_over_q', ex), body: '', run: () => save(ex) });
        return false;
      }
      save(typed);
    },
    tplApply(el) {
      const n = el.dataset.a;
      psmAsk({ kind: 'applyTpl', id: n, danger: false, ok: psmT('replace'), title: psmT('tpl_apply_q', n), body: '',
        run() { if (pdoApplyTemplate(n)) { psmUi.pfOpen.clear(); psmSay('ok', psmT('toast_applied', n)); } } });
      return false;
    },
    tplDelete(el) {
      const n = el.dataset.a;
      psmAsk({ kind: 'delTpl', id: n, danger: true, ok: psmT('del'), title: psmT('del_tpl_q', n), body: '',
        run() { if (pdoDeleteTemplate(n)) psmSay('ok', psmT('toast_deleted', n)); } });
      return false;
    },
  });
  
  Object.assign(PSM_INPUTS, {
    newPF(v) { psmUi.newPF = v; return false; },
    customIcon(v) { psmUi.customIcon = v; return false; },
    tplName(v) { psmUi.tplName = v; if (psmUi.confirm?.kind === 'overTpl') psmUi.confirm = null; },
  });
  

  // ─── divs-index.js ───────────────────────────────────────────────

  // Prompt Folders bootstrap.
  
  function initDivs() {
    if (parentDoc._pdoObserver) {
      schedulePdoRepaint();
      return;
    }
  
    injectDivStyles();
    initPdoDecorator();
  
    try {
      eventOn(tavern_events.OAI_PRESET_CHANGED_AFTER, () => {
        if (psmUi.sel?.kind === 'prompt') psmUi.sel = null;
        psmUi.iconFor = null;
        psmUi.pfOpen.clear();
        const searchInput = parentDoc.querySelector('#pdo-search-input');
        if (searchInput) searchInput.value = '';
        parentDoc.querySelector('#pdo-search-clear')?.setAttribute('hidden', '');
        pdoApplySearch('');
        schedulePdoRepaint();
        if (panelOpen) psmRender();
      });
    } catch(e) { ERR('pdo eventOn failed:', e); }
  
    $(window).on('pagehide', () => {
      try { parentDoc._pdoObserver?.disconnect(); } catch (_) {}
      delete parentDoc._pdoObserver;
      parent$('#pdo-search-bar, #' + PDO_STYLE_ID + ', #' + PDO_COLLAPSE_STYLE_ID, parentDoc).remove();
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
