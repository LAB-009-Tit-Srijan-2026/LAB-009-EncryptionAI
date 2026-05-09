from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from models.database import Trip, User
from schemas.pydantic_models import TripCreate, Trip as TripSchema
from routes.auth import get_current_user

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=TripSchema)
def create_trip(trip: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_trip = Trip(**trip.model_dump(), owner_id=current_user.id)
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

@router.get("/", response_model=List[TripSchema])
def get_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trips = db.query(Trip).filter(Trip.owner_id == current_user.id).offset(skip).limit(limit).all()
    return trips

@router.get("/{trip_id}", response_model=TripSchema)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == current_user.id).first()
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip
