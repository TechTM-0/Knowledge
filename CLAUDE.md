# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 会話開始時にやること（必読）

1. **未着手タスクを把握する** — `C:\Users\t-mur\.claude\projects\C--Users-t-mur-Knowledge\memory\project_pending_tasks.md` を参照する
2. **ベクトル検索の作業前** — `docs/vector_search_issues.md` を必ず読む

### サーバー起動が必要な場合

```powershell
# 仮想環境の uvicorn で起動する。python main.py では起動しない
.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000
```

- 仮想環境は `.venv\` にある。依存パッケージはすべてここに入っている
- `python main.py` は uvicorn.run() がないため何も起動しない
- スクリプト（`update_slides.py` 等）も `.venv\Scripts\python.exe` で実行する

---

## プロジェクト概要

個人用ナレッジ管理ツール。メモ・アイデア・調査結果の整理・検索・活用を目的とする。

### アーキテクチャ

```
ブラウザ（localhost）→ FastAPI → SQLite
```

### 実装済み機能

- ノートの作成・編集・削除
- タグ・カテゴリによる整理
- 全文検索（SQLite FTS5）
- テンプレート管理（作成・編集・削除・params キーバリュー設定）
- AI文章生成（Google Gemini API）— 編集モードで ✨ AI ボタンから起動、現在のノートに流し込む
- スライドレンダラー — `format_type=slide` のノートを iframe + KaTeX でレンダリング。スライド／コードのタブ切り替えあり
- ベクトル検索（意味検索）— `gemini-embedding-2` で埋め込み生成。検索ボックス横の 🔮 ボタンで切り替え。初回は `POST /api/vector-search/index` で全ノートを再インデックス

### 技術スタック

- バックエンド: FastAPI（Python）
- DB: SQLite（FTS5）
- AI文章生成: Google Gemini API（無料枠、`gemini-2.5-flash` を使用）
- 環境変数: `GEMINI_API_KEY`

## ファイル構成とコード解説

### `main.py` — エントリポイント

アプリ起動・静的ファイル配信・ルーター登録のみ。ビジネスロジックは持たない。

---

### `schemas.py` — Pydantic スキーマ

| クラス | 役割 |
|--------|------|
| `NoteCreate` | ノート作成時のリクエストボディ（title, category, tags, content） |
| `NoteUpdate` | ノート更新時のリクエストボディ（全フィールドOptional） |
| `TemplateCreate` | テンプレート作成（name, format_type, content, params） |
| `TemplateUpdate` | テンプレート更新（全フィールドOptional） |
| `GenerateRequest` | AI生成リクエスト（template_id, prompt） |

---

### `routers/templates.py` — テンプレートCRUDエンドポイント

prefix: `/api/templates`。ノートと同じ部分更新パターン。`params` フィールド（JSON dict）でテンプレートごとの Gemini 生成指示を保持。`format_type` は `article` / `slide` の2種。

---

### `routers/generate.py` — Gemini API 連携

`POST /api/generate` — テンプレートID・プロンプトを受け取り、テンプレートの `content`（見出し構造）と `params`（JSON ブロック）をプロンプトに埋め込んで Gemini に送信。`GEMINI_API_KEY` 環境変数が必須。`format_type=slide` のときはレスポンスの JSX コードから `import` / `export default` 文を除去してブラウザ実行可能な形に整形する。

---

### `routers/notes.py` — ノートCRUDエンドポイント

prefix: `/api/notes`

| エンドポイント | 役割 |
|--------------|------|
| `GET /api/notes?q=` | ノート一覧取得。`q` があればFTS5検索（失敗時はLIKEにフォールバック） |
| `GET /api/notes/{id}` | 単一ノート取得 |
| `POST /api/notes` | ノート新規作成。`created_at` / `updated_at` をサーバー側でセット |
| `PUT /api/notes/{id}` | 部分更新。渡されたフィールドのみ更新し `updated_at` を更新 |
| `DELETE /api/notes/{id}` | ノート削除（204 No Content） |

---

### `database.py` — DB層

| 関数 | 役割 |
|------|------|
| `get_db()` | SQLite接続を返す。`row_factory = sqlite3.Row` でdict風アクセス可能にしている |
| `init_db()` | アプリ起動時に1回だけ呼ぶ。`notes` / `templates` テーブル・FTS5仮想テーブル・3つのトリガーを作成 |
| `now()` | 現在日時を `'YYYY-MM-DD HH:MM:SS'` 形式で返す。`created_at` / `updated_at` に使用 |
| `row_to_note(row)` | DB行をdictに変換し、`tags`（JSON文字列）をPythonリストに変換して返す |

**FTS5トリガー**: `notes_ai`（INSERT後）/ `notes_ad`（DELETE後）/ `notes_au`（UPDATE後）の3つで `notes_fts` を自動同期。

---

### `static/state.js` — 共有状態

全モジュールが `import { state } from './state.js'` で参照する単一のミュータブルオブジェクト。

| フィールド | 役割 |
|-----------|------|
| `notes` | API から取得した全ノートの配列 |
| `filteredNotes` | カテゴリ・検索で絞り込んだ表示用配列 |
| `selectedNote` | 現在選択中のノートオブジェクト |
| `currentCategory` | 選択中カテゴリ（`'all'` / `'memo'` / `'idea'` / `'research'`） |
| `isEditMode` | 編集モード中かどうか |
| `autoSaveTimer` / `searchTimer` | debounce 用タイマーID |
| `templates` | テンプレート一覧キャッシュ |
| `editingTemplate` | テンプレート管理モーダルで編集中のテンプレート（null = 新規） |
| `slideViewTab` | スライドノートの表示タブ（`'slide'` / `'code'`） |
| `generateCancelled` | AI生成リトライをキャンセルするフラグ |

---

### `static/utils.js` — 共通ユーティリティ

副作用なしの純粋関数・定数のみ。全モジュールが参照する。

| エクスポート | 役割 |
|------------|------|
| `CATEGORY_LABELS` | カテゴリ名のマッピング定数 |
| `api(path, options)` | fetch のラッパー。204はnull返却、エラーは例外 |
| `escapeHtml(str)` | XSS対策のHTMLエスケープ |
| `extractTitle(content)` | Markdown の最初の `#` 見出しをタイトルとして抽出 |
| `categoryLabel(cat)` | カテゴリキーを表示名に変換 |

