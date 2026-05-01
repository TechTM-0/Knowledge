// カテゴリの表示ラベルマッピング
const CATEGORY_LABELS = { memo: 'メモ', idea: 'アイデア', research: '調査' };

// ===== 状態 =====
let notes = [];           // API から取得した全ノートのキャッシュ
let filteredNotes = [];   // カテゴリ・検索で絞り込んだ表示用サブセット
let selectedNote = null;  // 現在メインエリアに表示中のノート
let currentCategory = 'all';
let isEditMode = false;
let autoSaveTimer = null; // debounce 用タイマーID（自動保存）
let searchTimer = null;   // debounce 用タイマーID（検索）
let templates = [];       // テンプレート一覧キャッシュ
let editingTemplate = null; // 現在編集中のテンプレート（null = 新規）
let slideViewTab = 'slide'; // slide ノートの view モードで表示中のタブ（'slide' | 'code'）

// ===== DOM 参照 =====
const noteList     = document.getElementById('noteList');
const noteCount    = document.getElementById('noteCount');
const searchInput  = document.getElementById('searchInput');
const emptyState   = document.getElementById('emptyState');
const noteView     = document.getElementById('noteView');
const noteTitle    = document.getElementById('noteTitle');
const noteDate     = document.getElementById('noteDate');
const noteCategory = document.getElementById('noteCategory');
const noteTags     = document.getElementById('noteTags');
const noteContent  = document.getElementById('noteContent');
const noteEditor   = document.getElementById('noteEditor');
const slideTabs    = document.getElementById('slideTabs');
const slideTabSlide = document.getElementById('slideTabSlide');
const slideTabCode  = document.getElementById('slideTabCode');
const slideFrame     = document.getElementById('slideFrame');
const slideContainer = document.getElementById('slideContainer');
const editBtn              = document.getElementById('editBtn');
const deleteBtn            = document.getElementById('deleteBtn');
const newNoteBtn           = document.getElementById('newNoteBtn');
const noteCategorySelect   = document.getElementById('noteCategorySelect');
const generateBtn          = document.getElementById('generateBtn');
const generateModal        = document.getElementById('generateModal');
const generateOverlay      = document.getElementById('generateOverlay');
const generateCloseBtn     = document.getElementById('generateCloseBtn');
const generateSubmitBtn    = document.getElementById('generateSubmitBtn');
const generatePrompt       = document.getElementById('generatePrompt');
const generateError        = document.getElementById('generateError');
const templateSelect       = document.getElementById('templateSelect');
const modelSelect          = document.getElementById('modelSelect');
const templateBtn          = document.getElementById('templateBtn');
const templateModal        = document.getElementById('templateModal');
const templateOverlay      = document.getElementById('templateOverlay');
const templateCloseBtn     = document.getElementById('templateCloseBtn');
const templateList         = document.getElementById('templateList');
const templateNewBtn       = document.getElementById('templateNewBtn');
const templateFormEmpty    = document.getElementById('templateFormEmpty');
const templateForm         = document.getElementById('templateForm');
const tmplName             = document.getElementById('tmplName');
const tmplFormatType       = document.getElementById('tmplFormatType');
const tmplContent          = document.getElementById('tmplContent');
const tmplParamRows        = document.getElementById('tmplParamRows');
const tmplAddParamBtn      = document.getElementById('tmplAddParamBtn');
const tmplSaveBtn          = document.getElementById('tmplSaveBtn');
const tmplDeleteBtn        = document.getElementById('tmplDeleteBtn');
const tmplError            = document.getElementById('tmplError');

// ===== API ヘルパー =====
// fetch のラッパー。204 No Content は null を返し、エラー時は例外を投げる
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

// ===== 初期化 =====
async function init() {
  await loadNotes();
  bindEvents();
}

// ===== ノート一覧を API から取得 =====
async function loadNotes() {
  notes = await api('/api/notes');
  applyFilters();
}

