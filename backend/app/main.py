from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
import os

# Load configuration from environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, echo=True, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI app
app = FastAPI(title="v2v API", version="0.1.0")

# CORS for local frontend dev
origins = [
    "http://localhost",
    "http://localhost:3000",
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