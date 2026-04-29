import json
from fastapi import APIRouter, HTTPException
from database import get_db, now, row_to_note
from schemas import NoteCreate, NoteUpdate

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("")
def list_notes(q: str = ''):
    conn = get_db()
    if q:
        try:
            # FTS5 で title/content を全文検索 + tags の LIKE マッチを OR で結合
            # trigram トークナイザーは3文字未満のクエリで空結果を返すが tags LIKE は機能する
            rows = conn.execute("""
                SELECT n.* FROM notes n
                WHERE n.id IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH ?)
                   OR n.tags LIKE ?
                ORDER BY n.updated_at DESC
            """, (q, f'%{q}%')).fetchall()
        except Exception:
            # クエリに FTS5 の特殊文字が含まれる場合は LIKE 検索にフォールバック
            rows = conn.execute(
                "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY updated_at DESC",
                (f'%{q}%', f'%{q}%', f'%{q}%')
            ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [row_to_note(r) for r in rows]


@router.get("/{note_id}")
def get_note(note_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
    return row_to_note(row)


@router.post("", status_code=201)
def create_note(note: NoteCreate):
    ts = now()
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO notes (title, category, tags, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        # tags はリストを JSON 文字列に変換して保存。ensure_ascii=False で日本語をそのまま格納
        (note.title, note.category, json.dumps(note.tags, ensure_ascii=False), note.content, ts, ts)
    )
    conn.commit()
    # lastrowid: INSERT で採番された自動インクリメント ID
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row_to_note(row)


@router.put("/{note_id}")
def update_note(note_id: int, note: NoteUpdate):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM notes WHERE id = ?", (note_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")

    # None でないフィールドだけを更新対象に絞る（部分更新）
    fields: dict = {}
    if note.title is not None:
        fields['title'] = note.title
    if note.category is not None:
        fields['category'] = note.category
    if note.tags is not None:
        fields['tags'] = json.dumps(note.tags, ensure_ascii=False)
    if note.content is not None:
        fields['content'] = note.content

    if fields:
        # 更新対象フィールドから SET 句を動的に組み立てる
        set_clause = ', '.join(f"{k} = ?" for k in fields) + ", updated_at = ?"
        values = list(fields.values()) + [now(), note_id]
        conn.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    return row_to_note(row)


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: int):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM notes WHERE id = ?", (note_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")
    conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
