# タスク管理

実装状況を一元管理するファイル。完了したらここに「完了」と日付を記録する。
分散させない。このファイルだけを見れば状態がわかるようにする。

---

## ✅ 完了済み

| タスク | 完了日 | 実装場所 |
|--------|--------|----------|
| ベクトル検索：ハイブリッド検索（FTS5 + RRF） | 2026-05頃 | `routers/vector_search.py:132-138` |
| ベクトル検索：相対閾値による絞り込み（スコア正規化の代替） | 2026-05頃 | `routers/vector_search.py:57` |
| ベクトル検索：閾値スライダー UI | 2026-05頃 | `static/index.html:58,70`, `static/app.js:95-96,307` |
| Gemini API エラーハンドリング（429クォータ超過の即時通知） | 2026-05-10 | `routers/generate.py`, `static/generate.js`, `static/utils.js` |

---

## 🚧 実装中

### 画像挿入 + GitHub 自動アップロード（2026-05-10 着手）

**合意済みの仕様：**
- 編集モードのエディタに画像をドラッグ＆ドロップ → GitHub の `images/` フォルダに push → カーソル位置に `![ファイル名](raw.githubusercontent.com/...)` を挿入
- リポジトリは public なので Zenn 等へのコピペで画像も表示される
- 同名ファイルを再ドロップすると上書き（差し替え）
- view モードで画像をホバーすると ✕ ボタン → クリックで GitHub から削除 + ノートの Markdown からも除去

**必要な環境変数（.env に追加が必要）：**
- `GITHUB_TOKEN` — Personal Access Token（`contents: write` スコープ）
- `GITHUB_REPO` — 例: `TechTM-0/Knowledge`

**変更ファイルと内容：**

| ファイル | 状態 | 内容 |
|---------|------|------|
| `routers/images.py` | ❌ 未作成 | `POST /api/images/upload`（GitHub PUT）と `DELETE /api/images/{filename}` |
| `main.py` | ❌ 未変更 | `images_router` を `include_router` に追加 |
| `routers/vector_search.py` | ❌ 未変更 | `_note_to_text()` に `re.sub(r"!\[.*?\]\(.*?\)", "", text)` を追加して画像記法を除去 |
| `static/app.js` | ❌ 未変更 | ① `noteEditor` に dragover/drop イベント追加、② `uploadAndInsertImage(file)` 関数追加、③ `renderMarkdown()` で画像を `<span class="img-wrapper">` でラップして ✕ ボタン埋め込み、④ `noteContent` にクリック委譲で削除処理 |
| `static/style.css` | ❌ 未変更 | `.img-wrapper` / `.img-delete-btn` のホバースタイル追加 |

**実装を始めるときは：** `routers/images.py` の新規作成から着手する。

---

## ❌ 未実装

### 機能追加

#### カテゴリ廃止 → タグ検索一本化
検索ボックスで `#` 入力時に既存タグをサジェスト。サイドバーのカテゴリボタンを削除してタグに統一する。

**変更ファイル:** `static/app.js`（`#` 検出・サジェストUI）、`static/index.html`（カテゴリボタン削除）、`routers/notes.py`、`database.py`  
**注意:** 既存ノートの category を `#memo` 等のタグに変換するマイグレーションスクリプトが必要。

---

#### ノート間リンク（`[[タイトル]]` 記法）
本文中の `[[ノートタイトル]]` を view モードでクリッカブルなリンクに変換。編集中は `[[` 入力でタイトルサジェスト。

**変更ファイル:** `static/app.js`（`renderMarkdown()` の変換処理・サジェストUI）

---

#### AI生成のストリーミング表示
文字が流れるように表示する。バックエンドは SSE、フロントエンドは ReadableStream で受け取る。

**変更ファイル:** `routers/generate.py`（`stream=True` + `StreamingResponse`）、`static/generate.js`（ReadableStream 処理）

---

#### ノート一覧のソート切り替え
現在は更新日降順で固定。「作成日」「タイトル」への切り替えボタンを追加。クライアント側のみで完結。

**変更ファイル:** `static/app.js`、`static/index.html`

---

#### エクスポート機能
- slide: `buildSlideHtml()` の出力を HTML ファイルとしてダウンロード
- article: Markdown テキストを `.md` ファイルとしてダウンロード

**変更ファイル:** `static/app.js`、`static/slide.js`

---

#### 画像挿入 + GitHub 自動アップロード
編集モードで画像をドロップ → `POST /api/images/upload` → GitHub Contents API 経由でリポジトリに push → raw URL を Markdown に挿入。

**変更ファイル:** `routers/images.py`（新規）、`static/app.js`、`static/index.html`  
**必要な環境変数:** `GITHUB_TOKEN`（repo スコープ）、`GITHUB_REPO`（例: `TechTM-0/Knowledge`）

---

### ベクトル検索改善

#### タイトルと本文を別 embedding・重み付け（優先度中）
タイトルの識別力を活かす。現在はタイトル + 本文を結合して1ベクトル。

**実装方針:** `notes` テーブルに `title_embedding` カラム追加 → `embed_and_save()` でタイトルと本文を別々に embed → `0.6 * title_sim + 0.4 * body_sim` で統合。再インデックスが必要。  
**変更ファイル:** `database.py`、`routers/vector_search.py`

---

#### クエリ拡張（優先度低）
短いクエリの embedding が曖昧になる問題に対し、Gemini で類義語・関連概念を生成してから embedding する。latency が増えるのがトレードオフ。

**変更ファイル:** `routers/vector_search.py`（`_embed()` の前に拡張ステップを追加）

---

#### 閾値スライダー UI（優先度低）
スコアの可視化・手動調整 UI。バックエンドでスコア付き全件返却 → クライアント側フィルタリング。精度の根本解決にはならないがデバッグ用途で有用。

**変更ファイル:** `static/app.js`、`static/index.html`、`routers/vector_search.py`