---

### `static/slide.js` — スライドレンダラー

`format_type=slide` のノートに関する描画ロジック。

| エクスポート | 役割 |
|------------|------|
| `buildSlideHtml(jsxCode)` | JSX コードを受け取り、iframe の `srcdoc` に設定する完全な HTML 文字列を生成（React・Babel CDN を含む） |
| `showSlideTab(tab)` | `'slide'` / `'code'` タブの切り替え。`display:none` を使わず flex で潰すことで iframe の React 初期化状態を維持する |
| `renderSlide()` | view モードでスライドを表示。2段階 rAF で React 初期化タイミングを保証する |
| `hideSlide()` | スライドタブ・コンテナを完全に非表示（article ノートの view モードで呼ばれる） |
| `collapseSlide()` | コンテナのみ折り畳む（編集モード移行時に呼ばれる。iframe の状態は維持） |

---

### `static/templates.js` — テンプレート管理

`#templateModal` の開閉・一覧表示・フォーム操作を担当。

| エクスポート | 役割 |
|------------|------|
| `openTemplateModal()` | テンプレート一覧を API 取得してモーダルを開く |
| `closeTemplateModal()` | モーダルを閉じる |
| `renderTemplateList()` | `state.templates` をもとに一覧を再描画（クリックは `app.js` のイベント委譲で処理） |
| `openTemplateForm(template)` | 右パネルのフォームに選択テンプレートを展開（`null` = 新規） |
| `addParamRow(key, value)` | params キーバリュー行を動的追加 |
| `collectParams()` | フォームの params 行を `{key: value}` オブジェクトに集約 |
| `saveTemplate()` | テンプレートの作成または更新 |
| `deleteTemplateItem()` | テンプレート削除 |

---

### `static/generate.js` — AI生成

`#generateModal` の開閉・Gemini API リクエスト・リトライを担当。

| エクスポート | 役割 |
|------------|------|
| `openGenerateModal()` | テンプレート一覧を取得してモーダルを開く（編集モード時のみ ✨ ボタンで呼ばれる） |
| `closeGenerateModal()` | モーダルを閉じ、`generateCancelled` フラグをセットしてリトライを即中断 |
| `submitGenerate(onSuccess)` | Gemini API にリクエスト → 生成結果を現在のノートに保存 → `onSuccess()`（`renderNoteList`）を呼ぶ。エラー時は2秒待ちで最大20回リトライ |

---

### `static/app.js` — メインモジュール

ノートCRUD・タグ操作・検索・フィルター・モード切替・イベント登録を担当。各サブモジュールをインポートして統合する。

**主要関数**

| 関数 | 役割 |
|------|------|
| `init()` | 起動時に `loadNotes()` とイベント登録を実行 |
| `loadNotes()` | `GET /api/notes` で全件取得し `applyFilters()` を呼ぶ |
| `bindEvents()` | 全イベントリスナーを登録。`noteList` / `noteTags` / `templateList` はイベント委譲を使用 |
| `renderNoteList()` | `state.filteredNotes` をもとにサイドバーのカード一覧を再描画 |
| `selectNote(id)` | `state.notes` からノートを探してメインエリアに表示 |
| `showViewMode()` / `showEditMode()` | 表示・編集モードの切り替え。スライドノートは `slide.js` の関数に委譲 |
| `scheduleAutoSave()` | 800ms debounce で `PUT /api/notes/{id}` を呼ぶ |
| `applyFilters()` / `applyCategory()` | カテゴリ・検索キーワードでクライアント側絞り込みし `renderNoteList()` |
| `renderTags(editMode)` | タグをバッジ表示（view）または削除ボタン付き表示（edit）で描画 |

