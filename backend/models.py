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
