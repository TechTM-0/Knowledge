from typing import Optional
from pydantic import BaseModel


class NoteCreate(BaseModel):
    """新規ノート作成リクエスト。未指定フィールドはデフォルト値が使われる。"""
    title: str = '新しいノート'
    category: str = 'memo'
    tags: list[str] = []
    content: str = ''
    format_type: str = 'article'


class NoteUpdate(BaseModel):
    """ノート更新リクエスト。None のフィールドは「送信されなかった = 変更しない」として扱う。"""
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    content: Optional[str] = None
    format_type: Optional[str] = None


class TemplateCreate(BaseModel):
    name: str
    format_type: str = 'article'
    content: str = ''
    params: dict = {}


class TemplateUpdate(BaseModel):
    """None のフィールドは変更しない（NoteUpdate と同じ部分更新パターン）。"""
    name: Optional[str] = None
    format_type: Optional[str] = None
    content: Optional[str] = None
    params: Optional[dict] = None


class GenerateRequest(BaseModel):
    template_id: int
    prompt: str  # ユーザーが入力するトピック・指示
    model: str = 'gemini-2.5-flash-lite'
