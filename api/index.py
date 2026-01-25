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
