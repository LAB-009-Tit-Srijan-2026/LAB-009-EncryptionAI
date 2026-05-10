from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database.connection import get_db
from models.guide import TouristGuide, GuideBooking, GuideReview
from models.database import User, Trip
from routes.auth import get_current_user
from services.guide_engine import GuideMatchingEngine
from datetime import datetime
import random

router = APIRouter(prefix="/guides", tags=["guides"])

@router.get("/list/{city}")
async def list_guides(city: str, specialty: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TouristGuide).filter(TouristGuide.city.ilike(f"%{city}%"))
    if specialty:
        query = query.filter(TouristGuide.specialties_json.contains([specialty]))
    return query.all()

@router.get("/{guide_id}")
async def get_guide_details(guide_id: int, db: Session = Depends(get_db)):
    guide = db.query(TouristGuide).filter(TouristGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
    return guide

@router.post("/register")
async def register_guide(
    guide_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Check if already a guide
    existing = db.query(TouristGuide).filter(TouristGuide.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already registered as a guide")
    
    new_guide = TouristGuide(
        user_id=current_user.id,
        name=guide_data.get("name", current_user.name),
        bio=guide_data.get("bio"),
        city=guide_data.get("city"),
        languages_json=guide_data.get("languages", ["English"]),
        specialties_json=guide_data.get("specialties", ["General"]),
        price_per_day=guide_data.get("price", 500),
        phone=guide_data.get("phone"),
        experience_years=guide_data.get("experience", 0),
        verification_status="Verified" # Auto-verify for demo
    )
    db.add(new_guide)
    db.commit()
    db.refresh(new_guide)
    return new_guide

@router.post("/book")
async def book_guide(
    booking_data: dict, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    guide_id = booking_data.get("guide_id")
    trip_id = booking_data.get("trip_id")
    
    guide = db.query(TouristGuide).filter(TouristGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")
        
    otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
    
    new_booking = GuideBooking(
        guide_id=guide_id,
        user_id=current_user.id,
        trip_id=trip_id,
        activity_name=booking_data.get("activity_name", "Local Tour"),
        booking_date=datetime.utcnow(),
        total_price=guide.price_per_day,
        otp_code=otp
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return {
        "message": "Booking successful",
        "booking_id": new_booking.id,
        "otp": otp,
        "guide_phone": guide.phone
    }

@router.get("/recommendations/{trip_id}")
async def get_guide_recommendations_for_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # In a real app, we'd parse the itinerary activities
    # For now, we'll suggest a guide for the primary destination
    context = {"interests": trip.interests, "budget": trip.budget}
    return await GuideMatchingEngine.get_recommendations_for_activity(
        db, f"Exploration of {trip.destination}", trip.destination, context
    )
