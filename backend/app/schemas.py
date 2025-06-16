from datetime import datetime
from typing import List
from pydantic import BaseModel

class Message(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True

class Session(BaseModel):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True

class SessionWithMessages(Session):
    messages: List[Message]

class CreateChatRequest(BaseModel):
    session_id: int | None = None
    message: str

class ChatResponse(BaseModel):
    response: str
    session_id: int 