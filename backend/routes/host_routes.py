from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from models.local_stay import Host, Property
from models.database import User
from schemas.local_stay_schemas import HostCreate, Host as HostSchema, PropertyCreate, Property as PropertySchema
from routes.auth import get_current_user
from ai.pricing_ai import PricingAI
from services.pricing_engine import PricingEngine
from typing import List

router = APIRouter(prefix="/host", tags=["host"])
pricing_ai = PricingAI()

@router.post("/register", response_model=HostSchema)
async def register_host(host_data: HostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if user is already a host
    existing_host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if existing_host:
        return existing_host
    
    new_host = Host(
        user_id=current_user.id,
        emergency_contact=host_data.emergency_contact
    )
    db.add(new_host)
    db.commit()
    db.refresh(new_host)
    return new_host

@router.get("/me", response_model=HostSchema)
async def get_host_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=404, detail="Host profile not found")
    return host

@router.get("/pricing-suggestions/{property_id}")
async def get_property_pricing_suggestions(property_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=403, detail="Not a host")
    
    prop = db.query(Property).filter(Property.id == property_id, Property.host_id == host.id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    # Mock demand level for suggestion
    demand_level = "High" 
    demand_score = 0.75
    
    suggested_price = PricingEngine.calculate_suggested_price(prop.price_per_night, demand_score)
    ai_strategy = await pricing_ai.get_pricing_strategy(prop.price_per_night, demand_level, prop.city)
    
    return {
        "current_price": prop.price_per_night,
        "suggested_price": suggested_price,
        "ai_strategy": ai_strategy,
        "insights": PricingEngine.get_pricing_insights(prop.price_per_night, suggested_price)
    }
