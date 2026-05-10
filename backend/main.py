from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from models import database, local_stay, guide # Import all models
from routes import auth, trips, itinerary, expenses, booking, host_routes, local_stay_routes, demand_routes, safety_routes, guide_routes
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

from fastapi.staticfiles import StaticFiles
import os

# ... existing code ...

# Include routers
fastapi_app.include_router(auth.router)
fastapi_app.include_router(trips.router)
fastapi_app.include_router(itinerary.router)
fastapi_app.include_router(expenses.router)
fastapi_app.include_router(booking.router)
fastapi_app.include_router(host_routes.router)
fastapi_app.include_router(local_stay_routes.router)
fastapi_app.include_router(demand_routes.router)
fastapi_app.include_router(safety_routes.router)
fastapi_app.include_router(guide_routes.router)

# Serve Frontend
frontend_path = os.path.abspath(os.path.join(os.getcwd(), "..", "frontend"))
fastapi_app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

@fastapi_app.get("/")
def read_root():
    return {"message": "Welcome to AI Travel Planner API"}

# Wrap the FastAPI app with Socket.IO
app = socketio.ASGIApp(sio, fastapi_app)
