import os
import re
import json
import asyncio
import numpy as np
from typing import Optional
from fastapi import APIRouter, HTTPException
from database import get_db, row_to_note

router = APIRouter(prefix="/api/vector-search", tags=["vector-search"])

_note_ids: list[int] = []
_matrix: Optional[np.ndarray] = None  # shape (N, 3072)、L2正規化済み
_query_cache: dict[str, list] = {}
_is_indexing: bool = False


def _get_client():
    from google import genai
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY が設定されていません")
    return genai.Client(api_key=api_key)


def _embed(text: str) -> np.ndarray:
    client = _get_client()
    response = client.models.embed_content(model="gemini-embedding-2", contents=text)
    vec = np.array(response.embeddings[0].values, dtype=np.float32)
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 0 else vec


def _note_to_text(title: str, content: str, format_type: str) -> str:
    text = re.sub(r"<[^>]+>", "", content) if format_type == "slide" else content
    return f"{title}\n{text}"


def _fts_ranked_ids(q: str) -> list[int]:
    try:
        conn = get_db()
        rows = conn.execute(
            "SELECT rowid AS id FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank",
            (q,)
        ).fetchall()
        conn.close()
        return [row["id"] for row in rows]
    except Exception:
        return []


def _vec_ranked_ids(q: str) -> list[int]:
    if _matrix is None or not _note_ids:
        return []
    query_vec = _embed(q)
    scores = _matrix @ query_vec
    threshold = float(scores.min()) + (float(scores.max()) - float(scores.min())) * 0.15
    ranked = np.argsort(scores)[::-1]
    return [_note_ids[i] for i in ranked if scores[i] >= threshold]


def load_cache():
    global _note_ids, _matrix, _query_cache
    conn = get_db()
    rows = conn.execute("SELECT id, embedding FROM notes WHERE embedding IS NOT NULL").fetchall()
    conn.close()

    if not rows:
        _note_ids = []
        _matrix = None
        return

    ids, vecs = [], []
    for row in rows:
        ids.append(row["id"])
        vecs.append(json.loads(row["embedding"]))

    _note_ids = ids
    _matrix = np.array(vecs, dtype=np.float32)
    _query_cache = {}


def _update_cache(note_id: int, vec: Optional[np.ndarray]):
    global _note_ids, _matrix, _query_cache
    _query_cache = {}

    if vec is None:
        if note_id in _note_ids:
            idx = _note_ids.index(note_id)
            _note_ids.pop(idx)
            if _matrix is not None:
                _matrix = np.delete(_matrix, idx, axis=0)
                if len(_matrix) == 0:
                    _matrix = None
        return

    if note_id in _note_ids:
        idx = _note_ids.index(note_id)
        if _matrix is not None:
            _matrix[idx] = vec
    else:
        _note_ids.append(note_id)
        _matrix = vec.reshape(1, -1) if _matrix is None else np.vstack([_matrix, vec.reshape(1, -1)])


def embed_and_save(note_id: int, title: str, content: str, format_type: str):
    vec = _embed(_note_to_text(title, content, format_type))
    conn = get_db()
    conn.execute("UPDATE notes SET embedding = ? WHERE id = ?", (json.dumps(vec.tolist()), note_id))
    conn.commit()
    conn.close()
    _update_cache(note_id, vec)


def remove_embedding(note_id: int):
    _update_cache(note_id, None)


@router.get("")
def vector_search(q: str = ""):
    if not q.strip():
        return []
    if q in _query_cache:
        return _query_cache[q]

    fts_ids = _fts_ranked_ids(q)
    vec_ids = _vec_ranked_ids(q)

    if not fts_ids and not vec_ids:
        return []

    # Reciprocal Rank Fusion (k=60)
    K = 60
    rrf: dict[int, float] = {}
    for rank, nid in enumerate(fts_ids):
        rrf[nid] = rrf.get(nid, 0.0) + 1.0 / (K + rank)
    for rank, nid in enumerate(vec_ids):
        rrf[nid] = rrf.get(nid, 0.0) + 1.0 / (K + rank)

    top_ids = sorted(rrf, key=lambda x: rrf[x], reverse=True)

    conn = get_db()
    placeholders = ",".join("?" * len(top_ids))
    rows = conn.execute(f"SELECT * FROM notes WHERE id IN ({placeholders})", top_ids).fetchall()
    conn.close()

    id_to_note = {row["id"]: row_to_note(row) for row in rows}
    result = [{**id_to_note[tid], "_rrf_score": rrf[tid]} for tid in top_ids if tid in id_to_note]

    _query_cache[q] = result
    return result


@router.post("/index")
async def reindex():
    global _is_indexing
    if _is_indexing:
        raise HTTPException(status_code=409, detail="インデックス処理が既に実行中です")

    conn = get_db()
    rows = conn.execute("SELECT id, title, content, format_type FROM notes").fetchall()
    conn.close()
    notes = [dict(row) for row in rows]

    async def _run():
        global _is_indexing
        _is_indexing = True
        try:
            for note in notes:
                await asyncio.to_thread(
                    embed_and_save, note["id"], note["title"], note["content"], note["format_type"]
                )
        finally:
            _is_indexing = False

    asyncio.create_task(_run())
    return {"queued": len(notes)}
