from typing import Optional
from pydantic import BaseModel


class NoteCreate(BaseModel):
    """新規ノート作成リクエスト。未指定フィールドはデフォルト値が使われる。"""
    title: str = '新しいノート'
    category: str = 'memo'
    tags: list[str] = []
    content: str = ''


class NoteUpdate(BaseModel):
    """ノート更新リクエスト。None のフィールドは「送信されなかった = 変更しない」として扱う。"""
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    content: Optional[str] = None
