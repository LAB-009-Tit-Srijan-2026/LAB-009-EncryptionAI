from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON, Text
from sqlalchemy.orm import relationship
from database.connection import Base
from datetime import datetime

class TouristGuide(Base):
    __tablename__ = "tourist_guides"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True) # A user can be a guide
    name = Column(String(100))
    bio = Column(Text)
    city = Column(String(100), index=True)
    languages_json = Column(JSON) # ["English", "Hindi", "French"]
    specialties_json = Column(JSON) # ["Spiritual", "Food", "History"]
    experience_years = Column(Integer, default=0)
    rating = Column(Float, default=5.0)
    price_per_day = Column(Float)
    phone = Column(String(20))
    verification_status = Column(String(20), default="Pending") # Pending, Verified, Rejected
    profile_photo = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    availability_json = Column(JSON) # Blackout dates
    emergency_contact = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reviews = relationship("GuideReview", back_populates="guide")
    bookings = relationship("GuideBooking", back_populates="guide")

class GuideReview(Base):
    __tablename__ = "guide_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("tourist_guides.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)
    review = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    guide = relationship("TouristGuide", back_populates="reviews")

class GuideBooking(Base):
    __tablename__ = "guide_bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("tourist_guides.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    trip_id = Column(Integer, ForeignKey("trips.id"))
    activity_name = Column(String(255))
    booking_date = Column(DateTime)
    booking_status = Column(String(20), default="Confirmed") # Confirmed, Cancelled, Completed
    total_price = Column(Float)
    otp_code = Column(String(6))
    check_in_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    guide = relationship("TouristGuide", back_populates="bookings")
