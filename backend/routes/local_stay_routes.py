from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from models.local_stay import Host, Property, PropertyReview
from models.database import User
from schemas.local_stay_schemas import PropertyCreate, Property as PropertySchema, PropertyReviewCreate, PropertyReview as ReviewSchema
from routes.auth import get_current_user
from services.recommendation_engine import RecommendationEngine
from ai.stay_recommendation_ai import StayRecommendationAI
from typing import List, Optional

router = APIRouter(prefix="/properties", tags=["properties"])
recommendation_ai = StayRecommendationAI()

@router.post("/create", response_model=PropertySchema)
async def create_property(prop_data: PropertyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    if not host:
        raise HTTPException(status_code=403, detail="Must be a registered host to create properties")
    
    new_prop = Property(
        host_id=host.id,
        **prop_data.dict()
    )
    db.add(new_prop)
    db.commit()
    db.refresh(new_prop)
    return new_prop

@router.get("/list", response_model=List[PropertySchema])
async def list_properties(city: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Property)
    if city:
        query = query.filter(Property.city.ilike(f"%{city}%"))
    return query.all()

@router.get("/{property_id}", response_model=PropertySchema)
async def get_property(property_id: int, db: Session = Depends(get_db)):
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    return prop

@router.put("/update/{property_id}", response_model=PropertySchema)
async def update_property(property_id: int, prop_data: PropertyCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    prop = db.query(Property).filter(Property.id == property_id).first()
    
    if not prop or prop.host_id != host.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    for key, value in prop_data.dict().items():
        setattr(prop, key, value)
        
    db.commit()
    db.refresh(prop)
    return prop

@router.delete("/delete/{property_id}")
async def delete_property(property_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    host = db.query(Host).filter(Host.user_id == current_user.id).first()
    prop = db.query(Property).filter(Property.id == property_id).first()
    
    if not prop or prop.host_id != host.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    db.delete(prop)
    db.commit()
    return {"message": "Property deleted"}

@router.get("/nearby/{city}")
async def get_nearby_stays(city: str, lat: float, lon: float, db: Session = Depends(get_db)):
    properties = db.query(Property).filter(Property.city.ilike(f"%{city}%")).all()
    ranked = RecommendationEngine.rank_properties(properties, lat, lon)
    
    # Get AI summary
    prop_list = [{"name": r["property"].title, "price": r["property"].price_per_night} for r in ranked[:3]]
    ai_summary = await recommendation_ai.get_recommendation_summary(city, prop_list)
    
    return {
        "summary": ai_summary,
        "results": [
            {
                "id": r["property"].id,
                "title": r["property"].title,
                "price": r["property"].price_per_night,
                "distance_km": r["distance_km"],
                "match_score": r["match_score"],
                "room_type": r["property"].room_type,
                "photos": r["property"].photos_json
            } for r in ranked
        ]
    }
