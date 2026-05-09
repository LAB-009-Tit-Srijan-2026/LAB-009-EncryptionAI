from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from routes import auth, trips, itinerary, expenses, booking
import socketio
from sockets.manager import sio

# Create tables
Base.metadata.create_all(bind=engine)

fastapi_app = FastAPI(title="AI Travel Planner API")

# Configure CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
fastapi_app.include_router(auth.router)
fastapi_app.include_router(trips.router)
fastapi_app.include_router(itinerary.router)
fastapi_app.include_router(expenses.router)
fastapi_app.include_router(booking.router)

@fastapi_app.get("/")
def read_root():
    return {"message": "Welcome to AI Travel Planner API"}

# Wrap the FastAPI app with Socket.IO
app = socketio.ASGIApp(sio, fastapi_app)
