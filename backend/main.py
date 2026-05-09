from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.connection import engine, Base
from routes import auth, trips, itinerary, expenses

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Travel Planner API")

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:8000"
    # Add your frontend domains here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon simplicity, allowing all. Change in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(itinerary.router)
app.include_router(expenses.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Travel Planner API"}
