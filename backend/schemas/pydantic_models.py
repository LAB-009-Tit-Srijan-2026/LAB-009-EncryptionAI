from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        from_attributes = True

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Trip Schemas ---
class TripBase(BaseModel):
    destination: str
    budget: float
    days: int
    group_size: int
    interests: str

class TripCreate(TripBase):
    pass

class MemberAdd(BaseModel):
    email: str

class Trip(TripBase):
    id: int
    owner_id: int
    created_at: datetime
    members: List[User] = []
    itinerary: Optional["Itinerary"] = None
    class Config:
        from_attributes = True

# --- Itinerary Schemas ---
class ItineraryBase(BaseModel):
    content: str

class ItineraryCreate(ItineraryBase):
    trip_id: int

class Itinerary(ItineraryBase):
    id: int
    trip_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- Expense Schemas ---
class ExpenseBase(BaseModel):
    description: str
    amount: float

class ExpenseCreate(ExpenseBase):
    trip_id: int

class Expense(ExpenseBase):
    id: int
    trip_id: int
    payer_id: int
    created_at: datetime
    class Config:
        from_attributes = True
