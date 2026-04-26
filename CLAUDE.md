# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

個人用ナレッジ管理ツール。メモ・アイデア・調査結果の整理・検索・活用を目的とする。

### アーキテクチャ

```
ブラウザ（localhost）→ FastAPI → SQLite
```

### 主な機能

- ノートの作成・編集・削除
- タグ・カテゴリによる整理
- 全文検索（SQLite FTS5）
- ベクトル検索（意味的な類似検索）
- 文章生成（Google Gemini API）
- Markdown対応

### 技術スタック

- バックエンド: FastAPI（Python）
- DB: SQLite（FTS5 + ベクトル検索）
- AI文章生成: Google Gemini API（無料枠、`gemini-2.0-flash` を使用）
- 環境変数: `GEMINI_API_KEY`

## ファイル構成とコード解説

### `database.py` — DB層

| 関数 | 役割 |
|------|------|
| `get_db()` | SQLite接続を返す。`row_factory = sqlite3.Row` でdict風アクセス可能にしている |
| `init_db()` | アプリ起動時に1回だけ呼ぶ。`notes` テーブル・FTS5仮想テーブル・3つのトリガーを作成 |
| `now()` | 現在日時を `'YYYY-MM-DD HH:MM:SS'` 形式で返す。`created_at` / `updated_at` に使用 |
| `row_to_note(row)` | DB行をdictに変換し、`tags`（JSON文字列）をPythonリストに変換して返す |

**FTS5トリガー**: `notes_ai`（INSERT後）/ `notes_ad`（DELETE後）/ `notes_au`（UPDATE後）の3つで `notes_fts` を自動同期。

---

### `main.py` — APIルート層

| スキーマ / 関数 | 役割 |
|----------------|------|
| `NoteCreate` | ノート作成時のリクエストボディ（title, category, tags, content） |
| `NoteUpdate` | ノート更新時のリクエストボディ（全フィールドOptional） |
| `GET /api/notes?q=` | ノート一覧取得。`q` があればFTS5検索（失敗時はLIKEにフォールバック） |
| `GET /api/notes/{id}` | 単一ノート取得 |
| `POST /api/notes` | ノート新規作成。`created_at` / `updated_at` をサーバー側でセット |
| `PUT /api/notes/{id}` | 部分更新。渡されたフィールドのみ更新し `updated_at` を更新 |
| `DELETE /api/notes/{id}` | ノート削除（204 No Content） |

---

### `static/app.js` — フロントエンドロジック

**状態変数**

| 変数 | 役割 |
|------|------|
| `notes` | APIから取得した全ノートの配列 |
| `filteredNotes` | カテゴリ・検索で絞り込んだ表示用配列 |
| `selectedNote` | 現在選択中のノートオブジェクト |
| `currentCategory` | 選択中カテゴリ（`'all'` / `'memo'` / `'idea'` / `'research'`） |
| `autoSaveTimer` | 編集中の自動保存タイマーID |

**主要関数**

| 関数 | 役割 |
|------|------|
| `api(path, options)` | fetch のラッパー。204はnull返却、エラーは例外 |
| `init()` | 起動時に `loadNotes()` とイベント登録を実行 |
| `loadNotes()` | `GET /api/notes` で全件取得し `applyFilters()` を呼ぶ |
| `renderNoteList()` | `filteredNotes` をもとにサイドバーのカード一覧を再描画 |
| `selectNote(id)` | `notes` 配列からノートを探してメインエリアに表示 |
| `applyFilters()` | カテゴリ・検索キーワードでクライアント側絞り込みし `renderNoteList()` |
| `scheduleAutoSave()` | 800ms debounce で `PUT /api/notes/{id}` を呼ぶ |
| `extractTitle(content)` | Markdownの最初の `# 見出し` をタイトルとして抽出 |
| `openNewNote()` | `POST /api/notes` でDB作成 → 一覧再取得 → 編集モードで開く |
| `deleteNote()` | `DELETE /api/notes/{id}` → 一覧再取得 |
| `escapeHtml(str)` | XSS対策のHTMLエスケープ |

---

### `static/index.html` — フロントエンド構造

- Tailwind CSS（CDN）でレイアウト、`style.css` でガラスモーフィズムのカスタムスタイルを適用
- 主要な要素IDと対応する変数: `noteList` / `searchInput` / `emptyState` / `noteView` / `noteEditor` / `noteContent`

---

### `static/style.css` — スタイル

| クラス | 役割 |
|--------|------|
| `.glass` | サイドバー・ヘッダー等の半透明パネル |
| `.glass-card` | ノートカード（ホバー・アクティブ状態あり） |
| `.glass-input` | 検索・編集テキストエリア |
| `.btn-primary` | 新規作成・編集ボタン（インディゴ系） |
| `.btn-danger` | 削除ボタン（赤系） |
| `.tag` | カテゴリ・タグの丸バッジ |
| `.markdown-body` | Markdownレンダリング領域のスタイル一式 |

---

## 開発ルール

- このリポジトリでのやり取りは**日本語**で行う
- AI文章生成には Anthropic API を**使わない**。Google Gemini API（無料枠）を使う
- フォルダ構成に変更があった場合は、`README.md` の「フォルダ構成」セクションも必ず更新する
