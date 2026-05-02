import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path("knowledge.db")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    # row_factory を設定すると row['title'] のようにカラム名でアクセスできる
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS notes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL DEFAULT '新しいノート',
            category    TEXT NOT NULL DEFAULT 'memo',
            tags        TEXT NOT NULL DEFAULT '[]',  -- JSON配列を文字列で保存
            content     TEXT NOT NULL DEFAULT '',
            format_type TEXT NOT NULL DEFAULT 'article',  -- 'article' | 'slide'
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        -- FTS5: SQLite 組み込みの全文検索エンジン
        -- content=notes / content_rowid=id: テキストを二重管理せず notes テーブルを参照する「コンテンツテーブル」方式
        -- tokenize='trigram': 3文字単位で分割するため、スペースなしの日本語でも部分一致検索が可能
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            title,
            content,
            content=notes,
            content_rowid=id,
            tokenize='trigram'
        );

        -- notes_ai: INSERT 後に FTS インデックスへ追加
        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(rowid, title, content)
            VALUES (new.id, new.title, new.content);
        END;

        -- notes_ad: DELETE 後に FTS インデックスから削除
        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, content)
            VALUES ('delete', old.id, old.title, old.content);
        END;

        -- templates: ユーザー定義のテンプレートを管理するテーブル
        CREATE TABLE IF NOT EXISTS templates (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT NOT NULL,
            format_type TEXT NOT NULL DEFAULT 'article',  -- 'article' | 'slide'（将来拡張用）
            content     TEXT NOT NULL DEFAULT '',
            params      TEXT NOT NULL DEFAULT '{}',       -- format_type ごとの生成ルールを JSON で保持
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        -- notes_au: UPDATE 後は「旧エントリ削除 → 新エントリ追加」で更新（FTS5 は UPDATE を直接サポートしない）
        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            INSERT INTO notes_fts(notes_fts, rowid, title, content)
            VALUES ('delete', old.id, old.title, old.content);
            INSERT INTO notes_fts(rowid, title, content)
            VALUES (new.id, new.title, new.content);
        END;
    """)
    conn.commit()

    # 既存DBに params カラムがなければ追加（初回以外のマイグレーション）
    columns = [row[1] for row in conn.execute("PRAGMA table_info(templates)").fetchall()]
    if "params" not in columns:
        conn.execute("ALTER TABLE templates ADD COLUMN params TEXT NOT NULL DEFAULT '{}'")
        conn.commit()

    # 既存DBに notes.format_type カラムがなければ追加
    note_columns = [row[1] for row in conn.execute("PRAGMA table_info(notes)").fetchall()]
    if "format_type" not in note_columns:
        conn.execute("ALTER TABLE notes ADD COLUMN format_type TEXT NOT NULL DEFAULT 'article'")
        conn.commit()

    # 既存DBに notes.embedding カラムがなければ追加
    note_columns = [row[1] for row in conn.execute("PRAGMA table_info(notes)").fetchall()]
    if "embedding" not in note_columns:
        conn.execute("ALTER TABLE notes ADD COLUMN embedding TEXT")
        conn.commit()

    conn.close()


def now() -> str:
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def row_to_note(row: sqlite3.Row) -> dict:
    d = dict(row)
    # DB には JSON 文字列で保存しているので Python リストに変換して返す
    d['tags'] = json.loads(d['tags'])
    return d
