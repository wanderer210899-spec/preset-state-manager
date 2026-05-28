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
  yes:              { en: 'Yes',      zh: '确定' },
  sure:             { en: 'Sure?',    zh: '确定？' },
  drag_reorder:     { en: 'Drag to reorder', zh: '拖动以重新排序' },

  // ── Toolbar / shortcuts ───────────────────────────────────────────────────
  brand:                  { en: 'Preset State Manager', zh: '预设状态管理器' },
  snap_shortcut_title:    { en: 'Snapshots for current preset', zh: '当前预设的快照' },
  folders_shortcut_title: { en: 'Prompt folders for current preset', zh: '当前预设的提示词文件夹' },

  // ── Browser view (snapshot panel) ──────────────────────────────────────────
  goto_active:        { en: 'Go to active preset', zh: '跳转到当前预设' },
  filter_presets_ph:  { en: '🔍 filter presets…', zh: '🔍 筛选预设…' },
  new_folder_ph:      { en: 'New folder name…', zh: '新建文件夹名称…' },
  new_folder_btn:     { en: '+ Folder', zh: '+ 文件夹' },
  export:             { en: 'Export', zh: '导出' },
  import:             { en: 'Import', zh: '导入' },
  reset:              { en: 'Reset',  zh: '重置' },
  export_snapshots:   { en: 'Snapshots', zh: '快照' },
  export_folders:     { en: 'Folders', zh: '文件夹' },
  export_both:        { en: 'Both', zh: '两者' },
  no_presets:         { en: 'No presets found', zh: '未找到预设' },
  note_title:         { en: 'Note', zh: '备注' },
  no_note:            { en: 'No note.', zh: '暂无备注。' },
  edit_link:          { en: '[edit]', zh: '[编辑]' },

  confirm_delete_folder: { en: 'Delete folder "{0}"?\nPresets inside will become ungrouped.',
                           zh: '删除文件夹“{0}”？\n其中的预设将变为未分组。' },
  confirm_reset:      { en: 'Reset ALL PSM data?\n\nThis will permanently delete all folders, preset assignments, notes, and snapshots.\nThis cannot be undone.',
                        zh: '重置所有 PSM 数据？\n\n这将永久删除所有文件夹、预设分组、备注和快照。\n此操作无法撤销。' },
  toast_data_reset:   { en: 'Data reset', zh: '数据已重置' },
  toast_exported:     { en: 'Exported', zh: '已导出' },
  toast_invalid_backup: { en: 'Invalid backup file', zh: '备份文件无效' },
  confirm_overwrite_all: { en: 'Overwrite snapshots and folders with this backup?', zh: '用此备份覆盖快照和文件夹？' },
  confirm_overwrite_snapshots: { en: 'Overwrite snapshots with this backup?', zh: '用此备份覆盖快照？' },
  confirm_overwrite_folders:   { en: 'Overwrite folders with this backup?', zh: '用此备份覆盖文件夹？' },
  toast_imported:     { en: 'Imported', zh: '已导入' },
  toast_read_fail:    { en: 'Failed to read file', zh: '读取文件失败' },
  toast_folder_exists:{ en: 'Folder name already exists', zh: '文件夹名称已存在' },
  toast_all_in_folders:{ en: 'All presets already in folders', zh: '所有预设都已在文件夹中' },

  // ── Detail view ────────────────────────────────────────────────────────────
  confirm_btn:        { en: 'Confirm', zh: '确认' },
  delete_q:           { en: 'Delete?', zh: '删除？' },
  no_snapshots:       { en: 'No snapshots yet', zh: '暂无快照' },
  name_snapshot_ph:   { en: 'Name this snapshot…', zh: '为此快照命名…' },
  prompt_states:      { en: 'Prompt states', zh: '提示词状态' },
  show_disabled:      { en: 'show disabled', zh: '显示已禁用' },
  all_disabled:       { en: 'All prompts disabled', zh: '所有提示词均已禁用' },

  // ── Note edit view ─────────────────────────────────────────────────────────
  ungrouped_opt:      { en: '— ungrouped —', zh: '— 未分组 —' },
  folder_label:       { en: 'Folder', zh: '文件夹' },
  note_label:         { en: 'Note', zh: '备注' },
  note_suffix:        { en: '{0} · note', zh: '{0} · 备注' },
  toast_note_saved:   { en: 'Note saved', zh: '备注已保存' },

  // ── Snapshot operation toasts ──────────────────────────────────────────────
  toast_saved:        { en: 'Saved "{0}"', zh: '已保存“{0}”' },
  toast_busy:         { en: '⏳ Previous operation still running — please wait', zh: '⏳ 上一个操作仍在进行 — 请稍候' },
  toast_wait_chat:    { en: '⏳ Waiting for chat to finish loading…', zh: '⏳ 正在等待聊天加载完成…' },
  toast_applied:      { en: 'Snapshot applied successfully · {0}', zh: '快照应用成功 · {0}' },
  toast_deleted:      { en: 'Deleted "{0}"', zh: '已删除“{0}”' },

  // ── Prompt Folders panel ───────────────────────────────────────────────────
  folders_header:        { en: 'Prompt Folders · {0}', zh: '提示词文件夹 · {0}' },
  hide_folder_prompts:   { en: 'Hide folder prompts', zh: '隐藏文件夹内提示词' },
  show_folder_prompts:   { en: 'Show folder prompts', zh: '显示文件夹内提示词' },
  change_icon:           { en: 'Change icon', zh: '更改图标' },
  add_prompts:           { en: 'Add prompts', zh: '添加提示词' },
  delete_folder:         { en: 'Delete folder', zh: '删除文件夹' },
  custom_icon_ph:        { en: 'Custom icon', zh: '自定义图标' },
  use_icon:              { en: 'Use icon', zh: '使用图标' },
  remove_from_folder:    { en: 'Remove from folder', zh: '从文件夹移除' },
  prompts_in_folder:     { en: 'Prompts in this folder', zh: '此文件夹中的提示词数' },
  no_folders:            { en: 'No folders yet', zh: '暂无文件夹' },
  no_assigned:           { en: 'No assigned prompts', zh: '暂无已分配的提示词' },
  show_folders_in_list:  { en: 'Show folders in prompt list', zh: '在提示词列表中显示文件夹' },
  hide_folders_from_list:{ en: 'Hide folders from prompt list', zh: '在提示词列表中隐藏文件夹' },
  templates:             { en: 'Templates', zh: '模板' },
  folders_hidden_banner: { en: 'Folders hidden — drag reorder enabled in prompt list', zh: '文件夹已隐藏 — 可在提示词列表中拖动排序' },
  jump_to_prompt:        { en: 'Jump to prompt in list', zh: '跳转到列表中的提示词' },

  // ── Mass-assign popup ──────────────────────────────────────────────────────
  add_to:             { en: 'Add to · {0} {1}', zh: '添加到 · {0} {1}' },
  mass_filter_ph:     { en: '🔍 filter...', zh: '🔍 筛选...' },
  select_all:         { en: 'Select all', zh: '全选' },
  no_unassigned:      { en: 'No unassigned prompts', zh: '没有未分配的提示词' },

  // ── Templates popover ──────────────────────────────────────────────────────
  tpl_save_current:   { en: 'Save current preset', zh: '保存当前预设' },
  name_ph:            { en: 'Name...', zh: '名称...' },
  tpl_apply:          { en: 'Apply template', zh: '应用模板' },
  tpl_delete:         { en: 'Delete template', zh: '删除模板' },
  confirm_tpl_overwrite:{ en: 'Overwrite "{0}"?', zh: '覆盖“{0}”？' },
  confirm_tpl_delete: { en: 'Delete "{0}"?', zh: '删除“{0}”？' },
  confirm_tpl_apply:  { en: 'Apply "{0}" — replace current folders?', zh: '应用“{0}” — 替换当前文件夹？' },
  toast_tpl_saved:    { en: 'Template saved', zh: '模板已保存' },
  toast_tpl_updated:  { en: 'Template updated', zh: '模板已更新' },
  notify_tpl_dup:     { en: 'Template saved; duplicate prompt names used the later match', zh: '模板已保存；重复的提示词名称使用了较后的匹配项' },

  // ── Search bar (decorator) ─────────────────────────────────────────────────
  search_prompts_ph:  { en: 'Search prompts (name or content)…', zh: '搜索提示词（名称或内容）…' },
  clear_search:       { en: 'Clear search', zh: '清除搜索' },
  collapse_all:       { en: 'Collapse all folders', zh: '折叠所有文件夹' },
  expand_all:         { en: 'Expand all folders', zh: '展开所有文件夹' },
  prompt_not_found:   { en: 'Prompt not in current preset', zh: '当前预设中没有该提示词' },
};

function psmT(key, ...args) {
  const entry = PSM_I18N[key];
  let s = entry ? (entry[PSM_LANG] ?? entry.en ?? key) : key;
  if (args.length) {
    args.forEach((val, i) => { s = s.split('{' + i + '}').join(String(val)); });
  }
  return s;
}