// ===== イベント登録 =====
function bindEvents() {
  newNoteBtn.addEventListener('click', openNewNote);
  editBtn.addEventListener('click', toggleEditMode);
  deleteBtn.addEventListener('click', deleteNote);
  searchInput.addEventListener('input', scheduleSearch);
  noteEditor.addEventListener('input', scheduleAutoSave);
  noteCategorySelect.addEventListener('change', changeCategory);
  generateBtn.addEventListener('click', openGenerateModal);
  generateCloseBtn.addEventListener('click', closeGenerateModal);
  generateOverlay.addEventListener('click', closeGenerateModal);
  generateSubmitBtn.addEventListener('click', submitGenerate);
  slideTabSlide.addEventListener('click', () => showSlideTab('slide'));
  slideTabCode.addEventListener('click', () => showSlideTab('code'));
  templateBtn.addEventListener('click', openTemplateModal);
  templateCloseBtn.addEventListener('click', closeTemplateModal);
  templateOverlay.addEventListener('click', closeTemplateModal);
  templateNewBtn.addEventListener('click', () => openTemplateForm(null));
  tmplAddParamBtn.addEventListener('click', () => addParamRow('', ''));
  tmplSaveBtn.addEventListener('click', saveTemplate);
  tmplDeleteBtn.addEventListener('click', deleteTemplateItem);

  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => setCategory(btn));
  });
}

// ===== ノート一覧の描画 =====
// filteredNotes をもとにサイドバーのカードを再描画する。innerHTML の置き換え後にイベントを再登録する
function renderNoteList() {
  noteCount.textContent = filteredNotes.length;

  if (filteredNotes.length === 0) {
    noteList.innerHTML = `
      <div class="text-center text-white/30 text-sm py-8">ノートが見つかりません</div>
    `;
    return;
  }

  noteList.innerHTML = filteredNotes.map(note => `
    <div
      class="glass-card p-3.5 ${note.id === selectedNote?.id ? 'glass-card--active' : ''}"
      data-id="${note.id}"
    >
      <div class="text-sm font-semibold text-white/90 leading-snug mb-1 truncate">
        ${escapeHtml(note.title)}
      </div>
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-white/35">${note.created_at.slice(0, 10)}</span>
        <span class="tag">${categoryLabel(note.category)}</span>
      </div>
      <div class="flex flex-wrap gap-1">
        ${note.tags.slice(0, 3).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>
  `).join('');

  // innerHTML 置き換えで既存リスナーが消えるため毎回再登録する
  noteList.querySelectorAll('[data-id]').forEach(el => {
    el.addEventListener('click', () => selectNote(Number(el.dataset.id)));
  });
}

// ===== ノート選択 =====
function selectNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  selectedNote = note;
  isEditMode = false;

  noteTitle.textContent = note.title;
  noteDate.textContent = note.created_at.slice(0, 10);
  noteEditor.value = note.content;

  emptyState.classList.add('hidden');
  noteView.classList.remove('hidden');
  noteView.classList.add('flex');

  showViewMode();
  renderNoteList();
}

// ===== 表示／編集モード切替 =====
function showViewMode() {
  noteEditor.classList.add('hidden');
  noteEditor.classList.remove('flex');
  noteCategory.textContent = categoryLabel(selectedNote?.category ?? 'memo');
  noteCategory.classList.remove('hidden');
  noteCategorySelect.classList.add('hidden');
  editBtn.textContent = '✏️ 編集';
  isEditMode = false;
  generateBtn.classList.add('hidden');
  renderTags(false);

  if (selectedNote?.format_type === 'slide') {
    slideTabs.classList.remove('hidden');
    slideContainer.classList.remove('hidden');
    showSlideTab(slideViewTab);
    requestAnimationFrame(() => {
      const html = buildSlideHtml(selectedNote?.content ?? '');
      slideFrame.srcdoc = '';
      requestAnimationFrame(() => {
        slideFrame.srcdoc = html;
      });
    });
  } else {
    slideTabs.classList.add('hidden');
    slideContainer.classList.add('hidden');
    slideContainer.style.flex = '';
    slideContainer.style.overflow = '';
    noteContent.classList.remove('hidden');
    noteContent.innerHTML = marked.parse(selectedNote?.content ?? '');
  }
}

