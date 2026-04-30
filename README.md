# Knowledge

個人用ナレッジ管理ツール。メモ、アイデア、調査結果を整理・検索・活用するためのシステム。

## アーキテクチャ

```
ブラウザ（localhost）
      │
 [FastAPI]
├── ノートのCRUD
├── 全文検索（SQLite FTS5）
├── ベクトル検索（意味的な類似検索）
└── 文章生成（Google Gemini API）
      │
 [SQLite]  ← 全データがローカルに保存
```

## 機能

- ノートの作成・編集・削除
- タグ・カテゴリによる整理
- 全文検索（SQLite FTS5）
- 意味的な類似検索（ベクトル検索）
- 文章生成・補助（Google Gemini API）
- Markdown対応

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | FastAPI（Python） |
| データベース | SQLite（FTS5 + ベクトル検索） |
| AI（文章生成） | Google Gemini API（無料枠） |

## セットアップ

### 必要なもの

- Python 3.11+
- Google AI Studio の API キー（[取得はこちら](https://aistudio.google.com/)）

### 環境変数

```
GEMINI_API_KEY=your_api_key_here
```

## フォルダ構成

```
Knowledge/
├── main.py            # FastAPI エントリーポイント・ルーター登録
├── database.py        # DB初期化・接続・ヘルパー
├── schemas.py         # Pydantic スキーマ（リクエスト/レスポンス型）
├── routers/
│   ├── __init__.py
│   ├── notes.py       # ノート CRUD エンドポイント
│   ├── templates.py   # テンプレート CRUD エンドポイント
│   └── generate.py    # Gemini API 連携・コンテンツ生成
├── requirements.txt   # 依存パッケージ
├── knowledge.db       # SQLiteデータベース（Git管理外）
├── static/
│   ├── index.html     # フロントエンド（構造）
│   ├── style.css      # スタイル（ガラスモーフィズム）
│   └── app.js         # フロントエンドロジック
├── .env               # 環境変数（Git管理外）
├── .gitignore
├── README.md
└── CLAUDE.md
```

## ステータス

開発中
