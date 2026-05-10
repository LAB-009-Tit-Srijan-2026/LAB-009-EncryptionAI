from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.connection import get_db
from models.database import User
from routes.auth import get_current_user
import random

router = APIRouter(prefix="/safety", tags=["safety"])

@router.post("/report")
async def report_property(property_id: int, reason: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # In a real app, save to a reports table
    return {"status": "success", "message": "Property reported and will be reviewed by our safety team."}

@router.post("/checkin")
async def generate_checkin_otp(booking_id: int, current_user: User = Depends(get_current_user)):
    # Generate a random 6-digit OTP
    otp = str(random.randint(100000, 999999))
    return {"status": "success", "otp": otp, "message": "Share this OTP with your host at check-in."}

@router.post("/verify-otp")
async def verify_checkin_otp(booking_id: int, otp: str, current_user: User = Depends(get_current_user)):
    # In a real app, verify against stored OTP
    if len(otp) == 6:
        return {"status": "success", "message": "Check-in verified successfully."}
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP")

@router.get("/emergency-contacts")
async def get_emergency_contacts():
    return {
        "police": "100",
        "ambulance": "102",
        "support": "+91-TRAVEL-AI-HELP"
    }
