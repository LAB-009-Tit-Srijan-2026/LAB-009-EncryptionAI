from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class HostBase(BaseModel):
    emergency_contact: str

class HostCreate(HostBase):
    pass

class Host(HostBase):
    id: int
    user_id: int
    verification_status: str
    kyc_status: str
    rating: float
    created_at: datetime
    class Config:
        from_attributes = True

class PropertyBase(BaseModel):
    title: str
    description: str
    room_type: str
    price_per_night: float
    max_guests: int
    latitude: float
    longitude: float
    address: str
    city: str
    state: str
    weekend_enabled: bool = True

class PropertyCreate(PropertyBase):
    photos_json: Optional[List[str]] = []

class Property(PropertyBase):
    id: int
    host_id: int
    photos_json: Optional[Any]
    availability_json: Optional[Any]
    safety_rating: float
    created_at: datetime
    class Config:
        from_attributes = True

class PropertyReviewCreate(BaseModel):
    property_id: int
    rating: int
    review: str

class PropertyReview(PropertyReviewCreate):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class DemandHeatmap(BaseModel):
    destination: str
    date: datetime
    crowd_score: float
    demand_level: str
    class Config:
        from_attributes = True