function showSlideTab(tab) {
  slideViewTab = tab;
  slideTabSlide.classList.toggle('tag--active', tab === 'slide');
  slideTabCode.classList.toggle('tag--active', tab === 'code');

  if (tab === 'slide') {
    noteContent.classList.add('hidden');
    slideContainer.style.flex = '';
    slideContainer.style.overflow = '';
  } else {
    // display:none を避け flex で潰す（iframe の React 初期化を維持するため）
    slideContainer.style.flex = '0 0 0px';
    slideContainer.style.overflow = 'hidden';
    noteContent.classList.remove('hidden');
    noteContent.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;font-size:0.8rem;opacity:0.85;">${escapeHtml(selectedNote?.content ?? '')}</pre>`;
  }
}

function buildSlideHtml(jsxCode) {
  const escapedCode = JSON.stringify(jsxCode);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0f172a; color: white; font-family: system-ui, sans-serif; height: 100vh; overflow: hidden; }
#root { height: 100vh; }
#error { display: none; padding: 24px; color: #f87171; font-family: monospace; font-size: 13px; white-space: pre-wrap; overflow: auto; height: 100vh; }
</style>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
<div id="root"></div>
<div id="error"></div>
<script>
(function() {
  var root = document.getElementById('root');
  var errEl = document.getElementById('error');
  function showError(msg) {
    root.style.display = 'none';
    errEl.style.display = 'block';
    errEl.textContent = msg;
  }
  root.textContent = '[1] 起動中...';
  try {
    var jsxCode = ${escapedCode};
    root.textContent = '[2] コンパイル中...';
    var transformed = Babel.transform(jsxCode, { presets: ['react'] }).code;
    root.textContent = '[3] コンポーネント生成中...';
    var factory = new Function('React', 'ReactDOM', transformed + '\\nreturn typeof Slide !== "undefined" ? Slide : null;');
    var SlideComponent = factory(React, ReactDOM);
    if (!SlideComponent) { showError('エラー: Slide が定義されていません'); return; }
    root.textContent = '[4] レンダリング中...';
    ReactDOM.createRoot(root).render(React.createElement(SlideComponent));
  } catch(e) {
    showError('エラー [' + (root.textContent || '?') + ']:\\n' + e.message);
  }
})();
</script>
</body>
</html>`;
}

function showEditMode() {
  noteContent.classList.add('hidden');
  slideContainer.style.flex = '0 0 0px';
  slideContainer.style.overflow = 'hidden';
  noteEditor.classList.remove('hidden');
  noteEditor.classList.add('flex');
  // 表示モードのテキスト span を隠し、セレクトボックスを表示する
  noteCategory.classList.add('hidden');
  noteCategorySelect.classList.remove('hidden');
  noteCategorySelect.value = selectedNote?.category ?? 'memo';
  editBtn.textContent = '👁️ 表示';
  isEditMode = true;
  generateBtn.classList.remove('hidden');
  noteEditor.focus();
  renderTags(true);
}

function toggleEditMode() {
  isEditMode ? showViewMode() : showEditMode();
}

// ===== 自動保存 =====
// 入力のたびにタイマーをリセットし、800ms 無入力が続いたら保存する（debounce パターン）
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    if (!selectedNote) return;
    const content = noteEditor.value;
    const title = extractTitle(content);
    // 保存前のタグを退避する。auto-save はコンテンツのみ更新するが、
    // レスポンスで selectedNote を上書きするとタグが失われる競合が起きるため
    const currentTags = selectedNote.tags;
    const updated = await api(`/api/notes/${selectedNote.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, title }),
    });
    // タグは addTag/removeTag が管理するので scheduleAutoSave では上書きしない
    selectedNote = { ...updated, tags: currentTags };
    noteTitle.textContent = updated.title;
    noteContent.innerHTML = marked.parse(content);
    const idx = notes.findIndex(n => n.id === updated.id);
    if (idx !== -1) notes[idx] = updated;
    renderNoteList();
  }, 800);
}

