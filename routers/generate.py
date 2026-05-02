import os
import re
import json
from google import genai
from fastapi import APIRouter, HTTPException
from database import get_db
from schemas import GenerateRequest

router = APIRouter(prefix="/api/generate", tags=["generate"])


@router.post("")
def generate_note(req: GenerateRequest):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY が設定されていません")

    # テンプレートを取得
    conn = get_db()
    row = conn.execute("SELECT * FROM templates WHERE id = ?", (req.template_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")

    template_content = row["content"]
    format_type = row["format_type"]
    params = json.loads(row["params"])

    params_section = f"\n\n{json.dumps(params, ensure_ascii=False, indent=2)}" if params else ""

    prompt = f"""{template_content}{params_section}

# トピック
{req.prompt}"""

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=req.model,
        contents=prompt,
    )

    content = response.text.strip()
    if format_type == "slide":
        # html タグ付きコードフェンスを優先、なければタグなしを抽出
        match = re.search(r'```(?:html)\n(.*?)```', content, re.DOTALL)
        if not match:
            match = re.search(r'```\n(.*?)```', content, re.DOTALL)
        if match:
            content = match.group(1).strip()

    return {"content": content, "format_type": format_type}
