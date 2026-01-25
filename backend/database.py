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