// Markdown の最初の # 見出しをタイトルとして使う
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : '新しいノート';
}

// ===== フィルター =====

// タイプ中のデバウンス。300ms 無入力で API 検索を実行する
function scheduleSearch() {
  const query = searchInput.value.trim();
  clearTimeout(searchTimer);
  if (query) {
    searchTimer = setTimeout(() => searchFromApi(query), 300);
  } else {
    // クエリが消えたらローカルキャッシュに即時戻す
    applyFilters();
  }
}

// サーバー側 FTS5 検索（title / content / tags を横断）
async function searchFromApi(query) {
  const results = await api(`/api/notes?q=${encodeURIComponent(query)}`);
  applyCategory(results);
}

// クエリなし時: ローカルキャッシュにカテゴリフィルタだけ適用
function applyFilters() {
  applyCategory(notes);
}

// 検索結果またはローカルキャッシュにカテゴリフィルタを適用して描画
function applyCategory(noteList) {
  filteredNotes = currentCategory === 'all'
    ? noteList
    : noteList.filter(n => n.category === currentCategory);
  renderNoteList();
}

function setCategory(btn) {
  currentCategory = btn.dataset.category;
  document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('tag--active'));
  btn.classList.add('tag--active');
  applyFilters();
}

// ===== 新規ノート =====
async function openNewNote() {
  const note = await api('/api/notes', {
    method: 'POST',
    body: JSON.stringify({
      title: '新しいノート',
      category: 'memo',
      tags: [],
      content: '# 新しいノート\n\nここに内容を書いてください...',
    }),
  });
  // loadNotes で一覧を最新化してから選択・編集モードへ
  await loadNotes();
  selectNote(note.id);
  showEditMode();
}

// ===== 削除 =====
async function deleteNote() {
  if (!selectedNote) return;
  if (!confirm('このノートを削除しますか？')) return;
  await api(`/api/notes/${selectedNote.id}`, { method: 'DELETE' });
  selectedNote = null;
  noteView.classList.add('hidden');
  noteView.classList.remove('flex');
  emptyState.classList.remove('hidden');
  await loadNotes();
}

// ===== カテゴリ変更 =====
async function changeCategory() {
  if (!selectedNote) return;
  const updated = await api(`/api/notes/${selectedNote.id}`, {
    method: 'PUT',
    body: JSON.stringify({ category: noteCategorySelect.value }),
  });
  selectedNote = updated;
  const idx = notes.findIndex(n => n.id === updated.id);
  if (idx !== -1) notes[idx] = updated;
  renderNoteList();
}

// ===== タグ描画・操作 =====
// editMode=true: 各タグに削除ボタン＋入力フィールドを表示
// editMode=false: タグをバッジ表示のみ
function renderTags(editMode) {
  const tags = selectedNote?.tags ?? [];
  if (editMode) {
    noteTags.innerHTML =
      tags.map((t, i) => `
        <span class="tag" style="display:inline-flex;align-items:center;gap:4px;">
          #${escapeHtml(t)}
          <button data-remove-tag="${i}" style="line-height:1;color:rgba(255,255,255,0.5);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">×</button>
        </span>
      `).join('') +
      `<input id="tagInput" type="text" placeholder="タグを追加..." class="tag-input">`;
    // innerHTML 置き換え後にリスナーを再登録する
    document.getElementById('tagInput').addEventListener('keydown', handleTagInput);
    noteTags.querySelectorAll('[data-remove-tag]').forEach(btn => {
      btn.addEventListener('click', () => removeTag(Number(btn.dataset.removeTag)));
    });
  } else {
    noteTags.innerHTML = tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
  }
}

