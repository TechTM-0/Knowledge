import { state } from './state.js';
import { api, escapeHtml, categoryLabel, extractTitle, CATEGORY_LABELS } from './utils.js';
import { showSlideTab, renderSlide, hideSlide, collapseSlide } from './slide.js';
import {
  openTemplateModal, closeTemplateModal, renderTemplateList,
  openTemplateForm, addParamRow, saveTemplate, deleteTemplateItem,
} from './templates.js';
import { openGenerateModal, closeGenerateModal, submitGenerate } from './generate.js';

// ===== DOM 参照 =====
const noteList           = document.getElementById('noteList');
const noteCount          = document.getElementById('noteCount');
const searchInput        = document.getElementById('searchInput');
const emptyState         = document.getElementById('emptyState');
const noteView           = document.getElementById('noteView');
const noteTitle          = document.getElementById('noteTitle');
const noteTitleInput     = document.getElementById('noteTitleInput');
const noteDate           = document.getElementById('noteDate');
const noteCategory       = document.getElementById('noteCategory');
const noteTags           = document.getElementById('noteTags');
const noteContent        = document.getElementById('noteContent');
const noteEditor         = document.getElementById('noteEditor');
const editBtn            = document.getElementById('editBtn');
const newNoteBtn         = document.getElementById('newNoteBtn');
const noteCategorySelect = document.getElementById('noteCategorySelect');
const generateBtn           = document.getElementById('generateBtn');
const templateList          = document.getElementById('templateList');
const vectorSearchToggle    = document.getElementById('vectorSearchToggle');

// ===== 初期化 =====
async function init() {
  noteCategorySelect.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(([v, l]) => `<option value="${v}">${l}</option>`)
    .join('');
  await loadNotes();
  bindEvents();
}

async function loadNotes() {
  state.notes = await api('/api/notes');
  applyFilters();
}

// ===== イベント登録 =====
function bindEvents() {
  newNoteBtn.addEventListener('click', openNewNote);
  editBtn.addEventListener('click', toggleEditMode);
  document.getElementById('deleteBtn').addEventListener('click', deleteNote);
  searchInput.addEventListener('input', scheduleSearch);
  noteEditor.addEventListener('input', scheduleAutoSave);
  noteTitleInput.addEventListener('input', scheduleAutoSave);
  noteCategorySelect.addEventListener('change', changeCategory);

  // イベント委譲: ノートカード
  noteList.addEventListener('click', e => {
    const card = e.target.closest('[data-id]');
    if (card) selectNote(Number(card.dataset.id));
  });

  // イベント委譲: タグ削除ボタン・タグ入力
  noteTags.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-tag]');
    if (btn) removeTag(Number(btn.dataset.removeTag));
  });
  noteTags.addEventListener('keydown', e => {
    if (e.target.id === 'tagInput') handleTagInput(e);
  });

  document.getElementById('slideTabSlide').addEventListener('click', () => showSlideTab('slide'));
  document.getElementById('slideTabCode').addEventListener('click', () => showSlideTab('code'));

  document.getElementById('templateBtn').addEventListener('click', openTemplateModal);
  document.getElementById('templateCloseBtn').addEventListener('click', closeTemplateModal);
  document.getElementById('templateOverlay').addEventListener('click', closeTemplateModal);
  document.getElementById('templateNewBtn').addEventListener('click', () => openTemplateForm(null));
  document.getElementById('tmplAddParamBtn').addEventListener('click', () => addParamRow('', ''));
  document.getElementById('tmplSaveBtn').addEventListener('click', saveTemplate);
  document.getElementById('tmplDeleteBtn').addEventListener('click', deleteTemplateItem);

  // イベント委譲: テンプレート一覧
  templateList.addEventListener('click', e => {
    const btn = e.target.closest('[data-tid]');
    if (!btn) return;
    const t = state.templates.find(x => x.id === Number(btn.dataset.tid));
    if (t) openTemplateForm(t);
  });

  vectorSearchToggle.addEventListener('change', toggleVectorSearch);
  document.getElementById('generateBtn').addEventListener('click', openGenerateModal);
  document.getElementById('generateCloseBtn').addEventListener('click', closeGenerateModal);
  document.getElementById('generateOverlay').addEventListener('click', closeGenerateModal);
  document.getElementById('generateSubmitBtn').addEventListener('click', () => submitGenerate(renderNoteList));

  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => setCategory(btn));
  });
}

