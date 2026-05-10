from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from services.demand_engine import DemandEngine
from models.local_stay import DemandHeatmap
from typing import List

router = APIRouter(prefix="/demand", tags=["demand"])

@router.get("/analyze/{destination}")
async def analyze_destination_demand(destination: str, db: Session = Depends(get_db)):
    result = await DemandEngine.analyze_demand(db, destination)
    return result

@router.get("/heatmap/{destination}")
async def get_heatmap_data(destination: str, db: Session = Depends(get_db)):
    data = db.query(DemandHeatmap).filter(DemandHeatmap.destination.ilike(f"%{destination}%")).order_by(DemandHeatmap.date.desc()).limit(30).all()
    forecast = DemandEngine.get_forecast(db, destination)
    
    return {
        "history": data,
        "forecast": forecast
    }

@router.get("/alerts")
async def get_active_alerts(db: Session = Depends(get_db)):
    # In a real app, check for peak demand dates
    return [
        {"destination": "Mumbai", "level": "Peak", "reason": "Upcoming Festival Weekend", "action": "Switching to Local Stays Mode"},
        {"destination": "Goa", "level": "High", "reason": "Seasonal Spike", "action": "Dynamic Pricing Active"}
    ]
