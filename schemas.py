from typing import Optional
from pydantic import BaseModel


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