**UI フロー**
- ✨ AI ボタンは編集モード時のみ表示
- AI生成は新規ノート作成ではなく、**現在開いているノートの内容を上書き**する
- スライドノートは view モードで iframe レンダリング、code タブでソース表示

---

### `static/index.html` — フロントエンド構造

- Tailwind CSS（CDN）でレイアウト、`style.css` でガラスモーフィズムのカスタムスタイルを適用
- `<script type="module">` で `app.js` を読み込む（ES Modules によりグローバル汚染なし）
- モーダル: `#templateModal`（テンプレート管理）/ `#generateModal`（AI生成）の2つ

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
| `.tag-remove-btn` | タグ削除ボタン（`×`）のスタイル。hover で白く変化 |
| `.markdown-body` | Markdownレンダリング領域のスタイル一式 |

---

## 設計方針

### ファイル分割の基準

機能の追加・変更時に「どこを触ればよいか」が一目でわかる構成を維持する。
以下のいずれかに該当する場合に分割を検討する（強制ではなく判断基準）。

- 1ファイルに複数の責務が混在して、変更箇所を特定しにくくなったとき
- 新しい機能ドメイン（検索・AI連携など）を追加するとき

### バックエンドのファイル構成

```
main.py           # エントリポイント・ルーター登録・lifespan のみ
database.py       # DB接続・初期化・ヘルパー関数のみ
schemas.py        # Pydantic スキーマ（リクエスト/レスポンス型）のみ
routers/
  notes.py        # ノート CRUD エンドポイント
  templates.py    # テンプレート CRUD エンドポイント
  generate.py     # Gemini API 連携エンドポイント
```

| ファイル | 書いてよいもの | 書いてはいけないもの |
|---------|--------------|-------------------|
| `main.py` | `app` インスタンス、`lifespan`、`router.include_router()` | ビジネスロジック、SQL |
| `database.py` | DB接続、テーブル/FTS定義、ヘルパー関数 | HTTPロジック、スキーマ定義 |
| `schemas.py` | Pydantic モデルのみ | ロジック |
| `routers/*.py` | エンドポイント関数 | SQL直書き（`database.py` の関数を呼ぶ） |

### フロントエンドのファイル構成

```
static/
  index.html      # HTML構造のみ（type="module" で app.js を読み込む）
  style.css       # スタイルのみ
  state.js        # 共有状態オブジェクト（全モジュールが import して参照・更新）
  utils.js        # 副作用なしの共通ユーティリティ（api・escapeHtml 等）
  slide.js        # スライドレンダラー（buildSlideHtml・showSlideTab 等）
  templates.js    # テンプレート管理 UI ロジック
  generate.js     # AI生成モーダルロジック
  app.js          # メイン（ノートCRUD・タグ・検索・初期化・イベント登録）
```

ES Modules（`type="module"`）を使用。グローバル変数汚染なし。
新しい機能ドメインを追加する場合は新ファイルに分離し、`state.js` の共有状態を参照する。

### 責務の分離ルール

**バックエンド**
- エンドポイント関数はリクエスト受け取り・レスポンス返却のみ。DB操作は `database.py` の関数に委譲する
- SQLは `database.py`（または将来の `routers/` 内ヘルパー）に集約し、エンドポイントに直書きしない

**フロントエンド**
- 「データ取得」と「描画」は必ず分離した関数にする（例: `loadNotes()` はデータのみ、`renderNoteList()` は描画のみ）
- 状態変数（`notes`, `selectedNote` 等）を変更する操作は、必ずAPIを経由してからローカル状態を更新する（楽観的更新はしない）
- 描画関数（`render*`）は副作用なしで `filteredNotes` 等の状態だけを参照する

### 命名規則

| 種別 | 規則 | 例 |
|------|------|-----|
| Python 関数 | snake_case | `get_note`, `init_db` |
| Python クラス（スキーマ） | PascalCase | `NoteCreate`, `NoteUpdate` |
| Python ルーターファイル | snake_case | `routers/notes.py` |
| JS 関数 | camelCase | `loadNotes`, `renderNoteList` |
| JS 定数 | UPPER_SNAKE_CASE | `CATEGORY_LABELS` |
| API パス | kebab-case（小文字・ハイフン区切り） | `/api/notes`, `/api/vector-search` |

---

## 開発ルール

- このリポジトリでのやり取りは**日本語**で行う
- AI文章生成には Anthropic API を**使わない**。Google Gemini API（無料枠）を使う
- フォルダ構成に変更があった場合は、`README.md` の「フォルダ構成」セクションも必ず更新する
- 新しい機能ドメインを追加するときは「設計方針」セクションのファイル構成も更新する