function handleTagInput(e) {
  // IME で日本語確定中の Enter を誤検知しないようにする
  if (e.isComposing) return;
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.replace(/,/g, '').trim();
  if (!val) return;
  e.target.value = ''; // 送信と同時に入力欄をクリア
  addTag(val);
}

async function addTag(tagName) {
  // 重複タグは追加しない
  if (!selectedNote || selectedNote.tags.includes(tagName)) return;
  const updated = await api(`/api/notes/${selectedNote.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tags: [...selectedNote.tags, tagName] }),
  });
  selectedNote = updated;
  const idx = notes.findIndex(n => n.id === updated.id);
  if (idx !== -1) notes[idx] = updated;
  renderTags(true);
  document.getElementById('tagInput')?.focus();
  renderNoteList();
}

async function removeTag(index) {
  if (!selectedNote) return;
  const updated = await api(`/api/notes/${selectedNote.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tags: selectedNote.tags.filter((_, i) => i !== index) }),
  });
  selectedNote = updated;
  const idx = notes.findIndex(n => n.id === updated.id);
  if (idx !== -1) notes[idx] = updated;
  renderTags(true);
  document.getElementById('tagInput')?.focus();
  renderNoteList();
}

// ===== テンプレート管理 =====
async function openTemplateModal() {
  templates = await api('/api/templates');
  renderTemplateList();
  templateFormEmpty.classList.remove('hidden');
  templateForm.classList.add('hidden');
  templateModal.classList.remove('hidden');
}

function closeTemplateModal() {
  templateModal.classList.add('hidden');
}

function renderTemplateList() {
  if (templates.length === 0) {
    templateList.innerHTML = '<div class="text-white/30 text-xs text-center py-6">テンプレートなし</div>';
    return;
  }
  templateList.innerHTML = templates.map(t => `
    <button
      class="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors ${editingTemplate?.id === t.id ? 'bg-white/10 text-white' : ''}"
      data-tid="${t.id}"
    >${escapeHtml(t.name)}<span class="ml-1.5 text-xs text-white/40">${t.format_type}</span></button>
  `).join('');
  templateList.querySelectorAll('[data-tid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = templates.find(x => x.id === Number(btn.dataset.tid));
      if (t) openTemplateForm(t);
    });
  });
}

function openTemplateForm(template) {
  editingTemplate = template;
  renderTemplateList();

  tmplName.value = template?.name ?? '';
  tmplFormatType.value = template?.format_type ?? 'article';
  tmplContent.value = template?.content ?? '';
  renderParamsEditor(template?.params ?? {});
  tmplError.classList.add('hidden');
  tmplDeleteBtn.classList.toggle('hidden', !template);

  templateFormEmpty.classList.add('hidden');
  templateForm.classList.remove('hidden');
  tmplName.focus();
}

function renderParamsEditor(params) {
  tmplParamRows.innerHTML = '';
  Object.entries(params).forEach(([k, v]) => addParamRow(k, v));
}

function addParamRow(key, value) {
  const row = document.createElement('div');
  row.className = 'flex gap-1.5';
  row.innerHTML = `
    <input type="text" placeholder="キー（例: 枚数）" value="${escapeHtml(key)}"
      class="glass-input px-2 py-1.5 text-xs flex-1" data-param="key">
    <input type="text" placeholder="値（例: 8枚）" value="${escapeHtml(value)}"
      class="glass-input px-2 py-1.5 text-xs flex-1" data-param="val">
    <button class="text-white/40 hover:text-red-400 text-lg leading-none px-1" data-remove>×</button>
  `;
  row.querySelector('[data-remove]').addEventListener('click', () => row.remove());
  tmplParamRows.appendChild(row);
}