// ===== ノート一覧描画 =====
function renderNoteList() {
  noteCount.textContent = state.filteredNotes.length;

  if (state.filteredNotes.length === 0) {
    noteList.innerHTML = `
      <div class="text-center text-white/30 text-sm py-8">ノートが見つかりません</div>
    `;
    return;
  }

  noteList.innerHTML = state.filteredNotes.map(note => `
    <div
      class="glass-card p-3.5 ${note.id === state.selectedNote?.id ? 'glass-card--active' : ''}"
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
}

// ===== ノート選択 =====
function selectNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  state.selectedNote = note;
  state.isEditMode = false;

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
  noteTitle.classList.remove('hidden');
  noteTitleInput.classList.add('hidden');
  noteCategory.textContent = categoryLabel(state.selectedNote?.category ?? 'memo');
  noteCategory.classList.remove('hidden');
  noteCategorySelect.classList.add('hidden');
  editBtn.textContent = '✏️ 編集';
  state.isEditMode = false;
  generateBtn.classList.add('hidden');
  renderTags(false);

  if (state.selectedNote?.format_type === 'slide') {
    renderSlide();
  } else {
    hideSlide();
    noteContent.classList.remove('hidden');
    noteContent.innerHTML = marked.parse(state.selectedNote?.content ?? '');
    renderMathInElement(noteContent, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  }
}

function showEditMode() {
  noteContent.classList.add('hidden');
  collapseSlide();
  noteEditor.classList.remove('hidden');
  noteEditor.classList.add('flex');
  noteTitle.classList.add('hidden');
  noteTitleInput.classList.remove('hidden');
  noteTitleInput.value = state.selectedNote?.title ?? '';
  noteCategory.classList.add('hidden');
  noteCategorySelect.classList.remove('hidden');
  noteCategorySelect.value = state.selectedNote?.category ?? 'memo';
  editBtn.textContent = '👁️ 表示';
  state.isEditMode = true;
  generateBtn.classList.remove('hidden');
  noteEditor.focus();
  renderTags(true);
}

function toggleEditMode() {
  state.isEditMode ? showViewMode() : showEditMode();
}

// ===== 自動保存（800ms debounce） =====
function scheduleAutoSave() {
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(async () => {
    if (!state.selectedNote) return;
    const content = noteEditor.value;
    const title = noteTitleInput.value.trim() || extractTitle(content);
    const currentTags = state.selectedNote.tags;
    const updated = await api(`/api/notes/${state.selectedNote.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content, title }),
    });
    state.selectedNote = { ...updated, tags: currentTags };
    noteTitle.textContent = updated.title;
    noteContent.innerHTML = marked.parse(content);
    renderMathInElement(noteContent, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
    const idx = state.notes.findIndex(n => n.id === updated.id);
    if (idx !== -1) state.notes[idx] = updated;
    renderNoteList();
  }, 800);
}

// ===== 検索（300ms debounce） =====
function scheduleSearch() {
  const query = searchInput.value.trim();
  clearTimeout(state.searchTimer);
  if (query) {
    state.searchTimer = setTimeout(() => searchFromApi(query), 300);
  } else {
    applyFilters();
  }
}

async function searchFromApi(query) {
  const endpoint = state.vectorSearchMode
    ? `/api/vector-search?q=${encodeURIComponent(query)}`
    : `/api/notes?q=${encodeURIComponent(query)}`;
  const results = await api(endpoint);
  applyCategory(results);
}

function toggleVectorSearch() {
  state.vectorSearchMode = vectorSearchToggle.checked;
  const query = searchInput.value.trim();
  if (query) searchFromApi(query);
}

function applyFilters() {
  applyCategory(state.notes);
}

function applyCategory(noteArr) {
  state.filteredNotes = state.currentCategory === 'all'
    ? noteArr
    : noteArr.filter(n => n.category === state.currentCategory);
  renderNoteList();
}

function setCategory(btn) {
  state.currentCategory = btn.dataset.category;
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
  if (!state.selectedNote) return;
  if (!confirm('このノートを削除しますか？')) return;
  await api(`/api/notes/${state.selectedNote.id}`, { method: 'DELETE' });
  state.selectedNote = null;
  noteView.classList.add('hidden');
  noteView.classList.remove('flex');
  emptyState.classList.remove('hidden');
  await loadNotes();
}

// ===== カテゴリ変更 =====
async function changeCategory() {
  if (!state.selectedNote) return;
  const updated = await api(`/api/notes/${state.selectedNote.id}`, {
    method: 'PUT',
    body: JSON.stringify({ category: noteCategorySelect.value }),
  });
  state.selectedNote = updated;
  const idx = state.notes.findIndex(n => n.id === updated.id);
  if (idx !== -1) state.notes[idx] = updated;
  renderNoteList();
}

// ===== タグ描画・操作 =====
function renderTags(editMode) {
  const tags = state.selectedNote?.tags ?? [];
  if (editMode) {
    noteTags.innerHTML =
      tags.map((t, i) => `
        <span class="tag" style="display:inline-flex;align-items:center;gap:4px;">
          #${escapeHtml(t)}
          <button class="tag-remove-btn" data-remove-tag="${i}">×</button>
        </span>
      `).join('') +
      `<input id="tagInput" type="text" placeholder="タグを追加..." class="tag-input">`;
  } else {
    noteTags.innerHTML = tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('');
  }
}

function handleTagInput(e) {
  if (e.isComposing) return;
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.replace(/,/g, '').trim();
  if (!val) return;
  e.target.value = '';
  addTag(val);
}

async function addTag(tagName) {
  if (!state.selectedNote || state.selectedNote.tags.includes(tagName)) return;
  const updated = await api(`/api/notes/${state.selectedNote.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tags: [...state.selectedNote.tags, tagName] }),
  });
  state.selectedNote = updated;
  const idx = state.notes.findIndex(n => n.id === updated.id);
  if (idx !== -1) state.notes[idx] = updated;
  renderTags(true);
  document.getElementById('tagInput')?.focus();
  renderNoteList();
}

async function removeTag(index) {
  if (!state.selectedNote) return;
  const updated = await api(`/api/notes/${state.selectedNote.id}`, {
    method: 'PUT',
    body: JSON.stringify({ tags: state.selectedNote.tags.filter((_, i) => i !== index) }),
  });
  state.selectedNote = updated;
  const idx = state.notes.findIndex(n => n.id === updated.id);
  if (idx !== -1) state.notes[idx] = updated;
  renderTags(true);
  document.getElementById('tagInput')?.focus();
  renderNoteList();
}

init();
