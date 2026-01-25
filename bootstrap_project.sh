#!/bin/bash

# --- 1. Clean & Init Structure ---
echo "🚀 Initializing Vercel/Python Architecture..."
# Force create the new folder structure
mkdir -p api backend/services scripts .claude/commands

# --- 2. Configuration Files (The Overwrite) ---
echo "📦 Generating Vercel Configs..."

# Dependencies: Switching from yfinance to robust API clients
cat <<EOF > requirements.txt
fastapi
uvicorn
sqlmodel
psycopg2-binary
requests
alpaca-py
python-dotenv
EOF

# Vercel Config: Tells Vercel how to run FastAPI
cat <<EOF > vercel.json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.py" }
  ],
  "functions": {
    "api/index.py": {
      "maxDuration": 30
    }
  }
}
EOF

# Git Ignore: Critical for security
cat <<EOF > .gitignore
__pycache__/
*.pyc
.env
.env.*
.vercel
venv/
*.db
EOF

# --- 3. Backend Code ---
echo "🐍 Generating Application Code..."

# Database Connection (Vercel-Compatible)
cat <<EOF > backend/database.py
import os
from sqlmodel import create_engine, SQLModel, Session

# 1. Get the URL from Vercel Environment
DATABASE_URL = os.getenv("POSTGRES_URL")

# 2. Fix the protocol for SQLAlchemy (postgres:// -> postgresql://)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Create Engine (Fallback to SQLite if no Vercel DB found locally)
engine = create_engine(
    DATABASE_URL or "sqlite:///local_dev.db",
    echo=False, 
    pool_pre_ping=True,
    pool_recycle=300
)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
EOF

# Data Models (Your Trading Schema)
cat <<EOF > backend/models.py
from typing import Optional, List
from sqlmodel import SQLModel, Field, JSON
from datetime import datetime

class MarketScan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(default_factory=datetime.utcnow)
    dominant_theme: str
    top_gainers: List[dict] = Field(default=[], sa_type=JSON) 
    notes: Optional[str] = None

class TradePlan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    strategy_type: str
    status: str = Field(default="PLANNED")
    entry_price: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
EOF

# API Entry Point
cat <<EOF > api/index.py
from fastapi import FastAPI
from backend.database import init_db

app = FastAPI()

@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"DB Init skipped: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "online", "env": "vercel"}
EOF

# DB Initialization Utility
cat <<EOF > scripts/init_db.py
from backend.database import init_db
if __name__ == "__main__":
    print("🔄 Connecting to Vercel Postgres...")
    init_db()
    print("✅ Tables Created Successfully!")
EOF

# --- 4. Git Setup ---
echo "🔧 Configuring Git..."
[ -d .git ] || git init
git add .
git commit -m "Refactor: Migrate to Vercel/Python Architecture" || echo "Nothing to commit"

echo "✅ Bootstrap Complete! Ready to deploy."