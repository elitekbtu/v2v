from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os
import openai

# Load configuration from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# OpenAI API key (optional)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, echo=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI app
app = FastAPI(title="v2v API", version="0.1.0")

# CORS for local frontend dev
origins = [
    "http://localhost",
    "http://localhost:3000",
    "https://localhost",
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

# ------------------ Chat endpoint ------------------

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    """Simple chat endpoint backed by OpenAI if available, otherwise echo."""
    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

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

    return ChatResponse(response=bot_reply)

# Optional convenience GET endpoint: /api/gpt?message=...
@app.get("/api/gpt", response_model=ChatResponse)
async def gpt_get(message: str = ""):
    """GET wrapper around chat endpoint for quick tests."""
    if not message.strip():
        raise HTTPException(status_code=400, detail="message query param required")

    return await chat_endpoint(ChatRequest(message=message)) 