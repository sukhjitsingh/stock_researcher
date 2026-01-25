from backend.database import init_db
if __name__ == "__main__":
    print("🔄 Connecting to Vercel Postgres...")
    init_db()
    print("✅ Tables Created Successfully!")
