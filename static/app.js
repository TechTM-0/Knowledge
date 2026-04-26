// ===== ダミーデータ（APIが完成するまでの仮データ） =====
const DUMMY_NOTES = [
  {
    id: 1,
    title: 'Knowledge ツールの設計メモ',
    category: 'memo',
    tags: ['設計', 'FastAPI', 'SQLite'],
    date: '2026-04-25',
    content: `## 概要

個人用ナレッジ管理ツールの設計をまとめる。

## アーキテクチャ

\`\`\`
ブラウザ → FastAPI → SQLite
\`\`\`

## 実装フェーズ

1. **フロントエンド** ← 今ここ
2. データベース & CRUD API
3. 全文検索（FTS5）
4. ベクトル検索（後回し）
5. Gemini API 連携

## 技術選定ポイント

- SQLite はローカル保存で軽量
- FTS5 で日本語全文検索も対応可能
- **Gemini API** の無料枠で文章生成`,
  },
  {
    id: 2,
    title: 'ベクトル検索モデルの候補',
    category: 'research',
    tags: ['AI', 'ベクトル検索', '後回し'],
    date: '2026-04-25',
    content: `## 候補

| モデル | 特徴 |
|--------|------|
| **text-embedding-004** | Gemini API、無料枠あり |
| **sentence-transformers** | ローカル動作、API不要 |

## 方針

現在は**後回し**。Phase 1〜3 完了後に着手予定。

> 個人用途なら Gemini の無料枠（1日150万トークン）で十分。`,
  },
  {
    id: 3,
    title: 'FastAPI の基本構造',
    category: 'research',
    tags: ['FastAPI', 'Python', 'バックエンド'],
    date: '2026-04-24',
    content: `## エントリーポイント

\`\`\`python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root():
    return FileResponse("static/index.html")
\`\`\`

## 主なエンドポイント

- \`GET /\` — フロントエンド配信
- \`GET /api/notes\` — ノート一覧
- \`POST /api/notes\` — ノート作成
- \`PUT /api/notes/{id}\` — 更新
- \`DELETE /api/notes/{id}\` — 削除`,
  },
  {
    id: 4,
    title: 'アイデア：AI自動タグ付け',
    category: 'idea',
    tags: ['アイデア', 'Gemini', 'UX'],
    date: '2026-04-23',
    content: `## アイデア

ノートを保存したとき、Gemini API が自動でタグを提案してくれると便利。

## 実装イメージ

\`\`\`python
def suggest_tags(content: str) -> list[str]:
    prompt = f"以下のメモに適切なタグを3つ提案してください:\\n\\n{content}"
    # Gemini API 呼び出し
    ...
\`\`\`

## 優先度

低（コア機能完成後に検討）`,
  },
  {
    id: 5,
    title: 'SQLite FTS5 チートシート',
    category: 'memo',
    tags: ['SQLite', 'FTS5', 'SQL'],
    date: '2026-04-22',
    content: `## FTS5 仮想テーブル作成

\`\`\`sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title, content,
  tokenize='trigram'
);
\`\`\`

## 全文検索クエリ

\`\`\`sql
SELECT * FROM notes_fts WHERE notes_fts MATCH 'FastAPI';
\`\`\`

> trigram トークナイザを使うと日本語でも検索できる。`,
  },
];

const CATEGORY_LABELS = { memo: 'メモ', idea: 'アイデア', research: '調査' };

// ===== 状態 =====
let notes = [...DUMMY_NOTES];
let filteredNotes = [...notes];
let selectedId = null;
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

// ===== 初期化 =====
function init() {
  renderNoteList();
  bindEvents();
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
      class="glass-card p-3.5 ${note.id === selectedId ? 'glass-card--active' : ''}"
      data-id="${note.id}"
    >
      <div class="text-sm font-semibold text-white leading-snug mb-1 truncate">
        ${escapeHtml(note.title)}
      </div>
      <div class="flex items-center gap-2 mb-2">
        <span class="text-xs text-white/40">${note.date}</span>
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
  selectedId = id;
  isEditMode = false;

  const note = notes.find(n => n.id === id);
  if (!note) return;

  noteTitle.textContent = note.title;
  noteDate.textContent = note.date;
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
  if (isEditMode) {
    showViewMode();
  } else {
    showEditMode();
  }
}

// ===== 自動保存（クライアント側のみ） =====
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const note = notes.find(n => n.id === selectedId);
    if (!note) return;
    note.content = noteEditor.value;
    noteContent.innerHTML = marked.parse(note.content);
  }, 600);
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
function openNewNote() {
  const id = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const note = {
    id,
    title: '新しいノート',
    category: 'memo',
    tags: [],
    date: today,
    content: '# 新しいノート\n\nここに内容を書いてください...',
  };
  notes.unshift(note);
  applyFilters();
  selectNote(id);
  showEditMode();
}

// ===== 削除 =====
function deleteNote() {
  if (!selectedId) return;
  if (!confirm('このノートを削除しますか？')) return;

  notes = notes.filter(n => n.id !== selectedId);
  filteredNotes = filteredNotes.filter(n => n.id !== selectedId);
  selectedId = null;

  noteView.classList.add('hidden');
  noteView.classList.remove('flex');
  emptyState.classList.remove('hidden');

  renderNoteList();
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
