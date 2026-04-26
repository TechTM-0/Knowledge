const CATEGORY_LABELS = { memo: 'メモ', idea: 'アイデア', research: '調査' };

// ===== 状態 =====
let notes = [];
let filteredNotes = [];
let selectedNote = null;
let currentCategory = 'all';
let isEditMode = false;
let autoSaveTimer = null;

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
const editBtn      = document.getElementById('editBtn');
const deleteBtn    = document.getElementById('deleteBtn');
const newNoteBtn   = document.getElementById('newNoteBtn');

// ===== API ヘルパー =====
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
  searchInput.addEventListener('input', () => applyFilters());
  noteEditor.addEventListener('input', scheduleAutoSave);

  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => setCategory(btn));
  });
}

// ===== ノート一覧の描画 =====
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
  noteCategory.textContent = categoryLabel(note.category);
  noteTags.innerHTML = note.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
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
  editBtn.textContent = '✏️ 編集';
  isEditMode = false;
}

function showEditMode() {
  noteContent.classList.add('hidden');
  noteEditor.classList.remove('hidden');
  noteEditor.classList.add('flex');
  editBtn.textContent = '👁️ 表示';
  isEditMode = true;
  noteEditor.focus();
}

function toggleEditMode() {
  isEditMode ? showViewMode() : showEditMode();
}

// ===== 自動保存 =====
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(async () => {
    if (!selectedNote) return;
    const content = noteEditor.value;
    const title = extractTitle(content);
    const updated = await api(`/api/notes/${selectedNote.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, title }),
    });
    selectedNote = updated;
    noteTitle.textContent = updated.title;
    noteContent.innerHTML = marked.parse(content);
    const idx = notes.findIndex(n => n.id === updated.id);
    if (idx !== -1) notes[idx] = updated;
    renderNoteList();
  }, 800);
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : '新しいノート';
}

// ===== フィルター =====
function applyFilters() {
  const query = searchInput.value.trim();
  filteredNotes = notes.filter(note => {
    const matchCategory = currentCategory === 'all' || note.category === currentCategory;
    const matchQuery = !query ||
      note.title.includes(query) ||
      note.content.includes(query) ||
      note.tags.some(t => t.includes(query));
    return matchCategory && matchQuery;
  });
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

// ===== ユーティリティ =====
function categoryLabel(cat) {
  return CATEGORY_LABELS[cat] || cat;
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

// ===== 起動 =====
init();
