from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from models.database import Trip, User
from schemas.pydantic_models import TripCreate, Trip as TripSchema, MemberAdd
from routes.auth import get_current_user

router = APIRouter(prefix="/trips", tags=["trips"])

@router.post("/", response_model=TripSchema)
def create_trip(trip: TripCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_trip = Trip(**trip.model_dump(), owner_id=current_user.id)
    # Automatically add owner as the first member
    db_trip.members.append(current_user)
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

@router.get("/", response_model=List[TripSchema])
def get_trips(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Return trips where user is either owner OR a member
    trips = db.query(Trip).filter(
        (Trip.owner_id == current_user.id) | (Trip.members.any(id=current_user.id))
    ).offset(skip).limit(limit).all()
    return trips

@router.get("/{trip_id}", response_model=TripSchema)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        ((Trip.owner_id == current_user.id) | (Trip.members.any(id=current_user.id)))
    ).first()
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found or access denied")
    return trip

@router.post("/{trip_id}/members", response_model=TripSchema)
def add_member(trip_id: int, member: MemberAdd, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Only owner can add members
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or only owner can add members")
    
    new_member = db.query(User).filter(User.email == member.email).first()
    if not new_member:
        raise HTTPException(status_code=404, detail="User not found")
    
    if new_member in trip.members:
        raise HTTPException(status_code=400, detail="User is already a member")
        
    trip.members.append(new_member)
    db.commit()
    db.refresh(trip)
    return trip
