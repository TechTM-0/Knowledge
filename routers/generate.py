import os
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
    template_name = row["name"]

    # Gemini にテンプレートの形式を維持しながらコンテンツを生成させる
    prompt = f"""以下のテンプレート「{template_name}」の形式・構造・見出しを維持しながら、
次のトピックについての記事を日本語で生成してください。

# トピック
{req.prompt}

# テンプレート（この構造に従って生成すること）
{template_content}

テンプレートの見出し・セクション構成をそのまま使い、内容だけをトピックに合わせて書いてください。"""

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return {"content": response.text}