function collectParams() {
  const params = {};
  tmplParamRows.children && Array.from(tmplParamRows.children).forEach(row => {
    const key = row.querySelector('[data-param="key"]')?.value.trim();
    const val = row.querySelector('[data-param="val"]')?.value.trim();
    if (key) params[key] = val ?? '';
  });
  return params;
}

async function saveTemplate() {
  const name = tmplName.value.trim();
  if (!name) { showTmplError('テンプレート名を入力してください'); return; }

  const body = {
    name,
    format_type: tmplFormatType.value,
    content: tmplContent.value,
    params: collectParams(),
  };

  try {
    if (editingTemplate) {
      await api(`/api/templates/${editingTemplate.id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api('/api/templates', { method: 'POST', body: JSON.stringify(body) });
    }
    templates = await api('/api/templates');
    const saved = editingTemplate
      ? templates.find(t => t.id === editingTemplate.id)
      : templates[0];
    editingTemplate = saved ?? null;
    renderTemplateList();
    tmplError.classList.add('hidden');
  } catch (e) {
    showTmplError(`保存に失敗しました: ${e.message}`);
  }
}

async function deleteTemplateItem() {
  if (!editingTemplate) return;
  await api(`/api/templates/${editingTemplate.id}`, { method: 'DELETE' });
  templates = await api('/api/templates');
  editingTemplate = null;
  renderTemplateList();
  templateFormEmpty.classList.remove('hidden');
  templateForm.classList.add('hidden');
}

function showTmplError(msg) {
  tmplError.textContent = msg;
  tmplError.classList.remove('hidden');
}

// ===== AI 生成 =====
async function openGenerateModal() {
  // テンプレート一覧を取得してセレクトボックスを更新する
  const templates = await api('/api/templates');
  templateSelect.innerHTML = '<option value="">テンプレートを選択...</option>' +
    templates.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  generatePrompt.value = '';
  generateError.classList.add('hidden');
  generateModal.classList.remove('hidden');
  generatePrompt.focus();
}

function closeGenerateModal() {
  generateModal.classList.add('hidden');
}

async function submitGenerate() {
  const templateId = Number(templateSelect.value);
  const prompt = generatePrompt.value.trim();

  if (!templateId) {
    showGenerateError('テンプレートを選択してください');
    return;
  }
  if (!prompt) {
    showGenerateError('トピックを入力してください');
    return;
  }

  generateSubmitBtn.disabled = true;
  generateError.classList.add('hidden');

  const MAX_RETRIES = 20;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    generateSubmitBtn.textContent = attempt === 1 ? '生成中...' : `リトライ中... (${attempt}/${MAX_RETRIES})`;

    try {
      const { content, format_type } = await api('/api/generate', {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId, prompt, model: modelSelect.value }),
      });

      const title = extractTitle(content);
      const updated = await api(`/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content, title, format_type }),
      });
      selectedNote = { ...updated, tags: selectedNote.tags };
      noteTitle.textContent = updated.title;
      noteEditor.value = content;
      const idx = notes.findIndex(n => n.id === updated.id);
      if (idx !== -1) notes[idx] = updated;
      renderNoteList();
      generateSubmitBtn.textContent = '生成する';
      generateSubmitBtn.disabled = false;
      closeGenerateModal();
      return;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
    }
  }

  showGenerateError(`生成に失敗しました（${MAX_RETRIES}回試行）: ${lastError.message}`);
  generateSubmitBtn.textContent = '生成する';
  generateSubmitBtn.disabled = false;
}

function showGenerateError(msg) {
  generateError.textContent = msg;
  generateError.classList.remove('hidden');
}

// ===== ユーティリティ =====
function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

// innerHTML にユーザー入力を埋め込む際の XSS 対策
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

// ===== 起動 =====
init();
