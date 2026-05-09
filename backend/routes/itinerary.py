from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from database.connection import get_db
from models.database import Trip, Itinerary, User
from schemas.pydantic_models import ItineraryCreate, Itinerary as ItinerarySchema
from routes.auth import get_current_user
from ai.gemini import generate_trip_itinerary

router = APIRouter(prefix="/itinerary", tags=["itinerary"])

@router.post("/generate/{trip_id}", response_model=ItinerarySchema)
def create_itinerary(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    # Check if itinerary already exists
    existing = db.query(Itinerary).filter(Itinerary.trip_id == trip_id).first()
    if existing:
        return existing

    # Call Gemini API
    ai_response = generate_trip_itinerary(
        destination=trip.destination,
        budget=trip.budget,
        days=trip.days,
        group_size=trip.group_size,
        interests=trip.interests
    )

    if "error" in ai_response:
        raise HTTPException(status_code=500, detail=ai_response["error"])

    # Save to db
    db_itinerary = Itinerary(trip_id=trip_id, content=json.dumps(ai_response))
    db.add(db_itinerary)
    db.commit()
    db.refresh(db_itinerary)
    
    return db_itinerary

@router.get("/{trip_id}", response_model=ItinerarySchema)
def get_itinerary(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    itinerary = db.query(Itinerary).filter(Itinerary.trip_id == trip_id).first()
    if not itinerary:
        raise HTTPException(status_code=404, detail="Itinerary not found")
        
    return itinerary
