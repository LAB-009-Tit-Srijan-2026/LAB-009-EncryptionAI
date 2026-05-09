from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import random

from routes.auth import get_current_user
from models.database import User, Trip, Itinerary
from database.connection import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/booking", tags=["booking"])

# Mock Data Generators
def get_mock_hotels(city: str, budget: float):
    hotels = [
        {"name": f"Grand {city} Hotel", "rating": 4.8, "price": 250, "amenities": ["Spa", "Pool", "Free WiFi"], "image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500"},
        {"name": f"{city} Budget Inn", "rating": 3.5, "price": 80, "amenities": ["Free Breakfast", "Parking"], "image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500"},
        {"name": f"Royal {city} Suites", "rating": 4.9, "price": 450, "amenities": ["Butler Service", "Penthouse", "Private Chef"], "image": "https://images.unsplash.com/photo-1541971424249-347754385514?w=500"},
        {"name": f"{city} Garden Resort", "rating": 4.2, "price": 180, "amenities": ["Nature Trails", "Yoga Deck"], "image": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500"},
        {"name": f"Central {city} Loft", "rating": 4.5, "price": 120, "amenities": ["Gym", "Balcony"], "image": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500"}
    ]
    # Filter by budget (roughly)
    return [h for h in hotels if h["price"] <= budget * 0.5] if budget > 0 else hotels

def get_mock_transport(city: str):
    return [
        {"type": "Flight", "name": "SkyWay 101", "dep": "08:00 AM", "arr": "10:30 AM", "price": 300, "duration": "2h 30m"},
        {"type": "Flight", "name": "GlobalAir G7", "dep": "02:15 PM", "arr": "04:45 PM", "price": 250, "duration": "2h 30m"},
        {"type": "Train", "name": "EuroExpress", "dep": "09:30 AM", "arr": "01:30 PM", "price": 90, "duration": "4h 00m"},
        {"type": "Bus", "name": "CityTrans", "dep": "11:00 PM", "arr": "07:00 AM", "price": 45, "duration": "8h 00m"}
    ]

def get_mock_activities(city: str):
    return [
        {"name": f"{city} Food Tour", "category": "Food", "rating": 4.9, "price": 50, "duration": "3h", "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500"},
        {"name": f"Sunset {city} Cruise", "category": "Sightseeing", "rating": 4.7, "price": 75, "duration": "2h", "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500"},
        {"name": f"{city} Adventure Park", "category": "Adventure", "rating": 4.5, "price": 120, "duration": "Full Day", "image": "https://images.unsplash.com/photo-1533628635777-112b2239b1c7?w=500"},
        {"name": f"Ancient {city} Museum", "category": "Cultural", "rating": 4.3, "price": 20, "duration": "2h", "image": "https://images.unsplash.com/photo-1554306274-f23873d9a26c?w=500"}
    ]

@router.get("/hotels")
def search_hotels(city: str, budget: float = 1000):
    return get_mock_hotels(city, budget)

@router.get("/transport")
def search_transport(city: str):
    return get_mock_transport(city)

@router.get("/activities")
def search_activities(city: str):
    return get_mock_activities(city)

@router.get("/recommendations/{trip_id}")
def get_recommendations(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Simple logic: Recommend things that fit the budget and interests
    hotels = get_mock_hotels(trip.destination, trip.budget / trip.days if trip.days > 0 else 500)
    activities = get_mock_activities(trip.destination)
    
    # Tag them as recommended
    for h in hotels:
        if h["rating"] >= 4.5: h["ai_recommended"] = True
    
    for a in activities:
        if any(interest.lower() in a["name"].lower() or interest.lower() in a["category"].lower() for interest in trip.interests.split(',')):
            a["ai_recommended"] = True

    return {
        "hotels": hotels[:3],
        "transport": get_mock_transport(trip.destination)[:2],
        "activities": activities[:3]
    }
