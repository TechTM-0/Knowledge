import json
from fastapi import APIRouter, HTTPException
from database import get_db, now
from schemas import TemplateCreate, TemplateUpdate

router = APIRouter(prefix="/api/templates", tags=["templates"])


def row_to_template(row) -> dict:
    d = dict(row)
    d['params'] = json.loads(d['params'])
    return d


@router.get("")
def list_templates():
    conn = get_db()
    rows = conn.execute("SELECT * FROM templates ORDER BY updated_at DESC").fetchall()
    conn.close()
    return [row_to_template(r) for r in rows]


@router.get("/{template_id}")
def get_template(template_id: int):
    conn = get_db()
    row = conn.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return row_to_template(row)


@router.post("", status_code=201)
def create_template(template: TemplateCreate):
    ts = now()
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO templates (name, format_type, content, params, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (template.name, template.format_type, template.content, json.dumps(template.params), ts, ts)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM templates WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return row_to_template(row)


@router.put("/{template_id}")
def update_template(template_id: int, template: TemplateUpdate):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM templates WHERE id = ?", (template_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")

    fields: dict = {}
    if template.name is not None:
        fields['name'] = template.name
    if template.format_type is not None:
        fields['format_type'] = template.format_type
    if template.content is not None:
        fields['content'] = template.content
    if template.params is not None:
        fields['params'] = json.dumps(template.params)

    if fields:
        set_clause = ', '.join(f"{k} = ?" for k in fields) + ", updated_at = ?"
        values = list(fields.values()) + [now(), template_id]
        conn.execute(f"UPDATE templates SET {set_clause} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
    conn.close()
    return row_to_template(row)


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM templates WHERE id = ?", (template_id,)).fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Template not found")
    conn.execute("DELETE FROM templates WHERE id = ?", (template_id,))
    conn.commit()
    conn.close()
