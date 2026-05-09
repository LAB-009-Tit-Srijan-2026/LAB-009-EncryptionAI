from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Table
from sqlalchemy.orm import relationship
from database.connection import Base
from datetime import datetime

# Association table for many-to-many relationship between Users and Trips
trip_members = Table(
    "trip_members",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("trip_id", Integer, ForeignKey("trips.id"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    email = Column(String(255), unique=True, index=True)
    hashed_password = Column(String(255))

    owned_trips = relationship("Trip", back_populates="owner")
    joined_trips = relationship("Trip", secondary=trip_members, back_populates="members")
    expenses = relationship("Expense", back_populates="payer")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    destination = Column(String(255), index=True)
    budget = Column(Float)
    days = Column(Integer)
    group_size = Column(Integer) # Kept for backward compatibility/initial intent
    interests = Column(String(1000)) # Comma separated
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="owned_trips")
    members = relationship("User", secondary=trip_members, back_populates="joined_trips")
    itinerary = relationship("Itinerary", back_populates="trip", uselist=False)
    expenses = relationship("Expense", back_populates="trip")
    messages = relationship("ChatMessage", back_populates="trip")

class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    content = Column(String(5000)) # JSON string of the itinerary
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="itinerary")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    payer_id = Column(Integer, ForeignKey("users.id"))
    description = Column(String(255))
    amount = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="expenses")
    payer = relationship("User", back_populates="expenses")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String(1000))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User")
    trip = relationship("Trip", back_populates="messages")
