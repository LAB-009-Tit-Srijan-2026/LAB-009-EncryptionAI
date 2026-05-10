import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from models.database import Trip, User
from routes.auth import get_current_user
from ai.booking_ai import get_booking_recommendations, AMADEUS_CLIENT_ID, GOOGLE_PLACES_API_KEY, GEMINI_API_KEY
from typing import Optional

router = APIRouter(prefix="/booking", tags=["booking"])

@router.get("/source-status")
async def get_source_status():
    return {
        "amadeus_hotels": "✅ Connected" if AMADEUS_CLIENT_ID else "⚠️ Missing AMADEUS_CLIENT_ID",
        "google_activities": "✅ Connected" if GOOGLE_PLACES_API_KEY else "⚠️ Missing GOOGLE_PLACES_API_KEY",
        "gemini_ai_ranking": "✅ Connected" if GEMINI_API_KEY else "⚠️ Missing GEMINI_API_KEY"
    }

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
        
    context = {
        "destination": trip.destination,
        "budget": trip.budget,
        "days": trip.days,
        "interests": trip.interests
    }
    
    results = await get_booking_recommendations(context, type)
    # Return results as is, which includes the 'source' field from the wrapper
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
        "interests": trip.interests,
        "days": trip.days
    }
    
    # Concurrent execution using asyncio.gather
    tasks = [
        get_booking_recommendations(context, "hotels"),
        get_booking_recommendations(context, "transport"),
        get_booking_recommendations(context, "activities")
    ]
    
    hotel_res, transport_res, activity_res = await asyncio.gather(*tasks)
    
    # NEW: Demand Detection & Local Stay Injection
    demand_info = {"overflow_triggered": False}
    local_stays = []
    
    try:
        from services.demand_engine import DemandEngine
        from models.local_stay import Property
        
        demand_info = await DemandEngine.analyze_demand(db, trip.destination)
        
        if demand_info["overflow_triggered"]:
            # Fetch actual local properties from DB
            props = db.query(Property).filter(Property.city.ilike(f"%{trip.destination}%")).limit(2).all()
            for p in props:
                local_stays.append({
                    "name": p.title,
                    "price": p.price_per_night,
                    "rating": p.safety_rating,
                    "ai_reason": "Top-rated local stay available during peak hotel surge.",
                    "tag": f"Local {p.room_type}",
                    "is_local_stay": True,
                    "property_id": p.id
                })
    except Exception as e:
        print(f"Demand Engine Error: {e}")
        # Continue without local stays if engine fails

    # NEW: Guide Recommendations Integration
    guide_suggestions = []
    try:
        from services.guide_engine import GuideMatchingEngine
        # Check first activity for guide necessity
        if activity_res.get("results"):
            first_act = activity_res["results"][0]["name"]
            guide_match = await GuideMatchingEngine.get_recommendations_for_activity(
                db, first_act, trip.destination, context
            )
            if guide_match:
                guide_suggestions.append(guide_match)
    except Exception as e:
        print(f"Guide Integration Error: {e}")

    return {
        "hotels": hotel_res.get("results", [])[:2] + local_stays,
        "transport": transport_res.get("results", [])[:2],
        "activities": activity_res.get("results", [])[:2],
        "guide_recommendations": guide_suggestions,
        "demand_alert": demand_info if demand_info.get("overflow_triggered") else None,
        "sources": {
            "hotels": hotel_res.get("source"),
            "transport": transport_res.get("source"),
            "activities": activity_res.get("source"),
            "local_stays": "Verified Hosts" if local_stays else None,
            "guides": "Verified Experts" if guide_suggestions else None
        }
    }
