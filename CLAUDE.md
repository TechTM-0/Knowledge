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

## 開発ルール

- このリポジトリでのやり取りは**日本語**で行う
- AI文章生成には Anthropic API を**使わない**。Google Gemini API（無料枠）を使う
- フォルダ構成に変更があった場合は、`README.md` の「フォルダ構成」セクションも必ず更新する
