from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List

from database.connection import get_db
from models.database import Expense, Trip, User
from schemas.pydantic_models import ExpenseCreate, Expense as ExpenseSchema
from routes.auth import get_current_user
from utils.settlement import simplify_debts
from ai.gemini import parse_receipt

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.post("/scan-receipt")
async def scan_receipt(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    contents = await file.read()
    result = await parse_receipt(contents)
    return result

@router.post("/", response_model=ExpenseSchema)
def add_expense(expense: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify user is a member of the trip
    trip = db.query(Trip).filter(
        Trip.id == expense.trip_id,
        ((Trip.owner_id == current_user.id) | (Trip.members.any(id=current_user.id)))
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or access denied")

    db_expense = Expense(**expense.model_dump(), payer_id=current_user.id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/trip/{trip_id}", response_model=List[ExpenseSchema])
def get_trip_expenses(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify user is a member of the trip
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        ((Trip.owner_id == current_user.id) | (Trip.members.any(id=current_user.id)))
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or access denied")

    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    return expenses

@router.get("/trip/{trip_id}/split")
def split_trip_expenses(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        ((Trip.owner_id == current_user.id) | (Trip.members.any(id=current_user.id)))
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found or access denied")

    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    
    total_amount = sum(exp.amount for exp in expenses)
    num_members = len(trip.members)
    per_person = total_amount / num_members if num_members > 0 else 0

    member_balances = []
    for member in trip.members:
        amount_paid = sum(e.amount for e in expenses if e.payer_id == member.id)
        balance = amount_paid - per_person
        member_balances.append({
            "user_id": member.id,
            "name": member.name,
            "amount_paid": amount_paid,
            "balance": round(balance, 2)
        })

    return {
        "total_amount": total_amount,
        "num_members": num_members,
        "per_person_share": round(per_person, 2),
        "member_balances": member_balances,
        "simplified_debts": simplify_debts(member_balances),
        "expenses": [{"id": e.id, "amount": e.amount, "description": e.description, "payer_id": e.payer_id} for e in expenses]
    }
