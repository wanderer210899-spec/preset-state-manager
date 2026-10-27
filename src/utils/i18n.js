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
