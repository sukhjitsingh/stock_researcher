from backend.database import init_db
# Import models to register them with SQLModel metadata
from backend.models import MarketScan, AnalysisResult, TradePlan

if __name__ == "__main__":
    print("🔄 Connecting to Vercel Postgres...")
    print(f"📊 Registering tables: MarketScan, AnalysisResult, TradePlan")
    init_db()
    print("✅ Tables Created/Updated Successfully!")
