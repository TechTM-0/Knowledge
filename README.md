# Knowledge

個人用ナレッジ管理ツール。メモ、アイデア、調査結果を整理・検索・活用するためのシステム。

## アーキテクチャ

```
ブラウザ（localhost）→ FastAPI → SQLite
```

## 機能

- ノートの作成・編集・削除
- タグ・カテゴリによる整理
- 全文検索（SQLite FTS5）
- ベクトル検索（意味検索、Gemini Embedding API）
- テンプレート管理（作成・編集・削除）
- AI文章生成（Google Gemini API）
- Markdown + 数式（KaTeX）対応
- スライドレンダラー（`format_type=slide` 時に iframe + KaTeX でレンダリング）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | FastAPI（Python） |
| データベース | SQLite（FTS5） |
| AI（文章生成） | Google Gemini API（無料枠、gemini-2.5-flash） |

## セットアップ

### 必要なもの

- Python 3.11+
- Google AI Studio の API キー（[取得はこちら](https://aistudio.google.com/)）

### 環境変数

```
GEMINI_API_KEY=your_api_key_here
```

### サーバー起動

デスクトップの **「Knowledge サーバー」** ショートカットを開くと、起動・停止用の小さなウィンドウが出る。
「起動」を押すとサーバーがバックグラウンドで立ち上がり、ブラウザが開く。ウィンドウを閉じてもサーバーは動き続ける。

コマンドラインから操作したい場合：

```powershell
powershell -ExecutionPolicy Bypass -File server.ps1 start   # 起動
powershell -ExecutionPolicy Bypass -File server.ps1 stop    # 停止
powershell -ExecutionPolicy Bypass -File server.ps1 status  # 状態確認
```

uvicorn を直接動かす場合（ログをその場で見たいときなど）：

```powershell
.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8000
```

## フォルダ構成

```
Knowledge/
├── main.py            # FastAPI エントリーポイント・ルーター登録
├── database.py        # DB初期化・接続・ヘルパー
├── schemas.py         # Pydantic スキーマ（リクエスト/レスポンス型）
├── routers/
│   ├── __init__.py
│   ├── notes.py          # ノート CRUD エンドポイント
│   ├── templates.py      # テンプレート CRUD エンドポイント
│   ├── generate.py       # Gemini API 連携・コンテンツ生成
│   └── vector_search.py  # ベクトル検索（Gemini Embedding + RRF）
├── requirements.txt   # 依存パッケージ
├── server-gui.ps1     # サーバー起動・停止GUI（デスクトップのショートカットから開く）
├── server.ps1         # 起動・停止の実処理（GUIから呼ばれる／CLIでも使える）
├── server.log         # サーバーのログ（Git管理外）
├── knowledge.db       # SQLiteデータベース（Git管理外）
├── static/
│   ├── index.html     # フロントエンド（構造）
│   ├── style.css      # スタイル（ガラスモーフィズム）
│   ├── state.js       # 共有状態オブジェクト（全モジュールが参照）
│   ├── utils.js       # 共通ユーティリティ（api・escapeHtml・extractTitle 等）
│   ├── slide.js       # スライドレンダラー（buildSlideHtml・showSlideTab 等）
│   ├── templates.js   # テンプレート管理 UI ロジック
│   ├── generate.js    # AI生成モーダル ロジック
│   └── app.js         # メイン（ノートCRUD・タグ・検索・初期化）
├── docs/
│   └── open-tasks.md  # タスク一覧（正本は GitHub Issues。これは薄いポインタ）
├── .env               # 環境変数（Git管理外）
├── .gitignore
├── README.md
└── CLAUDE.md
```

## ステータス

開発中
