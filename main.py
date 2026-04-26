from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json

from database import get_db, init_db, now, row_to_note


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory="static"), name="static")


# ===== スキーマ =====

class NoteCreate(BaseModel):
    title: str = '新しいノート'
    category: str = 'memo'
    tags: list[str] = []
    content: str = ''


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    content: Optional[str] = None


# ===== フロントエンド =====

@app.get("/")
def root():
    return FileResponse("static/index.html")


# ===== ノート CRUD =====

@app.get("/api/notes")
def list_notes(q: str = ''):
    conn = get_db()
    if q:
        try:
            rows = conn.execute("""
                SELECT n.* FROM notes n
                WHERE n.id IN (SELECT rowid FROM notes_fts WHERE notes_fts MATCH ?)
                ORDER BY n.updated_at DESC
            """, (q,)).fetchall()
        except Exception:
            rows = conn.execute(
                "SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC",
                (f'%{q}%', f'%{q}%')
            ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [row_to_note(r) for r in rows]


@app.get("/api/notes/{note_id}")
def get_note(note_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
    return row_to_note(row)


@app.post("/api/notes", status_code=201)
def create_note(note: NoteCreate):
    ts = now()
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO notes (title, category, tags, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (note.title, note.category, json.dumps(note.tags, ensure_ascii=False), note.content, ts, ts)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM notes WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row_to_note(row)


@app.put("/api/notes/{note_id}")
def update_note(note_id: int, note: NoteUpdate):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM notes WHERE id = ?", (note_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")

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
        set_clause = ', '.join(f"{k} = ?" for k in fields) + ", updated_at = ?"
        values = list(fields.values()) + [now(), note_id]
        conn.execute(f"UPDATE notes SET {set_clause} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    conn.close()
    return row_to_note(row)


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM notes WHERE id = ?", (note_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")
    conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
