from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os
import openai
from typing import List

from .models import Base, ChatSession, ChatMessage
from . import schemas as sch

# Load configuration from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# OpenAI API key (optional)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Ensure tables exist (for demo; in production prefer Alembic migrations)
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(title="v2v API", version="0.1.0")

# CORS for local frontend dev
origins = [
    "http://localhost",
    "http://localhost:3000",
    "https://localhost"
    "https://206.189.61.37/"
    ,
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Prefix for API v1
@app.get("/api")
async def api_root():
    """Simple health-check endpoint."""
    return {"status": "ok"}

# ------------------ Session & Chat endpoints ------------------

@app.post("/api/session", response_model=sch.Session)
async def create_session(db: Session = Depends(get_db)):
    new_sess = ChatSession()
    db.add(new_sess)
    db.commit()
    db.refresh(new_sess)
    return new_sess

@app.get("/api/session", response_model=List[sch.Session])
async def list_sessions(db: Session = Depends(get_db)):
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).all()

@app.get("/api/session/{session_id}", response_model=sch.SessionWithMessages)
async def get_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess

@app.post("/api/chat", response_model=sch.ChatResponse)
async def chat_endpoint(payload: sch.CreateChatRequest, db: Session = Depends(get_db)):
    user_message = payload.message.strip()

    # get or create session
    if payload.session_id:
        session_obj = db.query(ChatSession).filter(ChatSession.id == payload.session_id).first()
        if not session_obj:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session_obj = ChatSession()
        db.add(session_obj)
        db.commit()
        db.refresh(session_obj)

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured on server")

    try:
        completion = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": user_message}],
        )
        bot_reply = completion.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Store messages
    db.add_all([
        ChatMessage(session_id=session_obj.id, role="user", content=user_message),
        ChatMessage(session_id=session_obj.id, role="assistant", content=bot_reply),
    ])
    db.commit()

    return sch.ChatResponse(response=bot_reply, session_id=session_obj.id)

# Optional convenience GET endpoint: /api/gpt?message=...
@app.get("/api/gpt", response_model=sch.ChatResponse)
async def gpt_get(message: str = "", db: Session = Depends(get_db)):
    """GET wrapper around chat endpoint for quick tests."""
    if not message.strip():
        raise HTTPException(status_code=400, detail="message query param required")

    return await chat_endpoint(sch.CreateChatRequest(message=message), db) 