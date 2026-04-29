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
const editBtn              = document.getElementById('editBtn');
const deleteBtn            = document.getElementById('deleteBtn');
const newNoteBtn           = document.getElementById('newNoteBtn');
const noteCategorySelect   = document.getElementById('noteCategorySelect');

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
  // marked.parse: Markdown テキストを HTML に変換して表示
  noteContent.innerHTML = marked.parse(note.content);
  noteEditor.value = note.content;

  emptyState.classList.add('hidden');
  noteView.classList.remove('hidden');
  noteView.classList.add('flex');

  showViewMode();
  renderNoteList();
}

// ===== 表示／編集モード切替 =====
function showViewMode() {
  noteContent.classList.remove('hidden');
  noteEditor.classList.add('hidden');
  noteEditor.classList.remove('flex');
  noteCategory.textContent = categoryLabel(selectedNote?.category ?? 'memo');
  noteCategory.classList.remove('hidden');
  noteCategorySelect.classList.add('hidden');
  editBtn.textContent = '✏️ 編集';
  isEditMode = false;
  renderTags(false);
}

function showEditMode() {
  noteContent.classList.add('hidden');
  noteEditor.classList.remove('hidden');
  noteEditor.classList.add('flex');
  // 表示モードのテキスト span を隠し、セレクトボックスを表示する
  noteCategory.classList.add('hidden');
  noteCategorySelect.classList.remove('hidden');
  noteCategorySelect.value = selectedNote?.category ?? 'memo';
  editBtn.textContent = '👁️ 表示';
  isEditMode = true;
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
