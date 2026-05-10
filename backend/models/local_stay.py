from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from database.connection import Base
from datetime import datetime

class Host(Base):
    __tablename__ = "hosts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    verification_status = Column(String(50), default="pending") # pending, verified, rejected
    kyc_status = Column(String(50), default="unverified")
    emergency_contact = Column(String(255))
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    properties = relationship("Property", back_populates="host")

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("hosts.id"))
    title = Column(String(255))
    description = Column(String(1000))
    room_type = Column(String(50)) # private room, shared room, full home
    price_per_night = Column(Float)
    max_guests = Column(Integer)
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    availability_json = Column(JSON) # Stores blackout dates
    weekend_enabled = Column(Boolean, default=True)
    photos_json = Column(JSON) # List of photo URLs
    safety_rating = Column(Float, default=5.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    host = relationship("Host", back_populates="properties")
    reviews = relationship("PropertyReview", back_populates="property")

class PropertyReview(Base):
    __tablename__ = "property_reviews"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)
    review = Column(String(1000))
    created_at = Column(DateTime, default=datetime.utcnow)

    property = relationship("Property", back_populates="reviews")
    user = relationship("User")

class BookingOverflow(Base):
    __tablename__ = "overflow_bookings"

    id = Column(Integer, primary_key=True, index=True)
    destination = Column(String(255), index=True)
    demand_score = Column(Float)
    hotel_availability = Column(Float) # Percentage (0-100)
    overflow_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class DemandHeatmap(Base):
    __tablename__ = "demand_heatmap"

    id = Column(Integer, primary_key=True, index=True)
    destination = Column(String(255), index=True)
    date = Column(DateTime)
    crowd_score = Column(Float) # 0 to 1
    demand_level = Column(String(50)) # Low, Moderate, High, Peak
    created_at = Column(DateTime, default=datetime.utcnow)
