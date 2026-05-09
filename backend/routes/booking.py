from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from models.database import Trip, User
from routes.auth import get_current_user
from ai.booking_ai import get_booking_recommendations
from typing import Optional

router = APIRouter(prefix="/booking", tags=["booking"])

@router.get("/search/{trip_id}")
async def search_bookings(
    trip_id: int, 
    type: str = "hotels",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Construct context for AI
    context = {
        "destination": trip.destination,
        "budget": trip.budget,
        "days": trip.days,
        "interests": trip.interests
    }
    
    results = await get_booking_recommendations(context, type)
    return results

@router.get("/recommendations/{trip_id}")
async def get_smart_recommendations(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    context = {
        "destination": trip.destination,
        "budget": trip.budget,
        "interests": trip.interests
    }
    
    # Get a mix of recommendations
    hotels = await get_booking_recommendations(context, "hotels")
    transport = await get_booking_recommendations(context, "transport")
    activities = await get_booking_recommendations(context, "activities")
    
    return {
        "hotels": hotels["results"][:2],
        "transport": transport["results"][:2],
        "activities": activities["results"][:2]
    }
